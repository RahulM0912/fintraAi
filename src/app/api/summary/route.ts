import { pool } from "@/lib/db/connection";

export async function GET(req:Request) {
  const userId = "test_user_1"; // replace with Clerk later
  
  const { searchParams } = new URL(req.url);
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");

  if(!startDate || !endDate) {
    return new Response("startDate and endDate are required", { status: 400});
  }

  try {
    const totalResult = await pool.query(
      `
      SELECT
        COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) AS total_income,
        COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) AS total_expense
      FROM transactions
      WHERE user_id = $1 AND date BETWEEN $2 AND $3
      `,
      [userId, startDate, endDate]
    )

    const totalIncome = Number(totalResult.rows[0].total_income);
    const totalExpense = Number(totalResult.rows[0].total_expense);
    const netBalance = totalIncome - totalExpense;

    const incomeByCategoryResult = await pool.query(
      `
      SELECT
        c.id AS category_id,
        c.name,
        c.icon,
        SUM(t.amount) AS total_amount
      FROM transactions t
      JOIN categories c ON c.id = t.category_id
      WHERE t.user_id = $1 
      AND t.type = 'income'
      AND t.date BETWEEN $2 AND $3
      GROUP BY c.id, c.name, c.icon
      ORDER BY total_amount DESC
      `,
      [userId, startDate, endDate]
    );

    const expenseByCategoryResult = await pool.query(
      `
      SELECT
        c.id AS category_id,
        c.name,
        c.icon,
        SUM(t.amount) AS total_amount
      FROM transactions t
      JOIN categories c ON c.id = t.category_id
      WHERE t.user_id = $1 
      AND t.type = 'expense'
      AND t.date BETWEEN $2 AND $3
      GROUP BY c.id, c.name, c.icon
      ORDER BY total_amount DESC
      `,
      [userId, startDate, endDate]
    );

    const incomeByCategory = incomeByCategoryResult.rows.map((row) => ({
      categoryId: row.category_id,
      name: row.name,
      icon: row.icon,
      totalAmount: Number(row.total_amount),
      percentage: totalIncome > 0 ? (Number(row.total_amount) / totalIncome) * 100 : 0,
    }));

    const expenseByCategory = expenseByCategoryResult.rows.map((row) => ({
      categoryId: row.category_id,
      name: row.name,
      icon: row.icon,
      totalAmount: Number(row.total_amount),
      percentage: totalExpense > 0 ? Math.round((Number(row.total_amount) / totalExpense) * 100) : 0,
    }));

    return Response.json({
      total: {
        totalIncome: totalIncome,
        totalExpense: totalExpense,
        netBalance: netBalance,
      },
      incomeByCategory,
      expenseByCategory
    });
  } catch (error) {
    console.error("Error fetching summary:", error);
    return new Response("Internal Server Error", { status: 500 });
  }

}