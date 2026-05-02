/**
 * Regression tests for every color rule the web Dashboard renders.
 *
 * Pure engine math is already pinned by `level-engine.test.ts`. This
 * file pins the *binding* layer — the view-side rules in
 * `lib/dashboard-color-rules.ts` that translate an engine `LevelDef`
 * into a CSS color string.
 *
 * If someone later "refactors" the web bar chart back to rolling-
 * average (the same regression iOS and Android are now protected
 * against), the engine fixture still passes — but `barColor(62) ===
 * colorForLevel(7)` would fail and the bug surfaces in `npm test`.
 *
 * **Important contract**: each tested helper MUST be the SOLE color
 * path called from the corresponding component. If you inline the
 * rule in a JSX style={{...}} block instead of calling the helper,
 * the test silently passes against the helper but the view drifts.
 * Search for "do NOT inline" comments in
 *   - `src/components/weekly-bar-chart.tsx`
 *   - `src/app/(app)/page.tsx`
 *   - `src/components/level-badge.tsx`
 * for the contract on each call site.
 *
 * Engine math (`levelFromWeeklyMinutes`, `rollingAverageLevel`) is
 * driven from the shared cross-platform `level-engine.json` fixture,
 * mirroring the iOS / Android dashboard-color tests so a fix landed
 * in only one platform fails the web suite as well.
 */

import { describe, it, expect, beforeAll } from "vitest";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  colorForLevel,
  textColorForLevel,
  levelFromValue,
  LEVELS,
} from "@/lib/level-engine";
import {
  INACTIVE_BAR_COLOR,
  barColor,
  barProjectedLevel,
  consistencyCircleColor,
  consistencyCircleLevel,
  consistencyCircleTextColor,
  badgeColor,
  badgeTextColor,
  progressBarColor,
  targetIsMet,
  toLevelLabelColor,
} from "@/lib/dashboard-color-rules";

// ---- Fixture loading -------------------------------------------------

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const FIXTURE_PATH = join(__dirname, "../../../../test-fixtures/level-engine.json");

interface Fixture {
  levelFromWeeklyMinutes: Array<{ name: string; weeklyMinutes: number; expectedLevel: number }>;
  rollingAverageLevel: Array<{
    name: string;
    dailyMinutes: number[];
    throughDay: number;
    expectedLevel: number;
  }>;
  consistencyCircleScenarios: Array<{
    name: string;
    dailyMinutes: number[];
    throughDay: number;
    expectedLevel: number;
  }>;
  progressBarScenarios: Array<{
    name: string;
    currentMinutes: number;
    targetMinutes: number;
    targetLevel: number;
    expectedLevel: number;
  }>;
}

const fixture: Fixture = JSON.parse(readFileSync(FIXTURE_PATH, "utf-8"));

// The shared fixture sweep cases assume H8-H14 unlocked. Set the flag
// in beforeAll (vitest.setup.ts already installs a localStorage shim
// and toggles the flag — this is just a defensive re-set in case a
// previous test in the same worker cleared it).
beforeAll(() => {
  localStorage.setItem("h7_extended_staircase", "true");
});

// ---- DailyBarChart — barColor / barProjectedLevel --------------------

