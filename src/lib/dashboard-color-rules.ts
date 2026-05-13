/**
 * Pure color rules for every dashboard view that paints belt colors.
 *
 * Lives as top-level functions (no React, no hooks, no DOM) so the
 * vitest unit-test suite at src/lib/__tests__/dashboard-color-rules.
 * test.ts can drive each rule with raw inputs and assert on the
 * resulting CSS-color string without rendering a component.
 *
 * Components MUST call these helpers — do NOT inline the rule. If you
 * inline, the unit tests still pass on the helper but the view silently
 * drifts. Search for the "do NOT inline" comments in
 * `src/components/weekly-bar-chart.tsx` and `src/app/(app)/page.tsx`
 * for the contract on each call site.
 *
 * Mirrors iOS `DailyBarChartView.barColor(forDayMinutes:)` /
 * `WeeklyConsistencyView.filledCircleColor(...)` / etc. and Android
 * `DashboardColorRules.barColor(...)` / `consistencyCircleColor(...)`.
 * Engine math (`levelFromWeeklyMinutes`, `rollingAverageLevel`) is
 * shared via the canonical level-engine.json fixture, so the per-
 * platform rules cannot drift apart silently.
 */

import {
  colorForLevel,
  textColorForLevel,
  levelFromWeeklyMinutes,
  rollingAverageLevel,
  type LevelDef,
} from "./level-engine";

// ----------------------------------------------------------
// Daily bar chart
// ----------------------------------------------------------

/** Inactive (zero-minute) bar — transparent placeholder, matching the
 *  original DailyBarChart behavior. iOS uses a faint dark slate; the
 *  web chart sits on a tinted card surface so transparent is correct. */
export const INACTIVE_BAR_COLOR = "transparent";

/**
 * Belt earned by THIS DAY's contribution alone, projected to a full
 * week (minutes × 7). The "if every day were like this day, what level
 * would I hit?" rule, per spec rules.md line 3 ("8 minut bude vždy bílý
 * a 62 min bude vždy černý"). Returns H0 for zero minutes.
 */
export function barProjectedLevel(dayMinutes: number): LevelDef {
  return levelFromWeeklyMinutes(dayMinutes * 7);
}

/**
 * Fill color (CSS string) for a single bar in DailyBarChart. Active
 * days surface their projected belt color; empty days render the
 * transparent placeholder.
 *
 * Pre-2026-04 the rule was `rollingAverageLevel(rawMinutes, i)`, which
 * painted a strong-week Friday with master purple even though 62
 * minutes alone is H7 black. Same iOS/Android bug, fixed in all three
 * platforms.
 */
export function barColor(dayMinutes: number): string {
  if (dayMinutes <= 0) return INACTIVE_BAR_COLOR;
  return colorForLevel(barProjectedLevel(dayMinutes).value);
}

// ----------------------------------------------------------
// Weekly consistency circles
// ----------------------------------------------------------

/**
 * Belt the filled circles tint to: PURE rolling-average projection
 * from Monday through `throughDay`. No max-rule with banked level.
 * Per spec rules.md lines 1-4 the circles reflect "live pace this
 * week" (klouzavý průměr od pondělí), independent of the badge's
 * banked status.
 *
 * Pre-spec the rule was `max(rollingAverage, bankedLevel)` — the
 * "never visually demote the badge" UX choice was a deliberate
 * product decision but contradicts the spec's "playful real-time
 * pace indicator". Mirrors iOS `WeeklyConsistencyView.filledCircleLevel`
 * and Android `DashboardColorRules.consistencyCircleLevel`.
 */
export function consistencyCircleLevel(
  dailyMinutes: number[],
  throughDay: number,
): LevelDef {
  return rollingAverageLevel(dailyMinutes, throughDay);
}

/** Fill color for a filled (active) consistency circle. */
export function consistencyCircleColor(
  dailyMinutes: number[],
  throughDay: number,
): string {
  return colorForLevel(consistencyCircleLevel(dailyMinutes, throughDay).value);
}

/** Text color contrasting with the circle fill — keeps the minute
 *  count legible across all 15 belt backgrounds. */
export function consistencyCircleTextColor(
  dailyMinutes: number[],
  throughDay: number,
): string {
  return textColorForLevel(consistencyCircleLevel(dailyMinutes, throughDay).value);
}

// ----------------------------------------------------------
// Level badge
// ----------------------------------------------------------

/** Belt color the badge circle paints with. Trivial wrapper, but
 *  pinning it as a helper means the regression test asserts the
 *  master-belt chip uses the master color, not the gold one. */
export function badgeColor(level: LevelDef): string {
  return colorForLevel(level.value);
}

/** Text color of the H_n label inside the badge circle. */
export function badgeTextColor(level: LevelDef): string {
  return textColorForLevel(level.value);
}

// ----------------------------------------------------------
// This-week progress card
// ----------------------------------------------------------

