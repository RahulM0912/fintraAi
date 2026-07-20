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
  HumanMessage,
  SystemMessage,
  isAIMessage,
  isHumanMessage,
  isToolMessage,
  type BaseMessage,
} from "@langchain/core/messages";
import { RunnableConfig } from "@langchain/core/runnables";
import { financeTools } from "./tools";
import { ModelProvider, DEFAULT_MODEL_CONFIG } from "./types";
import { getCheckpointer } from "./checkpointer";
import { buildDataView, RENDERABLE_READ_TOOLS } from "./render";

// ─── Message-content normalization ─────────────────────────────────────────────
//
// Providers differ in message-content shape: OpenAI-style models use a plain
// string, Gemini an array of parts ({ type: "text", text }). Any code that
// treats content as string-only silently loses Gemini text.
export function messageText(content: unknown): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((p) =>
        typeof p === "string"
          ? p
          : p && typeof p === "object" && typeof (p as { text?: unknown }).text === "string"
          ? (p as { text: string }).text
          : ""
      )
      .join("");
  }
  return "";
}

// ─── Tool executor node ────────────────────────────────────────────────────────

const toolNode = new ToolNode(financeTools);

// ─── Model factory ─────────────────────────────────────────────────────────────

// `apiKey` lets a user bring their own key; when omitted we fall back to the
// managed server key from the environment.
// Output cap: chat answers are short post render-fast-path; the cap stops
// runaway output. 2048 leaves headroom for models whose reasoning/thinking
// tokens count against the completion limit (gpt-oss, gemini-2.5).
const MAX_OUTPUT_TOKENS = 2048;

export function createModel(
  provider: ModelProvider,
  modelName: string,
  apiKey?: string
) {
  switch (provider) {
    case "openrouter":
      return new ChatOpenAI({
        model: modelName,
        temperature: 0.1,
        maxRetries: 1,
        maxTokens: MAX_OUTPUT_TOKENS,
        apiKey: apiKey ?? process.env.OPENROUTER_API_KEY ?? undefined,
        configuration: {
          baseURL: "https://openrouter.ai/api/v1",
          defaultHeaders: {
            "HTTP-Referer": process.env.NEXT_PUBLIC_SITE_URL ?? "https://fintra.app",
            "X-Title": "Fintra AI",
          },
        },
      });
    case "openai":
      // Direct OpenAI — default baseURL (api.openai.com).
      return new ChatOpenAI({
        model: modelName,
        temperature: 0.1,
        maxRetries: 1,
        maxTokens: MAX_OUTPUT_TOKENS,
        apiKey: apiKey ?? process.env.OPENAI_API_KEY ?? undefined,
      });
    case "gemini":
    default:
      return new ChatGoogleGenerativeAI({
        model: modelName,
        temperature: 0.1,
        maxRetries: 1,
        maxOutputTokens: MAX_OUTPUT_TOKENS,
        apiKey:
          apiKey ??
          process.env.GOOGLE_API_KEY ??
          process.env.GOOGLE_GEMINI_API_KEY ??
          undefined,
      });
  }
}

// ─── gate_node ─────────────────────────────────────────────────────────────────
//
// Cheap front door: greetings, small talk, off-topic asks, and too-vague
// queries get answered by a small model with a ~120-token prompt — the full
// system prompt + tool schemas (~2k tokens on the main model) never load.
// Anything that might need finance data PASSes through to the agent, so a
// misclassification only costs the old behavior, never a lost capability.

const GATE_PROMPT = `You are the front door of Fintra, a personal-finance assistant that can log/list/edit transactions, report spending, and manage budgets and recurring payments.

Read the user's latest message in context. Reply with exactly PASS when it needs any finance data or action — or when you are unsure.

Always PASS: anything about the user's money, spending, income, budgets, transactions, or trends — including short follow-ups to a previous answer ("how does this compare to last month?", "and in June?", "why so high?"). The main assistant can look all of that up. You have NO data access: never claim data is unavailable and never ask the user to supply their own numbers — PASS instead.

Otherwise reply with the exact message to show the user:
- greeting / small talk / thanks → one short friendly line (you may mention what you can do)
- off-topic for a finance app → decline briefly and point to what you can help with
- too vague to act on (no money topic at all) → ask ONE short clarifying question`;

