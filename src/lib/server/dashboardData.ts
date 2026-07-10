import { createAdminClient } from "@/utils/supabase/admin";

// ─── Shared dashboard data loaders ──────────────────────────────────────────────
//
// Each loader takes an admin client + userId and returns plain JSON. The
// individual API routes (/api/summary, /api/insights, /api/trends, /api/budgets)
// delegate here, and /api/dashboard composes all of them behind a single auth
// check so the dashboard costs one request instead of seven.

type Db = ReturnType<typeof createAdminClient>;

const pad = (n: number) => String(n).padStart(2, "0");

function ymd(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function inr(n: number) {
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}

// ─── Summary (totals + category breakdown for a date range) ─────────────────────

export interface CategoryBreakdown {
  categoryId: string;
  name: string;
  icon: string;
  totalAmount: number;
  percentage: number;
}

export interface SummaryData {
  total: { totalIncome: number; totalExpense: number; netBalance: number };
  incomeByCategory: CategoryBreakdown[];
  expenseByCategory: CategoryBreakdown[];
}

export async function getSummaryData(
  db: Db,
  userId: string,
  startDate: string,
  endDate: string
): Promise<SummaryData> {
  const { data: transactions, error } = await db
    .from("transactions")
    .select("type, amount, categories(id, name, icon)")
    .eq("user_id", userId)
    .gte("date", startDate.split("T")[0])
    .lte("date", endDate.split("T")[0]);

  if (error) throw error;

  const totalIncome = (transactions ?? [])
    .filter((t) => t.type === "income")
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const totalExpense = (transactions ?? [])
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + Number(t.amount), 0);

  function aggregateByCategory(type: "income" | "expense"): CategoryBreakdown[] {
    const total = type === "income" ? totalIncome : totalExpense;
    const map = new Map<string, { id: string; name: string; icon: string; total: number }>();
    (transactions ?? [])
      .filter((t) => t.type === type)
      .forEach((t) => {
        const rawCat = t.categories as
          | { id: string; name: string; icon: string }
          | { id: string; name: string; icon: string }[]
          | null;
        const cat = Array.isArray(rawCat) ? rawCat[0] ?? null : rawCat;
        if (!cat) return;
        const existing = map.get(cat.id);
        if (existing) existing.total += Number(t.amount);
        else map.set(cat.id, { id: cat.id, name: cat.name, icon: cat.icon, total: Number(t.amount) });
      });
    return Array.from(map.values())
      .sort((a, b) => b.total - a.total)
      .map((c) => ({
        categoryId: c.id,
        name: c.name,
        icon: c.icon,
        totalAmount: c.total,
        percentage: total > 0 ? Math.round((c.total / total) * 100) : 0,
      }));
  }

  return {
    total: { totalIncome, totalExpense, netBalance: totalIncome - totalExpense },
    incomeByCategory: aggregateByCategory("income"),
    expenseByCategory: aggregateByCategory("expense"),
  };
}

// ─── Insights (deterministic briefing signal) ───────────────────────────────────

type Tone = "warning" | "caution" | "tip" | "positive" | "note";

export interface Insight {
  tone: Tone;
  title: string;
  detail: string;
  /** Optional headline metric, e.g. "+22%". */
  metric?: string;
}

export interface Stat {
  label: string;
  value: string;
  tone: "pos" | "neg" | "neutral";
}

export interface InsightsData {
  month: string;
  hasData: boolean;
  primary: Insight | null;
  stats: Stat[];
}

interface Txn {
  type: "income" | "expense";
  amount: number;
  date: string;
  category: string;
}

