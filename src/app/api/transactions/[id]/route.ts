import { pool } from "@/lib/db/connection";

export async function DELETE(
  req: Request,
  context: { params: Promise<{id: string}> }
) {
  const userId = "test_user_1";
  const {id: transactionId} = await context.params;

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Fetch transaction
    const txRes = await client.query(
      `
      SELECT amount, type, date
      FROM transactions
      WHERE id = $1 AND user_id = $2
      `,
      [transactionId, userId]
    );

    if (txRes.rowCount === 0) {
      await client.query("ROLLBACK");
      return new Response("Transaction not found", { status: 404 });
    }

    const { type, date } = txRes.rows[0];
    const amount = Number(txRes.rows[0].amount);

    const txDate = new Date(`${date}`);
    const day = txDate.getDate();
    const month = txDate.getMonth() + 1;
    const year = txDate.getFullYear();

    // Delete transaction
    await client.query(
      `DELETE FROM transactions WHERE id = $1 AND user_id = $2`,
      [transactionId, userId]
    );

    // Reverse month history
    await client.query(
      `
      UPDATE month_history
      SET
        income  = income  - CASE WHEN $1 = 'income' THEN $2 ELSE 0 END,
        expense = expense - CASE WHEN $1 = 'expense' THEN $2 ELSE 0 END
      WHERE user_id = $3 AND day = $4 AND month = $5 AND year = $6
      `,
      [type, amount, userId, day, month, year]
    );

    // Reverse year history
    await client.query(
      `
      UPDATE year_history
      SET
        income  = income  - CASE WHEN $1 = 'income' THEN $2 ELSE 0 END,
        expense = expense - CASE WHEN $1 = 'expense' THEN $2 ELSE 0 END
      WHERE user_id = $3 AND month = $4 AND year = $5
      `,
      [type, amount, userId, month, year]
    );

    await client.query("COMMIT");
    return new Response(null, { status: 204 });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Delete transaction failed:", error);
    return new Response("Internal Server Error", { status: 500 });
  } finally {
    client.release();
  }
}



export async function PUT(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const userId = "test_user_1";
  const {id: transactionId} = await context.params;

  const { amount, date, description, categoryId, type } = await req.json();

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Fetch old transaction
    const oldTxRes = await client.query(
      `
      SELECT amount, type, date
      FROM transactions
      WHERE id = $1 AND user_id = $2
      `,
      [transactionId, userId]
    );

    if (oldTxRes.rowCount === 0) {
      await client.query("ROLLBACK");
      return new Response("Transaction not found", { status: 404 });
    }

    const oldTx = oldTxRes.rows[0];
    const oldDate = new Date(`${oldTx.date}`);

    const oldDay = oldDate.getDate();
    const oldMonth = oldDate.getMonth() + 1;
    const oldYear = oldDate.getFullYear();

    // Reverse old history
    await client.query(
      `
      UPDATE month_history
      SET
        income  = income  - CASE WHEN $1 = 'income' THEN $2 ELSE 0 END,
        expense = expense - CASE WHEN $1 = 'expense' THEN $2 ELSE 0 END
      WHERE user_id = $3 AND day = $4 AND month = $5 AND year = $6
      `,
      [oldTx.type, Number(oldTx.amount), userId, oldDay, oldMonth, oldYear]
    );

    await client.query(
      `
      UPDATE year_history
      SET
        income  = income  - CASE WHEN $1 = 'income' THEN $2 ELSE 0 END,
        expense = expense - CASE WHEN $1 = 'expense' THEN $2 ELSE 0 END
      WHERE user_id = $3 AND month = $4 AND year = $5
      `,
      [oldTx.type, Number(oldTx.amount), userId, oldMonth, oldYear]
    );

    // Update transaction
    await client.query(
      `
      UPDATE transactions
      SET
        amount = $1,
        date = $2,
        description = $3,
        category_id = $4,
        type = $5
      WHERE id = $6 AND user_id = $7
      `,
      [amount, date, description ?? null, categoryId, type, transactionId, userId]
    );

    const newDate = new Date(`${date}`);
    const day = newDate.getDate();
    const month = newDate.getMonth() + 1;
    const year = newDate.getFullYear();

    // Apply new history
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
        expense = month_history.expense + EXCLUDED.expense
      `,
      [userId, day, month, year, type, amount]
    );

    await client.query(
      `
      INSERT INTO year_history (user_id, month, year, income, expense)
      VALUES (
        $1, $2, $3,
        CASE WHEN $4 = 'income' THEN $5 ELSE 0 END,
        CASE WHEN $4 = 'expense' THEN $5 ELSE 0 END
      )
      ON CONFLICT (user_id, month, year)
      DO UPDATE SET
        income  = year_history.income  + EXCLUDED.income,
        expense = year_history.expense + EXCLUDED.expense
      `,
      [userId, month, year, type, amount]
    );

    await client.query("COMMIT");
    return new Response("Transaction updated", { status: 200 });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Update transaction failed:", error);
    return new Response("Internal Server Error", { status: 500 });
  } finally {
    client.release();
  }
}
