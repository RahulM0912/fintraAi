import { getAuthUser } from "@/utils/supabase/auth";
import { createAdminClient } from "@/utils/supabase/admin";
import { getTrendsData } from "@/lib/server/dashboardData";
export const dynamic = "force-dynamic";

// Rolling income/expense trend for the dashboard chart. Logic lives in
// lib/server/dashboardData so /api/dashboard can compose it.

export async function GET(req: Request) {
  const user = await getAuthUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const { searchParams } = new URL(req.url);
  const months = Number(searchParams.get("months") ?? 6);

  try {
    const data = await getTrendsData(createAdminClient(), user.id, months);
    return Response.json(data);
  } catch (error) {
    console.error("[GET /api/trends]", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
