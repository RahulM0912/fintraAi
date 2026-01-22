import { pool } from "@/lib/db/connection";

export async function GET(req: Request) {
  const userId = "test_user_1"; // replace with Clerk later

  const { searchParams } = new URL(req.url);
  const year = searchParams.get("year");
  const month = searchParams.get("month");

  if (!year || !month || Number(month) < 1 || Number(month) > 12) {
    return new Response("valid year and month are required", { status: 400 });
  }

  try {
    const result = await pool.query(
      `
      SELECT 
        day, 
        income, 
        expense
      FROM month_history 
      WHERE user_id = $1
        AND month = $2
        AND year = $3
      ORDER BY day ASC
      `,
      [userId, month, year]
    );

    const days = result.rows.map((row) => ({
      day: row.day,
      income: Number(row.income),
      expense: Number(row.expense),
    }));

    return Response.json({ 
        year,
        month,
        days
    });
  } catch (error) {
    console.error("Error fetching month history:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
} 