/** True iff the user has met the current target this week. */
export function targetIsMet(currentMinutes: number, targetMinutes: number): boolean {
  return targetMinutes > 0 && currentMinutes >= targetMinutes;
}

/**
 * Fill color of the progress bar.
 *
 * Cross-platform parity rule (level-engine.json `progressBarScenarios`):
 *   • While `currentMinutes < targetMinutes` → tint to the target belt
 *   • Once `currentMinutes >= targetMinutes` → flip to BeltGreen,
 *     which is identical to `colorForLevel(4)` on all platforms
 *
 * Pre-parity, web kept the bar belt-tinted on met and surfaced
 * "TARGET MET" via a separate emerald text label. iOS and Android
 * already flipped to green; web now matches. The spec (rules.md) is
 * silent on this — the convergence is a UX decision, pinned by the
 * `progressBarScenarios` cases the same fixture-driven helper test
 * runs through on every platform.
 *
 * `targetLevel` is non-nullable in production (`computeStatus` always
 * supplies `currentWeekTargetLevel`), but the helper defaults to
 * `colorForLevel(0)` if it ever regresses to null — neutral gray
 * rather than a crash.
 *
 * `isDark` lifts the belt color in dark mode only (HSL lightness +10%,
 * saturation −5%) so the bar pops against the dark card surface. Light
 * mode passes through — keeps belt swatches everywhere else in the app
 * untouched. Mirrors iOS WeekProgressView.adapt(_:scheme:) and Android
 * DashboardColorRules.adapt(...).
 */
export function progressBarColor(
  currentMinutes: number,
  targetMinutes: number,
  targetLevel: LevelDef | null | undefined,
  isDark: boolean = false,
): string {
  if (targetIsMet(currentMinutes, targetMinutes)) {
    // BeltGreen == colorForLevel(4) — H4 belt color, #33B859.
    return adapt(colorForLevel(4), isDark);
  }
  if (!targetLevel) return colorForLevel(0);
  return adapt(colorForLevel(targetLevel.value), isDark);
}

/** Color of the "TO Hn" label on the right side of the card. Mirrors
 *  the progress bar tint so the two elements visually agree. */
export function toLevelLabelColor(
  targetLevel: LevelDef,
  isDark: boolean = false,
): string {
  return adapt(colorForLevel(targetLevel.value), isDark);
}

/**
 * Slight lift on belt colors in dark mode so the chip + bar pop against
 * the dark card surface. Light mode passes through — keeps belt
 * swatches everywhere else in the app untouched.
 *
 * Approach: convert the CSS hex through RGB → HSL, lift L by ~10
 * percentage points (clamped), shave 5 off saturation, convert back.
 * Roughly matches the iOS HSV brightness +0.18 / saturation −0.05 rule
 * for typical mid-saturation belt swatches (sRGB sits close enough to
 * HSL for our purposes — empty-mode hex strings only).
 *
 * Accepts the hex strings emitted by `colorForLevel`. Defensive on
 * malformed input → passes through.
 */
export function adapt(color: string, isDark: boolean): string {
  if (!isDark) return color;
  const m = /^#([0-9a-fA-F]{6})$/.exec(color);
  if (!m) return color;
  const n = parseInt(m[1], 16);
  const r = ((n >> 16) & 0xff) / 255;
  const g = ((n >> 8) & 0xff) / 255;
  const b = (n & 0xff) / 255;
  const maxC = Math.max(r, g, b);
  const minC = Math.min(r, g, b);
  const l = (maxC + minC) / 2;
  let h = 0;
  let s = 0;
  if (maxC !== minC) {
    const d = maxC - minC;
    s = l > 0.5 ? d / (2 - maxC - minC) : d / (maxC + minC);
    switch (maxC) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      default:
        h = ((r - g) / d + 4) / 6;
    }
  }
  const newL = Math.min(1, l + 0.1);
  const newS = Math.max(0, s - 0.05);
  const hue2rgb = (p: number, q: number, t: number): number => {
    let tt = t;
    if (tt < 0) tt += 1;
    if (tt > 1) tt -= 1;
    if (tt < 1 / 6) return p + (q - p) * 6 * tt;
    if (tt < 1 / 2) return q;
    if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6;
    return p;
  };
  let r2: number;
  let g2: number;
  let b2: number;
  if (newS === 0) {
    r2 = newL;
    g2 = newL;
    b2 = newL;
  } else {
    const q = newL < 0.5 ? newL * (1 + newS) : newL + newS - newL * newS;
    const p = 2 * newL - q;
    r2 = hue2rgb(p, q, h + 1 / 3);
    g2 = hue2rgb(p, q, h);
    b2 = hue2rgb(p, q, h - 1 / 3);
  }
  const toHex = (v: number): string =>
    Math.round(v * 255)
      .toString(16)
      .padStart(2, "0");
  return `#${toHex(r2)}${toHex(g2)}${toHex(b2)}`;
}
