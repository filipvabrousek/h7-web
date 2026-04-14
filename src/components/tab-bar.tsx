"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, TrendingUp, Users, CalendarDays, User } from "lucide-react";

const tabs = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/my-path", label: "My Path", icon: TrendingUp },
  { href: "/connect", label: "Connect", icon: Users },
  { href: "/history", label: "History", icon: CalendarDays },
  { href: "/profile", label: "Profile", icon: User },
];

export function TabBar() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 z-40 sm:static sm:border-t-0 sm:border-r sm:w-20 sm:flex-col sm:pt-6 sm:flex-shrink-0 sm:self-stretch">
      <div className="flex sm:flex-col items-center justify-around sm:justify-start sm:gap-6 h-16 sm:h-auto max-w-lg mx-auto sm:max-w-none">
        {/* Logo — desktop sidebar only */}
        <div className="hidden sm:flex items-center justify-center mb-4">
          <span className="text-lg font-black text-yellow-500">H7</span>
        </div>

        {tabs.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== "/" && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center gap-0.5 text-xs transition-colors ${
                active
                  ? "text-blue-600 dark:text-blue-400"
                  : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              }`}
            >
              <Icon size={20} strokeWidth={active ? 2.5 : 1.8} />
              <span className={active ? "font-bold" : "font-medium"}>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
