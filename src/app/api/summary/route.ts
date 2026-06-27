import { getAuthUser } from "@/utils/supabase/auth";
import { createAdminClient } from "@/utils/supabase/admin";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const user = await getAuthUser();
  if (!user) return new Response("Unauthorized", { status: 401 });
  const userId = user.id;

  const { searchParams } = new URL(req.url);
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");

  if (!startDate || !endDate) {
    return new Response("startDate and endDate are required", { status: 400 });
  }

  const db = createAdminClient();

  const { data: transactions, error } = await db
    .from("transactions")
    .select("type, amount, categories(id, name, icon)")
    .eq("user_id", userId)
    .gte("date", startDate.split("T")[0])
    .lte("date", endDate.split("T")[0]);

  if (error) {
    console.error("[GET /api/summary]", error);
    return new Response("Internal Server Error", { status: 500 });
  }

  const totalIncome = (transactions ?? [])
    .filter((t) => t.type === "income")
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const totalExpense = (transactions ?? [])
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const netBalance = totalIncome - totalExpense;

  function aggregateByCategory(type: "income" | "expense") {
    const total = type === "income" ? totalIncome : totalExpense;
    const map = new Map<string, { id: string; name: string; icon: string; total: number }>();
    (transactions ?? [])
      .filter((t) => t.type === type)
      .forEach((t) => {
        const rawCat = t.categories as { id: string; name: string; icon: string } | { id: string; name: string; icon: string }[] | null;
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

  return Response.json({
    total: { totalIncome, totalExpense, netBalance },
    incomeByCategory: aggregateByCategory("income"),
    expenseByCategory: aggregateByCategory("expense"),
  });
}
