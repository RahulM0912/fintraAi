import { tool } from "@langchain/core/tools";
import { interrupt } from "@langchain/langgraph";
import { z } from "zod";
import type {
  TransactionCandidate,
  DisambiguateInterrupt,
  ConfirmDestructiveInterrupt,
  ConfirmLargeAmountInterrupt,
  DisambiguateResume,
  ConfirmResume,
} from "./interruptTypes";

// ─── Tool: request_transaction_selection ───────────────────────────────────────
//
//  Pauses the graph and asks the user to pick one transaction from a list of
//  candidates (e.g. multiple "Food" transactions on the same day). Returns the
//  picked candidate so the agent can call update_transaction or
//  delete_transaction with the resolved ID.

const candidateSchema: z.ZodType<TransactionCandidate> = z.object({
  id: z.string(),
  date: z.string(),
  type: z.enum(["income", "expense"]),
  amount: z.number(),
  category: z.string(),
  description: z.string().nullable(),
});

export const requestTransactionSelectionToolDef = tool(
  async ({
    action,
    question,
    candidates,
  }: {
    action: "edit" | "delete";
    question: string;
    candidates: TransactionCandidate[];
  }): Promise<string> => {
    const payload: DisambiguateInterrupt = {
      kind: "disambiguate_transaction",
      action,
      question,
      candidates,
    };

    const resume = interrupt(payload) as DisambiguateResume;

    if (!resume?.selectedId) {
      return JSON.stringify({ cancelled: true, message: "User cancelled — do not proceed." });
    }

    const picked = candidates.find((c) => c.id === resume.selectedId);
    if (!picked) {
      return JSON.stringify({ cancelled: true, message: "Selection not found in candidates." });
    }

    return JSON.stringify({ cancelled: false, selected: picked });
  },
  {
    name: "request_transaction_selection",
    description:
      "Use when list_transactions returns 2+ candidates that plausibly match the user's edit/delete request and you cannot disambiguate from context alone. Pauses the conversation and asks the user to pick the exact transaction. Returns the chosen transaction or {cancelled: true} if the user backs out.",
    schema: z.object({
      action: z.enum(["edit", "delete"]).describe("What the user is trying to do"),
      question: z
        .string()
        .describe("Short prompt shown to the user, e.g. 'Which Food expense did you mean?'"),
      candidates: z
        .array(candidateSchema)
        .min(2)
        .describe("The plausibly matching transactions to choose between"),
    }),
  }
);

// ─── Tool: request_destructive_confirmation ────────────────────────────────────
//
//  Use before any irreversible action: deleting a transaction, deleting a batch,
//  or sweeping bulk-edits. The agent stops and waits for an explicit yes/no.

export const requestDestructiveConfirmationToolDef = tool(
  async ({
    action,
    question,
    summary,
    affectedCount,
  }: {
    action: "delete" | "bulk_delete" | "bulk_edit";
    question: string;
    summary: string;
    affectedCount: number;
  }): Promise<string> => {
    const payload: ConfirmDestructiveInterrupt = {
      kind: "confirm_destructive",
      action,
      question,
      summary,
      affectedCount,
    };

    const resume = interrupt(payload) as ConfirmResume;
    return JSON.stringify({ approved: !!resume?.approved });
  },
  {
    name: "request_destructive_confirmation",
    description:
      "Pause and ask the user to confirm an irreversible action (delete one or many transactions, sweeping bulk edits). Returns {approved: true|false}. Do not proceed if approved is false.",
    schema: z.object({
      action: z.enum(["delete", "bulk_delete", "bulk_edit"]),
      question: z.string().describe("Short yes/no question"),
      summary: z.string().describe("One-line description of the exact change, with amounts and category"),
      affectedCount: z.number().min(1),
    }),
  }
);

// ─── Tool: request_large_amount_confirmation ───────────────────────────────────
//
//  Trip-wire for fat-finger errors on large transactions. The agent should call
//  this before add_transaction whenever the amount is unusually high (≥ ₹10,000)
//  or when the user typed an amount with no decimal that could be misparsed.

export const requestLargeAmountConfirmationToolDef = tool(
  async ({
    amount,
    type,
    category,
    date,
    question,
  }: {
    amount: number;
    type: "income" | "expense";
    category: string;
    date: string;
    question: string;
  }): Promise<string> => {
    const payload: ConfirmLargeAmountInterrupt = {
      kind: "confirm_large_amount",
      question,
      amount,
      type,
      category,
      date,
    };

    const resume = interrupt(payload) as ConfirmResume;
    return JSON.stringify({ approved: !!resume?.approved });
  },
  {
    name: "request_large_amount_confirmation",
    description:
      "Use before adding a transaction of ₹10,000 or more, or when an amount looks like a possible typo. Returns {approved: true|false}. Do not add that transaction if approved is false.",
    schema: z.object({
      amount: z.number().min(1),
      type: z.enum(["income", "expense"]),
      category: z.string(),
      date: z.string().describe("YYYY-MM-DD"),
      question: z.string().describe("Short confirmation question"),
    }),
  }
);

export const hitlTools = [
  requestTransactionSelectionToolDef,
  requestDestructiveConfirmationToolDef,
  requestLargeAmountConfirmationToolDef,
];

export const HITL_TOOL_NAMES = new Set(hitlTools.map((t) => t.name));
