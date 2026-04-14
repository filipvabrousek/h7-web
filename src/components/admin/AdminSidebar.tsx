"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, MessagesSquare, LogOut, ArrowLeft } from "lucide-react";
import { useSignOut } from "@/lib/hooks";

const NAV_ITEMS = [
  { href: "/admin", label: "Stats", icon: BarChart3, exact: true },
  { href: "/admin/support", label: "Support", icon: MessagesSquare, exact: false },
];

export function AdminSidebar({ email }: { email: string }) {
  const pathname = usePathname();
  const signOut = useSignOut();

  return (
    <aside className="w-60 shrink-0 border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 flex flex-col">
      <div className="px-5 py-5 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center gap-2">
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center text-yellow-400 font-black"
            style={{ backgroundColor: "#063a72" }}
          >
            H7
          </div>
          <div>
            <div className="text-sm font-bold">H7 Admin</div>
            <div className="text-[11px] text-gray-500 truncate max-w-[140px]">{email}</div>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-1">
        {NAV_ITEMS.map((item) => {
          const active = item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition ${
                active
                  ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 font-medium"
                  : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
              }`}
            >
              <Icon size={16} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t border-gray-200 dark:border-gray-800 space-y-1">
        <Link
          href="/"
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          <ArrowLeft size={16} />
          Back to app
        </Link>
        <button
          onClick={signOut}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10"
        >
          <LogOut size={16} />
          Sign out
        </button>
      </div>
    </aside>
  );
}
