// ============================================================
// H7 Data Types — mirrors iOS/Android models
// ============================================================

// MARK: - Perceived Intensity

export enum PerceivedIntensity {
  CASUAL = 1,
  CONSCIOUS = 2,
  CHALLENGING = 3,
  VIGOROUS = 4,
  MAXIMUM = 5,
}

export const intensityMeta: Record<
  PerceivedIntensity,
  { title: string; description: string; badge: string | null; countsForH7: boolean }
> = {
  [PerceivedIntensity.CASUAL]: {
    title: "Casual",
    description: "Leisurely walking, light chores",
    badge: "Does not count toward H7",
    countsForH7: false,
  },
  [PerceivedIntensity.CONSCIOUS]: {
    title: "Conscious",
    description: "I can feel my heart and lungs working, but I can still talk",
    badge: "The H7 Sweet Spot",
    countsForH7: true,
  },
  [PerceivedIntensity.CHALLENGING]: {
    title: "Challenging",
    description: "Out of my comfort zone; breathing is heavy",
    badge: "The H7 Sweet Spot",
    countsForH7: true,
  },
  [PerceivedIntensity.VIGOROUS]: {
    title: "Vigorous",
    description: "Intense effort; I can only say a few words",
    badge: "Be careful in H1-H4",
    countsForH7: true,
  },
  [PerceivedIntensity.MAXIMUM]: {
    title: "Maximum",
    description: "All-out effort; I am gasping for air",
    badge: "Be careful!",
    countsForH7: true,
  },
};

// MARK: - Activity

export type ActivitySource = "manual" | "healthkit" | "garmin" | "fitbit";

export const ACTIVITY_TYPES = [
  "Walking",
  "Brisk Walking",
  "Running",
  "Cycling",
  "Swimming",
  "Yoga",
  "Strength Training",
  "Hiking",
  "Dancing",
  "Tennis",
  "Rowing",
  "Martial Arts",
  "Skiing",
  "Skating",
  "Basketball",
  "Football",
  "Volleyball",
  "Badminton",
  "Table Tennis",
  "Climbing",
  "Pilates",
  "Jump Rope",
  "Stretching",
  "CrossFit",
  "Triathlon",
  "Housework",
  "Garden Work",
  "H7 Move",
  "Aerobics",
  "Trampoline",
  "Frisbee",
  "Other",
] as const;

export type ActivityType = (typeof ACTIVITY_TYPES)[number];

export interface ActivityLog {
  id: string;
  user_id: string;
  date: string;
  duration_minutes: number;
  activity_type: ActivityType;
  source: ActivitySource;
  intensity: number | string | null;  // TEXT column: may be number, string-number, or word
  /** Belt level the user held when the activity was logged (e.g. "H0"..."H8+"). */
  user_level: string | null;
  /**
   * Upstream sample identifier (HealthKit sample UUID on iOS / Health
   * Connect record metadata id on Android). Carried through on
   * round-trip so native clients can map platform deletion-change
   * events back to the Supabase row. Null for manual entries and for
   * auto-imported rows created before migration 0005. The web client
   * itself never writes this — it's populated by native imports only.
   */
  source_id: string | null;
  created_at: string | null;
}

/** Parse intensity from any format (number, string-number, word) → PerceivedIntensity or null */
function parseIntensity(val: number | string | null | undefined): PerceivedIntensity | null {
  if (val == null) return null;
  if (typeof val === "number") return val as PerceivedIntensity;
  // String: try numeric first ("2" → 2)
  const n = Number(val);
  if (!isNaN(n) && n >= 1 && n <= 5) return n as PerceivedIntensity;
  // Word string ("casual" → 1, "conscious" → 2, etc.)
  const map: Record<string, PerceivedIntensity> = {
    casual: PerceivedIntensity.CASUAL,
    conscious: PerceivedIntensity.CONSCIOUS,
    challenging: PerceivedIntensity.CHALLENGING,
    vigorous: PerceivedIntensity.VIGOROUS,
    maximum: PerceivedIntensity.MAXIMUM,
  };
  return map[val.toLowerCase()] ?? null;
}

/** Minutes that count toward H7 (0 if casual) */
export function h7Minutes(log: ActivityLog): number {
  const parsed = parseIntensity(log.intensity);
  // null intensity (e.g. HealthKit imports) → counts
  if (parsed === null) return log.duration_minutes;
  // Casual does not count
  if (parsed === PerceivedIntensity.CASUAL) return 0;
  return log.duration_minutes;
}

// MARK: - Week Record

export interface WeekRecord {
  id: string;
  user_id: string;
  week_start: string;
  total_minutes: number;
  level_achieved: number;
  is_grace_week: boolean;
  created_at: string | null;
}

// MARK: - Weight Entry

export interface WeightEntry {
  id: string;
  user_id: string;
  date: string;
  weight_kg: number;
  source: string;
  created_at: string | null;
}

// MARK: - Gender

export type Gender = "male" | "female" | "other";

// MARK: - User

export interface H7User {
  id: string;
  username: string;
  email: string;
  height_cm: number | null;
  weight_kg: number | null;
  gender: Gender | null;
  birth_date: string | null;
  /** Year of birth, e.g. 1988. Collected in sign-up; used for analytics bucketing. */
  birth_year: number | null;
  country: string | null;
  avatar_url: string | null;
  initial_weekly_activity: number | null;
  /** Whether the user has unlocked the H8–H14 extended staircase.
   *  Persisted on the profile row (migration 0015) so the toggle
   *  survives reinstall + sync cross-device. The localStorage key
   *  `h7_extended_staircase` is kept as a synchronous-read cache for
   *  `level-engine.ts` and is written every time this field is
   *  fetched or mutated. */
  extended_staircase: boolean;
  created_at: string | null;
  updated_at: string | null;
}

export function computeBMI(user: H7User): number | null {
  if (!user.height_cm || !user.weight_kg || user.height_cm <= 0) return null;
  const heightM = user.height_cm / 100;
  return user.weight_kg / (heightM * heightM);
}

export function bmiCategory(bmi: number): string {
  if (bmi < 18.5) return "Underweight";
  if (bmi < 25) return "Normal";
  if (bmi < 30) return "Overweight";
  return "Obese";
}

// MARK: - Belt Promotion

export interface BeltPromotion {
  id: string;
  user_id: string;
  /** Previous belt level (null for the very first promotion). */
  from_level: string | null;
  /** Newly achieved belt level (e.g. "H1", "H2"). */
  to_level: string;
  /** ISO-8601 timestamp. */
  promoted_at: string;
  created_at: string | null;
}

// MARK: - Social

export interface SocialPost {
  id: string;
  user_id: string;
  username: string;
  user_level: number;
  text: string;
  image_url: string | null;
  likes_count: number;
  comments_count: number;
  created_at: string;
}

export interface PostComment {
  id: string;
  post_id: string;
  user_id: string;
  username: string;
  text: string;
  reply_to_username: string | null;
  created_at: string;
}

export interface PostLike {
  id: string;
  post_id: string;
  user_id: string;
  created_at: string;
}

// MARK: - Support

export interface SupportMessage {
  id: string;
  user_id: string;
  username: string;
  text: string | null;
  media_url: string | null;
  media_type: string | null;
  is_from_support: boolean;
  created_at: string;
}
