import "server-only";
import { createAdminClient } from "./serviceClient";
import { LEVELS } from "@/lib/level-engine";
import { computeBMI, h7Minutes, type ActivityLog, type BeltPromotion, type H7User, type WeekRecord } from "@/lib/types";
import type {
  AdminStats,
  H1ToH2DurationSegment,
  TopH1ActivitySegment,
} from "./stats-types";
export type { AdminStats };

// ============================================================
// Stats domain — pure aggregations over the raw Supabase tables
// ============================================================

// ---- Helpers ---------------------------------------------------------------

function ageFromBirthDate(birth: string | null): number | null {
  if (!birth) return null;
  const d = new Date(birth);
  if (isNaN(d.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  return age >= 0 && age < 130 ? age : null;
}

function ageBucketLabel(age: number): string {
  if (age < 18) return "<18";
  if (age < 25) return "18-24";
  if (age < 35) return "25-34";
  if (age < 45) return "35-44";
  if (age < 55) return "45-54";
  if (age < 65) return "55-64";
  return "65+";
}

const AGE_BUCKET_ORDER = ["<18", "18-24", "25-34", "35-44", "45-54", "55-64", "65+"];

function bmiBucket(bmi: number): string {
  if (bmi < 18.5) return "Underweight";
  if (bmi < 25) return "Normal";
  if (bmi < 30) return "Overweight";
  if (bmi < 35) return "Obese I";
  return "Obese II+";
}

const BMI_BUCKET_ORDER = ["Underweight", "Normal", "Overweight", "Obese I", "Obese II+"];

function topN<T>(map: Map<T, number>, n: number): { key: T; count: number }[] {
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([key, count]) => ({ key, count }));
}

// ---- Birth-year bucketing ---------------------------------------------------

const BIRTH_YEAR_BUCKET_ORDER = [
  "<1960",
  "1960s",
  "1970s",
  "1980s",
  "1990s",
  "2000s",
  "2010+",
  "Unknown",
] as const;

function birthYearBucket(year: number | null | undefined): string {
  if (year == null || !Number.isFinite(year)) return "Unknown";
  if (year < 1960) return "<1960";
  if (year < 1970) return "1960s";
  if (year < 1980) return "1970s";
  if (year < 1990) return "1980s";
  if (year < 2000) return "1990s";
  if (year < 2010) return "2000s";
  return "2010+";
}

const GENDER_ORDER = ["male", "female", "other", "unknown"] as const;

function normGender(g: string | null | undefined): string {
  if (!g) return "unknown";
  const lower = g.toLowerCase();
  if (lower === "male" || lower === "female" || lower === "other") return lower;
  return "unknown";
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

function mean(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function msPerDay(): number {
  return 24 * 60 * 60 * 1000;
}

/** Build every (gender, bucket) cell, including empty ones so the UI renders a full matrix. */
function allSegments(): { gender: string; bucket: string }[] {
  const out: { gender: string; bucket: string }[] = [];
  for (const g of GENDER_ORDER) {
    for (const b of BIRTH_YEAR_BUCKET_ORDER) {
      out.push({ gender: g, bucket: b });
    }
  }
  return out;
}

// ---- Average weeks at level before leveling up ----------------------------
//
// For each user, walk their week_records chronologically. Track contiguous
// runs at each level and, when the user transitions UP to a higher level,
// record the length of the run that just ended. We never count the user's
// current (still-open) run, so the answer reflects "how many weeks did people
// stay at H_n before reaching H_{n+1}+".

interface RunSample {
  level: number;
  weeks: number;
}

function levelRunsForUser(records: WeekRecord[]): RunSample[] {
  if (records.length === 0) return [];
  const sorted = [...records].sort((a, b) => a.week_start.localeCompare(b.week_start));

  const samples: RunSample[] = [];
  let currentLevel = sorted[0].level_achieved;
  let runLength = 1;

  for (let i = 1; i < sorted.length; i++) {
    const lvl = sorted[i].level_achieved;
    if (lvl === currentLevel) {
      runLength++;
    } else if (lvl > currentLevel) {
      samples.push({ level: currentLevel, weeks: runLength });
      currentLevel = lvl;
      runLength = 1;
    } else {
      // Demotion: end the run but only count it if the user later climbed
      // back. For simplicity record it now anyway — it still represents time
      // spent at that level.
      samples.push({ level: currentLevel, weeks: runLength });
      currentLevel = lvl;
      runLength = 1;
    }
  }
  return samples;
}

// ---- Public entry point ----------------------------------------------------

export async function loadAdminStats(): Promise<AdminStats> {
  const supabase = createAdminClient();

  const [
    { data: profilesRaw },
    { data: activitiesRaw },
    { data: weekRecordsRaw },
    { data: promotionsRaw },
  ] = await Promise.all([
    supabase.from("profiles").select("*"),
    supabase.from("activity_logs").select("*"),
    supabase.from("week_records").select("*"),
    supabase.from("belt_promotions").select("*"),
  ]);

  const profiles: H7User[] = (profilesRaw ?? []) as H7User[];
  const activities: ActivityLog[] = (activitiesRaw ?? []) as ActivityLog[];
  const weekRecords: WeekRecord[] = (weekRecordsRaw ?? []) as WeekRecord[];
  const promotions: BeltPromotion[] = (promotionsRaw ?? []) as BeltPromotion[];

  // ---- Current level per user (from latest week_record) -------------------

  const recordsByUser = new Map<string, WeekRecord[]>();
  for (const r of weekRecords) {
    const arr = recordsByUser.get(r.user_id) ?? [];
    arr.push(r);
    recordsByUser.set(r.user_id, arr);
  }

  const currentLevelByUser = new Map<string, number>();
  for (const [userId, recs] of recordsByUser) {
    const sorted = [...recs].sort((a, b) => b.week_start.localeCompare(a.week_start));
    currentLevelByUser.set(userId, sorted[0]?.level_achieved ?? 0);
  }
  // Users with no week records → level 0
  for (const p of profiles) {
    if (!currentLevelByUser.has(p.id)) currentLevelByUser.set(p.id, 0);
  }

  // ---- Level distribution -------------------------------------------------

  const levelCounts = new Map<number, number>();
  for (const lvl of currentLevelByUser.values()) {
    levelCounts.set(lvl, (levelCounts.get(lvl) ?? 0) + 1);
  }
  const levelDistribution = LEVELS.map((l) => ({
    level: l.value,
    displayName: l.displayName,
    count: levelCounts.get(l.value) ?? 0,
  }));

  // ---- Average weeks at level before leveling up --------------------------

  const runsByLevel = new Map<number, number[]>();
  for (const [, recs] of recordsByUser) {
    for (const sample of levelRunsForUser(recs)) {
      const arr = runsByLevel.get(sample.level) ?? [];
      arr.push(sample.weeks);
      runsByLevel.set(sample.level, arr);
    }
  }
  const averageWeeksPerLevel = LEVELS.map((l) => {
    const arr = runsByLevel.get(l.value) ?? [];
    const avg = arr.length === 0 ? 0 : arr.reduce((a, b) => a + b, 0) / arr.length;
    return {
      level: l.value,
      displayName: l.displayName,
      averageWeeks: Math.round(avg * 10) / 10,
      sampleSize: arr.length,
    };
  });

  // ---- Gender breakdown ---------------------------------------------------

  const genderCounts = new Map<string, number>();
  for (const p of profiles) {
    const g = p.gender ?? "unknown";
    genderCounts.set(g, (genderCounts.get(g) ?? 0) + 1);
  }
  const genderBreakdown = [...genderCounts.entries()]
    .map(([gender, count]) => ({ gender, count }))
    .sort((a, b) => b.count - a.count);

  // ---- Age distribution ---------------------------------------------------

  const ageCounts = new Map<string, number>();
  for (const bucket of AGE_BUCKET_ORDER) ageCounts.set(bucket, 0);
  ageCounts.set("Unknown", 0);
  for (const p of profiles) {
    const age = ageFromBirthDate(p.birth_date);
    const label = age == null ? "Unknown" : ageBucketLabel(age);
    ageCounts.set(label, (ageCounts.get(label) ?? 0) + 1);
  }
  const ageBuckets = [...AGE_BUCKET_ORDER, "Unknown"].map((range) => ({
    range,
    count: ageCounts.get(range) ?? 0,
  }));

  // ---- BMI distribution ---------------------------------------------------

  const bmiCounts = new Map<string, number>();
  for (const bucket of BMI_BUCKET_ORDER) bmiCounts.set(bucket, 0);
  bmiCounts.set("Unknown", 0);
  for (const p of profiles) {
    const bmi = computeBMI(p);
    const label = bmi == null ? "Unknown" : bmiBucket(bmi);
    bmiCounts.set(label, (bmiCounts.get(label) ?? 0) + 1);
  }
  const bmiBuckets = [...BMI_BUCKET_ORDER, "Unknown"].map((category) => ({
    category,
    count: bmiCounts.get(category) ?? 0,
  }));

  // ---- Top activities by level / by gender --------------------------------

  const genderByUser = new Map<string, string>();
  for (const p of profiles) genderByUser.set(p.id, p.gender ?? "unknown");

  const activityCountByLevel = new Map<number, Map<string, number>>();
  const activityCountByGender = new Map<string, Map<string, number>>();
  for (const a of activities) {
    const lvl = currentLevelByUser.get(a.user_id) ?? 0;
    const gender = genderByUser.get(a.user_id) ?? "unknown";

    const lvlMap = activityCountByLevel.get(lvl) ?? new Map<string, number>();
    lvlMap.set(a.activity_type, (lvlMap.get(a.activity_type) ?? 0) + 1);
    activityCountByLevel.set(lvl, lvlMap);

    const gMap = activityCountByGender.get(gender) ?? new Map<string, number>();
    gMap.set(a.activity_type, (gMap.get(a.activity_type) ?? 0) + 1);
    activityCountByGender.set(gender, gMap);
  }

  const topActivitiesByLevel = LEVELS.map((l) => {
    const map = activityCountByLevel.get(l.value) ?? new Map();
    return {
      level: l.value,
      displayName: l.displayName,
      activities: topN(map, 5).map((e) => ({ name: e.key as string, count: e.count })),
    };
  }).filter((row) => row.activities.length > 0);

  const topActivitiesByGender = [...activityCountByGender.entries()].map(([gender, map]) => ({
    gender,
    activities: topN(map, 5).map((e) => ({ name: e.key as string, count: e.count })),
  }));

  // ---- Activity totals + activity / engagement ----------------------------

  const totalActivities = activities.length;
  const totalMinutes = activities.reduce((sum, a) => sum + h7Minutes(a), 0);

  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;
  const lastSeen = new Map<string, number>();
  for (const a of activities) {
    const t = new Date(a.date).getTime();
    if (!isNaN(t)) lastSeen.set(a.user_id, Math.max(lastSeen.get(a.user_id) ?? 0, t));
  }
  let activeUsers7d = 0;
  let activeUsers30d = 0;
  for (const t of lastSeen.values()) {
    if (now - t <= 7 * day) activeUsers7d++;
    if (now - t <= 30 * day) activeUsers30d++;
  }

  // ---- Progression: H1 → H2 duration per user ----------------------------
  //
  // We look at the belt_promotions table: for each user, find the earliest
  // to_level='H1' row and the earliest to_level='H2' row. Duration =
  // (H2.promoted_at - H1.promoted_at) in days. Segment by (gender, birth_year).

  const firstH1 = new Map<string, Date>();
  const firstH2 = new Map<string, Date>();
  for (const p of promotions) {
    const t = new Date(p.promoted_at);
    if (isNaN(t.getTime())) continue;
    if (p.to_level === "H1") {
      const prev = firstH1.get(p.user_id);
      if (!prev || t < prev) firstH1.set(p.user_id, t);
    } else if (p.to_level === "H2") {
      const prev = firstH2.get(p.user_id);
      if (!prev || t < prev) firstH2.set(p.user_id, t);
    }
  }

  const profileById = new Map<string, H7User>();
  for (const p of profiles) profileById.set(p.id, p);

  // Bucket index keyed as `${gender}|${bucket}`.
  const h1h2Durations = new Map<string, number[]>();
  for (const [userId, h1Time] of firstH1.entries()) {
    const h2Time = firstH2.get(userId);
    if (!h2Time) continue; // user hasn't reached H2 yet — not a completed sample
    const days = (h2Time.getTime() - h1Time.getTime()) / msPerDay();
    if (days < 0) continue; // clock-skew guard
    const profile = profileById.get(userId);
    const gender = normGender(profile?.gender ?? null);
    const bucket = birthYearBucket(profile?.birth_year ?? null);
    const key = `${gender}|${bucket}`;
    const arr = h1h2Durations.get(key) ?? [];
    arr.push(days);
    h1h2Durations.set(key, arr);
  }

  const h1ToH2Duration: H1ToH2DurationSegment[] = allSegments().map(({ gender, bucket }) => {
    const arr = h1h2Durations.get(`${gender}|${bucket}`) ?? [];
    const med = median(arr);
    const avg = mean(arr);
    return {
      gender,
      birthYearBucket: bucket,
      sampleSize: arr.length,
      medianDays: med == null ? null : Math.round(med * 10) / 10,
      averageDays: avg == null ? null : Math.round(avg * 10) / 10,
    };
  });

  // ---- Most common H1 activity by segment --------------------------------
  //
  // Count activity_logs where user_level = 'H1', grouped by (gender, bucket).
  // Rows with a null user_level (pre-0003 legacy data) are skipped.

  const h1Counts = new Map<string, Map<string, number>>();
  for (const a of activities) {
    if (a.user_level !== "H1") continue;
    const profile = profileById.get(a.user_id);
    const gender = normGender(profile?.gender ?? null);
    const bucket = birthYearBucket(profile?.birth_year ?? null);
    const key = `${gender}|${bucket}`;
    const map = h1Counts.get(key) ?? new Map<string, number>();
    map.set(a.activity_type, (map.get(a.activity_type) ?? 0) + 1);
    h1Counts.set(key, map);
  }

  const topH1Activity: TopH1ActivitySegment[] = allSegments().map(({ gender, bucket }) => {
    const map = h1Counts.get(`${gender}|${bucket}`) ?? new Map<string, number>();
    const top = topN(map, 5);
    const total = [...map.values()].reduce((a, b) => a + b, 0);
    return {
      gender,
      birthYearBucket: bucket,
      sampleSize: total,
      topActivity: top[0]?.key as string | undefined ?? null,
      topActivityCount: top[0]?.count ?? 0,
      breakdown: top.map((e) => ({ name: e.key as string, count: e.count })),
    };
  });

  return {
    totalUsers: profiles.length,
    activeUsers7d,
    activeUsers30d,
    totalActivities,
    totalMinutes,
    levelDistribution,
    averageWeeksPerLevel,
    genderBreakdown,
    ageBuckets,
    bmiBuckets,
    topActivitiesByLevel,
    topActivitiesByGender,
    h1ToH2Duration,
    topH1Activity,
  };
}

