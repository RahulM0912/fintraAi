import { getAuthUser } from "@/utils/supabase/auth";
import { createAdminClient } from "@/utils/supabase/admin";
export const dynamic = "force-dynamic";

// Bulk-import transactions from a CSV (the same shape /export produces).
// Expected header: Date, Type, Category, Amount, Description.
// Rows are validated individually; bad rows are skipped and reported so a
// partial file still imports what it can.

const MAX_ROWS = 2000;

// Minimal RFC-4180 parser: handles quoted fields, escaped quotes, embedded
// commas/newlines, and CRLF or LF line endings.
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  // Strip a leading UTF-8 BOM if present.
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += c;
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field); field = "";
    } else if (c === "\n") {
      row.push(field); field = "";
      rows.push(row); row = [];
    } else if (c === "\r") {
      // swallow; \n handles the row break
    } else field += c;
  }
  if (field.length > 0 || row.length > 0) { row.push(field); rows.push(row); }
  return rows.filter((r) => r.some((cell) => cell.trim() !== ""));
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export async function POST(req: Request) {
  const user = await getAuthUser();
  if (!user) return new Response("Unauthorized", { status: 401 });
  const userId = user.id;

  const text = await req.text();
  if (!text.trim()) return Response.json({ error: "Empty file" }, { status: 400 });

  const rows = parseCsv(text);
  if (rows.length < 2)
    return Response.json({ error: "No data rows found" }, { status: 400 });

  // Map header → column index so column order is flexible.
  const header = rows[0].map((h) => h.trim().toLowerCase());
  const col = (name: string) => header.indexOf(name);
  const iDate = col("date");
  const iType = col("type");
  const iCat = col("category");
  const iAmount = col("amount");
  const iDesc = col("description");
  if (iDate < 0 || iType < 0 || iAmount < 0)
    return Response.json(
      { error: "Missing required columns. Need at least: Date, Type, Amount." },
      { status: 400 }
    );

  const dataRows = rows.slice(1);
  if (dataRows.length > MAX_ROWS)
    return Response.json(
      { error: `Too many rows (${dataRows.length}). Limit is ${MAX_ROWS} per import.` },
      { status: 400 }
    );

  const db = createAdminClient();

  // Category name → id, per type (categories are global with a type column).
  const { data: cats, error: catErr } = await db
    .from("categories")
    .select("id, name, type");
  if (catErr) {
    console.error("[POST /api/transactions/import] cats", catErr);
    return new Response("Internal Server Error", { status: 500 });
  }
  const catByKey = new Map<string, string>(); // `${type}|${lowername}` -> id
  const fallbackByType = new Map<string, string>(); // first cat of a type
  for (const c of cats ?? []) {
    catByKey.set(`${c.type}|${String(c.name).trim().toLowerCase()}`, c.id);
    if (!fallbackByType.has(c.type)) fallbackByType.set(c.type, c.id);
  }

  interface Prepared {
    date: string; type: "income" | "expense"; category_id: string;
    amount: number; description: string | null;
    day: number; month: number; year: number;
  }
  const prepared: Prepared[] = [];
  const errors: string[] = [];

  dataRows.forEach((r, idx) => {
    const lineNo = idx + 2; // 1-based incl header
    const date = (r[iDate] ?? "").trim();
    const type = (r[iType] ?? "").trim().toLowerCase();
    const amount = Number((r[iAmount] ?? "").trim());
    const catName = iCat >= 0 ? (r[iCat] ?? "").trim() : "";
    const desc = iDesc >= 0 ? (r[iDesc] ?? "").trim() : "";

    if (!DATE_RE.test(date)) return errors.push(`Row ${lineNo}: bad date "${date}" (use YYYY-MM-DD)`);
    if (type !== "income" && type !== "expense")
      return errors.push(`Row ${lineNo}: type must be income or expense`);
    if (!isFinite(amount) || amount <= 0)
      return errors.push(`Row ${lineNo}: amount must be a positive number`);

    const category_id =
      catByKey.get(`${type}|${catName.toLowerCase()}`) ?? fallbackByType.get(type);
    if (!category_id) return errors.push(`Row ${lineNo}: no ${type} category available`);

    const [y, m, d] = date.split("-").map(Number);
    prepared.push({
      date, type, category_id, amount,
      description: desc || null, day: d, month: m, year: y,
    });
  });

  if (prepared.length === 0)
    return Response.json(
      { error: "No valid rows to import.", imported: 0, skipped: errors.length, errors: errors.slice(0, 20) },
      { status: 400 }
    );

  // Insert transactions in one shot.
  const { error: insErr } = await db.from("transactions").insert(
    prepared.map((p) => ({
      user_id: userId, category_id: p.category_id, amount: p.amount,
      date: p.date, type: p.type, description: p.description,
    }))
  );
  if (insErr) {
    console.error("[POST /api/transactions/import] insert", insErr);
    return new Response(`DB Error: ${insErr.message}`, { status: 500 });
  }

  // Roll the aggregated deltas into month_history + year_history so the trend
  // chart and history views reflect the import.
  await applyHistoryDeltas(db, userId, prepared);

  return Response.json({
    imported: prepared.length,
    skipped: errors.length,
    errors: errors.slice(0, 20),
  });
}

type Db = ReturnType<typeof createAdminClient>;

async function applyHistoryDeltas(
  db: Db,
  userId: string,
  rows: { day: number; month: number; year: number; type: "income" | "expense"; amount: number }[]
) {
  const monthMap = new Map<string, { day: number; month: number; year: number; income: number; expense: number }>();
  const yearMap = new Map<string, { month: number; year: number; income: number; expense: number }>();

  for (const r of rows) {
    const mk = `${r.day}|${r.month}|${r.year}`;
    const mEntry = monthMap.get(mk) ?? { day: r.day, month: r.month, year: r.year, income: 0, expense: 0 };
    mEntry[r.type] += r.amount;
    monthMap.set(mk, mEntry);

    const yk = `${r.month}|${r.year}`;
    const yEntry = yearMap.get(yk) ?? { month: r.month, year: r.year, income: 0, expense: 0 };
    yEntry[r.type] += r.amount;
    yearMap.set(yk, yEntry);
  }

  for (const e of monthMap.values()) {
    const { data: existing } = await db
      .from("month_history")
      .select("id, income, expense")
      .eq("user_id", userId).eq("day", e.day).eq("month", e.month).eq("year", e.year)
      .maybeSingle();
    if (existing) {
      await db.from("month_history").update({
        income: Number(existing.income) + e.income,
        expense: Number(existing.expense) + e.expense,
      }).eq("id", existing.id);
    } else {
      await db.from("month_history").insert({
        user_id: userId, day: e.day, month: e.month, year: e.year,
        income: e.income, expense: e.expense,
      });
    }
  }

  for (const e of yearMap.values()) {
    const { data: existing } = await db
      .from("year_history")
      .select("id, income, expense")
      .eq("user_id", userId).eq("month", e.month).eq("year", e.year)
      .maybeSingle();
    if (existing) {
      await db.from("year_history").update({
        income: Number(existing.income) + e.income,
        expense: Number(existing.expense) + e.expense,
      }).eq("id", existing.id);
    } else {
      await db.from("year_history").insert({
        user_id: userId, month: e.month, year: e.year,
        income: e.income, expense: e.expense,
      });
    }
  }
}
