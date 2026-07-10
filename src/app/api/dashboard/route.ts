import { getAuthUser } from "@/utils/supabase/auth";
import { createAdminClient } from "@/utils/supabase/admin";
import {
  getSummaryData,
  getInsightsData,
  getTrendsData,
  getBudgetsData,
  getRecentTransactionsData,
} from "@/lib/server/dashboardData";
export const dynamic = "force-dynamic";

// Everything the dashboard needs in one request: one auth round-trip, the five
// data loads in parallel server-side. Trends always come back as 12 months —
// the 6M/12M toggle slices client-side instead of refetching.

export async function GET() {
  const user = await getAuthUser();
  if (!user) return new Response("Unauthorized", { status: 401 });
  const userId = user.id;

  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  const db = createAdminClient();

  try {
    const [summary, insights, trends, budgets, recent] = await Promise.all([
      getSummaryData(db, userId, start.toISOString(), end.toISOString()),
      getInsightsData(db, userId),
      getTrendsData(db, userId, 12),
      getBudgetsData(db, userId),
      getRecentTransactionsData(db, userId, 7),
    ]);

    return Response.json({ summary, insights, trends, budgets, recent });
  } catch (error) {
    console.error("[GET /api/dashboard]", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
