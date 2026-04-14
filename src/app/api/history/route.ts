import { auth } from "@clerk/nextjs/server";
import { createAdminClient } from "@/utils/supabase/admin";

export async function GET(req: Request) {
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const { searchParams } = new URL(req.url);
  const year = searchParams.get("year");
  const month = searchParams.get("month");

  if (!year || !month || Number(month) < 1 || Number(month) > 12) {
    return new Response("valid year and month are required", { status: 400 });
  }

  const db = createAdminClient();
  const { data, error } = await db
    .from("month_history")
    .select("day, income, expense")
    .eq("user_id", userId)
    .eq("month", Number(month))
    .eq("year", Number(year))
    .order("day");

  if (error) {
    console.error("[GET /api/history]", error);
    return new Response("Internal Server Error", { status: 500 });
  }

  return Response.json({
    year,
    month,
    days: (data ?? []).map((row) => ({
      day: row.day,
      income: Number(row.income),
      expense: Number(row.expense),
    })),
  });
}
