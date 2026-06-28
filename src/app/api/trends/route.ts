import { getAuthUser } from "@/utils/supabase/auth";
import { createAdminClient } from "@/utils/supabase/admin";
export const dynamic = "force-dynamic";

// Rolling income/expense trend for the dashboard chart.
// Reads the pre-aggregated `year_history` table (per month) and returns the
// last N months ending at the current month, with empty months filled as 0
// so the chart always has a continuous x-axis.

const MONTH_LABELS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

export async function GET(req: Request) {
  const user = await getAuthUser();
  if (!user) return new Response("Unauthorized", { status: 401 });
  const userId = user.id;

  const { searchParams } = new URL(req.url);
  const monthsParam = Number(searchParams.get("months") ?? 6);
  const months = Math.min(Math.max(monthsParam, 2), 24);

  // Build the ordered window of {year, month} ending this month.
  const now = new Date();
  const window: { year: number; month: number }[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    window.push({ year: d.getFullYear(), month: d.getMonth() + 1 });
  }

  const years = Array.from(new Set(window.map((w) => w.year)));

  const db = createAdminClient();
  const { data, error } = await db
    .from("year_history")
    .select("year, month, income, expense")
    .eq("user_id", userId)
    .in("year", years);

  if (error) {
    console.error("[GET /api/trends]", error);
    return new Response("Internal Server Error", { status: 500 });
  }

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

  return Response.json({ months, points });
}
