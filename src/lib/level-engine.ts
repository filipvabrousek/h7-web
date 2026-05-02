// ============================================================
// H7 Level System & Engine — ported from iOS/Android
// ============================================================

import type { ActivityLog, WeekRecord } from "./types";
import { h7Minutes } from "./types";

// MARK: - Level Definition

export interface LevelDef {
  value: number;
  weeklyMinutes: number;
  dailyMinutes: number;
  displayName: string;
  beltName: string;
}

export const LEVELS: LevelDef[] = [
  { value: 0, weeklyMinutes: 0, dailyMinutes: 0, displayName: "H0", beltName: "Beginner" },
  { value: 1, weeklyMinutes: 60, dailyMinutes: 9, displayName: "H1", beltName: "White Belt" },
  { value: 2, weeklyMinutes: 120, dailyMinutes: 17, displayName: "H2", beltName: "Yellow Belt" },
  { value: 3, weeklyMinutes: 180, dailyMinutes: 26, displayName: "H3", beltName: "Orange Belt" },
  { value: 4, weeklyMinutes: 240, dailyMinutes: 35, displayName: "H4", beltName: "Green Belt" },
  { value: 5, weeklyMinutes: 300, dailyMinutes: 43, displayName: "H5", beltName: "Blue Belt" },
  { value: 6, weeklyMinutes: 360, dailyMinutes: 52, displayName: "H6", beltName: "Brown Belt" },
  { value: 7, weeklyMinutes: 420, dailyMinutes: 60, displayName: "H7", beltName: "Black Belt" },
  { value: 8, weeklyMinutes: 480, dailyMinutes: 69, displayName: "H8", beltName: "Platinum Belt" },
  { value: 9, weeklyMinutes: 540, dailyMinutes: 77, displayName: "H9", beltName: "Diamond Belt" },
  { value: 10, weeklyMinutes: 600, dailyMinutes: 86, displayName: "H10", beltName: "Ruby Belt" },
  { value: 11, weeklyMinutes: 660, dailyMinutes: 94, displayName: "H11", beltName: "Sapphire Belt" },
  { value: 12, weeklyMinutes: 720, dailyMinutes: 103, displayName: "H12", beltName: "Emerald Belt" },
  { value: 13, weeklyMinutes: 780, dailyMinutes: 111, displayName: "H13", beltName: "Gold Belt" },
  { value: 14, weeklyMinutes: 840, dailyMinutes: 120, displayName: "H14", beltName: "Master Belt" },
];

/** Check if extended staircase (H8-H14) is enabled */
export function isExtendedStaircase(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem("h7_extended_staircase") === "true";
}

/** Maximum allowed level value (7 or 14) */
export function maxLevelValue(): number {
  return isExtendedStaircase() ? 14 : 7;
}

export function levelFromValue(v: number): LevelDef {
  return LEVELS[Math.max(0, Math.min(maxLevelValue(), v))];
}

export function levelFromWeeklyMinutes(minutes: number): LevelDef {
  const max = maxLevelValue();
  let result = LEVELS[0];
  for (const l of LEVELS) {
    if (l.value > max) break;
    if (minutes >= l.weeklyMinutes) result = l;
  }
  return result;
}

// MARK: - Belt Colors

export const BELT_COLORS: Record<number, { color: string; bg: string }> = {
  0: { color: "#9E9E9E", bg: "#F2F2F2" },
  // H1 — TRUE pure white in both light and dark mode.
  1: { color: "#FFFFFF", bg: "#F5F5F5" },
  2: { color: "#ebfe00", bg: "#FFF5D1" },
  3: { color: "#FF8C00", bg: "#FFEBD1" },
  4: { color: "#33B859", bg: "#D9F2E0" },
  5: { color: "#063a72", bg: "#D9E6FB" },
  6: { color: "#8C592B", bg: "#EDE0D1" },
  7: { color: "#1F1F1F", bg: "#E0E0E0" },
  8: { color: "#B3B8BF", bg: "#F0F0F2" },
  9: { color: "#B8D9FA", bg: "#E8F0FB" },
  10: { color: "#CC1F33", bg: "#F5D1D5" },
  11: { color: "#1A3399", bg: "#D1D9F5" },
  12: { color: "#12804D", bg: "#D1F0DE" },
  13: { color: "#D9B333", bg: "#F5EED1" },
  14: { color: "#4D0D73", bg: "#E0D1F0" },
};

