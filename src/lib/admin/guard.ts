import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Allowlist of admin emails (comma separated). Configure in `.env.local`:
 *
 *   ADMIN_EMAILS=alice@example.com,bob@example.com
 */
function adminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * Returns the current user if they're authenticated; redirects to /login
 * otherwise. Does NOT enforce the admin allowlist — callers that need the
 * admin check should use `requireAdmin()`.
 */
export async function requireAuthUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return user;
}

/**
 * Returns true if the given email is on the admin allowlist. An empty
 * allowlist fails closed — nobody is admin until you configure it.
 */
export function isAdminEmail(email: string | null | undefined): boolean {
  const allowed = adminEmails();
  if (allowed.length === 0) return false;
  return allowed.includes((email ?? "").toLowerCase());
}

/**
 * Hard guard: returns the user if they're an authed admin, otherwise
 * redirects to /login (if unauth) or throws (handled by caller UI).
 *
 * Prefer `requireAuthUser()` + `isAdminEmail()` in layouts so you can render
 * a friendly "not authorized" page instead of a silent redirect.
 */
export async function requireAdmin() {
  const user = await requireAuthUser();
  if (!isAdminEmail(user.email)) {
    // Signal to the layout that the user is authed but not an admin.
    throw new NotAdminError(user.email ?? "");
  }
  return user;
}

export class NotAdminError extends Error {
  constructor(public email: string) {
    super(`Not an admin: ${email}`);
    this.name = "NotAdminError";
  }
}
