import { createClient } from "@/utils/supabase/server";

/**
 * Returns the authenticated Supabase user for the current request, or null.
 * Reads the session from cookies via the SSR server client. Use in API routes
 * and server components in place of Clerk's `auth()`.
 */
export async function getAuthUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}
