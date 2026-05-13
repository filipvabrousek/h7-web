"use client";

import { useEffect, useState } from "react";
import type { LevelDef } from "@/lib/level-engine";
import { progressBarColor, toLevelLabelColor } from "@/lib/dashboard-color-rules";

/**
 * Tracks whether the document root has the `dark` class applied — the
 * source of truth maintained by `<ThemeProvider>` in `lib/theme.tsx`.
 *
 * Read this way (rather than via `useTheme`) so the card renders fine
 * inside isolated snapshot/unit tests that mount it without a
 * `ThemeProvider` wrapper. SSR returns `false` — the inline init
 * script in <head> still flips the class before paint so there's no
 * flash; the first client render reconciles to the real value.
 */
function useIsDark(): boolean {
  const [isDark, setIsDark] = useState(false);
  useEffect(() => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    const sync = () => setIsDark(root.classList.contains("dark"));
    sync();
    const obs = new MutationObserver(sync);
    obs.observe(root, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);
  return isDark;
}

/**
 * "This Week" progress card — extracted from `app/(app)/page.tsx` so
 * the vitest snapshot suite has a standalone component to render. The
 * inline version in page.tsx now re-uses this; do NOT inline back —
 * snapshot regression coverage depends on this being a leaf
 * presentational component.
 *
 * Mirrors iOS `WeekProgressView` and Android `ThisWeekCard`. Cross-
 * platform parity: progress bar tints to target belt while unmet,
 * flips to BeltGreen on met (pinned by `progressBarScenarios` in the
 * shared fixture).
 */
export interface ThisWeekCardProps {
  currentMinutes: number;
  targetMinutes: number;
  /** Belt the bar's filling toward — `currentWeekTargetLevel` from
   *  `computeStatus`. Advances to the next rung once the current belt
   *  is banked for the week, in lock-step with `targetMinutes`. */
  targetLevel: LevelDef;
  /** True when the user is at the top of their staircase (H7 or H14
   *  depending on the extended-staircase setting) so the card shows
   *  "MAX LEVEL" instead of "TARGET MET" when the threshold is met. */
  isMaxLevel?: boolean;
  /** Calendar days left in the current week (Mon–Sun), inclusive of today.
   *  Monday = 7, …, Sunday = 1. Used to render "30' / 4 days". */
  daysRemainingInWeek?: number;
}

export function ThisWeekCard({
  currentMinutes,
  targetMinutes,
  targetLevel,
  isMaxLevel = false,
  daysRemainingInWeek = 0,
}: ThisWeekCardProps) {
  const remaining = Math.max(0, targetMinutes - currentMinutes);
  const daysRemaining = daysRemainingInWeek;
  const progress =
    targetMinutes > 0 ? Math.min((currentMinutes / targetMinutes) * 100, 100) : 0;
  const targetMet = currentMinutes >= targetMinutes && targetMinutes > 0;
  // Dark-mode lift on belt colors so the bar and "TO Hn" chip pop
  // against the dark card surface. Mirrors iOS WeekProgressView and
  // Android DashboardColorRules.adapt(...). Reads the .dark class
  // straight off <html> (set by ThemeProvider's init script + state)
  // so the card stays render-stable when mounted outside a provider
  // in unit/snapshot tests. Light mode passes through unchanged.
  const isDark = useIsDark();

  return (
    // Subtle lift in dark mode only — a low-alpha white tint sits over
    // the card surface so the block reads one step above the dashboard
    // background. Implemented as an inset overlay (absolute + inset-0)
    // so the underlying card color is preserved. Mirrors iOS
    // WeekProgressView's `Color.white.opacity(0.04)` overlay.
    <div className="relative rounded-2xl p-5 bg-gray-900 dark:bg-gray-950 border border-gray-800">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-2xl hidden dark:block bg-white/[0.04]"
      />
      <div className="relative flex items-center justify-between">
        <div>
          <div className="flex items-baseline gap-1">
            <span className="text-4xl font-black text-white leading-none">
              {currentMinutes}
            </span>
            <span className="text-xl font-bold text-gray-500 leading-none">
              /{targetMinutes}
            </span>
          </div>
          <div className="text-xs font-bold text-gray-400 tracking-wider uppercase mt-2">
            This Week Activity
          </div>
        </div>
        <div className="text-right">
          {!targetMet ? (
            <>
              {/* "TO Hn" tracks the TARGET, not the user's current
                  badge — pinned by `toLevelLabelColor`. `isDark` lifts
                  the chip color in dark mode only so it pops against
                  the dark card surface. */}
              <div
                className="text-base font-black"
                style={{ color: toLevelLabelColor(targetLevel, isDark) }}
              >
                TO H{targetLevel.value}
              </div>
              <div className="text-base font-bold text-white mt-1">
                {remaining}&apos; / {daysRemaining} days
              </div>
            </>
          ) : isMaxLevel ? (
            <div className="text-base font-black text-emerald-400">MAX LEVEL</div>
          ) : (
            <div className="text-base font-black text-emerald-400">TARGET MET</div>
          )}
        </div>
      </div>
      <div className="relative h-1 bg-gray-800 dark:bg-white/[0.14] rounded-full overflow-hidden mt-4">
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${progress}%`,
            // Pinned by `progressBarColor` — do NOT inline. Cross-
            // platform parity: tints to target belt while unmet,
            // flips to BeltGreen on met. `isDark` lifts the fill in
            // dark mode only — keeps belt swatches everywhere else
            // in the app untouched.
            backgroundColor: progressBarColor(
              currentMinutes,
              targetMinutes,
              targetLevel,
              isDark,
            ),
          }}
        />
      </div>
    </div>
  );
}
