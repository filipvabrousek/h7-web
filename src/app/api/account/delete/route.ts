import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/admin/serviceClient";

export const dynamic = "force-dynamic";

/**
 * Permanently delete the currently authenticated user.
 *
 * The caller proves identity by passing their Supabase session access token
 * in the `Authorization: Bearer <jwt>` header. We verify the token with the
 * admin client (which can call `getUser(jwt)`), then issue
 * `auth.admin.deleteUser(id)` to wipe the auth user — all foreign-keyed rows
 * in `profiles`, `activity_logs`, `week_records`, `weight_entries`,
 * `social_posts`, `post_likes`, `post_comments`, and `support_messages`
 * are removed via the `on delete cascade` constraints.
 */
export async function POST(req: Request) {
  const authHeader = req.headers.get("authorization") ?? "";
  const token = authHeader.toLowerCase().startsWith("bearer ")
    ? authHeader.slice(7).trim()
    : "";

  if (!token) {
    return NextResponse.json({ error: "Missing bearer token" }, { status: 401 });
  }

  const admin = createAdminClient();

  // Verify the JWT and resolve the user id.
  const { data: userData, error: getUserErr } = await admin.auth.getUser(token);
  if (getUserErr || !userData?.user) {
    return NextResponse.json({ error: "Invalid session" }, { status: 401 });
  }
  const userId = userData.user.id;

  const { error: deleteErr } = await admin.auth.admin.deleteUser(userId);
  if (deleteErr) {
    return NextResponse.json({ error: deleteErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