async function gateNode(
  state: typeof MessagesAnnotation.State,
  config: RunnableConfig
): Promise<Partial<typeof MessagesAnnotation.State>> {
  // The gate runs on the managed OpenRouter key regardless of the user's BYO
  // model — it costs fractions of a paisa. No key → skip the gate entirely.
  if (!process.env.OPENROUTER_API_KEY) return {};

  // Only the visible conversation rides along — no system prompt, no schemas.
  const convo = state.messages
    .filter((m) => isHumanMessage(m) || (isAIMessage(m) && !(m.tool_calls?.length ?? 0)))
    .filter((m) => messageText(m.content).trim())
    .slice(-6);
  if (convo.length === 0) return {};

  try {
    const llm = createModel("openrouter", "openai/gpt-oss-20b");
    const res = await llm.invoke([new SystemMessage(GATE_PROMPT), ...convo], config);
    const text = messageText(res.content).trim();
    if (!text || /^PASS\b/i.test(text)) return {};
    return { messages: [new AIMessage(text)] };
  } catch (err) {
    // Gate is best-effort — any failure falls through to the full agent.
    console.error("[gate] failed, passing through", err);
    return {};
  }
}

function afterGate(
  state: typeof MessagesAnnotation.State
): "agent" | typeof END {
  // The gate either appended its own AI reply (turn is done) or returned
  // nothing, leaving the user's message last (continue to the agent).
  const last = state.messages[state.messages.length - 1];
  return isAIMessage(last) && !(last.tool_calls?.length ?? 0) ? END : "agent";
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
  const apiKey = config.configurable?.apiKey as string | undefined;

  const llm = createModel(provider, modelName, apiKey).bindTools(financeTools);
  let response: AIMessage = await llm.invoke(state.messages, config);

  // Some models (seen with gemini-2.5-flash-lite after a tool round) return an
  // empty candidate — finishReason STOP, zero output tokens, no text, no tool
  // calls — which would surface as a silent blank reply. Retry once with an
  // explicit "answer now" turn; if the model still returns nothing, fall back
  // to a fixed reply so the user always sees something.
  const isEmpty = (r: AIMessage) =>
    !messageText(r.content).trim() && !(r.tool_calls?.length ?? 0);
  if (isEmpty(response)) {
    response = await llm.invoke(
      [
        ...state.messages,
        new HumanMessage(
          "Write your final answer to the user now as plain text, using the tool results above. Do not call any more tools."
        ),
      ],
      config
    );
    if (isEmpty(response)) {
      response = new AIMessage(
        "I hit a temporary glitch composing that reply — please send your message again."
      );
    }
  }

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
  "add_transactions",
  "edit_transaction",
  "budget", // only action:"set" produces a {success,message} shape; "status" fails parseToolSuccess and falls through
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
): "confirm" | "render" | "agent" {
  const batch = lastToolBatch(state.messages);
  if (!batch) return "agent";
  const { ai, toolMsgs } = batch;

  // The agent must have emitted ONLY tool calls (no prose to stream).
  const text = messageText(ai.content).trim();
  if (text) return "agent";

  const calls = ai.tool_calls ?? [];
  if (calls.length === 0 || toolMsgs.length !== calls.length) return "agent";

  // Pure successful mutation batch → deterministic confirmation, no 2nd call.
  if (
    calls.every((c) => TERMINAL_MUTATING_TOOLS.has(c.name)) &&
    toolMsgs.every((m) => parseToolSuccess(m.content))
  ) {
    return "confirm";
  }

  // Pure single read call → deterministic table render, no 2nd call (Phase B).
  // Strictly opt-in: the model must mark the call purpose:"display" ("user just
  // wants to see this"). Lookups before an action and analysis asks omit it (or
  // say "lookup") and loop back to the agent — worst case is the old 2nd call,
  // never a lost answer.
  if (calls.length === 1 && RENDERABLE_READ_TOOLS.has(calls[0].name)) {
    const call = calls[0];
    const isDisplay = (call.args as { purpose?: string } | undefined)?.purpose === "display";
    if (isDisplay && buildDataView(call.name, toolMsgs[0]?.content)) {
      return "render";
    }
  }

  return "agent";
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
    else if (Array.isArray(j.messages) && j.messages.length)
      lines.push(...(j.messages.filter((s) => typeof s === "string") as string[]));
    else if (typeof j.added === "number")
      lines.push(`Added ${j.added} transaction${j.added === 1 ? "" : "s"}.`);
  }
  const content = lines.length
    ? lines.map((l) => `✓ ${l}`).join("\n\n")
    : "Done.";
  return { messages: [new AIMessage(content)] };
}

// Build the table straight from the read tool's result — no LLM call. The
// structured payload rides in additional_kwargs; chatHandler forwards it to the
// client as a `data` SSE event and the client renders it natively.
function renderNode(
  state: typeof MessagesAnnotation.State
): Partial<typeof MessagesAnnotation.State> {
  const batch = lastToolBatch(state.messages);
  const call = batch?.ai.tool_calls?.[0];
  const hint = (call?.args as { chart?: string } | undefined)?.chart;
  const view = call ? buildDataView(call.name, batch?.toolMsgs[0]?.content, hint) : null;
  return {
    messages: [
      new AIMessage({
        content: view?.headline ?? "Here's what I found.",
        additional_kwargs: {
          ...(view?.table ? { fintra_table: view.table } : {}),
          ...(view?.chart ? { fintra_chart: view.chart } : {}),
          ...(view?.facts ? { fintra_facts: view.facts } : {}),
        },
      }),
    ],
  };
}

