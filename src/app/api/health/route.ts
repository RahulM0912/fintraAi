import { initDatabase } from "@/lib/db";

export async function GET() {
  await initDatabase();

  return Response.json({ status: "ok" });
}
