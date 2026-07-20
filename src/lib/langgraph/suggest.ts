import { SystemMessage, HumanMessage } from "@langchain/core/messages";
import { createModel, messageText } from "./graph";

// ─── AI follow-up suggestions ────────────────────────────────────────────────────
//
// After a data answer, a cheap small model (same managed key as the gate —
// fractions of a paisa) proposes 2-3 follow-up questions tied to what the user
// just asked. Runs handler-side after the answer has streamed, like
// summarizeHistory — not a graph node, because it never affects graph routing
// or state. Best-effort: any failure just means no suggestions this turn (the
// client falls back to shape-derived ones).

const SUGGEST_INSTRUCTIONS = `You write follow-up questions for Fintra, a personal-finance assistant that can list transactions, report spending, and manage budgets and recurring payments.

Given the user's last question and the assistant's answer, write 2-3 short follow-up questions the user would naturally ask NEXT. Each must:
- be directly related to what they just asked and the numbers in the answer
- be answerable from their own finance data (a question to ask the assistant, never a command that changes data)
- be at most 9 words

Reply with one question per line. No numbering, no bullets, no other text.`;

const MAX_SUGGESTIONS = 3;

export async function suggestFollowUps(
  userQuestion: string,
  answer: string
): Promise<string[]> {
  if (!process.env.OPENROUTER_API_KEY || !userQuestion.trim() || !answer.trim()) return [];

  try {
    const model = createModel("openrouter", "openai/gpt-oss-20b");
    const res = await model.invoke([
      new SystemMessage(SUGGEST_INSTRUCTIONS),
      new HumanMessage(
        `User asked: ${userQuestion}\n\nAssistant answered:\n${answer.slice(0, 1500)}`
      ),
    ]);

    return messageText(res.content)
      .split("\n")
      .map((l) => l.replace(/^[-*\d.)\s]+/, "").trim())
      .filter((l) => l.length > 0 && l.length <= 80 && l.includes("?"))
      .slice(0, MAX_SUGGESTIONS);
  } catch (err) {
    console.error("[suggest] failed", err);
    return [];
  }
}
