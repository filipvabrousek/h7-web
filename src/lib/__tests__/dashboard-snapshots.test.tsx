/**
 * Snapshot regression tests for the H7 dashboard components.
 *
 * Each pure presentational component is rendered to an HTML string
 * via `react-dom/server` and snapshotted via vitest's built-in
 * `toMatchInlineSnapshot` / `toMatchSnapshot`. This catches a class
 * of bugs the helper-level tests in `dashboard-color-rules.test.ts`
 * miss:
 *
 *   1. View bypassing the helper (inlining the rule in JSX) — the
 *      snapshot will diff because the rendered DOM no longer reflects
 *      the helper's output.
 *   2. Wrong CSS property (e.g. `color` instead of `backgroundColor`)
 *      — the snapshot pins exactly which attribute carries which value.
 *   3. Wrong data shape passed to a component (e.g. day-of-week order
 *      flipped) — the rendered DOM exposes the bug visually.
 *
 * Snapshots are stored as `*.snap` files next to this test under
 * `__snapshots__/`. First run records, subsequent runs diff. Update
 * an intentionally-changed snapshot with `npm test -- -u`.
 *
 * Why string-rendering instead of a full DOM (jsdom)? Speed and
 * stability — `renderToString` is deterministic, has no async
 * effects, no `useEffect` re-renders, and produces the same bytes
 * every time. The components under test are pure (no hooks, no
 * network); a full DOM environment buys nothing here.
 *
 * Snapshot scenarios mirror the 3 seed test accounts from
 * `scripts/seed-test-accounts.ts`:
 *   - Alice: H1 white belt beginner
 *   - Bob:   H6 brown belt intermediate (banked)
 *   - Carol: H14 master belt with the dashboard regression scenario
 *            (Mon 164 / Tue 211 / Wed 177 / Thu 166 / Fri 62)
 */

import { describe, it, expect } from "vitest";
import { renderToString } from "react-dom/server";
import { LevelBadge, LevelBadgeCard } from "@/components/level-badge";
import { DailyBarChart } from "@/components/weekly-bar-chart";
import { WeeklyConsistencyDots } from "@/components/weekly-consistency-dots";
import { ThisWeekCard } from "@/components/this-week-card";
import { LEVELS } from "@/lib/level-engine";
import type { ActivityLog } from "@/lib/types";

// ----------------------------------------------------------------------
// Fixture builders
// ----------------------------------------------------------------------

/** Build an ActivityLog at a fixed date in the current week.
 *  Anchored relative to a deterministic Monday so snapshots are stable
 *  regardless of when tests run. The DailyBarChart bins by day-of-week
 *  via `startOfWeek()` which uses real `new Date()`, so we have to
 *  produce dates in the *current* calendar week to land in the right
 *  bins. We use today's week start. */
function activityFor(dayOffset: number, durationMinutes: number, activityType = "Running"): ActivityLog {
  const weekStart = new Date();
  weekStart.setHours(0, 0, 0, 0);
  // Mon=1, Sun=0 in JS — convert so Mon=0 is the offset base.
  const day = weekStart.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  weekStart.setDate(weekStart.getDate() + mondayOffset);
  const date = new Date(weekStart);
  date.setDate(date.getDate() + dayOffset);
  date.setHours(12, 0, 0, 0);
  return {
    id: `snap-${dayOffset}-${durationMinutes}`,
    user_id: "snap-user",
    date: date.toISOString(),
    duration_minutes: durationMinutes,
    activity_type: activityType,
    source: "manual",
    intensity: 4,
    user_level: "H7",
    source_id: null,
    created_at: null,
  } as ActivityLog;
}

// ----------------------------------------------------------------------
// LevelBadge — every belt rung
// ----------------------------------------------------------------------

describe("LevelBadge — visual catalog of all 15 belts", () => {
  it.each(LEVELS.map((l) => l.value))("renders H%i with the canonical belt color", (value) => {
    const html = renderToString(<LevelBadge level={value} size={40} />);
    // Inline snapshot — keeps the expected output next to the test for
    // easy review. If a belt's color hex changes, this diff makes it
    // obvious which one drifted.
    expect(html).toMatchSnapshot(`H${value}`);
  });
});

// ----------------------------------------------------------------------
// LevelBadgeCard — three seed accounts
// ----------------------------------------------------------------------

