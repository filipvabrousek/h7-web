import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/admin/serviceClient";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Upload an avatar image for the currently authenticated user.
 *
 * Why go through a server route instead of calling `supabase.storage` from the
 * browser? Two reasons:
 *   1. We can guarantee the `avatars` bucket exists by using the admin client
 *      to create it on first use (the storage migration may not have been
 *      applied to the live project yet — this makes the flow self-healing).
 *   2. Once the bucket exists here, iOS and Android direct uploads (which use
 *      the user's JWT against the RLS policies) also start working with no
 *      further action.
 *
 * Auth: `Authorization: Bearer <supabase jwt>`
 * Body: multipart/form-data with a single `file` field.
 * Response: `{ url: string }` — public URL with a cache-buster query param.
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

  // Resolve caller identity.
  const { data: userData, error: getUserErr } = await admin.auth.getUser(token);
  if (getUserErr || !userData?.user) {
    return NextResponse.json({ error: "Invalid session" }, { status: 401 });
  }
  const userId = userData.user.id;

  // Parse the uploaded file.
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Expected multipart/form-data body" }, { status: 400 });
  }
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing 'file' field" }, { status: 400 });
  }
  if (file.size === 0) {
    return NextResponse.json({ error: "Empty file" }, { status: 400 });
  }
  if (file.size > 8 * 1024 * 1024) {
    return NextResponse.json({ error: "File too large (max 8MB)" }, { status: 413 });
  }

  // Make sure the bucket exists (idempotent). This is the self-healing step
  // that removes the need for a manual migration run.
  const { data: bucketInfo } = await admin.storage.getBucket("avatars");
  if (!bucketInfo) {
    const { error: createErr } = await admin.storage.createBucket("avatars", {
      public: true,
      fileSizeLimit: 8 * 1024 * 1024,
      allowedMimeTypes: ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"],
    });
    if (createErr && !createErr.message.toLowerCase().includes("exists")) {
      return NextResponse.json(
        { error: `Failed to ensure bucket: ${createErr.message}` },
        { status: 500 }
      );
    }
  }

  // Derive extension from the mime type (fall back to the filename).
  const mimeToExt: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/heic": "heic",
    "image/heif": "heif",
  };
  const ext =
    mimeToExt[file.type] ??
    (file.name.split(".").pop() || "jpg").toLowerCase();

  const path = `${userId.toLowerCase()}/avatar.${ext}`;
  const bytes = new Uint8Array(await file.arrayBuffer());

  const { error: uploadErr } = await admin.storage
    .from("avatars")
    .upload(path, bytes, {
      upsert: true,
      contentType: file.type || "image/jpeg",
    });
  if (uploadErr) {
    return NextResponse.json({ error: uploadErr.message }, { status: 500 });
  }

  const { data: pub } = admin.storage.from("avatars").getPublicUrl(path);
  const url = `${pub.publicUrl}?v=${Date.now()}`;

  // Mirror the URL onto the profile so all platforms see it immediately.
  await admin.from("profiles").update({ avatar_url: url, updated_at: new Date().toISOString() }).eq("id", userId);

  return NextResponse.json({ url });
}
