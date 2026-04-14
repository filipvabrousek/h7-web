import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { loadSupportThread } from "@/lib/admin/support";
import { createAdminClient } from "@/lib/admin/serviceClient";
import { requireAuthUser, isAdminEmail } from "@/lib/admin/guard";
import { SupportThreadView } from "@/components/admin/SupportThreadView";
import type { H7User } from "@/lib/types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function SupportThreadPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const user = await requireAuthUser();
  if (!isAdminEmail(user.email)) return null;

  const { userId } = await params;

  const messages = await loadSupportThread(userId);
  if (messages.length === 0) notFound();

  const supabase = createAdminClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  return (
    <div className="space-y-4">
      <Link
        href="/admin/support"
        className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 dark:hover:text-gray-200"
      >
        <ArrowLeft size={14} /> Back to inbox
      </Link>

      <SupportThreadView
        userId={userId}
        username={messages[0].username || profile?.username || "User"}
        profile={profile as H7User | null}
        initialMessages={messages}
      />
    </div>
  );
}