describe("LevelBadgeCard — three seed-account states", () => {
  it("Alice (H1 white belt beginner)", () => {
    const html = renderToString(
      <LevelBadgeCard
        level={1}
        beltName="White Belt"
        streak={3}
        dailyTarget={LEVELS[1].dailyMinutes}
      />,
    );
    expect(html).toMatchSnapshot();
  });

  it("Bob (H6 brown belt intermediate)", () => {
    const html = renderToString(
      <LevelBadgeCard
        level={6}
        beltName="Brown Belt"
        streak={11}
        dailyTarget={LEVELS[6].dailyMinutes}
      />,
    );
    expect(html).toMatchSnapshot();
  });

  it("Carol (H14 master belt — matches dashboard screenshot)", () => {
    const html = renderToString(
      <LevelBadgeCard
        level={14}
        beltName="Master Belt"
        streak={53}
        dailyTarget={LEVELS[14].dailyMinutes}
      />,
    );
    expect(html).toMatchSnapshot();
  });
});

// ----------------------------------------------------------------------
// DailyBarChart — the regression scenario itself
// ----------------------------------------------------------------------

// ----------------------------------------------------------------------
// Per-scenario complete dashboard cards
//
// Each of the 3 seed accounts (Alice / Bob / Carol) snapshots all
// four dashboard cards with the same inputs across platforms — see
// the run-tests.sh PDF report layout for how these surface side-by-
// side with iOS XCTest and Android Paparazzi outputs.
// ----------------------------------------------------------------------

describe("Per-scenario dashboard cards — Alice / Bob / Carol", () => {
  // ---- Alice — H1 white belt, 60/60 H1 target met (Sat) ----------

  it("alice — daily bar chart (Mon 30, Wed 30 walking)", () => {
    const html = renderToString(
      <DailyBarChart activities={[activityFor(0, 30, "Walking"), activityFor(2, 30, "Walking")]} />,
    );
    expect(html).toMatchSnapshot();
  });

  it("alice — weekly consistency (Sat: Mon 30 + Wed 30, 2 active days → 210/wk → H3 orange)", () => {
    // Active-days rule: divisor = 2 (only Mon and Wed have minutes),
    // not 6 (calendar days through Sat). (30+30)/2 × 7 = 210 → H3
    // orange (≥180, <240). The OLD calendar-elapsed rule gave H1
    // white (70/wk) by inflating the divisor with empty days.
    const html = renderToString(
      <WeeklyConsistencyDots dayMinutes={[30, 0, 30, 0, 0, 0, 0]} todayIdx={5} />,
    );
    expect(html).toMatchSnapshot();
  });

  it("alice — week progress (60/60 H1 met → BeltGreen)", () => {
    const html = renderToString(
      <ThisWeekCard
        currentMinutes={60}
        targetMinutes={60}
        targetLevel={LEVELS[1]}
        daysRemainingInWeek={5}
      />,
    );
    expect(html).toMatchSnapshot();
  });

  // ---- Bob — H6 brown belt, 250/360 H6 target unmet (Wed) -------

  it("bob — daily bar chart (Mon 60 / Tue 90 / Wed 100)", () => {
    const html = renderToString(
      <DailyBarChart activities={[
        activityFor(0, 60, "Running"),
        activityFor(1, 90, "Cycling"),
        activityFor(2, 100, "Strength Training"),
      ]} />,
    );
    expect(html).toMatchSnapshot();
  });

  it("bob — weekly consistency (Wed: Mon 60 + Tue 90 + Wed 100, 3 active days → 583.3/wk → H9 diamond)", () => {
    // Active-days rule = calendar-elapsed rule here because every day
    // through Wed has minutes — both produce divisor=3, (250/3)*7 =
    // 583.3 → H9 diamond (≥540, <600).
    const html = renderToString(
      <WeeklyConsistencyDots dayMinutes={[60, 90, 100, 0, 0, 0, 0]} todayIdx={2} />,
    );
    expect(html).toMatchSnapshot();
  });

  it("bob — week progress (250/360 H6 unmet → tint H6 brown)", () => {
    const html = renderToString(
      <ThisWeekCard
        currentMinutes={250}
        targetMinutes={360}
        targetLevel={LEVELS[6]}
        daysRemainingInWeek={4}
      />,
    );
    expect(html).toMatchSnapshot();
  });
});

describe("DailyBarChart — Carol's dashboard regression scenario", () => {
  it("renders 5 belt-coloured bars for Mon 164 / Tue 211 / Wed 177 / Thu 166 / Fri 62", () => {
    // Each day's activity from the screenshot. The point of pinning
    // this snapshot: if the bar-color rule ever silently regresses
    // back to rolling-average, the rendered HTML's inline-style
    // `background-color` for the Friday bar will diff from H7 black
    // to whatever the rolling-avg (H14 purple) produces.
    const activities: ActivityLog[] = [
      activityFor(0, 164),
      activityFor(1, 211),
      activityFor(2, 177),
      activityFor(3, 166),
      activityFor(4, 62),
    ];
    const html = renderToString(<DailyBarChart activities={activities} />);
    expect(html).toMatchSnapshot();
  });

  it("renders an empty week as 7 transparent bars", () => {
    const html = renderToString(<DailyBarChart activities={[]} />);
    expect(html).toMatchSnapshot();
  });
});

