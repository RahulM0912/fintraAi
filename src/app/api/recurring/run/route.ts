import { getAuthUser } from "@/utils/supabase/auth";
import { createAdminClient } from "@/utils/supabase/admin";
import { lastDueOnOrBefore } from "@/lib/recurring";
export const dynamic = "force-dynamic";

type Db = ReturnType<typeof createAdminClient>;
type TxType = "income" | "expense";

function parts(dateStr: string) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return { year: y, month: m, day: d };
}

async function incMonthHistory(
  db: Db, userId: string, day: number, month: number, year: number, type: TxType, amount: number
) {
  const { data: row } = await db
    .from("month_history")
    .select("id, income, expense")
    .eq("user_id", userId).eq("day", day).eq("month", month).eq("year", year)
    .maybeSingle();
  if (row) {
    await db.from("month_history").update({
      income: type === "income" ? Number(row.income) + amount : Number(row.income),
      expense: type === "expense" ? Number(row.expense) + amount : Number(row.expense),
    }).eq("id", row.id);
  } else {
    await db.from("month_history").insert({
      user_id: userId, day, month, year,
      income: type === "income" ? amount : 0,
      expense: type === "expense" ? amount : 0,
    });
  }
}

async function incYearHistory(
  db: Db, userId: string, month: number, year: number, type: TxType, amount: number
) {
  const { data: row } = await db
    .from("year_history")
    .select("id, income, expense")
    .eq("user_id", userId).eq("month", month).eq("year", year)
    .maybeSingle();
  if (row) {
    await db.from("year_history").update({
      income: type === "income" ? Number(row.income) + amount : Number(row.income),
      expense: type === "expense" ? Number(row.expense) + amount : Number(row.expense),
    }).eq("id", row.id);
  } else {
    await db.from("year_history").insert({
      user_id: userId, month, year,
      income: type === "income" ? amount : 0,
      expense: type === "expense" ? amount : 0,
    });
  }
}

// POST — materialize any due recurring rules into real transactions.
// Idempotent: a rule only posts once per period, guarded by last_run_date.
export async function POST() {
  const user = await getAuthUser();
  if (!user) return new Response("Unauthorized", { status: 401 });
  const userId = user.id;

  const db = createAdminClient();
  const today = new Date();

  const { data: rules, error } = await db
    .from("recurring_rules")
    .select("id, category_id, amount, type, description, day_of_month, last_run_date")
    .eq("user_id", userId)
    .eq("active", true);

  if (error) {
    console.error("[POST /api/recurring/run]", error);
    return new Response("Internal Server Error", { status: 500 });
  }

  let created = 0;

  for (const r of rules ?? []) {
    const due = lastDueOnOrBefore(today, r.day_of_month);
    // Already posted for this (or a later) period — skip.
    if (r.last_run_date && String(r.last_run_date) >= due) continue;

    const amount = Number(r.amount);
    const type = r.type as TxType;

    const { error: txErr } = await db.from("transactions").insert({
      user_id: userId,
      category_id: r.category_id,
      amount,
      type,
      date: due,
      description: r.description ?? null,
    });
    if (txErr) {
      console.error("[recurring materialize]", txErr);
      continue;
    }

    const { day, month, year } = parts(due);
    await incMonthHistory(db, userId, day, month, year, type, amount);
    await incYearHistory(db, userId, month, year, type, amount);

    await db
      .from("recurring_rules")
      .update({ last_run_date: due, updated_at: new Date().toISOString() })
      .eq("id", r.id);

    created++;
  }

  return Response.json({ created });
}