export async function getInsightsData(db: Db, userId: string): Promise<InsightsData> {
  const now = new Date();
  const day = now.getDate();
  const curStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevEnd = new Date(now.getFullYear(), now.getMonth(), 0); // last day prev month

  const [{ data: txData, error: txErr }, { data: budgets, error: bErr }] =
    await Promise.all([
      db
        .from("transactions")
        .select("type, amount, date, categories(name)")
        .eq("user_id", userId)
        .gte("date", ymd(prevStart))
        .lte("date", ymd(new Date(now.getFullYear(), now.getMonth() + 1, 0))),
      db
        .from("budgets")
        .select("amount, category_id, categories(name)")
        .eq("user_id", userId),
    ]);

  if (txErr || bErr) throw txErr ?? bErr;

  const txns: Txn[] = (txData ?? []).map((t: any) => {
    const cat = Array.isArray(t.categories) ? t.categories[0] : t.categories;
    return {
      type: t.type,
      amount: Number(t.amount),
      date: String(t.date).split("T")[0],
      category: cat?.name ?? "Uncategorized",
    };
  });

  const curStr = ymd(curStart);
  const prevStr = ymd(prevStart);
  const prevEndStr = ymd(prevEnd);
  // Same day-of-month cutoff in the previous month for a fair MTD comparison.
  const prevCutoff = `${prevStart.getFullYear()}-${pad(prevStart.getMonth() + 1)}-${pad(day)}`;

  let curIncome = 0;
  let curExpense = 0;
  let prevExpenseMTD = 0;
  const curCatExpense = new Map<string, number>();

  for (const t of txns) {
    const inCur = t.date >= curStr;
    const inPrev = t.date >= prevStr && t.date <= prevEndStr;
    if (inCur) {
      if (t.type === "income") curIncome += t.amount;
      else {
        curExpense += t.amount;
        curCatExpense.set(t.category, (curCatExpense.get(t.category) ?? 0) + t.amount);
      }
    } else if (inPrev && t.type === "expense" && t.date <= prevCutoff) {
      prevExpenseMTD += t.amount;
    }
  }

  const hasData = txns.some((t) => t.date >= curStr);
  const topCat = [...curCatExpense.entries()].sort((a, b) => b[1] - a[1])[0] ?? null;
  const savingsRate = curIncome > 0 ? (curIncome - curExpense) / curIncome : null;

  // ── Stat chips ─────────────────────────────────────────────────────────────
  const stats: Stat[] = [];
  if (savingsRate !== null) {
    stats.push({
      label: "Saved",
      value: `${Math.round(savingsRate * 100)}%`,
      tone: savingsRate >= 0.2 ? "pos" : savingsRate < 0 ? "neg" : "neutral",
    });
  }
  if (topCat) {
    stats.push({ label: `Top: ${topCat[0]}`, value: inr(topCat[1]), tone: "neutral" });
  }

  // ── Ranked insight candidates ───────────────────────────────────────────────
  const candidates: Insight[] = [];

  // 1. Budget breach (any category over 100%).
  const expenseByBudgetCat = new Map<string, number>();
  for (const t of txns) {
    if (t.type === "expense" && t.date >= curStr)
      expenseByBudgetCat.set(t.category, (expenseByBudgetCat.get(t.category) ?? 0) + t.amount);
  }
  let overBudget: { name: string; pct: number; over: number } | null = null;
  let nearBudget: { name: string; pct: number } | null = null;
  for (const b of budgets ?? []) {
    const cat = Array.isArray(b.categories) ? b.categories[0] : b.categories;
    const name = (cat as any)?.name as string | undefined;
    const amount = Number(b.amount);
    if (amount <= 0) continue;
    const spent = name ? expenseByBudgetCat.get(name) ?? 0 : curExpense; // null cat = overall
    const pct = Math.round((spent / amount) * 100);
    const label = name ?? "your overall budget";
    if (pct >= 100 && (!overBudget || pct > overBudget.pct))
      overBudget = { name: label, pct, over: spent - amount };
    else if (pct >= 80 && (!nearBudget || pct > nearBudget.pct))
      nearBudget = { name: label, pct };
  }
  if (overBudget) {
    candidates.push({
      tone: "warning",
      title: `Over budget on ${overBudget.name}`,
      detail: `You're ${inr(overBudget.over)} past your ${overBudget.name} budget — ${overBudget.pct}% of the cap with the month still going.`,
      metric: `${overBudget.pct}%`,
    });
  }

  // 2. Expense spike vs same point last month.
  if (prevExpenseMTD > 0 && curExpense > 0) {
    const delta = (curExpense - prevExpenseMTD) / prevExpenseMTD;
    if (delta >= 0.2) {
      candidates.push({
        tone: "warning",
        title: "Spending is up this month",
        detail: `You've spent ${Math.round(delta * 100)}% more than by this day last month (${inr(curExpense)} vs ${inr(prevExpenseMTD)}). ${topCat ? `${topCat[0]} is your biggest line.` : ""}`.trim(),
        metric: `+${Math.round(delta * 100)}%`,
      });
    } else if (delta <= -0.15) {
      candidates.push({
        tone: "tip",
        title: "Spending is down — nice",
        detail: `You're ${Math.round(Math.abs(delta) * 100)}% below where you were by this day last month (${inr(curExpense)} vs ${inr(prevExpenseMTD)}). Keep it up.`,
        metric: `${Math.round(delta * 100)}%`,
      });
    }
  }

  // 3. Budget nearing.
  if (nearBudget) {
    candidates.push({
      tone: "caution",
      title: `Close to your ${nearBudget.name} budget`,
      detail: `You're at ${nearBudget.pct}% of your ${nearBudget.name} budget. Ease off to stay under.`,
      metric: `${nearBudget.pct}%`,
    });
  }

  // 4. Savings rate signal.
  if (savingsRate !== null) {
    if (savingsRate >= 0.3) {
      candidates.push({
        tone: "positive",
        title: "You're saving well",
        detail: `You've kept ${Math.round(savingsRate * 100)}% of your income this month (${inr(curIncome - curExpense)} of ${inr(curIncome)}). Strong month.`,
        metric: `${Math.round(savingsRate * 100)}%`,
      });
    } else if (savingsRate < 0) {
      candidates.push({
        tone: "warning",
        title: "Spending more than you earned",
        detail: `Expenses (${inr(curExpense)}) have passed income (${inr(curIncome)}) this month. Worth a look before month-end.`,
        metric: `-${inr(curExpense - curIncome)}`,
      });
    }
  }

  // 5. Fallback — top category.
  if (topCat) {
    candidates.push({
      tone: "note",
      title: `${topCat[0]} leads your spending`,
      detail: `${inr(topCat[1])} on ${topCat[0]} so far this month${curExpense > 0 ? ` — ${Math.round((topCat[1] / curExpense) * 100)}% of all spending.` : "."}`,
    });
  }

  return {
    month: `${now.getFullYear()}-${pad(now.getMonth() + 1)}`,
    hasData,
    primary: hasData ? candidates[0] ?? null : null,
    stats,
  };
}

