/**
 * Seed three deterministic H7 test accounts so manual / e2e regression
 * runs always start from a known state. Run with:
 *
 *   SUPABASE_URL=https://<proj>.supabase.co \
 *   SUPABASE_SERVICE_ROLE_KEY=<service-role-key> \
 *   npm run seed:test-accounts
 *
 * Idempotent: every run looks up the test users by email, deletes them
 * (and their cascade-linked rows: profile, activity_logs, week_records,
 * deletion tombstones), then re-creates them from scratch. So you can
 * run it before any test session to wipe drift from prior runs.
 *
 * The three accounts span the H1 → H7 → H14 belt range so manual UI
 * checks across the dashboard, profile, and admin stats screens always
 * have variety:
 *
 *   alice@h7.test  — H1 white-belt beginner, 8 weeks of light walking
 *   bob@h7.test    — H6 brown-belt intermediate, 16 weeks with one grace consumption
 *   carol@h7.test  — H14 master, 30 weeks of heavy training; current week
 *                    matches the screenshot from the dashboard regression
 *                    (Mon 164 / Tue 211 / Wed 177 / Thu 166 / Fri 62)
 *
 * Each user gets:
 *   - auth.users row (created via admin API)
 *   - profile (height_cm, weight_kg, gender, birth_date, country)
 *   - activity_logs spanning their training history
 *   - week_records pre-stamped with the deterministic level
 *
 * Activity dates are derived from a frozen anchor (2026-04-13 Monday)
 * minus N weeks, NOT from `new Date()`. This makes the seeded data
 * deterministic regardless of when the script runs — every test session
 * gets the same week_starts and the same number of activities.
 */

import { createClient } from "@supabase/supabase-js";
import { config as loadEnv } from "dotenv";
import { resolve } from "node:path";

// Load .env.local from h7-web root if present so devs don't have to
// re-export SUPABASE_* on every shell.
loadEnv({ path: resolve(__dirname, "../.env.local") });

const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error(
    "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY — set them in env or .env.local before running.",
  );
  process.exit(1);
}

// Service-role client bypasses RLS. NEVER ship this to the browser
// bundle; this file is intentionally a Node-only script run via tsx.
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Frozen anchor — Monday 2026-04-13 UTC. All seed dates are relative
// to this so the data is bit-for-bit reproducible.
const ANCHOR = new Date("2026-04-13T00:00:00Z");

// Common test password. Per app safety policy this script does NOT
// auto-fill this anywhere — devs sign in manually with these creds.
const TEST_PASSWORD = "H7-test-1234!";

// ----------------------------------------------------------------------
// Account specs
// ----------------------------------------------------------------------

interface ActivitySpec {
  weekOffset: number;       // 0 = current week, 1 = last week, …
  dayOfWeek: number;        // 0=Mon … 6=Sun
  durationMinutes: number;
  activityType: string;
  intensity: number;        // 1=casual,2=conscious,3=challenging,4=vigorous,5=maximum
}

interface WeekRecordSpec {
  weekOffset: number;       // 0 = current week, 1 = last week, …
  totalMinutes: number;
  levelAchieved: number;
  isGraceWeek: boolean;
}

interface AccountSpec {
  email: string;
  password: string;
  username: string;
  profile: {
    height_cm: number;
    weight_kg: number;
    gender: "male" | "female" | "other";
    birth_date: string;     // ISO date
    country: string;
    initial_weekly_activity: number | null;
  };
  activities: ActivitySpec[];
  weekRecords: WeekRecordSpec[];
}

// --- Alice: beginner, 8 weeks at H1 -----------------------------------
const alice: AccountSpec = {
  email: "alice@h7.test",
  password: TEST_PASSWORD,
  username: "alice_test",
  profile: {
    height_cm: 168,
    weight_kg: 62,
    gender: "female",
    birth_date: "1995-06-15",
    country: "CZ",
    initial_weekly_activity: 60,
  },
  // 8 prior weeks of ~75 min/wk walking + a few logs in current week.
  activities: [
    // Current week (offset 0): Mon, Wed each 30 min
    { weekOffset: 0, dayOfWeek: 0, durationMinutes: 30, activityType: "Walking", intensity: 2 },
    { weekOffset: 0, dayOfWeek: 2, durationMinutes: 30, activityType: "Walking", intensity: 2 },
    // Past 8 weeks: 3 walks per week (~25 min each = 75 min/wk → H1)
    ...Array.from({ length: 8 }, (_, w) => [
      { weekOffset: w + 1, dayOfWeek: 0, durationMinutes: 25, activityType: "Walking", intensity: 2 },
      { weekOffset: w + 1, dayOfWeek: 2, durationMinutes: 25, activityType: "Walking", intensity: 2 },
      { weekOffset: w + 1, dayOfWeek: 4, durationMinutes: 25, activityType: "Walking", intensity: 2 },
    ]).flat(),
  ],
  weekRecords: Array.from({ length: 8 }, (_, w) => ({
    weekOffset: w + 1,
    totalMinutes: 75,
    levelAchieved: 1,
    isGraceWeek: false,
  })),
};