// ----------------------------------------------------------------------
// WeeklyConsistencyDots — three seed-account scenarios
// ----------------------------------------------------------------------

describe("WeeklyConsistencyDots — three seed-account scenarios", () => {
  // ---- Filip — banked H7 black belt, 53 week streak (shared) ----

  it("filip — level badge (H7 black, 53 week streak — shared between #1 and #2)", () => {
    const html = renderToString(
      <LevelBadgeCard
        level={7}
        beltName="Black Belt"
        streak={53}
        dailyTarget={LEVELS[7].dailyMinutes}
      />,
    );
    expect(html).toMatchSnapshot();
  });

  it("filip — daily bar chart sat morning (Mon 57, Tue 70 only)", () => {
    const html = renderToString(
      <DailyBarChart activities={[
        activityFor(0, 49, "Running"),
        activityFor(0, 8, "Running"),
        activityFor(1, 51, "Running"),
        activityFor(1, 19, "Swimming"),
      ]} />,
    );
    expect(html).toMatchSnapshot();
  });

  it("filip — week progress sat morning (127/420 H7 unmet → tint H7 black)", () => {
    const html = renderToString(
      <ThisWeekCard
        currentMinutes={127}
        targetMinutes={420}
        targetLevel={LEVELS[7]}
        daysRemainingInWeek={5}
      />,
    );
    expect(html).toMatchSnapshot();
  });

  it("filip — daily bar chart sat evening (Mon-Fri all logged)", () => {
    const html = renderToString(
      <DailyBarChart activities={[
        activityFor(0, 49, "Running"), activityFor(0, 8, "Running"),
        activityFor(1, 51, "Running"), activityFor(1, 19, "Swimming"),
        activityFor(2, 75, "Running"),
        activityFor(3, 57, "Running"),
        activityFor(4, 11, "Running"),
      ]} />,
    );
    expect(html).toMatchSnapshot();
  });

  it("filip — week progress sat evening (270/420 H7 unmet → tint H7 black)", () => {
    const html = renderToString(
      <ThisWeekCard
        currentMinutes={270}
        targetMinutes={420}
        targetLevel={LEVELS[7]}
        daysRemainingInWeek={2}
      />,
    );
    expect(html).toMatchSnapshot();
  });

  it("Filip real data Sat morning 2026-05-02 — partial sync (Mon+Tue only) projects to H7 black", () => {
    // Earlier sync state on the same Saturday: only Mon and Tue
    // HealthKit imports had landed; Wed-Fri activities not yet pushed
    // through Garmin Connect. Active-days rule: Mon 57 + Tue 70 = 127
    // over 2 active days → (127/2)*7 = 444.5/wk → H7 black
    // (420 ≤ 444 < 480). This is the exact data state that triggered
    // the "why are circles yellow?" investigation — the OLD calendar-
    // elapsed rule divided by 6 (giving H2 yellow) and effectively
    // penalised the user for Wed-Fri not having synced yet.
    const html = renderToString(
      <WeeklyConsistencyDots
        dayMinutes={[57, 70, 0, 0, 0, 0, 0]}
        todayIdx={5}
      />,
    );
    expect(html).toMatchSnapshot();
  });

  it("Filip real data Sat 2026-05-02 — moderate week with Fri 11-min outlier projects to H6 brown", () => {
    // Real healthkit-imported pattern observed for filipvabrousek4@gmail.com
    // on 2026-05-02 (Saturday). Active-days rule: Mon 57 + Tue 70 +
    // Wed 75 + Thu 57 + Fri 11 = 270 over 5 active days (Sat is zero
    // and excluded from the divisor) → (270/5)*7 = 378/wk → H6 brown
    // (360 ≤ 378 < 420). The OLD calendar-elapsed rule divided by 6
    // and produced H5 blue (315/wk) — the active-days rule lifts the
    // circles to reflect the actual training pace.
    const html = renderToString(
      <WeeklyConsistencyDots
        dayMinutes={[57, 70, 75, 57, 11, 0, 0]}
        todayIdx={5}
      />,
    );
    expect(html).toMatchSnapshot();
  });

  it("Carol — strong week, all 5 elapsed circles paint H14 master purple", () => {
    // Through Friday: rolling-avg projection = H14 every day, so all
    // filled circles must paint master purple (#4D0D73).
    const html = renderToString(
      <WeeklyConsistencyDots
        dayMinutes={[164, 211, 177, 166, 62, 0, 0]}
        todayIdx={4}
      />,
    );
    expect(html).toMatchSnapshot();
  });

  it("100-min Mon, 1 active day through Tue — projects to H11 sapphire (active-days rule)", () => {
    // Active-days rule: only Mon contributes (Tue is zero), so divisor
    // = 1. (100/1)*7 = 700/wk → H11 sapphire (660 ≤ 700 < 720). This
    // is the case where the new rule diverges most sharply from the
    // OLD calendar-elapsed math (which gave 350/wk → H5 blue): the
    // user's pace on the day they trained projects very high, and
    // empty Tue doesn't drag it down.
    //
    // Pinned per spec rules.md line 4 — circles paint the work the
    // user actually did, independent of banked level (no max-rule).
    const html = renderToString(
      <WeeklyConsistencyDots dayMinutes={[100, 0, 0, 0, 0, 0, 0]} todayIdx={1} />,
    );
    expect(html).toMatchSnapshot();
  });

  it("Alice — light walking, Mon-only 30-min H3-orange circle", () => {
    // 1 active day, sum=30, (30/1)*7 = 210/wk → H3 orange. Same
    // result under both old and new rule because divisor is 1 either
    // way (only Monday is the elapsed day).
    const html = renderToString(
      <WeeklyConsistencyDots dayMinutes={[30, 0, 0, 0, 0, 0, 0]} todayIdx={0} />,
    );
    expect(html).toMatchSnapshot();
  });

  it("empty week — 7 hollow placeholders", () => {
    const html = renderToString(
      <WeeklyConsistencyDots dayMinutes={[0, 0, 0, 0, 0, 0, 0]} todayIdx={0} />,
    );
    expect(html).toMatchSnapshot();
  });
});