// ─── Trends (rolling monthly income/expense from year_history) ──────────────────

const MONTH_LABELS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

export interface TrendPoint {
  year: number;
  month: number;
  label: string;
  income: number;
  expense: number;
  net: number;
}

export interface TrendsData {
  months: number;
  points: TrendPoint[];
}

export async function getTrendsData(
  db: Db,
  userId: string,
  monthsParam: number
): Promise<TrendsData> {
  const months = Math.min(Math.max(monthsParam, 2), 24);

  // Build the ordered window of {year, month} ending this month.
  const now = new Date();
  const window: { year: number; month: number }[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    window.push({ year: d.getFullYear(), month: d.getMonth() + 1 });
  }

  const years = Array.from(new Set(window.map((w) => w.year)));

  const { data, error } = await db
    .from("year_history")
    .select("year, month, income, expense")
    .eq("user_id", userId)
    .in("year", years);

  if (error) throw error;

  const byKey = new Map<string, { income: number; expense: number }>();
  for (const row of data ?? []) {
    byKey.set(`${row.year}-${row.month}`, {
      income: Number(row.income),
      expense: Number(row.expense),
    });
  }

  const points = window.map(({ year, month }) => {
    const hit = byKey.get(`${year}-${month}`);
    return {
      year,
      month,
      label: MONTH_LABELS[month - 1],
      income: hit?.income ?? 0,
      expense: hit?.expense ?? 0,
      net: (hit?.income ?? 0) - (hit?.expense ?? 0),
    };
  });

  return { months, points };
}

