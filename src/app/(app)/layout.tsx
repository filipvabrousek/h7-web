"use client";

import { TabBar } from "@/components/tab-bar";
import { useTheme, type ThemeMode } from "@/lib/theme";
import { Sun, Moon, Monitor } from "lucide-react";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { mode: themeMode, setMode: setThemeMode } = useTheme();
  const cycleTheme = () => {
    const order: ThemeMode[] = ["system", "light", "dark"];
    setThemeMode(order[(order.indexOf(themeMode) + 1) % order.length]);
  };
  const ThemeIcon = themeMode === "light" ? Sun : themeMode === "dark" ? Moon : Monitor;

  return (
    <div className="flex flex-col sm:flex-row h-screen">
      <TabBar />
      <main className="flex-1 pb-20 sm:pb-0 overflow-y-auto relative">
        {/* Global dark mode toggle — top right on all pages */}
        <button
          type="button"
          onClick={cycleTheme}
          aria-label={`Theme: ${themeMode}`}
          title={`Theme: ${themeMode}`}
          className="fixed top-4 right-4 z-30 w-9 h-9 rounded-xl bg-gray-100 dark:bg-[#242A2A] border border-gray-200 dark:border-gray-700 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-700 transition shadow-sm"
        >
          <ThemeIcon size={16} className="text-gray-700 dark:text-gray-200" />
        </button>
        <div className="max-w-xl mx-auto px-4 py-6">{children}</div>
      </main>
    </div>
  );
}
