import type {
  InterruptPayload,
  InterruptResume,
  TransactionCandidate,
  DisambiguateInterrupt,
  ConfirmDestructiveInterrupt,
  ConfirmLargeAmountInterrupt,
  DisambiguateResume,
  ConfirmResume,
} from "@/lib/langgraph";

// Re-export the server-defined HITL types so client-only code never has to
// reach into the langgraph package directly.
export type {
  InterruptPayload,
  InterruptResume,
  TransactionCandidate,
  DisambiguateInterrupt,
  ConfirmDestructiveInterrupt,
  ConfirmLargeAmountInterrupt,
  DisambiguateResume,
  ConfirmResume,
};

// ─── Chat-domain types (client) ────────────────────────────────────────────────

// Structured table payload rendered natively (mirror of server render.ts).
export interface DataTablePayload {
  title: string;
  columns: string[];
  rows: (string | number)[][];
}

export interface Message {
  role: "user" | "ai";
  content: string;
  isStreaming?: boolean;
  toolsUsed?: string[];
  table?: DataTablePayload;           // structured table from the render fast-path
  interrupt?: InterruptPayload;       // pending HITL prompt attached to the bubble
  interruptResolved?: boolean;        // user already answered this prompt
}

export interface ActivityItem {
  id: string;
  label: string;
  status: "active" | "done";
}

// ─── SSE event shape (mirror of server contract) ───────────────────────────────

export type SSEEvent =
  | { type: "token"; content: string }
  | { type: "data"; table: DataTablePayload }
  | { type: "tool_start"; tool: string }
  | { type: "tool_end"; tool: string }
  | { type: "status"; step: string; label: string }
  | { type: "usage"; inputTokens: number; outputTokens: number; cost: number }
  | { type: "summary"; summary: string; summarizedCount: number }
  | { type: "interrupt"; threadId: string; payload: InterruptPayload }
  | { type: "done" }
  | { type: "error"; message: string };

// ─── Shared display constants ──────────────────────────────────────────────────

export const TOOL_STATUS_LABELS: Record<string, string> = {
  add_transactions: "Adding transactions...",
  list_transactions: "Fetching transactions...",
  edit_transaction: "Editing transaction...",
  get_report: "Analyzing spending...",
  budget: "Working on budgets...",
  create_recurring_transaction: "Scheduling recurring...",
  request_transaction_selection: "Waiting for your selection...",
  request_destructive_confirmation: "Waiting for your confirmation...",
  request_large_amount_confirmation: "Waiting for your confirmation...",
};

export const MUTATING_TOOLS = new Set([
  "add_transactions",
  "edit_transaction",
  "budget",
]);

export interface UsageInfo {
  inputTokens: number;
  outputTokens: number;
  cost: number;
}