// ----------------------------------------------------------------------
// ThisWeekCard — progress bar coloring, including the cross-platform
// "flip to green on met" parity rule
// ----------------------------------------------------------------------

describe("ThisWeekCard — progress bar parity", () => {
  it("Alice unmet — 30 of 60 H1, bar paints H1 white target tint", () => {
    const html = renderToString(
      <ThisWeekCard
        currentMinutes={30}
        targetMinutes={60}
        targetLevel={LEVELS[1]}
        daysRemainingInWeek={5}
      />,
    );
    expect(html).toMatchSnapshot();
  });

  it("Carol near master — 780 of 840 H14, bar paints H14 master purple", () => {
    const html = renderToString(
      <ThisWeekCard
        currentMinutes={780}
        targetMinutes={840}
        targetLevel={LEVELS[14]}
        daysRemainingInWeek={2}
      />,
    );
    expect(html).toMatchSnapshot();
  });

  // Companion snapshots to "target met" — the other dashboard cards
  // for the same coherent scenario (60 min × 7 days = 420 = H7 exact).
  // Used in the PDF Progress-bar-parity section to show the full
  // dashboard alongside the BeltGreen bar.
  it("target met — daily bar chart (60 min × 7 days, all H7 black)", () => {
    const html = renderToString(
      <DailyBarChart activities={[
        activityFor(0, 60, "Walking"),
        activityFor(1, 60, "Walking"),
        activityFor(2, 60, "Walking"),
        activityFor(3, 60, "Walking"),
        activityFor(4, 60, "Walking"),
        activityFor(5, 60, "Walking"),
        activityFor(6, 60, "Walking"),
      ]} />,
    );
    expect(html).toMatchSnapshot();
  });

  it("target met — weekly consistency (60/day rolling avg → H7 black all 7 circles)", () => {
    const html = renderToString(
      <WeeklyConsistencyDots dayMinutes={[60, 60, 60, 60, 60, 60, 60]} todayIdx={6} />,
    );
    expect(html).toMatchSnapshot();
  });

  it("target met — bar flips to BeltGreen, label flips to TARGET MET (cross-platform parity)", () => {
    // Cross-platform parity guard: if anyone reverts the helper to
    // "always belt color", the rendered HTML's progress-bar
    // background-color attribute will switch from #33B859 (BeltGreen)
    // back to #1F1F1F (H7 black) and this snapshot diffs.
    const html = renderToString(
      <ThisWeekCard
        currentMinutes={420}
        targetMinutes={420}
        targetLevel={LEVELS[7]}
        daysRemainingInWeek={1}
      />,
    );
    expect(html).toMatchSnapshot();
  });

  it("target met at top of staircase — shows 'MAX LEVEL' instead of 'TARGET MET'", () => {
    const html = renderToString(
      <ThisWeekCard
        currentMinutes={840}
        targetMinutes={840}
        targetLevel={LEVELS[14]}
        isMaxLevel
        daysRemainingInWeek={1}
      />,
    );
    expect(html).toMatchSnapshot();
  });
});
