"use server";

import { revalidatePath } from "next/cache";
import { requireAuthUser, isAdminEmail } from "@/lib/admin/guard";
import { createAdminClient } from "@/lib/admin/serviceClient";

export async function sendSupportReply(formData: FormData) {
  const user = await requireAuthUser();
  if (!isAdminEmail(user.email)) {
    return { error: "Forbidden: not an admin." };
  }

  const userId = String(formData.get("userId") ?? "").trim();
  const text = String(formData.get("text") ?? "").trim();

  if (!userId || !text) {
    return { error: "Missing user or message text." };
  }

  const supabase = createAdminClient();
  const { error } = await supabase.from("support_messages").insert({
    user_id: userId,
    username: "Support",
    text,
    media_url: null,
    media_type: null,
    is_from_support: true,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/admin/support/${userId}`);
  revalidatePath("/admin/support");
  return { ok: true };
}