// --- Bob: intermediate, 16 weeks reaching H6 with one grace ----------
const bob: AccountSpec = {
  email: "bob@h7.test",
  password: TEST_PASSWORD,
  username: "bob_test",
  profile: {
    height_cm: 182,
    weight_kg: 84,
    gender: "male",
    birth_date: "1985-03-22",
    country: "CZ",
    initial_weekly_activity: 200,
  },
  activities: [
    // Current week: ~250 min logged so far (Mon-Wed)
    { weekOffset: 0, dayOfWeek: 0, durationMinutes: 60, activityType: "Running", intensity: 4 },
    { weekOffset: 0, dayOfWeek: 1, durationMinutes: 90, activityType: "Cycling", intensity: 3 },
    { weekOffset: 0, dayOfWeek: 2, durationMinutes: 100, activityType: "Strength Training", intensity: 4 },
    // 16 prior weeks at H6 pace (~360 min/wk), with week offset 4 deliberately light to trigger grace
    ...Array.from({ length: 16 }, (_, w) => {
      const offset = w + 1;
      const isGraceWeek = offset === 4;
      const totalMin = isGraceWeek ? 200 : 380;
      // Distribute roughly across Mon, Wed, Fri, Sat
      return [
        { weekOffset: offset, dayOfWeek: 0, durationMinutes: Math.floor(totalMin * 0.30), activityType: "Running", intensity: 4 },
        { weekOffset: offset, dayOfWeek: 2, durationMinutes: Math.floor(totalMin * 0.25), activityType: "Cycling", intensity: 3 },
        { weekOffset: offset, dayOfWeek: 4, durationMinutes: Math.floor(totalMin * 0.25), activityType: "Strength Training", intensity: 4 },
        { weekOffset: offset, dayOfWeek: 5, durationMinutes: Math.floor(totalMin * 0.20), activityType: "Hiking", intensity: 3 },
      ];
    }).flat(),
  ],
  weekRecords: Array.from({ length: 16 }, (_, w) => {
    const offset = w + 1;
    const isGraceWeek = offset === 4;
    return {
      weekOffset: offset,
      totalMinutes: isGraceWeek ? 200 : 380,
      // Grace week: H6 status preserved despite only logging 200 min (would be H3 alone)
      levelAchieved: 6,
      isGraceWeek,
    };
  }),
};

// --- Carol: master, 30 weeks at H14, current week matches screenshot --
const carol: AccountSpec = {
  email: "carol@h7.test",
  password: TEST_PASSWORD,
  username: "carol_test",
  profile: {
    height_cm: 170,
    weight_kg: 68,
    gender: "female",
    birth_date: "1978-11-03",
    country: "CZ",
    initial_weekly_activity: 800,
  },
  activities: [
    // Current week — matches the dashboard screenshot exactly:
    // Mon 164, Tue 211, Wed 177, Thu 166, Fri 62, Sat/Sun 0
    { weekOffset: 0, dayOfWeek: 0, durationMinutes: 164, activityType: "Running", intensity: 4 },
    { weekOffset: 0, dayOfWeek: 1, durationMinutes: 211, activityType: "Cycling", intensity: 4 },
    { weekOffset: 0, dayOfWeek: 2, durationMinutes: 177, activityType: "Strength Training", intensity: 4 },
    { weekOffset: 0, dayOfWeek: 3, durationMinutes: 166, activityType: "Triathlon", intensity: 5 },
    { weekOffset: 0, dayOfWeek: 4, durationMinutes: 62,  activityType: "Yoga", intensity: 2 },
    // 30 prior weeks at H14 pace (~900 min/wk)
    ...Array.from({ length: 30 }, (_, w) => {
      const offset = w + 1;
      return [
        { weekOffset: offset, dayOfWeek: 0, durationMinutes: 160, activityType: "Running", intensity: 4 },
        { weekOffset: offset, dayOfWeek: 1, durationMinutes: 200, activityType: "Cycling", intensity: 4 },
        { weekOffset: offset, dayOfWeek: 2, durationMinutes: 170, activityType: "Strength Training", intensity: 4 },
        { weekOffset: offset, dayOfWeek: 3, durationMinutes: 160, activityType: "Swimming", intensity: 4 },
        { weekOffset: offset, dayOfWeek: 4, durationMinutes: 120, activityType: "Triathlon", intensity: 5 },
        { weekOffset: offset, dayOfWeek: 5, durationMinutes: 100, activityType: "Hiking", intensity: 3 },
      ];
    }).flat(),
  ],
  weekRecords: Array.from({ length: 30 }, (_, w) => ({
    weekOffset: w + 1,
    totalMinutes: 910,
    levelAchieved: 14,
    isGraceWeek: false,
  })),
};

