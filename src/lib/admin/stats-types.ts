// Pure type definitions — safe to import from client components.

/**
 * A single analytics segment (intersection of one gender value and one birth-year
 * bucket). `sampleSize` is the number of underlying rows that contributed.
 */
export interface ProgressionSegment {
  gender: string;          // "male" | "female" | "other" | "unknown"
  birthYearBucket: string; // e.g. "1980s", "1990s", "Unknown"
  sampleSize: number;
}

export interface H1ToH2DurationSegment extends ProgressionSegment {
  /** Median days from first H1 promotion to first H2 promotion. */
  medianDays: number | null;
  /** Mean days. */
  averageDays: number | null;
}

export interface TopH1ActivitySegment extends ProgressionSegment {
  /** The most-logged activity while users held H1. null if no H1 activity logged. */
  topActivity: string | null;
  topActivityCount: number;
  /** Top 5 to let the UI show a breakdown. */
  breakdown: { name: string; count: number }[];
}

export interface AdminStats {
  totalUsers: number;
  activeUsers7d: number;
  activeUsers30d: number;
  totalActivities: number;
  totalMinutes: number;
  levelDistribution: { level: number; displayName: string; count: number }[];
  averageWeeksPerLevel: { level: number; displayName: string; averageWeeks: number; sampleSize: number }[];
  genderBreakdown: { gender: string; count: number }[];
  ageBuckets: { range: string; count: number }[];
  bmiBuckets: { category: string; count: number }[];
  topActivitiesByLevel: { level: number; displayName: string; activities: { name: string; count: number }[] }[];
  topActivitiesByGender: { gender: string; activities: { name: string; count: number }[] }[];

  // ---- Progression analytics (0003 migration) ----
  /** Row per (gender, birthYearBucket): how long it took users to go H1 → H2. */
  h1ToH2Duration: H1ToH2DurationSegment[];
  /** Row per (gender, birthYearBucket): what activity dominates when users are at H1. */
  topH1Activity: TopH1ActivitySegment[];
}