export function colorForLevel(level: number): string {
  return BELT_COLORS[level]?.color ?? "#9E9E9E";
}

export function bgForLevel(level: number): string {
  return BELT_COLORS[level]?.bg ?? "#F5F5F5";
}

/**
 * Text color that contrasts with the TRUE belt color in both light and dark mode.
 * Light belts (H1 white, H2 yellow, H8 platinum, H9 diamond, H13 gold) → dark text.
 * Dark/saturated belts → white text.
 */
export function textColorForLevel(level: number): string {
  if (level === 1 || level === 2 || level === 8 || level === 9 || level === 13) {
    return "#1A1A1F";
  }
  return "#FFFFFF";
}

/**
 * Neutral gray surface used wherever H1 (white) or H7 (black) belts appear,
 * so both extremes remain visible in light and dark mode. Same in both modes.
 */
export const H7_BELT_SURFACE = "#C7CACE";

// MARK: - Date Helpers

export function startOfWeek(date: Date = new Date()): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day; // Monday = start
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function dayOfWeek(date: Date): number {
  const d = date.getDay();
  return d === 0 ? 7 : d; // Mon=1 … Sun=7
}

export function formatDate(date: Date): string {
  // Use local date parts — toISOString() converts to UTC which shifts dates in non-UTC timezones
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function parseDate(s: string): Date {
  // For full ISO timestamps, parse directly to preserve timezone info
  if (s.includes("T")) return new Date(s);
  // Plain date string → treat as local midnight
  return new Date(s + "T00:00:00");
}

/** Extract YYYY-MM-DD in LOCAL timezone from any date string */
export function normalizeDate(s: string): string {
  // Parse to Date object first, then extract local date parts
  // This handles UTC timestamps correctly: "2026-03-31T23:00:00+00:00" → "2026-04-01" in CEST
  const d = new Date(s.includes("T") ? s : s + "T00:00:00");
  return formatDate(d);
}

// MARK: - Level Status

export interface LevelStatus {
  currentLevel: LevelDef;
  consecutiveWeeks: number;
  graceAvailable: boolean;
  graceUsed: boolean;
  weekStreak: number;
  projectedLevel: LevelDef;
  currentWeekMinutes: number;
  currentWeekTarget: number;
  /**
   * Belt the "This Week" progress bar is filling toward. Derived from
   * `currentWeekTarget` so the "TO Hn" readout stays in lock-step with
   * the bar's denominator: while the user is still earning their current
   * belt it equals `currentLevel`, but once the week's minutes have
   * banked that belt the target (and therefore this label) advances to
   * the next rung. Matches iOS / Android.
   */
  currentWeekTargetLevel: LevelDef;
}

// MARK: - Compute Status

export const WEEKS_FOR_GRACE = 3;

export function computeStatus(
  activities: ActivityLog[],
  weekRecords: WeekRecord[],
  currentDate: Date = new Date()
): LevelStatus {
  const weekStart = startOfWeek(currentDate);

  // Current week H7-qualifying minutes
  const currentWeekMinutes = activities
    .filter((a) => {
      const d = parseDate(a.date);
      return d >= weekStart && d <= currentDate;
    })
    .reduce((sum, a) => sum + h7Minutes(a), 0);

  const currentWeekLevel = levelFromWeeklyMinutes(currentWeekMinutes);

  // Projected level
  const dow = Math.max(dayOfWeek(currentDate), 1);
  const projectedWeekly = Math.floor((currentWeekMinutes / dow) * 7);
  const projectedLevel = levelFromWeeklyMinutes(projectedWeekly);

  // Sort records chronologically
  const sorted = [...weekRecords].sort((a, b) => a.week_start.localeCompare(b.week_start));
  const history = replayHistory(sorted);

  // Effective belt during the IN-PROGRESS week. Mirror of iOS /
  // Android: never drop below banked status mid-week. The week
  // isn't over — judging "you slacked" on a Tuesday morning when
  // the user has only logged a fraction of the minutes they need
  // is hostile UX. Demotion still happens at end-of-week when
  // recalculateWeekRecord stamps the actual levelAchieved, which
  // feeds back through replayHistory next Monday.
  //
  // Upward deviation is honored: if currentWeekLevel exceeds
  // history.level (live promotion), we show the higher level.
  //
  // Previously this had a third branch dropping to currentWeekLevel
  // when grace was already used in the prior completed week —
  // produced a "user with multi-week black-belt streak shows H2 on
  // Tuesday morning" bug. See iOS/Android LevelEngine for the
  // matching change.
  const effectiveLevel =
    currentWeekLevel.value > history.level.value
      ? currentWeekLevel
      : history.level;

  // Week streak
  let weekStreak = 0;
  for (let i = sorted.length - 1; i >= 0; i--) {
    if (sorted[i].level_achieved >= 1) weekStreak++;
    else break;
  }
  if (currentWeekMinutes >= 60) weekStreak++;

  // Target for the "This Week" progress bar.
  // Rolling semantics: the bar always fills toward the NEXT rung the
  // user hasn't banked yet.
  //   • While currentWeekMinutes < effectiveLevel.weeklyMinutes the
  //     target is the current belt's threshold (still earning the
  //     badge they hold; "TO Hn" readout shows the current level).
  //   • Once currentWeekMinutes >= effectiveLevel.weeklyMinutes the
  //     current belt is locked in for the week, so the target
  //     advances to the NEXT level's threshold and the "TO Hn+1"
  //     readout reflects the new goal. Without this step the bar
  //     sits pinned at 100 % and the countdown collapses to 0 as
  //     soon as the user crosses their own threshold — surfacing
  //     the next rung is the whole point of the card.
  // H0 has weeklyMinutes === 0, which would zero the progress
  // fraction, so fall back to H1 (60 min) for new users.
  const nextLevel = LEVELS[Math.min(effectiveLevel.value + 1, maxLevelValue())];
  const nextThreshold = nextLevel && nextLevel.value !== effectiveLevel.value
    ? nextLevel.weeklyMinutes
    : null;
  let target: number;
  if (effectiveLevel.weeklyMinutes === 0) {
    target = nextThreshold ?? 60;
  } else if (
    currentWeekMinutes >= effectiveLevel.weeklyMinutes &&
    nextThreshold !== null &&
    nextThreshold > effectiveLevel.weeklyMinutes
  ) {
    target = nextThreshold;
  } else {
    target = effectiveLevel.weeklyMinutes;
  }

  return {
    currentLevel: effectiveLevel,
    consecutiveWeeks: history.consecutiveWeeks,
    graceAvailable: history.graceAvailable,
    graceUsed: history.graceUsedThisWeek,
    weekStreak,
    projectedLevel,
    currentWeekMinutes,
    currentWeekTarget: target,
    currentWeekTargetLevel: levelFromWeeklyMinutes(target),
  };
}

// MARK: - History Replay

interface HistoryStatus {
  level: LevelDef;
  consecutiveWeeks: number;
  graceAvailable: boolean;
  graceUsedThisWeek: boolean;
}

function replayHistory(records: WeekRecord[]): HistoryStatus {
  if (records.length === 0) {
    return { level: LEVELS[0], consecutiveWeeks: 0, graceAvailable: false, graceUsedThisWeek: false };
  }

  let statusLevel = levelFromValue(records[0].level_achieved);
  let consecutiveAtStatus = 1;
  let graceAvailable = false;
  let lastGraceUsed = false;

  for (let i = 1; i < records.length; i++) {
    const achieved = levelFromValue(records[i].level_achieved);

    if (achieved.value >= statusLevel.value) {
      if (achieved.value > statusLevel.value) {
        statusLevel = achieved;
        consecutiveAtStatus = 1;
      } else {
        consecutiveAtStatus++;
      }
      graceAvailable = consecutiveAtStatus >= WEEKS_FOR_GRACE;
      lastGraceUsed = false;
    } else {
      if (graceAvailable && !lastGraceUsed) {
        lastGraceUsed = true;
        graceAvailable = false;
      } else {
        // No grace at the OLD level — drop exactly ONE level.
        //
        // SPEC (rules.md line 10): "next week I drop one step lower,
        // there I am again protected for one week. And in the same
        // rhythm I then possibly drop another step lower (always
        // protected for a week and then a drop by 1 step)."
        //
        // So every level drop AUTOMATICALLY arms grace at the new
        // level. Produces the alternating drop / protect / drop /
        // protect rhythm the spec describes for an extended absence
        // (illness, injury, work, travel) — without it a banked-H7
        // user who stops logging entirely would crash from black to
        // white in 6 weeks. Mirrors iOS / Android.
        const newVal = Math.max(0, statusLevel.value - 1);
        statusLevel = levelFromValue(newVal);
        consecutiveAtStatus = achieved.value >= statusLevel.value ? 1 : 0;
        graceAvailable = true;   // soft-landing: 1 free week at new level
        lastGraceUsed = false;
      }
    }
  }

  return { level: statusLevel, consecutiveWeeks: consecutiveAtStatus, graceAvailable, graceUsedThisWeek: lastGraceUsed };
}

// MARK: - Rolling Average

/**
 * Belt color for the weekly consistency circles.
 *
 * Rule (spec rules.md line 4 — "Průměrují se ... jen ty kruhy nad
 * sloupci"): the rolling average is taken over the days that have
 * LOGGED ACTIVITY only — zero-minute days are ignored in BOTH the
 * numerator and the denominator. So the circles paint the user's pace
 * on the days they actually trained, independent of how many rest /
 * unsynced days sit alongside.
 *
 * Concrete consequence: `[57, 70, 0, 0, 0, 0, 0]` queried with
 * `throughDay = 5` (Saturday) produces `127 / 2 × 7 = 444.5` → H7
 * black, NOT `127 / 6 × 7 = 148` → H2 yellow. This is the exact
 * "why are circles yellow when I logged 70+ minutes Mon and Tue?"
 * scenario from the field — the old calendar-elapsed divisor punished
 * users for unsynced or rest days they never opted into.
 *
 * `× 7` is the unit conversion into the canonical weekly-minute
 * threshold space (`levelFromWeeklyMinutes` compares against
 * 60/120/180/...). Mathematically equivalent to comparing the per-day
 * average directly against per-day thresholds.
 *
 * Edge cases:
 *   - `throughDay` out of range → H0 (defensive).
 *   - No active days in `[0..throughDay]` → H0 (no projection).
 */
export function rollingAverageLevel(dailyMinutes: number[], throughDay: number): LevelDef {
  if (throughDay < 0 || throughDay >= dailyMinutes.length) return LEVELS[0];
  const slice = dailyMinutes.slice(0, throughDay + 1);
  const total = slice.reduce((a, b) => a + b, 0);
  const activeDays = slice.filter(m => m > 0).length;
  if (activeDays === 0) return LEVELS[0];
  const projected = Math.floor((total / activeDays) * 7);
  return levelFromWeeklyMinutes(projected);
}
