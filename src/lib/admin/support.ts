import "server-only";
import { createAdminClient } from "./serviceClient";
import type { SupportMessage } from "@/lib/types";

// ============================================================
// Support thread queries
// ============================================================

export interface SupportThreadSummary {
  userId: string;
  username: string;
  lastMessage: string;
  lastMessageAt: string;
  unreadFromUser: number;
  totalMessages: number;
}

/** Group support_messages by user_id and return one row per thread. */
export async function loadSupportThreads(): Promise<SupportThreadSummary[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("support_messages")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  const messages: SupportMessage[] = (data ?? []) as SupportMessage[];

  const grouped = new Map<string, SupportMessage[]>();
  for (const m of messages) {
    const arr = grouped.get(m.user_id) ?? [];
    arr.push(m);
    grouped.set(m.user_id, arr);
  }

  const summaries: SupportThreadSummary[] = [];
  for (const [userId, msgs] of grouped) {
    const sorted = [...msgs].sort((a, b) => b.created_at.localeCompare(a.created_at));
    const last = sorted[0];
    // "Unread from user" = trailing run of user-side messages without a
    // support reply after them
    let unread = 0;
    for (const m of sorted) {
      if (m.is_from_support) break;
      unread++;
    }
    summaries.push({
      userId,
      username: last.username || "User",
      lastMessage: last.text ?? (last.media_url ? "📷 Media" : ""),
      lastMessageAt: last.created_at,
      unreadFromUser: unread,
      totalMessages: msgs.length,
    });
  }

  summaries.sort((a, b) => b.lastMessageAt.localeCompare(a.lastMessageAt));
  return summaries;
}

export async function loadSupportThread(userId: string): Promise<SupportMessage[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("support_messages")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as SupportMessage[];
}
