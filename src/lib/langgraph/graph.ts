import {
  StateGraph,
  START,
  END,
  MessagesAnnotation,
} from "@langchain/langgraph";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { ChatOpenAI } from "@langchain/openai";
import {
  AIMessage,
  isAIMessage,
  isToolMessage,
  type BaseMessage,
} from "@langchain/core/messages";
import { RunnableConfig } from "@langchain/core/runnables";
import { financeTools } from "./tools";
import { ModelProvider, DEFAULT_MODEL_CONFIG } from "./types";
import { getCheckpointer } from "./checkpointer";

// ─── Tool executor node ────────────────────────────────────────────────────────

const toolNode = new ToolNode(financeTools);

// ─── Model factory ─────────────────────────────────────────────────────────────

export function createModel(provider: ModelProvider, modelName: string) {
  switch (provider) {
    case "openrouter":
      return new ChatOpenAI({
        model: modelName,
        temperature: 0.1,
        maxRetries: 1,
        apiKey: process.env.OPENROUTER_API_KEY ?? undefined,
        configuration: {
          baseURL: "https://openrouter.ai/api/v1",
          defaultHeaders: {
            "HTTP-Referer": process.env.NEXT_PUBLIC_SITE_URL ?? "https://fintra.app",
            "X-Title": "Fintra AI",
          },
        },
      });
    case "gemini":
    default:
      return new ChatGoogleGenerativeAI({
        model: modelName,
        temperature: 0.1,
        maxRetries: 1,
        apiKey:
          process.env.GOOGLE_API_KEY ??
          process.env.GOOGLE_GEMINI_API_KEY ??
          undefined,
      });
  }
}

// ─── agent_node ────────────────────────────────────────────────────────────────

async function agentNode(
  state: typeof MessagesAnnotation.State,
  config: RunnableConfig
): Promise<Partial<typeof MessagesAnnotation.State>> {
  const provider =
    (config.configurable?.modelProvider as ModelProvider) ??
    DEFAULT_MODEL_CONFIG.provider;
  const modelName =
    (config.configurable?.modelName as string) ??
    DEFAULT_MODEL_CONFIG.modelName;

  const llm = createModel(provider, modelName).bindTools(financeTools);
  const response = await llm.invoke(state.messages, config);
  return { messages: [response] };
}

// ─── Conditional edge ──────────────────────────────────────────────────────────

function shouldContinue(
  state: typeof MessagesAnnotation.State
): "tools" | typeof END {
  const last = state.messages[state.messages.length - 1] as AIMessage;
  if (last.tool_calls?.length) return "tools";
  return END;
}

// ─── Fast-path: skip the second agent call for simple mutations ─────────────────
//
// A simple "add ₹50 for lunch" normally costs two LLM calls: one to emit the
// tool call, one to write the confirmation. When the agent's tool call is a pure
// (no accompanying text) batch of mutating tools that all succeeded, the
// confirmation is fully determined by the tool results — so we synthesise it
// deterministically and skip the second call entirely.

const TERMINAL_MUTATING_TOOLS = new Set([
  "add_transaction",
  "add_transactions_bulk",
  "update_transaction",
  "delete_transaction",
]);

// Find the most recent AI tool-calling message and the tool results that follow it.
function lastToolBatch(
  messages: BaseMessage[]
): { ai: AIMessage; toolMsgs: BaseMessage[] } | null {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (isAIMessage(m) && (m.tool_calls?.length ?? 0) > 0) {
      const toolMsgs = messages.slice(i + 1).filter(isToolMessage);
      return { ai: m, toolMsgs };
    }
  }
  return null;
}

// Returns the parsed result if the tool reported success, else null.
function parseToolSuccess(content: unknown): Record<string, unknown> | null {
  if (typeof content !== "string") return null;
  try {
    const j = JSON.parse(content) as Record<string, unknown>;
    if (j.success === true) return j;
    if (typeof j.added === "number" && (j.failed ?? 0) === 0) return j;
    return null;
  } catch {
    return null;
  }
}

function afterTools(
  state: typeof MessagesAnnotation.State
): "confirm" | "agent" {
  const batch = lastToolBatch(state.messages);
  if (!batch) return "agent";
  const { ai, toolMsgs } = batch;

  // The agent must have emitted ONLY tool calls (no prose to stream).
  const text = typeof ai.content === "string" ? ai.content.trim() : "";
  if (text) return "agent";

  const calls = ai.tool_calls ?? [];
  if (calls.length === 0 || toolMsgs.length !== calls.length) return "agent";
  if (!calls.every((c) => TERMINAL_MUTATING_TOOLS.has(c.name))) return "agent";
  if (!toolMsgs.every((m) => parseToolSuccess(m.content))) return "agent";

  return "confirm";
}