// ─── Graph assembly ────────────────────────────────────────────────────────────
//
//  START → gate ──(chat/vague — replies itself)──► END
//            │(PASS)
//            ▼
//          agent ──(has tool_calls)──► tools ──(pure successful mutation)──► confirm → END
//            ▲                           │(pure display read)──────────────► render → END
//            └────(needs reasoning)──────┘
//          (no tool_calls) → END
//
//  The formatter node has been removed. Formatting rules are baked into the
//  system prompt. The `confirm` node short-circuits the second agent call for
//  simple mutations whose confirmation is fully determined by the tool result.

export const fintraGraph = new StateGraph(MessagesAnnotation)
  .addNode("gate", gateNode)
  .addNode("agent", agentNode)
  .addNode("tools", toolNode)
  .addNode("confirm", confirmNode)
  .addNode("render", renderNode)
  .addEdge(START, "gate")
  .addConditionalEdges("gate", afterGate, {
    agent: "agent",
    [END]: END,
  })
  .addConditionalEdges("agent", shouldContinue)
  .addConditionalEdges("tools", afterTools, {
    confirm: "confirm",
    render: "render",
    agent: "agent",
  })
  .addEdge("confirm", END)
  .addEdge("render", END)
  .compile({ checkpointer: getCheckpointer() });

// ─── System prompt ─────────────────────────────────────────────────────────────

// Static rules come first and are byte-stable so providers can cache the
// prefix (Gemini implicit cache, OpenAI/OpenRouter automatic prefix caching).
// Anything that changes per request (date, categories) goes in the Context
// section appended at the END — never edit the static block per request.
const STATIC_RULES = `You are Fintra AI, a personal finance assistant inside a finance tracking app.

You can add/list/edit transactions, report spending (get_report), manage monthly budgets (budget), and schedule recurring transactions.

## Rules
- Convert relative dates (today, yesterday, last Monday, this month) to absolute YYYY-MM-DD using today's date from Context.
- Format money as ₹ (Indian Rupees).
- add_transactions takes the FULL list (1-20 rows) in one call — never call it twice in a turn.
- You need a transaction ID to edit — call list_transactions (purpose "lookup") first if you don't have one, then edit_transaction with action "update" or "delete".
- Pick the closest category from the Categories list in Context.
- get_report: scope "range" (startDate+endDate) for totals + category breakdown; scope "month" (year+month) for a daily breakdown; scope "year" (year) for a monthly breakdown.
- budget: action "set" sets a monthly cap (omit categoryName for an overall cap); action "status" reports spent/remaining/percentage. When a budget is near or over (≥80%), flag it with a GitHub alert.
- Recurring: create_recurring_transaction schedules a monthly auto-post (rent, salary, subscriptions). dayOfMonth must be 1-28; it first posts next occurrence, not the current month.
- Be concise and friendly; confirm each action in one short line.
- If the request is vague or underspecified (no amount, unclear target, "do something with my money"), ask ONE short clarifying question in plain text — no tool calls, no guessing. Once the user answers, proceed.
- NEVER fabricate values. Every amount, date, category, description, and ID must come verbatim from a tool result. If a field is null/empty, render \`—\` (em dash), never a guess. "Food" is a category, never a note.

## Showing data
- When the user just wants to SEE data — their transactions, a spending summary, history/trends, budget status — call exactly ONE read tool with purpose:"display" and no accompanying text. The app renders the result as a table automatically and your turn is complete: do NOT transcribe rows into the reply.
- When the user asks for analysis, advice, or comparison, or you need the data for a follow-up action, call the read tool with purpose:"lookup" and then write the answer yourself from the result.

## Human-in-the-loop
These tools pause for a rich UI prompt. Call them with a short question and do NOT also ask in chat text:
- request_transaction_selection: when an edit matches 2+ rows. Pass all candidates; act on the returned ID. If {cancelled:true}, stop.
- request_destructive_confirmation: before every edit_transaction action "delete" and any sweeping bulk update. If {approved:false}, don't proceed.
- request_large_amount_confirmation: before add_transactions when a row's amount ≥ ₹10,000 or looks like a typo. If {approved:false}, skip that add.

## Response format (GitHub-Flavored Markdown) — for analytical answers
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

export function buildSystemPrompt(
  today: string,
  categorySummary: string
): string {
  return `${STATIC_RULES}

## Context
Today: ${today}${categorySummary ? `\nCategories:\n${categorySummary}` : ""}`;
}
