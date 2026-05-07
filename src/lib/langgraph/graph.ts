import {
  StateGraph,
  START,
  END,
  MessagesAnnotation,
} from "@langchain/langgraph";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { ChatOpenAI } from "@langchain/openai";
import { AIMessage } from "@langchain/core/messages";
import { RunnableConfig } from "@langchain/core/runnables";
import { financeTools } from "./tools";
import { ModelProvider, DEFAULT_MODEL_CONFIG } from "./types";
import { getCheckpointer } from "./checkpointer";

// ─── Tool executor node ────────────────────────────────────────────────────────

const toolNode = new ToolNode(financeTools);

// ─── Model factory ─────────────────────────────────────────────────────────────

function createModel(provider: ModelProvider, modelName: string) {
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

// ─── Graph assembly ────────────────────────────────────────────────────────────
//
//  START → agent ──(has tool_calls)──► tools
//            ▲                           │
//            └───────────────────────────┘
//          (no tool_calls) → END
//
//  The formatter node has been removed. Formatting rules are now baked into
//  the system prompt so the agent produces clean markdown in one LLM call.

export const fintraGraph = new StateGraph(MessagesAnnotation)
  .addNode("agent", agentNode)
  .addNode("tools", toolNode)
  .addEdge(START, "agent")
  .addConditionalEdges("agent", shouldContinue)
  .addEdge("tools", "agent")
  .compile({ checkpointer: getCheckpointer() });

// ─── System prompt ─────────────────────────────────────────────────────────────

export function buildSystemPrompt(
  today: string,
  categorySummary: string
): string {
  return `You are Fintra AI, a smart personal finance assistant embedded in a finance tracking app.

Today's date: ${today}

${categorySummary ? `Available categories:\n${categorySummary}\n` : ""}
## Your capabilities
- Add single or multiple income/expense transactions
- List, filter, and search transactions
- Update or delete existing transactions
- Provide spending summaries and category breakdowns
- Analyze monthly and yearly financial trends

## Rules
1. **Dates**: Convert relative dates (today, yesterday, last Monday, this month, last week) to absolute YYYY-MM-DD using today's date.
2. **Currency**: Always format amounts as ₹ (Indian Rupees).
3. **IDs**: You need a transaction ID to update or delete. Call list_transactions first if you don't have one.
4. **Bulk adds**: Use add_transactions_bulk when the user provides 3 or more transactions at once. For 1-2, use parallel add_transaction calls.
5. **Categories**: Choose the closest matching category. If truly ambiguous, call get_categories to see the full list.
6. **Tone**: Be concise and friendly. Confirm every action with a brief summary.

## Human-in-the-loop (very important)
You have three tools that pause the conversation and ask the user for a decision. The UI renders rich pickers and confirm dialogs for these — do NOT replicate the question in chat text, just call the tool with a short question.

- **request_transaction_selection**: When the user asks to edit or delete a transaction and list_transactions returns 2 or more rows that plausibly match (same category and date, similar amounts, ambiguous descriptions, etc.), call this tool. Pass every plausible candidate. After the user picks, call update_transaction or delete_transaction with the returned ID. If {cancelled: true}, stop and tell the user nothing was changed.
- **request_destructive_confirmation**: Call before EVERY delete_transaction (single or bulk) and before any sweeping bulk update. Pass a one-line summary of the exact change. Do not call the destructive tool if {approved: false}.
- **request_large_amount_confirmation**: Call before add_transaction whenever the amount is ≥ ₹10,000, or whenever the user typed an amount that could plausibly be a typo (e.g. "5000" when prior similar transactions were "500"). Skip add_transaction if {approved: false}.

When you call a HITL tool, do NOT also write a question in chat text — the UI handles the prompt. Just call the tool.

## Response format
Format every response as clean GitHub-Flavored Markdown (GFM):

**Tables** — always use a proper GFM table for any list of transactions or structured data:
\`\`\`
| Date | Category | Amount | Note |
|------|----------|--------|------|
| 2026-05-01 | Food | **₹500** | lunch |
\`\`\`
Rules: every row must start and end with |, separator row uses --- per column, no blank lines inside the table.

**Other formatting:**
- **Bold** rupee amounts (e.g. **₹1,200**) and key metric percentages (e.g. **47%**)
- Use bullet points ( - ) for non-tabular lists
- Leave a blank line between sections
- Keep sentences short and scannable
- Do NOT bold labels, field names, dates, or headings`;
}