describe("DailyBarChart bar color rule", () => {
  it("dashboard screenshot: per-day colors match the spec rule", () => {
    // The exact regression scenario fixed in 2026-04 on iOS first then
    // mirrored here. Friday 62-minute light day must paint H7 black,
    // not the rolling-average's H14 purple.
    const cases: Array<[number, number]> = [
      [164, 14],   // 164 × 7 = 1148 → above H14 ceiling → H14 (purple)
      [211, 14],
      [177, 14],
      [166, 14],
      [ 62,  7],   //  62 × 7 = 434 → H7 (BLACK) — the bug
    ];
    for (const [mins, expectedLevel] of cases) {
      expect(barColor(mins)).toBe(colorForLevel(expectedLevel));
    }
  });

  it("every belt rung paints the canonical belt color", () => {
    for (let raw = 0; raw <= 14; raw++) {
      const level = levelFromValue(raw);
      if (raw === 0) {
        // H0 == "no activity" → returns the inactive placeholder, NOT
        // colorForLevel(0). A zero-minute day shouldn't paint as a
        // "gray belt".
        expect(barColor(0)).toBe(INACTIVE_BAR_COLOR);
        continue;
      }
      // Pick a per-day value 1 minute above this rung's daily floor
      // (weekly threshold ÷ 7 + 1) so the projection lands safely
      // inside the rung's band rather than at the boundary.
      const dayMins = Math.floor(level.weeklyMinutes / 7) + 1;
      expect(barProjectedLevel(dayMins).value).toBe(raw);
      expect(barColor(dayMins)).toBe(colorForLevel(raw));
    }
  });

  it("shared fixture cases — projection matches engine across all rungs", () => {
    // Drive barProjectedLevel with the same `levelFromWeeklyMinutes`
    // cases used by the engine test. Each weekly minutes value is
    // split into a daily value that, when × 7, lands in the same or
    // higher band — confirming the view-side rule provably matches
    // the engine-side rule for every fixture row.
    for (const c of fixture.levelFromWeeklyMinutes) {
      if (c.weeklyMinutes <= 0) continue;
      const dayMins = Math.ceil(c.weeklyMinutes / 7);
      const projected = barProjectedLevel(dayMins);
      expect(projected.value).toBeGreaterThanOrEqual(c.expectedLevel);
    }
  });

  it("zero-minute day paints the transparent placeholder, not gray belt", () => {
    expect(barColor(0)).toBe(INACTIVE_BAR_COLOR);
    expect(barColor(-5)).toBe(INACTIVE_BAR_COLOR); // defensive
  });
});

// ---- WeeklyConsistency — consistencyCircleColor ----------------------

describe("Weekly Consistency circles", () => {
  it("shared fixture cases — pure rolling average from Monday", () => {
    // Drives the circle rule with the spec example cases (Mon 20 →
    // yellow, Mon-Tue 55 → orange, Mon-Wed 65 → yellow) plus the
    // "fluctuates independently of banked level" guard. Same JSON
    // consumed by iOS DashboardColorTests + Android DashboardColorsTest.
    for (const c of fixture.consistencyCircleScenarios) {
      expect(consistencyCircleLevel(c.dailyMinutes, c.throughDay).value).toBe(
        c.expectedLevel,
      );
      expect(consistencyCircleColor(c.dailyMinutes, c.throughDay)).toBe(
        colorForLevel(c.expectedLevel),
      );
    }
  });

  it("strong week: all 5 elapsed circles tint to the same H14 master", () => {
    // Reproduces the dashboard screenshot scenario where every day's
    // rolling average projects to H14.
    const daily = [164, 211, 177, 166, 62, 0, 0];
    for (let throughDay = 0; throughDay <= 4; throughDay++) {
      expect(consistencyCircleColor(daily, throughDay)).toBe(colorForLevel(14));
    }
  });

  it("circles fluctuate independently of banked level (active-days rule)", () => {
    // Per spec rules.md line 4 ("Průměrují se ... jen ty kruhy nad
    // sloupci"): circles reflect "live pace" averaged over the days
    // the user actually trained — not banked status, and not calendar-
    // elapsed days. The badge above continues to show banked status
    // (effectiveLevel = max(currentWeek, banked)) — but the circles
    // are pure rolling-average over active days, so a 100-min Monday
    // with Tue empty paints H11 sapphire (the user's pace on the day
    // they trained, projected to a full week of that pace).
    //
    // Counterpart to the engine-level effectiveLevel test in
    // level-engine.test.ts — they're not contradictory:
    //   • effectiveLevel (badge): max(currentWeek, banked) → H7
    //   • consistency circles:    active-days rolling avg → H11
    const daily = [100, 0, 0, 0, 0, 0, 0];
    // 100 over 1 active day → (100/1)*7 = 700 weekly → H11 sapphire
    // (660 ≤ 700 < 720). Pre-2026-05 rule divided by 2 calendar days
    // → 350 weekly → H5 blue, dragging the circles below the user's
    // actual effort on the day they did log activity.
    expect(consistencyCircleLevel(daily, 1).value).toBe(11);
  });

  it("circle text color contrasts with the fill across all 15 belts", () => {
    // Walks every belt threshold by feeding a one-day pace that
    // projects to that belt, asserts the inner-number text color
    // matches the contrast rule (light belts → dark; rest → white).
    for (let raw = 0; raw <= 14; raw++) {
      const level = levelFromValue(raw);
      const dayMins = raw === 0 ? 0 : Math.floor(level.weeklyMinutes / 7) + 1;
      // single-day rolling avg — input lands on this belt
      const daily = [dayMins, 0, 0, 0, 0, 0, 0];
      expect(consistencyCircleTextColor(daily, 0)).toBe(textColorForLevel(raw));
    }
  });
});

