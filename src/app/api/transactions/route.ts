import { pool } from '@/lib/db/connection';

export async function POST(req: Request) {
  try {
    const userId = "test_user_1"; // TODO: Replace with authenticated user ID from clerk/session
    const { amount, type, categoryId, date, description } = await req.json();
    console.log(amount, type, categoryId, date, description);
    if(!amount || amount <=0) {
      return new Response("Invalid amount", { status: 400 });
    }

    if(!categoryId) {
      return new Response("Category ID is required", { status: 400 });
    }

    if(!["income", "expense"].includes(type)) {
      return new Response("Invalid transaction type", { status: 400 });
    }

    const client = await pool.connect();
    try {

      //validate category
      await client.query('BEGIN');
      const categoryRes = await client.query(
        `SELECT type FROM categories WHERE id = $1`, 
        [categoryId]
      );

      if(categoryRes.rowCount === 0) {
        await client.query('ROLLBACK');
        return new Response("Category not found", { status: 404 });
      }

      if(categoryRes.rows[0].type !== type) {
        await client.query('ROLLBACK');
        return new Response("Category type mismatch", { status: 400 });
      }

      //insert transaction
      const transactionRes = await client.query(
        `
          INSERT INTO transactions (user_id, category_id, amount, date, type, description)
          VALUES ($1, $2, $3, $4, $5, $6)
          RETURNING *;
        `,
        [userId, categoryId, amount, date, type, description??null]
      );

      const transaction = transactionRes.rows[0];
      const textDate = new Date(date);
      
      const day = textDate.getDate();
      const month = textDate.getMonth() + 1;
      const year = textDate.getFullYear();

      //update month
      await client.query(
        `
          INSERT INTO month_history (user_id, day, month, year, income, expense)
          VALUES (
            $1, $2, $3, $4,
            CASE WHEN $5 = 'income' THEN $6 ELSE 0 END,
            CASE WHEN $5 = 'expense' THEN $6 ELSE 0 END
          )
          ON CONFLICT (user_id, day, month, year)
          DO UPDATE SET
            income  = month_history.income  + EXCLUDED.income,
            expense = month_history.expense + EXCLUDED.expense;
        `,
        [userId, day, month, year, type, amount]
      );

      //update Year
      await client.query(
        `
          INSERT INTO year_history (
            user_id, month, year, income, expense
          )
          VALUES (
            $1, $2, $3,
            CASE WHEN $4 = 'income' THEN $5 ELSE 0 END,
            CASE WHEN $4 = 'expense' THEN $5 ELSE 0 END
          )
          ON CONFLICT (user_id, month, year)
          DO UPDATE SET
            income  = year_history.income  + EXCLUDED.income,
            expense = year_history.expense + EXCLUDED.expense;
        `,
        [userId, month, year, type, amount]
      );

    await client.query("COMMIT");

    return Response.json(transaction, { status: 201 });

    } catch (error) {
      await client.query("ROLLBACK");
      console.error("Create transaction failed:", error);
      return new Response("Internal Server Error", {
        status: 500,
      });
    } finally { 
      client.release()
    }

  } catch (error) {
    console.error("Failed to create transaction:", error);
  }
}

export async function GET(req: Request) {
  const userId = "test_user_1"; // replace with Clerk later

  const { searchParams } = new URL(req.url);

  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");

  if (!startDate || !endDate) {
    return new Response("startDate and endDate are required", { status: 400 });
  }

  const page = Number(searchParams.get("page") ?? 1);
  const limit = Number(searchParams.get("limit") ?? 10);
  const type = searchParams.get("type");
  const categoryId = searchParams.get("categoryId");

  const offset = (page - 1) * limit;

  const values: string[] = [userId, startDate, endDate];
  let whereClause = `
    WHERE t.user_id = $1
    AND t.date BETWEEN $2 AND $3
  `;

  if (type) {
    values.push(type);
    whereClause += ` AND t.type = $${values.length}`;
  }

  if (categoryId) {
    values.push(categoryId);
    whereClause += ` AND t.category_id = $${values.length}`;
  }

  try {
    // Get paginated transactions
    const dataQuery = `
      SELECT
        t.id,
        t.date,
        t.type,
        t.amount,
        t.description,
        c.id AS category_id,
        c.name AS category_name,
        c.icon AS category_icon
      FROM transactions t
      JOIN categories c ON c.id = t.category_id
      ${whereClause}
      ORDER BY t.date DESC
      LIMIT ${limit}
      OFFSET ${offset};
    `;

    const dataResult = await pool.query(dataQuery, values);

    // Get total count (for pagination)
    const countQuery = `
      SELECT COUNT(*) AS total
      FROM transactions t
      ${whereClause};
    `;

    const countResult = await pool.query(countQuery, values);
    const total = Number(countResult.rows[0].total);

    return Response.json({
      data: dataResult.rows.map(row => ({
        id: row.id,
        date: row.date,
        type: row.type,
        amount: Number(row.amount),
        description: row.description,
        category: {
          id: row.category_id,
          name: row.category_name,
          icon: row.category_icon,
        },
      })),
      pagination: {
        page,
        limit,
        total,
        hasNext: offset + limit < total,
        hasPrev: page > 1,
      },
    });
  } catch (error) {
    console.error("Failed to fetch transactions:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}









