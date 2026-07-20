import { SystemMessage, HumanMessage } from "@langchain/core/messages";
import { createModel, messageText } from "./graph";
import { DEFAULT_MODEL_CONFIG, type ModelProvider } from "./types";

// ─── Rolling conversation summary ───────────────────────────────────────────────
//
// Folds the messages that have aged out of the verbatim window into a compact
// running summary, so the agent keeps long-conversation context without the full
// transcript riding along in every request. Combines the previous summary with
// the newly-dropped messages incrementally (not a full re-summarisation).

const SUMMARY_INSTRUCTIONS = `You maintain a running summary of the older part of a personal-finance chat.

Combine the EXISTING SUMMARY with the NEW MESSAGES into one updated summary.
Keep only what matters for continuing the conversation:
- what the user asked for and any unfinished requests
- concrete amounts, dates, categories, and transaction IDs that were mentioned
- decisions or confirmations the user made

Rules:
- Be terse: bullet points or short sentences, no preamble.
- Do not invent anything not present in the messages.
- Output ONLY the updated summary text.`;

interface FoldMessage {
  role: "user" | "assistant";
  content: string;
}

export async function summarizeHistory(
  priorSummary: string,
  newMessages: FoldMessage[],
  opts?: { provider?: ModelProvider; modelName?: string }
): Promise<string> {
  if (newMessages.length === 0) return priorSummary;

  // Summarising a chat tail is trivial work — pin it to a cheap small model on
  // the managed key instead of the (possibly premium) chat model (Phase E).
  const provider = opts?.provider ?? DEFAULT_MODEL_CONFIG.provider;
  const modelName =
    opts?.modelName ??
    (provider === "openrouter" ? "openai/gpt-oss-20b" : DEFAULT_MODEL_CONFIG.modelName);
  const model = createModel(provider, modelName);

  const transcript = newMessages
    .map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`)
    .join("\n");

  const payload = `EXISTING SUMMARY:\n${priorSummary || "(none yet)"}\n\nNEW MESSAGES:\n${transcript}`;

  const res = await model.invoke([
    new SystemMessage(SUMMARY_INSTRUCTIONS),
    new HumanMessage(payload),
  ]);

  const text = messageText(res.content).trim();
  // Fall back to the prior summary if the model returned nothing useful.
  return text || priorSummary;
}
