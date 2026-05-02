"use client";

import { H7_BELT_SURFACE } from "@/lib/level-engine";
import {
  consistencyCircleColor,
  consistencyCircleTextColor,
} from "@/lib/dashboard-color-rules";

/**
 * Weekly Consistency dots — extracted from `app/(app)/page.tsx` so the
 * vitest snapshot suite has a standalone component to render. The
 * inline version in page.tsx now re-uses this; do NOT inline back —
 * snapshot regression coverage depends on this being a leaf
 * presentational component.
 *
 * Per spec rules.md line 4 ("Průměrují se ... jen ty kruhy nad
 * sloupci"): all elapsed circles share ONE color = the current rolling
 * average across ACTIVE DAYS ONLY. Days with zero logged minutes are
 * excluded from BOTH numerator and denominator — see
 * `rollingAverageLevel` in level-engine.ts for the math.
 *
 * Concrete spec example (Wednesday today, Mon 20, Tue 35, Wed 10):
 *   3 active days → (65/3)*7 = 151.7/wk → H2 yellow → all three
 *   Mon/Tue/Wed circles render H2 yellow.
 *
 * Concrete field-regression example (Saturday today, Mon 57, Tue 70,
 * Wed-Fri unsynced, Sat-Sun zero):
 *   2 active days → (127/2)*7 = 444.5/wk → H7 black → both Mon and
 *   Tue circles render H7 black even though four calendar days have
 *   elapsed since with no data. The old calendar-elapsed divisor
 *   would have given H2 yellow — that's the bug this rule fixes.
 *
 * No max-rule with banked level. The container is a fixed neutral gray
 * (H7BeltSurface) so true H1 white and H7 black belts stay visible.
 */
export interface WeeklyConsistencyDotsProps {
  /** Mon-first array of 7 numbers — minutes per day this week. */
  dayMinutes: number[];
  /** Index of "today" in the dayMinutes array (Mon=0 … Sun=6). Days
   *  past this index are rendered as not-yet-elapsed placeholders. */
  todayIdx: number;
}

export function WeeklyConsistencyDots({ dayMinutes, todayIdx }: WeeklyConsistencyDotsProps) {
  const dayCaps = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

  return (
    <div className="rounded-2xl p-4" style={{ backgroundColor: H7_BELT_SURFACE }}>
      <h3 className="text-sm font-black tracking-wider mb-4" style={{ color: "#191A1E" }}>
        WEEKLY CONSISTENCY
      </h3>
      <div className="flex justify-between">
        {dayCaps.map((label, i) => {
          const mins = dayMinutes[i] ?? 0;
          const isElapsed = i <= todayIdx;
          const hasMinutes = mins > 0;
          // Per-day fill / text colors via the pure helpers — pinned by
          // dashboard-color-rules.test.ts. Same call site that the
          // page.tsx inline version used; do NOT inline back.
          const fillColor = consistencyCircleColor(dayMinutes, todayIdx);
          const textColor = consistencyCircleTextColor(dayMinutes, todayIdx);
          return (
            <div key={i} className="flex flex-col items-center gap-2 flex-1">
              <span
                className="text-[11px] font-bold tracking-wide"
                style={{ color: "rgba(25,26,30,0.6)" }}
              >
                {label}
              </span>
              <div
                className="w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold"
                style={
                  hasMinutes
                    ? { backgroundColor: fillColor, color: textColor }
                    : isElapsed
                      ? { backgroundColor: "rgba(0,0,0,0.06)", color: "rgba(25,26,30,0.35)" }
                      : { backgroundColor: "rgba(0,0,0,0.04)", color: "rgba(25,26,30,0.30)" }
                }
              >
                {hasMinutes ? mins : "–"}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
