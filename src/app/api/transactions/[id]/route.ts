import { getAuthUser } from "@/utils/supabase/auth";
import { createAdminClient } from "@/utils/supabase/admin";

function parseDateParts(dateStr: string) {
  const [yearStr, monthStr, dayStr] = String(dateStr).split("T")[0].split("-");
  return {
    day: parseInt(dayStr, 10),
    month: parseInt(monthStr, 10),
    year: parseInt(yearStr, 10),
  };
}

async function adjustMonthHistory(
  db: ReturnType<typeof createAdminClient>,
  userId: string,
  day: number, month: number, year: number,
  type: "income" | "expense",
  delta: number
) {
  const { data: existing } = await db
    .from("month_history").select("id, income, expense")
    .eq("user_id", userId).eq("day", day).eq("month", month).eq("year", year)
    .maybeSingle();
  if (!existing) return;
  await db.from("month_history").update({
    income: type === "income" ? Math.max(0, Number(existing.income) + delta) : Number(existing.income),
    expense: type === "expense" ? Math.max(0, Number(existing.expense) + delta) : Number(existing.expense),
  }).eq("id", existing.id);
}

async function adjustYearHistory(
  db: ReturnType<typeof createAdminClient>,
  userId: string,
  month: number, year: number,
  type: "income" | "expense",
  delta: number
) {
  const { data: existing } = await db
    .from("year_history").select("id, income, expense")
    .eq("user_id", userId).eq("month", month).eq("year", year)
    .maybeSingle();
  if (!existing) return;
  await db.from("year_history").update({
    income: type === "income" ? Math.max(0, Number(existing.income) + delta) : Number(existing.income),
    expense: type === "expense" ? Math.max(0, Number(existing.expense) + delta) : Number(existing.expense),
  }).eq("id", existing.id);
}

async function incrementMonthHistory(
  db: ReturnType<typeof createAdminClient>,
  userId: string,
  day: number, month: number, year: number,
  type: "income" | "expense",
  amount: number
) {
  const { data: existing } = await db
    .from("month_history").select("id, income, expense")
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
    .from("year_history").select("id, income, expense")
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

export async function DELETE(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser();
  if (!user) return new Response("Unauthorized", { status: 401 });
  const userId = user.id;

  const { id: transactionId } = await context.params;
  const db = createAdminClient();

  const { data: tx, error: fetchError } = await db
    .from("transactions").select("amount, type, date")
    .eq("id", transactionId).eq("user_id", userId).single();

  if (fetchError || !tx) return new Response("Transaction not found", { status: 404 });

  const amount = Number(tx.amount);
  const { day, month, year } = parseDateParts(tx.date);

  const { error: deleteError } = await db
    .from("transactions").delete().eq("id", transactionId).eq("user_id", userId);

  if (deleteError) {
    console.error("[DELETE /api/transactions/:id]", deleteError);
    return new Response(`DB Error: ${deleteError.message}`, { status: 500 });
  }

  await adjustMonthHistory(db, userId, day, month, year, tx.type, -amount);
  await adjustYearHistory(db, userId, month, year, tx.type, -amount);

  return new Response(null, { status: 204 });
}

export async function PUT(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser();
  if (!user) return new Response("Unauthorized", { status: 401 });
  const userId = user.id;

  const { id: transactionId } = await context.params;

  let body: any;
  try { body = await req.json(); }
  catch { return new Response("Invalid JSON body", { status: 400 }); }

  const { amount, date, description, categoryId, type } = body;
  const db = createAdminClient();

  const { data: oldTx, error: fetchError } = await db
    .from("transactions").select("amount, type, date")
    .eq("id", transactionId).eq("user_id", userId).single();

  if (fetchError || !oldTx) return new Response("Transaction not found", { status: 404 });

  const oldAmount = Number(oldTx.amount);
  const { day: oldDay, month: oldMonth, year: oldYear } = parseDateParts(oldTx.date);

  await adjustMonthHistory(db, userId, oldDay, oldMonth, oldYear, oldTx.type, -oldAmount);
  await adjustYearHistory(db, userId, oldMonth, oldYear, oldTx.type, -oldAmount);

  const { error: updateError } = await db
    .from("transactions")
    .update({ amount: Number(amount), date, description: description ?? null, category_id: categoryId, type })
    .eq("id", transactionId).eq("user_id", userId);

  if (updateError) {
    console.error("[PUT /api/transactions/:id]", updateError);
    return new Response(`DB Error: ${updateError.message}`, { status: 500 });
  }

  const { day, month, year } = parseDateParts(date);
  await incrementMonthHistory(db, userId, day, month, year, type, Number(amount));
  await incrementYearHistory(db, userId, month, year, type, Number(amount));

  return new Response("Transaction updated", { status: 200 });
}
