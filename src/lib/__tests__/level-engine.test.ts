/**
 * Shared-fixture regression tests for the H7 level engine (web side).
 *
 * Loads `/test-fixtures/level-engine.json` from the repo root (sibling
 * directory to `h7-web`) and walks every case. The same JSON is consumed
 * by the iOS XCTest target so a fix landed in only one platform fails
 * CI everywhere it hasn't been ported.
 *
 * What's NOT here: rendering tests, network tests, or anything that
 * depends on Supabase. Those belong in `*.integration.test.ts` files
 * we add later. This suite is intentionally pure-function only — it
 * runs in <100 ms and has zero external dependencies.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  levelFromWeeklyMinutes,
  rollingAverageLevel,
  computeStatus,
  startOfWeek,
  formatDate,
} from "@/lib/level-engine";
import type { ActivityLog, WeekRecord } from "@/lib/types";

// Resolve the shared fixture at repo root. __dirname-equivalent under ESM
// because vitest emits ESM by default with TS files.
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const FIXTURE_PATH = join(__dirname, "../../../../test-fixtures/level-engine.json");

interface Fixture {
  version: number;
  weeksForGrace: number;
  levelFromWeeklyMinutes: Array<{ name: string; weeklyMinutes: number; expectedLevel: number }>;
  rollingAverageLevel: Array<{
    name: string;
    dailyMinutes: number[];
    throughDay: number;
    expectedLevel: number;
  }>;
  processWeekEnd: Array<{
    name: string;
    previousLevel: number;
    weekMinutes: number;
    consecutiveAtLevel: number;
    expectedNewLevel: number;
    expectedGraceUsed: boolean;
  }>;
  weekRecordScenarios: Array<{
    name: string;
    weekLevels: number[];
    expectedCurrentLevel: number;
    expectedConsecutiveWeeks: number;
    expectedGraceAvailable: boolean;
    expectedGraceUsed: boolean;
  }>;
}

const fixture: Fixture = JSON.parse(readFileSync(FIXTURE_PATH, "utf-8"));

// ------------------------------------------------------------------
// levelFromWeeklyMinutes
// ------------------------------------------------------------------

describe("levelFromWeeklyMinutes — shared fixture", () => {
  for (const c of fixture.levelFromWeeklyMinutes) {
    it(c.name, () => {
      expect(levelFromWeeklyMinutes(c.weeklyMinutes).value).toBe(c.expectedLevel);
    });
  }
});

// ------------------------------------------------------------------
// rollingAverageLevel
// ------------------------------------------------------------------

describe("rollingAverageLevel — shared fixture", () => {
  for (const c of fixture.rollingAverageLevel) {
    it(c.name, () => {
      expect(rollingAverageLevel(c.dailyMinutes, c.throughDay).value).toBe(c.expectedLevel);
    });
  }
});

// ------------------------------------------------------------------
// processWeekEnd
//
// The web engine doesn't ship a standalone `processWeekEnd` export
// (the equivalent logic is inlined in `recalculateWeekRecord` in
// hooks.ts). We replicate the same three-rule contract here as a
// pure function so the shared fixture keeps testing the rule itself,
// not its embedding. If the inline version ever drifts from this
// reference, the platform-parity guarantee breaks — so guarding the
// reference is the highest-value thing this test does.
// ------------------------------------------------------------------

const WEEKS_FOR_GRACE = fixture.weeksForGrace;

function processWeekEnd(
  previousLevel: number,
  weekMinutes: number,
  consecutiveWeeksAtLevel: number,
): { newLevel: number; graceUsed: boolean } {
  const achieved = levelFromWeeklyMinutes(weekMinutes).value;
  if (achieved >= previousLevel) return { newLevel: achieved, graceUsed: false };
  if (consecutiveWeeksAtLevel >= WEEKS_FOR_GRACE) return { newLevel: previousLevel, graceUsed: true };
  return { newLevel: Math.max(0, previousLevel - 1), graceUsed: false };
}

describe("processWeekEnd — shared fixture", () => {
  for (const c of fixture.processWeekEnd) {
    it(c.name, () => {
      const result = processWeekEnd(c.previousLevel, c.weekMinutes, c.consecutiveAtLevel);
      expect(result.newLevel).toBe(c.expectedNewLevel);
      expect(result.graceUsed).toBe(c.expectedGraceUsed);
    });
  }
});

// ------------------------------------------------------------------
// weekRecordScenarios — exercises replayHistory via computeStatus
//
// Strategy: pick a fixed Monday as `currentDate`, build N synthetic
// week_records as Mondays going BACK from the prior week (so none
// collide with the in-progress week), feed an empty activity list
// → currentWeekMinutes=0 → currentWeekLevel=H0 → effectiveLevel
// = max(H0, history.level) = history.level. The status fields then
// reflect replayHistory's output directly.
// ------------------------------------------------------------------

function makeWeekRecord(weekStart: Date, levelAchieved: number): WeekRecord {
  return {
    id: `wr-${formatDate(weekStart)}`,
    user_id: "fixture-user",
    week_start: weekStart.toISOString(),
    total_minutes: levelAchieved * 60,
    level_achieved: levelAchieved,
    is_grace_week: false,
    created_at: null,
  };
}

describe("weekRecordScenarios — shared fixture (via computeStatus)", () => {
  // Anchor on a known Monday so weekStart math is deterministic
  // regardless of when the test runs. 2026-04-13 is a Monday.
  const anchor = new Date("2026-04-13T10:00:00Z");
  const currentWeekStart = startOfWeek(anchor);

  for (const c of fixture.weekRecordScenarios) {
    it(c.name, () => {
      // Build records oldest-first ending at "last week" so none of
      // them is the current week.
      const records: WeekRecord[] = c.weekLevels.map((lvl, i) => {
        const offsetWeeks = c.weekLevels.length - i; // oldest = largest offset
        const ws = new Date(currentWeekStart);
        ws.setDate(ws.getDate() - offsetWeeks * 7);
        return makeWeekRecord(ws, lvl);
      });

      const activities: ActivityLog[] = [];
      const status = computeStatus(activities, records, anchor);

      expect(status.currentLevel.value).toBe(c.expectedCurrentLevel);
      expect(status.consecutiveWeeks).toBe(c.expectedConsecutiveWeeks);
      expect(status.graceAvailable).toBe(c.expectedGraceAvailable);
      expect(status.graceUsed).toBe(c.expectedGraceUsed);
    });
  }
});

// ------------------------------------------------------------------
// effectiveLevel max-rule (the 53-week-streak Tuesday-morning bug)
// ------------------------------------------------------------------

describe("effectiveLevel = max(currentWeekLevel, bankedLevel)", () => {
  it("user banked at H7 with only 100 min logged so far this week stays at H7, not H1", () => {
    const anchor = new Date("2026-04-14T10:00:00Z"); // Tuesday
    const currentWeekStart = startOfWeek(anchor);

    // 4 prior weeks at H7 → banked = H7 with grace available
    const records: WeekRecord[] = [4, 3, 2, 1].map((offset) => {
      const ws = new Date(currentWeekStart);
      ws.setDate(ws.getDate() - offset * 7);
      return makeWeekRecord(ws, 7);
    });

    // Mon-only 100 min logged → currentWeekLevel = H1
    const monday = new Date(currentWeekStart);
    const activities: ActivityLog[] = [
      {
        id: "a1",
        user_id: "fixture-user",
        date: monday.toISOString(),
        duration_minutes: 100,
        activity_type: "Walking",
        source: "manual",
        intensity: 3,
        user_level: "H7",
        source_id: null,
        created_at: null,
      },
    ];

    const status = computeStatus(activities, records, anchor);
    expect(status.currentLevel.value).toBe(7); // not 1
    expect(status.currentWeekMinutes).toBe(100);
  });

  it("live promotion: current week exceeds banked → show the higher level", () => {
    const anchor = new Date("2026-04-17T10:00:00Z"); // Thursday
    const currentWeekStart = startOfWeek(anchor);

    // Banked H6 from 2 prior weeks
    const records: WeekRecord[] = [2, 1].map((offset) => {
      const ws = new Date(currentWeekStart);
      ws.setDate(ws.getDate() - offset * 7);
      return makeWeekRecord(ws, 6);
    });

    // Already 500 min this week → H8 territory
    const monday = new Date(currentWeekStart);
    const activities: ActivityLog[] = [
      {
        id: "a1",
        user_id: "fixture-user",
        date: monday.toISOString(),
        duration_minutes: 500,
        activity_type: "Running",
        source: "manual",
        intensity: 4,
        user_level: "H6",
        source_id: null,
        created_at: null,
      },
    ];

    const status = computeStatus(activities, records, anchor);
    expect(status.currentLevel.value).toBe(8);
  });
});
