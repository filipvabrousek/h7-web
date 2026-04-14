import Link from "next/link";
import { loadSupportThreads } from "@/lib/admin/support";
import { requireAuthUser, isAdminEmail } from "@/lib/admin/guard";
import { MessageCircle } from "lucide-react";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.round(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

export default async function SupportInboxPage() {
  const user = await requireAuthUser();
  if (!isAdminEmail(user.email)) return null;

  const threads = await loadSupportThreads();

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Support inbox</h1>
        <p className="text-sm text-gray-500 mt-1">
          {threads.length} thread{threads.length === 1 ? "" : "s"} ·{" "}
          {threads.reduce((s, t) => s + t.unreadFromUser, 0)} awaiting reply
        </p>
      </header>

      {threads.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-12 text-center text-gray-500">
          <MessageCircle size={32} className="mx-auto mb-3 opacity-40" />
          No support messages yet.
        </div>
      ) : (
        <ul className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 divide-y divide-gray-100 dark:divide-gray-800 overflow-hidden">
          {threads.map((t) => (
            <li key={t.userId}>
              <Link
                href={`/admin/support/${t.userId}`}
                className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition"
              >
                <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center font-semibold text-blue-700 dark:text-blue-300 shrink-0">
                  {t.username.slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-semibold text-sm truncate">{t.username}</span>
                    <span className="text-xs text-gray-400 shrink-0">{timeAgo(t.lastMessageAt)}</span>
                  </div>
                  <div className="text-sm text-gray-500 truncate mt-0.5">{t.lastMessage}</div>
                </div>
                {t.unreadFromUser > 0 && (
                  <span className="shrink-0 text-[11px] font-bold bg-blue-600 text-white rounded-full min-w-[20px] h-5 px-1.5 flex items-center justify-center">
                    {t.unreadFromUser}
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
