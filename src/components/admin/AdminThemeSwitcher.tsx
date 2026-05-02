"use client";

import { Sun, Moon, Monitor } from "lucide-react";
import { useTheme, type ThemeMode } from "@/lib/theme";

const THEME_OPTIONS: Array<{ mode: ThemeMode; icon: typeof Sun; label: string }> = [
  { mode: "light", icon: Sun, label: "Light" },
  { mode: "dark", icon: Moon, label: "Dark" },
  { mode: "system", icon: Monitor, label: "System" },
];

/**
 * Compact 3-button Light / Dark / System pill rendered in the top-right
 * of the admin layout. Wired to the same `ThemeProvider` (`useTheme`) the
 * rest of the app uses, so the choice persists in `localStorage`
 * ("h7_theme") and applies the `.dark` class to <html> the same way the
 * Profile-screen theme picker does.
 *
 * Lives as its own client component because the parent admin layout is
 * an `async` server component and `useTheme` is client-only.
 */
export function AdminThemeSwitcher() {
  const { mode, setMode } = useTheme();
  return (
    <div
      role="group"
      aria-label="Theme"
      className="inline-flex gap-1 p-1 rounded-lg bg-gray-100 dark:bg-gray-800"
    >
      {THEME_OPTIONS.map((opt) => {
        const Icon = opt.icon;
        const active = mode === opt.mode;
        return (
          <button
            key={opt.mode}
            type="button"
            onClick={() => setMode(opt.mode)}
            aria-label={opt.label}
            aria-pressed={active}
            title={opt.label}
            className={`flex items-center justify-center w-8 h-7 rounded-md text-xs transition ${
              active
                ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm"
                : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
            }`}
          >
            <Icon size={14} />
          </button>
        );
      })}
    </div>
  );
}
