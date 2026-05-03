import {
  StateGraph,
  START,
  END,
  MessagesAnnotation,
} from "@langchain/langgraph";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { ChatOpenAI } from "@langchain/openai";
import { AIMessage, SystemMessage, HumanMessage } from "@langchain/core/messages";
import { RunnableConfig } from "@langchain/core/runnables";
import { financeTools } from "./tools";
import { ModelProvider, DEFAULT_MODEL_CONFIG } from "./types";

// ─── Tool executor node ────────────────────────────────────────────────────────

const toolNode = new ToolNode(financeTools);

// ─── Model factory (extend here for future providers) ─────────────────────────

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

// ─── formatter_node ────────────────────────────────────────────────────────────

const FORMATTER_SYSTEM = `You are a response formatter for a personal finance assistant.
Reformat the given text as clean markdown. Follow these rules strictly:

**Bold** only:
- Rupee amounts (e.g. **₹1,200**)
- Percentages that represent a key metric (e.g. **97%**)
- A single most-important number per sentence when it is the core fact

Do NOT bold:
- Labels or field names (Period, Total Income, Savings Rate, Category, etc.)
- Section headings — use plain text or a short heading instead
- Category names in bullet lists
- Dates — write them in plain text
- Conjunctions, prepositions, or filler words

Structure:
- Use bullet points (- ) for lists of transactions, categories, or items
- Use a blank line between distinct sections for breathing room
- Keep sentences short and scannable

Keep all information intact — only change formatting, never add or remove content.
Return only the formatted text with no preamble.`;

async function formatterNode(
  state: typeof MessagesAnnotation.State,
  config: RunnableConfig
): Promise<Partial<typeof MessagesAnnotation.State>> {
  const provider =
    (config.configurable?.modelProvider as ModelProvider) ??
    DEFAULT_MODEL_CONFIG.provider;
  const modelName =
    (config.configurable?.modelName as string) ??
    DEFAULT_MODEL_CONFIG.modelName;

  const last = state.messages[state.messages.length - 1] as AIMessage;
  const rawContent =
    typeof last.content === "string" ? last.content : JSON.stringify(last.content);

  const llm = createModel(provider, modelName);
  const formatted = await llm.invoke([
    new SystemMessage(FORMATTER_SYSTEM),
    new HumanMessage(rawContent),
  ]);

  return { messages: [formatted] };
}

// ─── Conditional edge ──────────────────────────────────────────────────────────

function shouldContinue(
  state: typeof MessagesAnnotation.State
): "tools" | "formatter" {
  const last = state.messages[state.messages.length - 1] as AIMessage;
  if (last.tool_calls?.length) return "tools";
  return "formatter";
}

// ─── Graph assembly ────────────────────────────────────────────────────────────
//
//  The system message is injected by the API route BEFORE invoking the graph
//  so it is always the first message in the state (Gemini requirement).
//
//  START → agent ──(has tool_calls)──► tools
//            ▲                           │
//            └───────────────────────────┘
//          (no tool_calls) → formatter → END

export const fintraGraph = new StateGraph(MessagesAnnotation)
  .addNode("agent", agentNode)
  .addNode("tools", toolNode)
  .addNode("formatter", formatterNode)
  .addEdge(START, "agent")
  .addConditionalEdges("agent", shouldContinue)
  .addEdge("tools", "agent")
  .addEdge("formatter", END)
  .compile();

// ─── System prompt ─────────────────────────────────────────────────────────────
// Exported so the API route can build and prepend it before invoking the graph.

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
3. **Delete safety**: Always ask the user to confirm before calling delete_transaction.
4. **IDs**: You need a transaction ID to update or delete. Call list_transactions first if you don't have one.
5. **Bulk adds**: Use add_transactions_bulk when the user provides 3 or more transactions at once. For 1-2, use parallel add_transaction calls.
6. **Categories**: Choose the closest matching category. If truly ambiguous, call get_categories to see the full list.
7. **Tone**: Be concise and friendly. Confirm every action with a brief summary.`;
}
