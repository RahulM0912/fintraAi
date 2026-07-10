import { getAuthUser } from "@/utils/supabase/auth";
import { createAdminClient } from "@/utils/supabase/admin";
import { getInsightsData } from "@/lib/server/dashboardData";
export const dynamic = "force-dynamic";

// Deterministic dashboard insight — no LLM cost. Logic lives in
// lib/server/dashboardData so /api/dashboard can compose it.

export async function GET() {
  const user = await getAuthUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  try {
    const data = await getInsightsData(createAdminClient(), user.id);
    return Response.json(data);
  } catch (error) {
    console.error("[GET /api/insights]", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
