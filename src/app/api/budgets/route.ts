import { auth } from "@clerk/nextjs/server";
import { createAdminClient } from "@/utils/supabase/admin";
export const dynamic = "force-dynamic";

function unauthorized() {
  return new Response("Unauthorized", { status: 401 });
}

// First and last day (YYYY-MM-DD) of the current month, server-local.
function currentMonthRange() {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const pad = (n: number) => String(n).padStart(2, "0");
  const start = `${y}-${pad(m + 1)}-01`;
  const lastDay = new Date(y, m + 1, 0).getDate();
  const end = `${y}-${pad(m + 1)}-${pad(lastDay)}`;
  return { start, end, label: `${y}-${pad(m + 1)}` };
}

// GET — list budgets for the current month with spent + percentage computed.
export async function GET() {
  const { userId } = await auth();
  if (!userId) return unauthorized();

  const db = createAdminClient();
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

  if (bErr || tErr) {
    console.error("[GET /api/budgets]", bErr ?? tErr);
    return new Response("Internal Server Error", { status: 500 });
  }

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

  let overall: {
    id: string;
    amount: number;
    spent: number;
    percentage: number;
  } | null = null;
  const items: {
    id: string;
    categoryId: string;
    categoryName: string;
    categoryIcon: string;
    amount: number;
    spent: number;
    percentage: number;
  }[] = [];

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

  return Response.json({ month: label, overall, items, totalExpense });
}

// POST — create or update a budget. Body: { categoryId: string|null, amount: number }
export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return unauthorized();

  let body: any;
  try {
    body = await req.json();
  } catch {
    return new Response("Invalid JSON body", { status: 400 });
  }

  const categoryId: string | null = body.categoryId ?? null;
  const amount = Number(body.amount);

  if (!amount || amount <= 0) return new Response("Invalid amount", { status: 400 });

  const db = createAdminClient();

  if (categoryId) {
    const { data: cat, error: catErr } = await db
      .from("categories")
      .select("type")
      .eq("id", categoryId)
      .single();
    if (catErr || !cat) return new Response("Category not found", { status: 404 });
    if (cat.type !== "expense")
      return new Response("Budgets can only be set on expense categories", { status: 400 });
  }

  // Manual upsert keyed on (user_id, category_id), since category_id can be NULL.
  let existingQuery = db.from("budgets").select("id").eq("user_id", userId);
  existingQuery = categoryId
    ? existingQuery.eq("category_id", categoryId)
    : existingQuery.is("category_id", null);
  const { data: existing } = await existingQuery.maybeSingle();

  if (existing) {
    const { error } = await db
      .from("budgets")
      .update({ amount, updated_at: new Date().toISOString() })
      .eq("id", existing.id);
    if (error) return new Response(`DB Error: ${error.message}`, { status: 500 });
    return Response.json({ success: true, id: existing.id }, { status: 200 });
  }

  const { data: created, error } = await db
    .from("budgets")
    .insert({ user_id: userId, category_id: categoryId, amount })
    .select("id")
    .single();
  if (error) return new Response(`DB Error: ${error.message}`, { status: 500 });
  return Response.json({ success: true, id: created.id }, { status: 201 });
}

// DELETE — remove a budget by id (?id=...).
export async function DELETE(req: Request) {
  const { userId } = await auth();
  if (!userId) return unauthorized();

  const id = new URL(req.url).searchParams.get("id");
  if (!id) return new Response("id is required", { status: 400 });

  const db = createAdminClient();
  const { error } = await db
    .from("budgets")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);
  if (error) return new Response(`DB Error: ${error.message}`, { status: 500 });
  return Response.json({ success: true });
}