// ---- LevelBadge — badgeColor / badgeTextColor ------------------------

describe("Level badge", () => {
  it("every belt rung paints the canonical belt color", () => {
    for (const level of LEVELS) {
      expect(badgeColor(level)).toBe(colorForLevel(level.value));
    }
  });

  it("text color: two-group classification (light belts → dark, rest → white)", () => {
    // Mirrors the iOS three-group test, but web only has two groups
    // (no `.secondary` quirk for H0 — H0 just gets white like every
    // other dark/saturated belt).
    const darkTextLevels = new Set([1, 2, 8, 9, 13]);
    for (const level of LEVELS) {
      const actual = badgeTextColor(level);
      expect(actual).toBe(textColorForLevel(level.value));
      if (darkTextLevels.has(level.value)) {
        expect(actual).toBe("#1A1A1F"); // dark text on light belts
      } else {
        expect(actual).toBe("#FFFFFF"); // white text on dark/saturated belts
      }
    }
  });
});

// ---- ThisWeek progress bar — progressBarColor / toLevelLabelColor ----

describe("This-week progress card", () => {
  it("unmet target: bar tints to the target belt", () => {
    // 200 min into a 420 min (H7) target → bar paints H7 black.
    expect(progressBarColor(200, 420, LEVELS[7])).toBe(colorForLevel(7));
  });

  it("met target: bar flips to BeltGreen (cross-platform parity)", () => {
    // Sweep H1-H14: regardless of which target belt the user just
    // cleared, the bar must paint colorForLevel(4) (BeltGreen, #33B859).
    // Pre-parity, web kept the bar belt-tinted; now matches iOS / Android.
    for (let raw = 1; raw <= 14; raw++) {
      const level = LEVELS[raw];
      // currentMinutes safely above target → met
      expect(progressBarColor(level.weeklyMinutes + 10, level.weeklyMinutes, level))
        .toBe(colorForLevel(4));
    }
  });

  it("null target level falls back to gray (defensive, only when also unmet)", () => {
    // computeStatus always supplies a target level in production, but
    // the helper must not crash if that ever regresses.
    expect(progressBarColor(50, 420, null)).toBe(colorForLevel(0));
    expect(progressBarColor(50, 420, undefined)).toBe(colorForLevel(0));
  });

  it("targetIsMet boundary: equals threshold = met; below = not met", () => {
    expect(targetIsMet(420, 420)).toBe(true);
    expect(targetIsMet(421, 420)).toBe(true);
    expect(targetIsMet(419, 420)).toBe(false);
    // Zero-target case: not considered met regardless of currentMinutes.
    expect(targetIsMet(100, 0)).toBe(false);
  });

  it("'TO Hn' label color mirrors the bar's target tint", () => {
    for (const level of LEVELS) {
      expect(toLevelLabelColor(level)).toBe(colorForLevel(level.value));
    }
  });

  // Cross-platform parity — same fixture cases drive the iOS XCTest
  // and Android JUnit suites' progressBar tests. A divergence in any
  // platform's helper fails CI here on the next `npm test`.
  describe("progressBarColor — cross-platform parity (shared fixture)", () => {
    for (const c of fixture.progressBarScenarios) {
      it(c.name, () => {
        const targetLevel = LEVELS[c.targetLevel];
        const actual = progressBarColor(c.currentMinutes, c.targetMinutes, targetLevel);
        expect(actual).toBe(colorForLevel(c.expectedLevel));
      });
    }
  });
});
