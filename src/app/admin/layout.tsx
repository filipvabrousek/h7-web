import Link from "next/link";
import { requireAuthUser, isAdminEmail } from "@/lib/admin/guard";
import { AdminShell } from "@/components/admin/AdminShell";

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
          <div className="text-xs text-gray-500 space-y-2">
            <p>Add this email to the <code className="font-mono">ADMIN_EMAILS</code> allowlist:</p>
            <pre className="bg-gray-100 dark:bg-[#242A2A] rounded-lg p-3 text-[11px] overflow-auto">
ADMIN_EMAILS={user.email ?? "your@email"}
            </pre>
            <p>
              <span className="font-semibold">Local:</span> set in <code className="font-mono">.env.local</code> and restart <code className="font-mono">npm run dev</code>.
            </p>
            <p>
              <span className="font-semibold">Production:</span> set in Vercel Project&nbsp;Settings → Environment&nbsp;Variables (Production scope), then redeploy.
            </p>
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

  // AdminShell is a client component so it can manage drawer state for
  // the responsive sidebar (collapses to a hamburger-toggled off-canvas
  // drawer below md). The auth check stays here in the server layout.
  return <AdminShell email={user.email ?? ""}>{children}</AdminShell>;
}
