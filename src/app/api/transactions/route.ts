import { getAuthUser } from "@/utils/supabase/auth";
import { createAdminClient } from "@/utils/supabase/admin";
export const dynamic = "force-dynamic";

function unauthorized() {
  return new Response("Unauthorized", { status: 401 });
}

function parseDateParts(dateStr: string) {
  const [yearStr, monthStr, dayStr] = String(dateStr).split("T")[0].split("-");
  return {
    day: parseInt(dayStr, 10),
    month: parseInt(monthStr, 10),
    year: parseInt(yearStr, 10),
  };
}

async function incrementMonthHistory(
  db: ReturnType<typeof createAdminClient>,
  userId: string,
  day: number, month: number, year: number,
  type: "income" | "expense",
  amount: number
) {
  const { data: existing } = await db
    .from("month_history")
    .select("id, income, expense")
    .eq("user_id", userId).eq("day", day).eq("month", month).eq("year", year)
    .maybeSingle();

  if (existing) {
    await db.from("month_history").update({
      income: type === "income" ? Number(existing.income) + amount : Number(existing.income),
      expense: type === "expense" ? Number(existing.expense) + amount : Number(existing.expense),
    }).eq("id", existing.id);
  } else {
    await db.from("month_history").insert({
      user_id: userId, day, month, year,
      income: type === "income" ? amount : 0,
      expense: type === "expense" ? amount : 0,
    });
  }
}

async function incrementYearHistory(
  db: ReturnType<typeof createAdminClient>,
  userId: string,
  month: number, year: number,
  type: "income" | "expense",
  amount: number
) {
  const { data: existing } = await db
    .from("year_history")
    .select("id, income, expense")
    .eq("user_id", userId).eq("month", month).eq("year", year)
    .maybeSingle();

  if (existing) {
    await db.from("year_history").update({
      income: type === "income" ? Number(existing.income) + amount : Number(existing.income),
      expense: type === "expense" ? Number(existing.expense) + amount : Number(existing.expense),
    }).eq("id", existing.id);
  } else {
    await db.from("year_history").insert({
      user_id: userId, month, year,
      income: type === "income" ? amount : 0,
      expense: type === "expense" ? amount : 0,
    });
  }
}

export async function POST(req: Request) {
  const user = await getAuthUser();
  if (!user) return unauthorized();
  const userId = user.id;

  let body: any;
  try { body = await req.json(); }
  catch { return new Response("Invalid JSON body", { status: 400 }); }

  const { amount, type, categoryId, date, description } = body;

  if (!amount || Number(amount) <= 0) return new Response("Invalid amount", { status: 400 });
  if (!categoryId) return new Response("Category ID is required", { status: 400 });
  if (!["income", "expense"].includes(type)) return new Response("Invalid transaction type", { status: 400 });

  const db = createAdminClient();

  const { data: category, error: catError } = await db
    .from("categories").select("type").eq("id", categoryId).single();

  if (catError || !category) return new Response("Category not found", { status: 404 });
  if (category.type !== type) return new Response("Category type mismatch", { status: 400 });

  const { data: transaction, error: txError } = await db
    .from("transactions")
    .insert({ user_id: userId, category_id: categoryId, amount: Number(amount), date, type, description: description ?? null })
    .select().single();

  if (txError) {
    console.error("[POST /api/transactions]", txError);
    return new Response(`DB Error: ${txError.message}`, { status: 500 });
  }

  const { day, month, year } = parseDateParts(date);
  await incrementMonthHistory(db, userId, day, month, year, type, Number(amount));
  await incrementYearHistory(db, userId, month, year, type, Number(amount));

  return Response.json(transaction, { status: 201 });
}

export async function GET(req: Request) {
  const user = await getAuthUser();
  if (!user) return unauthorized();
  const userId = user.id;

  const { searchParams } = new URL(req.url);
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");
  const page = Number(searchParams.get("page") ?? 1);
  const limit = Number(searchParams.get("limit") ?? 10);
  const type = searchParams.get("type");
  const categoryId = searchParams.get("categoryId");
  const search = searchParams.get("search");
  const offset = (page - 1) * limit;

  const db = createAdminClient();

  let query = db
    .from("transactions")
    .select("id, date, type, amount, description, categories(id, name, icon)", { count: "exact" })
    .eq("user_id", userId)
    .order("date", { ascending: false })
    .range(offset, offset + limit - 1);

  if (startDate && endDate) query = query.gte("date", startDate).lte("date", endDate);
  if (type) query = query.eq("type", type);
  if (categoryId) query = query.eq("category_id", categoryId);
  if (search) {
    // Escape LIKE wildcards so user input is matched literally
    const escaped = search.replace(/[%_]/g, (m) => `\\${m}`);
    query = query.ilike("description", `%${escaped}%`);
  }

  const { data, count, error } = await query;
  if (error) {
    console.error("[GET /api/transactions]", error);
    return new Response("Internal Server Error", { status: 500 });
  }

  const total = count ?? 0;
  return Response.json({
    data: (data ?? []).map((row: any) => ({
      id: row.id,
      date: row.date,
      type: row.type,
      amount: Number(row.amount),
      description: row.description,
      category: row.categories
        ? { id: row.categories.id, name: row.categories.name, icon: row.categories.icon }
        : null,
    })),
    pagination: { page, limit, total, hasNext: offset + limit < total, hasPrev: page > 1 },
  });
}
