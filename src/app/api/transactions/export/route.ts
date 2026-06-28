import { getAuthUser } from "@/utils/supabase/auth";
import { createAdminClient } from "@/utils/supabase/admin";
export const dynamic = "force-dynamic";

// Streams every transaction for the signed-in user as a CSV download.
// Columns match what the import route expects, so an export can be edited and
// re-imported round-trip.

function csvCell(value: unknown): string {
  const s = value == null ? "" : String(value);
  // Quote if the cell contains a comma, quote, or newline; double inner quotes.
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export async function GET() {
  const user = await getAuthUser();
  if (!user) return new Response("Unauthorized", { status: 401 });
  const userId = user.id;

  const db = createAdminClient();
  const { data, error } = await db
    .from("transactions")
    .select("date, type, amount, description, categories(name)")
    .eq("user_id", userId)
    .order("date", { ascending: false });

  if (error) {
    console.error("[GET /api/transactions/export]", error);
    return new Response("Internal Server Error", { status: 500 });
  }

  const header = ["Date", "Type", "Category", "Amount", "Description"];
  const lines = [header.join(",")];
  for (const row of data ?? []) {
    const cat = Array.isArray(row.categories) ? row.categories[0] : row.categories;
    lines.push(
      [
        csvCell(String(row.date).split("T")[0]),
        csvCell(row.type),
        csvCell((cat as { name?: string } | null)?.name ?? ""),
        csvCell(Number(row.amount)),
        csvCell(row.description ?? ""),
      ].join(",")
    );
  }

  // Prepend a UTF-8 BOM so Excel reads ₹/non-ASCII notes correctly.
  const body = "﻿" + lines.join("\r\n") + "\r\n";
  const today = new Date().toISOString().split("T")[0];

  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="fintra-transactions-${today}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
