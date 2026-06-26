import { auth } from "@clerk/nextjs/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { lastDueOnOrBefore } from "@/lib/recurring";
export const dynamic = "force-dynamic";

function unauthorized() {
  return new Response("Unauthorized", { status: 401 });
}

// GET — list the user's recurring rules with category info.
export async function GET() {
  const { userId } = await auth();
  if (!userId) return unauthorized();

  const db = createAdminClient();
  const { data, error } = await db
    .from("recurring_rules")
    .select("id, amount, type, description, day_of_month, active, last_run_date, category_id, categories(id, name, icon)")
    .eq("user_id", userId)
    .order("day_of_month");

  if (error) {
    console.error("[GET /api/recurring]", error);
    return new Response("Internal Server Error", { status: 500 });
  }

  const rules = (data ?? []).map((r: any) => {
    const cat = Array.isArray(r.categories) ? r.categories[0] : r.categories;
    return {
      id: r.id,
      amount: Number(r.amount),
      type: r.type,
      description: r.description,
      dayOfMonth: r.day_of_month,
      active: r.active,
      lastRunDate: r.last_run_date,
      categoryId: r.category_id,
      categoryName: cat?.name ?? "Unknown",
      categoryIcon: cat?.icon ?? "",
    };
  });

  return Response.json({ rules });
}

// POST — create a recurring rule.
// Body: { amount, type, categoryId, dayOfMonth, description? }
export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return unauthorized();

  let body: any;
  try {
    body = await req.json();
  } catch {
    return new Response("Invalid JSON body", { status: 400 });
  }

  const { amount, type, categoryId, dayOfMonth, description } = body;

  if (!amount || Number(amount) <= 0) return new Response("Invalid amount", { status: 400 });
  if (!["income", "expense"].includes(type)) return new Response("Invalid type", { status: 400 });
  if (!categoryId) return new Response("Category is required", { status: 400 });
  const dom = Number(dayOfMonth);
  if (!dom || dom < 1 || dom > 28)
    return new Response("Day of month must be between 1 and 28", { status: 400 });

  const db = createAdminClient();

  const { data: cat, error: catErr } = await db
    .from("categories")
    .select("type")
    .eq("id", categoryId)
    .single();
  if (catErr || !cat) return new Response("Category not found", { status: 404 });
  if (cat.type !== type) return new Response("Category type mismatch", { status: 400 });

  // Seed last_run_date to the current period so we don't immediately back-post.
  const lastRun = lastDueOnOrBefore(new Date(), dom);

  const { data: created, error } = await db
    .from("recurring_rules")
    .insert({
      user_id: userId,
      category_id: categoryId,
      amount: Number(amount),
      type,
      description: description ?? null,
      day_of_month: dom,
      last_run_date: lastRun,
    })
    .select("id")
    .single();

  if (error) return new Response(`DB Error: ${error.message}`, { status: 500 });
  return Response.json({ success: true, id: created.id }, { status: 201 });
}

// PATCH — update a rule. Body: { id, amount?, dayOfMonth?, description?, active? }
export async function PATCH(req: Request) {
  const { userId } = await auth();
  if (!userId) return unauthorized();

  let body: any;
  try {
    body = await req.json();
  } catch {
    return new Response("Invalid JSON body", { status: 400 });
  }

  const { id } = body;
  if (!id) return new Response("id is required", { status: 400 });

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (body.amount !== undefined) {
    if (Number(body.amount) <= 0) return new Response("Invalid amount", { status: 400 });
    update.amount = Number(body.amount);
  }
  if (body.description !== undefined) update.description = body.description ?? null;
  if (body.active !== undefined) update.active = !!body.active;
  if (body.dayOfMonth !== undefined) {
    const dom = Number(body.dayOfMonth);
    if (dom < 1 || dom > 28) return new Response("Day of month must be 1-28", { status: 400 });
    update.day_of_month = dom;
    // Re-anchor so a changed day doesn't back-post the current period.
    update.last_run_date = lastDueOnOrBefore(new Date(), dom);
  }

  const db = createAdminClient();
  const { error } = await db
    .from("recurring_rules")
    .update(update)
    .eq("id", id)
    .eq("user_id", userId);

  if (error) return new Response(`DB Error: ${error.message}`, { status: 500 });
  return Response.json({ success: true });
}

// DELETE — remove a rule (?id=...).
export async function DELETE(req: Request) {
  const { userId } = await auth();
  if (!userId) return unauthorized();

  const id = new URL(req.url).searchParams.get("id");
  if (!id) return new Response("id is required", { status: 400 });

  const db = createAdminClient();
  const { error } = await db
    .from("recurring_rules")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);

  if (error) return new Response(`DB Error: ${error.message}`, { status: 500 });
  return Response.json({ success: true });
}