// Build the confirmation text straight from the tool results — no LLM call.
function confirmNode(
  state: typeof MessagesAnnotation.State
): Partial<typeof MessagesAnnotation.State> {
  const batch = lastToolBatch(state.messages);
  const lines: string[] = [];
  for (const m of batch?.toolMsgs ?? []) {
    const j = parseToolSuccess(m.content);
    if (!j) continue;
    if (typeof j.message === "string") lines.push(j.message);
    else if (typeof j.added === "number")
      lines.push(`Added ${j.added} transaction${j.added === 1 ? "" : "s"}.`);
  }
  const content = lines.length
    ? lines.map((l) => `✓ ${l}`).join("\n\n")
    : "Done.";
  return { messages: [new AIMessage(content)] };
}

// ─── Graph assembly ────────────────────────────────────────────────────────────
//
//  START → agent ──(has tool_calls)──► tools ──(pure successful mutation)──► confirm → END
//            ▲                           │
//            └────(needs reasoning)──────┘
//          (no tool_calls) → END
//
//  The formatter node has been removed. Formatting rules are baked into the
//  system prompt. The `confirm` node short-circuits the second agent call for
//  simple mutations whose confirmation is fully determined by the tool result.

export const fintraGraph = new StateGraph(MessagesAnnotation)
  .addNode("agent", agentNode)
  .addNode("tools", toolNode)
  .addNode("confirm", confirmNode)
  .addEdge(START, "agent")
  .addConditionalEdges("agent", shouldContinue)
  .addConditionalEdges("tools", afterTools, {
    confirm: "confirm",
    agent: "agent",
  })
  .addEdge("confirm", END)
  .compile({ checkpointer: getCheckpointer() });

// ─── System prompt ─────────────────────────────────────────────────────────────

export function buildSystemPrompt(
  today: string,
  categorySummary: string
): string {
  return `You are Fintra AI, a personal finance assistant inside a finance tracking app.

Today: ${today}
${categorySummary ? `Categories:\n${categorySummary}\n` : ""}
You can add/list/update/delete transactions, report spending summaries and monthly/yearly trends (get_history), set/check monthly budgets, and schedule recurring transactions.

## Rules
- Convert relative dates (today, yesterday, last Monday, this month) to absolute YYYY-MM-DD using today's date.
- Format money as ₹ (Indian Rupees).
- You need a transaction ID to update/delete — call list_transactions first if you don't have one.
- Use add_transactions_bulk for 3+ transactions; parallel add_transaction for 1-2.
- Pick the closest category from the list above.
- For history/trends use get_history (scope 'month' needs month; scope 'year' for the whole year).
- Budgets: set_budget sets a monthly cap (omit category for an overall cap); get_budget_status reports spent/remaining/percentage. When a budget is near or over (≥80%), flag it with a GitHub alert.
- Recurring: create_recurring_transaction schedules a monthly auto-post (rent, salary, subscriptions). dayOfMonth must be 1-28; it first posts next occurrence, not the current month.
- Be concise and friendly; confirm each action in one short line.
- NEVER fabricate values. Every amount, date, category, description, and ID must come verbatim from a tool result. If a field is null/empty, render \`—\` (em dash), never a guess. "Food" is a category, never a note.

## Human-in-the-loop
These tools pause for a rich UI prompt. Call them with a short question and do NOT also ask in chat text:
- request_transaction_selection: when an edit/delete matches 2+ rows. Pass all candidates; act on the returned ID. If {cancelled:true}, stop.
- request_destructive_confirmation: before every delete and any sweeping bulk update. If {approved:false}, don't proceed.
- request_large_amount_confirmation: before add_transaction when amount ≥ ₹10,000 or looks like a typo. If {approved:false}, skip the add.

## Response format (GitHub-Flavored Markdown)
- Use a GFM table for any list of transactions/structured data. Each row starts/ends with \`|\`, separator uses \`---\`, no blank lines inside. Copy cell values from tool data verbatim; null description → \`—\`.
  | Date | Category | Amount | Note |
  |------|----------|--------|------|
  | 2026-05-01 | Food | **₹500** | Lunch |
- Bold ₹ amounts and key percentages. Use \`-\` bullets for non-tabular lists. Short, scannable sentences. Don't bold labels/dates/headings.
- When a number warrants attention, add a GitHub alert on its own line (blank line before/after), max 1-2 per response, 1-2 sentences, bold the key number. Don't repeat the main text — add a comparison, advice, or warning. Skip for greetings and simple add confirmations.
  - \`> [!WARNING]\` overspending / spike / large / pace ahead of average
  - \`> [!CAUTION]\` irreversible action you just performed
  - \`> [!TIP]\` savings opportunity / positive trend
  - \`> [!NOTE]\` neutral context worth knowing`;
}