const ACCOUNTS = [alice, bob, carol];

// ----------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------

/** Date for week=offset weeks back, day=Mon-based 0..6 from that week's Monday. */
function dateFor(weekOffset: number, dayOfWeek: number): string {
  const d = new Date(ANCHOR);
  d.setUTCDate(d.getUTCDate() - weekOffset * 7 + dayOfWeek);
  // Activity logs are stored as timestamptz; pick noon UTC so timezone
  // shifts don't push the date across midnight in the user's locale.
  d.setUTCHours(12, 0, 0, 0);
  return d.toISOString();
}

/** Monday of week=offset weeks back from the anchor. */
function weekStartFor(weekOffset: number): string {
  const d = new Date(ANCHOR);
  d.setUTCDate(d.getUTCDate() - weekOffset * 7);
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString();
}

/** Find the existing test user by email, returning their UUID or null. */
async function findUserByEmail(email: string): Promise<string | null> {
  // Admin API doesn't expose direct lookup-by-email, so paginate.
  let page = 1;
  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const found = data.users.find((u) => u.email === email);
    if (found) return found.id;
    if (data.users.length < 200) return null;
    page++;
  }
}

async function deleteUserIfExists(email: string): Promise<void> {
  const id = await findUserByEmail(email);
  if (!id) return;
  // Cascade FKs delete profile, activity_logs, week_records, etc.
  const { error } = await supabase.auth.admin.deleteUser(id);
  if (error) throw error;
}

async function seedAccount(spec: AccountSpec): Promise<void> {
  console.log(`→ ${spec.email}`);

  await deleteUserIfExists(spec.email);

  const { data: created, error: createErr } = await supabase.auth.admin.createUser({
    email: spec.email,
    password: spec.password,
    email_confirm: true,
    user_metadata: { username: spec.username, seeded: true },
  });
  if (createErr || !created.user) {
    throw new Error(`createUser failed for ${spec.email}: ${createErr?.message}`);
  }
  const userId = created.user.id;

  // Profile
  const { error: profileErr } = await supabase.from("profiles").insert({
    id: userId,
    username: spec.username,
    email: spec.email,
    ...spec.profile,
  });
  if (profileErr) throw new Error(`profile insert failed: ${profileErr.message}`);

  // Activities
  const activityRows = spec.activities.map((a) => ({
    user_id: userId,
    date: dateFor(a.weekOffset, a.dayOfWeek),
    duration_minutes: a.durationMinutes,
    activity_type: a.activityType,
    source: "manual" as const,
    intensity: a.intensity,
    user_level: `H${spec.weekRecords[0]?.levelAchieved ?? 0}`,
  }));
  if (activityRows.length > 0) {
    const { error: actErr } = await supabase.from("activity_logs").insert(activityRows);
    if (actErr) throw new Error(`activity_logs insert failed: ${actErr.message}`);
  }

  // Week records
  const weekRows = spec.weekRecords.map((r) => ({
    user_id: userId,
    week_start: weekStartFor(r.weekOffset),
    total_minutes: r.totalMinutes,
    level_achieved: r.levelAchieved,
    is_grace_week: r.isGraceWeek,
  }));
  if (weekRows.length > 0) {
    const { error: wkErr } = await supabase.from("week_records").insert(weekRows);
    if (wkErr) throw new Error(`week_records insert failed: ${wkErr.message}`);
  }

  console.log(
    `  ${spec.username}: ${activityRows.length} activities, ${weekRows.length} week records, current belt H${spec.weekRecords[0]?.levelAchieved ?? 0}`,
  );
}

// ----------------------------------------------------------------------
// Main
// ----------------------------------------------------------------------

async function main() {
  console.log(`Seeding test accounts at ${SUPABASE_URL}`);
  console.log(`Anchor week (offset 0): ${weekStartFor(0)}`);
  console.log(`Test password for all accounts: ${TEST_PASSWORD}`);
  console.log("");

  for (const spec of ACCOUNTS) {
    try {
      await seedAccount(spec);
    } catch (e) {
      console.error(`✘ ${spec.email}:`, (e as Error).message);
      process.exitCode = 1;
    }
  }

  console.log("\nDone. Sign in to any account with the password above.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
