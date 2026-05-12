"use client";

import type { LevelDef } from "@/lib/level-engine";
import { progressBarColor, toLevelLabelColor } from "@/lib/dashboard-color-rules";

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

  return (
    <div className="rounded-2xl p-5 bg-gray-900 dark:bg-gray-950 border border-gray-800">
      <div className="flex items-center justify-between">
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
                  badge — pinned by `toLevelLabelColor`. */}
              <div
                className="text-base font-black"
                style={{ color: toLevelLabelColor(targetLevel) }}
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
      <div className="h-1 bg-gray-800 rounded-full overflow-hidden mt-4">
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${progress}%`,
            // Pinned by `progressBarColor` — do NOT inline. Cross-
            // platform parity: tints to target belt while unmet,
            // flips to BeltGreen on met.
            backgroundColor: progressBarColor(currentMinutes, targetMinutes, targetLevel),
          }}
        />
      </div>
    </div>
  );
}
