import { pool } from '@/lib/db/connection';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type');

    if(type && type !== 'income' && type !== 'expense')  {
      return new Response("Invalid category type", { status: 400 });
    }

    const query = `
      SELECT id, name, icon
      FROM categories
      WHERE type = $1
      ORDER BY name
    `

    const value = [type];
    const { rows} = await pool.query(query, value);

    return Response.json(rows, { status: 200 });
  } catch (error) {
    console.error("Failed to fetch categories:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}