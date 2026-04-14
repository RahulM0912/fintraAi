import { createAdminClient } from "@/utils/supabase/admin";

export async function GET() {
  try {
    const db = createAdminClient();
    const { error } = await db.from("users").select("id").limit(1);
    if (error) throw error;
    return Response.json({ status: "ok" });
  } catch (err) {
    return Response.json({ status: "error", message: String(err) }, { status: 500 });
  }
}
