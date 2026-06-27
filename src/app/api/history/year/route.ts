import { getAuthUser } from "@/utils/supabase/auth";
import { createAdminClient } from "@/utils/supabase/admin";

export async function GET(req: Request) {
  const user = await getAuthUser();
  if (!user) return new Response("Unauthorized", { status: 401 });
  const userId = user.id;

  const { searchParams } = new URL(req.url);
  const year = searchParams.get("year");
  if (!year) return new Response("valid year is required", { status: 400 });

  const db = createAdminClient();
  const { data, error } = await db
    .from("year_history")
    .select("month, income, expense")
    .eq("user_id", userId)
    .eq("year", Number(year))
    .order("month");

  if (error) {
    console.error("[GET /api/history/year]", error);
    return new Response("Internal Server Error", { status: 500 });
  }

  return Response.json({
    year,
    months: (data ?? []).map((row) => ({
      month: row.month,
      income: Number(row.income),
      expense: Number(row.expense),
    })),
  });
}
