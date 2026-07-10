import { getAuthUser } from "@/utils/supabase/auth";
import { createAdminClient } from "@/utils/supabase/admin";
import { getBudgetsData } from "@/lib/server/dashboardData";
export const dynamic = "force-dynamic";

function unauthorized() {
  return new Response("Unauthorized", { status: 401 });
}

// GET — list budgets for the current month with spent + percentage computed.
// Logic lives in lib/server/dashboardData so /api/dashboard can compose it.
export async function GET() {
  const user = await getAuthUser();
  if (!user) return unauthorized();

  try {
    const data = await getBudgetsData(createAdminClient(), user.id);
    return Response.json(data);
  } catch (error) {
    console.error("[GET /api/budgets]", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}

// POST — create or update a budget. Body: { categoryId: string|null, amount: number }
export async function POST(req: Request) {
  const user = await getAuthUser();
  if (!user) return unauthorized();
  const userId = user.id;

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
  const user = await getAuthUser();
  if (!user) return unauthorized();
  const userId = user.id;

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
