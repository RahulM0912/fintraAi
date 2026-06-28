import { getAuthUser } from "@/utils/supabase/auth";
import { createAdminClient } from "@/utils/supabase/admin";
export const dynamic = "force-dynamic";

// Deterministic dashboard insight — no LLM cost. Surfaces the single most
// salient thing about this month's money: an expense spike vs last month
// (prorated to the same day so a partial month is compared fairly), a budget
// breach, a strong/weak savings rate, or a fallback on the top category.

type Tone = "warning" | "caution" | "tip" | "positive" | "note";

interface Insight {
  tone: Tone;
  title: string;
  detail: string;
  /** Optional headline metric, e.g. "+22%". */
  metric?: string;
}

interface Stat {
  label: string;
  value: string;
  tone: "pos" | "neg" | "neutral";
}

const pad = (n: number) => String(n).padStart(2, "0");

function ymd(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function inr(n: number) {
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}

interface Txn {
  type: "income" | "expense";
  amount: number;
  date: string;
  category: string;
}

export async function GET() {
  const user = await getAuthUser();
  if (!user) return new Response("Unauthorized", { status: 401 });
  const userId = user.id;

  const now = new Date();
  const day = now.getDate();
  const curStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevEnd = new Date(now.getFullYear(), now.getMonth(), 0); // last day prev month

  const db = createAdminClient();
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

  if (txErr || bErr) {
    console.error("[GET /api/insights]", txErr ?? bErr);
    return new Response("Internal Server Error", { status: 500 });
  }

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

  const primary = hasData ? candidates[0] ?? null : null;

  return Response.json({
    month: `${now.getFullYear()}-${pad(now.getMonth() + 1)}`,
    hasData,
    primary,
    stats,
  });
}
