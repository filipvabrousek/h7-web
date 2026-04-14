import Link from "next/link";
import { requireAuthUser, isAdminEmail } from "@/lib/admin/guard";
import { AdminSidebar } from "@/components/admin/AdminSidebar";

export const metadata = {
  title: "H7 Admin",
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAuthUser();

  if (!isAdminEmail(user.email)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 p-6">
        <div className="max-w-md w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 space-y-4">
          <h1 className="text-lg font-semibold">Admin access denied</h1>
          <p className="text-sm text-gray-500">
            You are signed in as{" "}
            <code className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-[#242A2A] text-gray-900 dark:text-gray-100 font-mono text-xs">
              {user.email ?? "unknown"}
            </code>
            , which is not on the admin allowlist.
          </p>
          <div className="text-xs text-gray-500 space-y-1">
            <p>To grant access, add this email to <code className="font-mono">ADMIN_EMAILS</code> in <code className="font-mono">.env.local</code>:</p>
            <pre className="bg-gray-100 dark:bg-[#242A2A] rounded-lg p-3 text-[11px] overflow-auto">
ADMIN_EMAILS={user.email ?? "your@email"}
            </pre>
            <p>Then restart <code className="font-mono">npm run dev</code>.</p>
          </div>
          <Link
            href="/"
            className="inline-block text-sm text-blue-600 hover:underline"
          >
            ← Back to app
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-950">
      <AdminSidebar email={user.email ?? ""} />
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto p-6 sm:p-8">{children}</div>
      </main>
    </div>
  );
}