// ─── Budgets (current month, spent + percentage computed) ───────────────────────

export interface BudgetItem {
  id: string;
  categoryId: string;
  categoryName: string;
  categoryIcon: string;
  amount: number;
  spent: number;
  percentage: number;
}

export interface BudgetsData {
  month: string;
  overall: { id: string; amount: number; spent: number; percentage: number } | null;
  items: BudgetItem[];
  totalExpense: number;
}

// First and last day (YYYY-MM-DD) of the current month, server-local.
function currentMonthRange() {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const start = `${y}-${pad(m + 1)}-01`;
  const lastDay = new Date(y, m + 1, 0).getDate();
  const end = `${y}-${pad(m + 1)}-${pad(lastDay)}`;
  return { start, end, label: `${y}-${pad(m + 1)}` };
}

export async function getBudgetsData(db: Db, userId: string): Promise<BudgetsData> {
  const { start, end, label } = currentMonthRange();

  const [{ data: budgets, error: bErr }, { data: txns, error: tErr }] =
    await Promise.all([
      db
        .from("budgets")
        .select("id, category_id, amount, categories(id, name, icon)")
        .eq("user_id", userId),
      db
        .from("transactions")
        .select("amount, category_id")
        .eq("user_id", userId)
        .eq("type", "expense")
        .gte("date", start)
        .lte("date", end),
    ]);

  if (bErr || tErr) throw bErr ?? tErr;

  const rows = txns ?? [];
  const spentByCategory = new Map<string, number>();
  let totalExpense = 0;
  for (const t of rows) {
    const amt = Number(t.amount);
    totalExpense += amt;
    if (t.category_id)
      spentByCategory.set(t.category_id, (spentByCategory.get(t.category_id) ?? 0) + amt);
  }

  const pct = (spent: number, amount: number) =>
    amount > 0 ? Math.round((spent / amount) * 100) : 0;

  let overall: BudgetsData["overall"] = null;
  const items: BudgetItem[] = [];

  for (const b of budgets ?? []) {
    const amount = Number(b.amount);
    if (!b.category_id) {
      overall = { id: b.id, amount, spent: totalExpense, percentage: pct(totalExpense, amount) };
      continue;
    }
    const cat = Array.isArray(b.categories) ? b.categories[0] : b.categories;
    const spent = spentByCategory.get(b.category_id) ?? 0;
    items.push({
      id: b.id,
      categoryId: b.category_id,
      categoryName: (cat as any)?.name ?? "Unknown",
      categoryIcon: (cat as any)?.icon ?? "",
      amount,
      spent,
      percentage: pct(spent, amount),
    });
  }

  items.sort((a, b) => b.percentage - a.percentage);

  return { month: label, overall, items, totalExpense };
}

// ─── Recent transactions (latest N, same shape as GET /api/transactions) ────────

export interface RecentTransaction {
  id: string;
  date: string;
  type: "income" | "expense";
  amount: number;
  description: string | null;
  category: { id: string; name: string; icon: string } | null;
}

export async function getRecentTransactionsData(
  db: Db,
  userId: string,
  limit = 7
): Promise<RecentTransaction[]> {
  const { data, error } = await db
    .from("transactions")
    .select("id, date, type, amount, description, categories(id, name, icon)")
    .eq("user_id", userId)
    .order("date", { ascending: false })
    .range(0, limit - 1);

  if (error) throw error;

  return (data ?? []).map((row: any) => ({
    id: row.id,
    date: row.date,
    type: row.type,
    amount: Number(row.amount),
    description: row.description,
    category: row.categories
      ? { id: row.categories.id, name: row.categories.name, icon: row.categories.icon }
      : null,
  }));
}
