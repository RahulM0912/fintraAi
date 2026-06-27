import type { User } from "@supabase/supabase-js";

/**
 * Derives display fields from a Supabase user. Handles both email/password
 * users (name lives in user_metadata.full_name) and OAuth users (Google sets
 * name/avatar_url/picture in user_metadata).
 */
export function getUserDisplay(user: User | null) {
  const meta = (user?.user_metadata ?? {}) as Record<string, string | undefined>;
  const fullName = meta.full_name || meta.name || "";
  const email = user?.email ?? "";
  const displayName = fullName || email || "User";
  const avatarUrl = meta.avatar_url || meta.picture || undefined;

  const initialsSource = fullName
    ? fullName
        .split(" ")
        .map((n) => n[0])
        .slice(0, 2)
        .join("")
    : email.slice(0, 2);
  const initials = initialsSource.toUpperCase() || "U";

  const firstName = fullName.split(" ")[0] || null;

  return { displayName, email, avatarUrl, initials, firstName };
}
