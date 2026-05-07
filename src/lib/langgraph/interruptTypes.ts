// ─── Interrupt payload contract ────────────────────────────────────────────────
//
//  When the agent calls a HITL tool, it raises an `interrupt(payload)` whose
//  shape is one of the variants below. The API layer forwards it to the client
//  verbatim as an `interrupt` SSE event. The client renders the matching UI,
//  collects the user's decision, and POSTs it back as an `InterruptResponse`,
//  which the API resumes the graph with via `Command({ resume })`.
//
//  Every variant has a `kind` discriminator so client-side renderers can switch
//  cleanly without inspecting other fields.

export interface TransactionCandidate {
  id: string;
  date: string;
  type: "income" | "expense";
  amount: number;
  category: string;
  description: string | null;
}

export type InterruptAction = "edit" | "delete";

export interface DisambiguateInterrupt {
  kind: "disambiguate_transaction";
  action: InterruptAction;
  question: string;
  candidates: TransactionCandidate[];
}

export interface ConfirmDestructiveInterrupt {
  kind: "confirm_destructive";
  action: "delete" | "bulk_delete" | "bulk_edit";
  question: string;
  summary: string;
  affectedCount: number;
}

export interface ConfirmLargeAmountInterrupt {
  kind: "confirm_large_amount";
  question: string;
  amount: number;
  type: "income" | "expense";
  category: string;
  date: string;
}

export type InterruptPayload =
  | DisambiguateInterrupt
  | ConfirmDestructiveInterrupt
  | ConfirmLargeAmountInterrupt;

// ─── Resume contract ───────────────────────────────────────────────────────────
//
//  What the client sends back to resume after an interrupt.

export interface DisambiguateResume {
  kind: "disambiguate_transaction";
  selectedId: string | null; // null = user cancelled
}

export interface ConfirmResume {
  kind: "confirm_destructive" | "confirm_large_amount";
  approved: boolean;
}

export type InterruptResume = DisambiguateResume | ConfirmResume;
