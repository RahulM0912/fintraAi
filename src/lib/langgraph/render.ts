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

// Chart payloads are data-only: the client owns colors, sizes and marks (theme
// tokens don't exist server-side). `kind` picks the renderer. The model can
// steer `style` via the get_report `chart` param; the data shape stays the
// heuristic fallback.
export type ChartStyle = "bar" | "line" | "area";

export type ChartPayload =
  | {
      kind: "series";
      unit: "day" | "month";
      style: ChartStyle;
      title: string;
      points: { label: string; income: number; expense: number }[];
    }
  | {
      kind: "shares";
      title: string;
      items: { name: string; amount: number; pct: number }[];
    }
  | {
      kind: "progress";
      title: string;
      items: { name: string; cap: number; spent: number; pct: number }[];
    };

// The model's chart hint, straight from tool-call args — validated, never trusted.
function seriesStyle(hint: string | undefined, fallback: ChartStyle): ChartStyle {
  return hint === "bar" || hint === "line" || hint === "area" ? hint : fallback;
}

export interface DataView {
  headline: string;
  /** 0–2 short computed facts shown under the headline — derived, never generated. */
  facts?: string[];
  table?: DataTablePayload;
  chart?: ChartPayload;
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
const signedRupee = (n: number) => `${n < 0 ? "−" : "+"}${rupee(Math.abs(n))}`;

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
    parts.length ? ` — **${parts.join(", ")}**` : ""
  }.`;

  // No chart: a list of individual records is a table; charting it invents
  // structure. One computed fact instead.
  const facts: string[] = [];
  if (txs.length > 1) {
    const largest = (txs as TxRow[]).reduce((a, b) =>
      Number(b.amount ?? 0) > Number(a.amount ?? 0) ? b : a
    );
    facts.push(
      `Largest: ${rupee(Number(largest.amount ?? 0))} (${largest.category ?? "—"}) on ${
        largest.date ?? "—"
      }`
    );
  }

  return {
    headline,
    facts: facts.length ? facts : undefined,
    table: {
      title: "Transactions",
      columns: ["Date", "Category", "Note", "Amount"],
      rows,
    },
  };
}

// ─── get_spending_summary ────────────────────────────────────────────────────────

function spendingSummaryView(j: Record<string, unknown>, hint?: string): DataView | null {
  if (typeof j.totalExpense !== "number" || typeof j.totalIncome !== "number") return null;

  const cats = Array.isArray(j.topExpenseCategories) ? j.topExpenseCategories : [];
  const headline = `${j.period}: spent ${rupee(j.totalExpense)}, earned ${rupee(
    j.totalIncome
  )} — net **${rupee(Number(j.netBalance ?? j.totalIncome - j.totalExpense))}**${
    typeof j.savingsRate === "number" && j.totalIncome > 0
      ? ` (savings rate ${j.savingsRate}%)`
      : ""
  }.`;

  if (cats.length === 0) return { headline };

  const catRows = cats as { name?: string; amount?: number; percentage?: number }[];
  const top = catRows[0];
  const facts =
    top && Number(top.percentage ?? 0) > 0
      ? [`${top.name ?? "—"} took ${top.percentage}% — top category`]
      : undefined;

  // Part-to-whole → ranked share bars; only worth drawing with 2+ categories.
  const chart: ChartPayload | undefined =
    catRows.length >= 2 && hint !== "none"
      ? {
          kind: "shares",
          title: "Where it went",
          items: catRows.map((c) => ({
            name: c.name ?? "—",
            amount: Number(c.amount ?? 0),
            pct: Number(c.percentage ?? 0),
          })),
        }
      : undefined;

  return {
    headline,
    facts,
    chart,
    table: {
      title: "Spending by category",
      columns: ["Category", "Amount", "Share"],
      rows: catRows.map((c) => [
        c.name ?? "—",
        rupee(Number(c.amount ?? 0)),
        `${c.percentage ?? 0}%`,
      ]),
    },
  };
}

// ─── get_history ─────────────────────────────────────────────────────────────────

function historyView(j: Record<string, unknown>, hint?: string): DataView | null {
  if (j.scope === "month" && Array.isArray(j.days)) {
    const days = j.days as { day?: number; income?: number; expense?: number; net?: number }[];
    const headline = `${MONTHS[Number(j.month) - 1] ?? j.month} ${j.year}: spent ${rupee(
      Number(j.totalExpense ?? 0)
    )}, earned ${rupee(Number(j.totalIncome ?? 0))} — net **${rupee(Number(j.netBalance ?? 0))}**.`;
    if (days.length === 0) return { headline: headline.replace(".", " — no activity recorded.") };

    const facts: string[] = [];
    const biggest = days.reduce((a, b) =>
      Number(b.expense ?? 0) > Number(a.expense ?? 0) ? b : a
    );
    if (Number(biggest.expense ?? 0) > 0) {
      const active = days.filter(
        (d) => Number(d.expense ?? 0) > 0 || Number(d.income ?? 0) > 0
      ).length;
      const avg = Math.round(Number(j.totalExpense ?? 0) / Math.max(active, 1));
      facts.push(
        `Biggest day: ${biggest.day} (${rupee(Number(biggest.expense ?? 0))}) · ${active} active day${
          active === 1 ? "" : "s"
        }, ~${rupee(avg)}/day`
      );
    }

    const hasActivity = days.some(
      (d) => Number(d.expense ?? 0) > 0 || Number(d.income ?? 0) > 0
    );
    // Fill the day axis 1..last-recorded-day so time reads honestly — four
    // recorded days must not become four equal bands.
    const maxDay = Math.max(...days.map((d) => Number(d.day ?? 0)));
    const byDay = new Map(days.map((d) => [Number(d.day ?? 0), d]));
    const points = Array.from({ length: maxDay }, (_, i) => {
      const d = byDay.get(i + 1);
      return {
        label: String(i + 1),
        income: Number(d?.income ?? 0),
        expense: Number(d?.expense ?? 0),
      };
    });
    const chart: ChartPayload | undefined =
      days.length >= 2 && hasActivity && hint !== "none"
        ? {
            kind: "series",
            unit: "day",
            style: seriesStyle(hint, "bar"),
            title: `Daily flow — ${MONTHS[Number(j.month) - 1] ?? j.month} ${j.year}`,
            points,
          }
        : undefined;

    return {
      headline,
      facts: facts.length ? facts : undefined,
      chart,
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
    )} — net **${rupee(Number(j.netBalance ?? 0))}**.`;
    if (months.length === 0) return { headline: headline.replace(".", " — no activity recorded.") };

    const facts: string[] = [];
    const active = months.filter(
      (m) => Number(m.expense ?? 0) > 0 || Number(m.income ?? 0) > 0
    );
    if (active.length >= 2) {
      const byNet = [...active].sort((a, b) => Number(b.net ?? 0) - Number(a.net ?? 0));
      const best = byNet[0];
      const worst = byNet[byNet.length - 1];
      const name = (m: { month?: number }) => MONTHS[Number(m.month) - 1] ?? String(m.month);
      facts.push(
        `Best month: ${name(best)} (${signedRupee(Number(best.net ?? 0))}) · toughest: ${name(
          worst
        )} (${signedRupee(Number(worst.net ?? 0))})`
      );
    }

    const chart: ChartPayload | undefined =
      active.length >= 2 && hint !== "none"
        ? {
            kind: "series",
            unit: "month",
            style: seriesStyle(hint, "line"),
            title: `Cash flow — ${j.year}`,
            points: months.map((m) => ({
              label: MONTHS[Number(m.month) - 1] ?? String(m.month),
              income: Number(m.income ?? 0),
              expense: Number(m.expense ?? 0),
            })),
          }
        : undefined;

    return {
      headline,
      facts: facts.length ? facts : undefined,
      chart,
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
      ? ` Highest usage is at **${worst.percentage}%** — watch it.`
      : "";

  // Usage-against-cap is inherently a progress bar.
  const progressItems: { name: string; cap: number; spent: number; pct: number }[] = [];
  if (overall) {
    progressItems.push({
      name: "Overall",
      cap: Number(overall.amount ?? 0),
      spent: Number(overall.spent ?? 0),
      pct: Number(overall.percentage ?? 0),
    });
  }
  for (const c of cats as {
    category?: string;
    amount?: number;
    spent?: number;
    percentage?: number;
  }[]) {
    progressItems.push({
      name: c.category ?? "—",
      cap: Number(c.amount ?? 0),
      spent: Number(c.spent ?? 0),
      pct: Number(c.percentage ?? 0),
    });
  }

  return {
    headline: `Budgets for ${j.month}.${flag}`,
    chart: progressItems.length
      ? { kind: "progress", title: `Budget usage — ${j.month}`, items: progressItems }
      : undefined,
    table: {
      title: `Budgets — ${j.month}`,
      columns: ["Budget", "Cap", "Spent", "Remaining", "Used"],
      rows,
    },
  };
}

// ─── Dispatcher ──────────────────────────────────────────────────────────────────

export function buildDataView(
  toolName: string,
  resultJson: unknown,
  chartHint?: string
): DataView | null {
  if (typeof resultJson !== "string") return null;
  const j = parse(resultJson);
  if (!j) return null;

  switch (toolName) {
    case "list_transactions":
      return listTransactionsView(j);
    case "get_report":
      // scope "range" → summary shape; "month"/"year" → history shapes.
      return j.scope === "range" ? spendingSummaryView(j, chartHint) : historyView(j, chartHint);
    case "budget":
      // Only the action:"status" result matches this shape; a "set" result
      // returns null here and the confirm fast-path handles it instead.
      return budgetStatusView(j);
    default:
      return null;
  }
}
