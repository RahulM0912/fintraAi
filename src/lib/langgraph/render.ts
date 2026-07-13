// ─── Deterministic render path for read tools ──────────────────────────────────
//
// Phase B of docs/agent-improvement-plan.md: when a turn is a pure single read
// tool call, the answer is fully determined by the tool result — the client can
// render the table natively and no second LLM call is needed. These builders
// turn a tool's JSON result into a headline + structured table. Returning null
// means "shape not understood, fall back to the agent" — never guess.

export interface DataTablePayload {
  title: string;
  columns: string[];
  rows: (string | number)[][];
}

export interface DataView {
  headline: string;
  table?: DataTablePayload;
}

// Read tools whose results can be rendered without model prose. The fast-path
// additionally requires the call to be marked purpose === "display" (afterTools).
export const RENDERABLE_READ_TOOLS = new Set([
  "list_transactions",
  "get_report",
  "budget",
]);

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

const rupee = (n: number) => `₹${Number(n).toLocaleString("en-IN")}`;

function parse(json: string): Record<string, unknown> | null {
  try {
    const v = JSON.parse(json);
    return v && typeof v === "object" ? (v as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

// ─── list_transactions ──────────────────────────────────────────────────────────

interface TxRow {
  date?: string;
  type?: string;
  amount?: number;
  category?: string;
  description?: string | null;
}

function listTransactionsView(j: Record<string, unknown>): DataView | null {
  const txs = j.transactions;
  if (!Array.isArray(txs)) return null;

  if (txs.length === 0) {
    return { headline: "No transactions found for that." };
  }

  let expense = 0;
  let income = 0;
  const rows = (txs as TxRow[]).map((t) => {
    const amt = Number(t.amount ?? 0);
    if (t.type === "income") income += amt;
    else expense += amt;
    return [
      t.date ?? "—",
      t.category ?? "—",
      t.description || "—",
      `${t.type === "income" ? "+" : ""}${rupee(amt)}`,
    ];
  });

  const parts: string[] = [];
  if (expense > 0) parts.push(`${rupee(expense)} spent`);
  if (income > 0) parts.push(`${rupee(income)} received`);
  const headline = `${txs.length} transaction${txs.length === 1 ? "" : "s"}${
    parts.length ? ` — ${parts.join(", ")}` : ""
  }.`;

  return {
    headline,
    table: {
      title: "Transactions",
      columns: ["Date", "Category", "Note", "Amount"],
      rows,
    },
  };
}

// ─── get_spending_summary ────────────────────────────────────────────────────────

function spendingSummaryView(j: Record<string, unknown>): DataView | null {
  if (typeof j.totalExpense !== "number" || typeof j.totalIncome !== "number") return null;

  const cats = Array.isArray(j.topExpenseCategories) ? j.topExpenseCategories : [];
  const headline = `${j.period}: spent ${rupee(j.totalExpense)}, earned ${rupee(
    j.totalIncome
  )} — net ${rupee(Number(j.netBalance ?? j.totalIncome - j.totalExpense))}${
    typeof j.savingsRate === "number" && j.totalIncome > 0
      ? ` (savings rate ${j.savingsRate}%)`
      : ""
  }.`;

  if (cats.length === 0) return { headline };

  return {
    headline,
    table: {
      title: "Spending by category",
      columns: ["Category", "Amount", "Share"],
      rows: (cats as { name?: string; amount?: number; percentage?: number }[]).map((c) => [
        c.name ?? "—",
        rupee(Number(c.amount ?? 0)),
        `${c.percentage ?? 0}%`,
      ]),
    },
  };
}

// ─── get_history ─────────────────────────────────────────────────────────────────

function historyView(j: Record<string, unknown>): DataView | null {
  if (j.scope === "month" && Array.isArray(j.days)) {
    const days = j.days as { day?: number; income?: number; expense?: number; net?: number }[];
    const headline = `${MONTHS[Number(j.month) - 1] ?? j.month} ${j.year}: spent ${rupee(
      Number(j.totalExpense ?? 0)
    )}, earned ${rupee(Number(j.totalIncome ?? 0))} — net ${rupee(Number(j.netBalance ?? 0))}.`;
    if (days.length === 0) return { headline: headline.replace(".", " — no activity recorded.") };
    return {
      headline,
      table: {
        title: "Daily breakdown",
        columns: ["Day", "Income", "Expense", "Net"],
        rows: days.map((d) => [
          d.day ?? "—",
          rupee(Number(d.income ?? 0)),
          rupee(Number(d.expense ?? 0)),
          rupee(Number(d.net ?? 0)),
        ]),
      },
    };
  }

  if (j.scope === "year" && Array.isArray(j.months)) {
    const months = j.months as { month?: number; income?: number; expense?: number; net?: number }[];
    const headline = `${j.year}: spent ${rupee(Number(j.totalExpense ?? 0))}, earned ${rupee(
      Number(j.totalIncome ?? 0)
    )} — net ${rupee(Number(j.netBalance ?? 0))}.`;
    if (months.length === 0) return { headline: headline.replace(".", " — no activity recorded.") };
    return {
      headline,
      table: {
        title: "Monthly breakdown",
        columns: ["Month", "Income", "Expense", "Net"],
        rows: months.map((m) => [
          MONTHS[Number(m.month) - 1] ?? String(m.month),
          rupee(Number(m.income ?? 0)),
          rupee(Number(m.expense ?? 0)),
          rupee(Number(m.net ?? 0)),
        ]),
      },
    };
  }

  return null;
}

// ─── get_budget_status ───────────────────────────────────────────────────────────

function budgetStatusView(j: Record<string, unknown>): DataView | null {
  if (typeof j.month !== "string") return null;

  if (j.hasBudgets === false) {
    return {
      headline: `No budgets set yet — ${rupee(Number(j.totalExpense ?? 0))} spent in ${j.month}.`,
    };
  }

  const rows: (string | number)[][] = [];
  const overall = j.overall as
    | { amount?: number; spent?: number; remaining?: number; percentage?: number }
    | null
    | undefined;
  if (overall) {
    rows.push([
      "Overall",
      rupee(Number(overall.amount ?? 0)),
      rupee(Number(overall.spent ?? 0)),
      rupee(Number(overall.remaining ?? 0)),
      `${overall.percentage ?? 0}%`,
    ]);
  }
  const cats = Array.isArray(j.categories) ? j.categories : [];
  for (const c of cats as {
    category?: string;
    amount?: number;
    spent?: number;
    remaining?: number;
    percentage?: number;
  }[]) {
    rows.push([
      c.category ?? "—",
      rupee(Number(c.amount ?? 0)),
      rupee(Number(c.spent ?? 0)),
      rupee(Number(c.remaining ?? 0)),
      `${c.percentage ?? 0}%`,
    ]);
  }
  if (rows.length === 0) return null;

  const worst = [...(cats as { percentage?: number }[]), ...(overall ? [overall] : [])].sort(
    (a, b) => Number(b.percentage ?? 0) - Number(a.percentage ?? 0)
  )[0];
  const flag =
    worst && Number(worst.percentage ?? 0) >= 80
      ? ` Highest usage is at ${worst.percentage}% — watch it.`
      : "";

  return {
    headline: `Budgets for ${j.month}.${flag}`,
    table: {
      title: `Budgets — ${j.month}`,
      columns: ["Budget", "Cap", "Spent", "Remaining", "Used"],
      rows,
    },
  };
}

// ─── Dispatcher ──────────────────────────────────────────────────────────────────

export function buildDataView(toolName: string, resultJson: unknown): DataView | null {
  if (typeof resultJson !== "string") return null;
  const j = parse(resultJson);
  if (!j) return null;

  switch (toolName) {
    case "list_transactions":
      return listTransactionsView(j);
    case "get_report":
      // scope "range" → summary shape; "month"/"year" → history shapes.
      return j.scope === "range" ? spendingSummaryView(j) : historyView(j);
    case "budget":
      // Only the action:"status" result matches this shape; a "set" result
      // returns null here and the confirm fast-path handles it instead.
      return budgetStatusView(j);
    default:
      return null;
  }
}
