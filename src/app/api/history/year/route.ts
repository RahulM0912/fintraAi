import { pool } from "@/lib/db/connection";

export async function GET(req: Request) {
  const userId = "test_user_1"; // replace with Clerk later

  const { searchParams } = new URL(req.url);
  const year = searchParams.get("year");
  if (!year) {
    return new Response("valid year is required", { status: 400 });
  }

  try {
    const result = await pool.query(
      `
      SELECT 
        month,
        income,
        expense
      FROM year_history 
      WHERE user_id = $1
        AND year = $2
      ORDER BY month ASC
      `,
      [userId, year]
    );

    const months = result.rows.map((row) => ({
      month: row.month,
      income: Number(row.income),
      expense: Number(row.expense),
    }))

    return Response.json({
      year,
      months
    })
  } catch (error) {
    console.error("Error fetching year history:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}