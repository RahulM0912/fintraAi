import { createClient } from "@supabase/supabase-js";

/**
 * Server-side Supabase client that uses the service role key.
 * Bypasses Row Level Security — only use in API routes, never in client code.
 */
export function createAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!key) throw new Error("Missing Supabase key: set SUPABASE_SERVICE_ROLE_KEY in .env");
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    key,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
