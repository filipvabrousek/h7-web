"use client";

/**
 * Phosphor activity icons — shared across all pages.
 * Same icon set used on iOS and Android for cross-platform parity.
 */
import {
  PersonSimpleWalk,
  PersonSimpleRun,
  Bicycle,
  SwimmingPool,
  Barbell,
  Mountains,
  MusicNotes,
  TennisBall,
  Boat,
  HandFist,
  PersonSimpleSki,
  Sneaker,
  Basketball,
  SoccerBall,
  Volleyball,
  Racquet,
  Plant,
  Broom,
  Trophy,
  HeartHalf,
  YinYang,
  PersonArmsSpread,
  Lightning,
  Star,
  type Icon,
} from "@phosphor-icons/react";
import type { ActivityType } from "./types";

/** Map each H7 activity type to a Phosphor icon component.
 *  Keys are display names ("Walking") used by web UI. */
export const ACTIVITY_ICON_MAP: Record<ActivityType, Icon> = {
  "Walking": PersonSimpleWalk,
  "Brisk Walking": PersonSimpleRun,
  "Running": PersonSimpleRun,
  "Cycling": Bicycle,
  "Swimming": SwimmingPool,
  "Yoga": YinYang,
  "Strength Training": Barbell,
  "Hiking": Mountains,
  "Dancing": MusicNotes,
  "Tennis": TennisBall,
  "Rowing": Boat,
  "Martial Arts": HandFist,
  "Skiing": PersonSimpleSki,
  "Skating": Sneaker,
  "Basketball": Basketball,
  "Football": SoccerBall,
  "Volleyball": Volleyball,
  "Badminton": Racquet,
  "Table Tennis": TennisBall,
  "Climbing": Mountains,
  "Pilates": PersonArmsSpread,
  "Jump Rope": Lightning,
  "Stretching": PersonArmsSpread,
  "CrossFit": Barbell,
  "Triathlon": Trophy,
  "Housework": Broom,
  "Garden Work": Plant,
  "H7 Move": HeartHalf,
};

/**
 * Lookup by camelCase serialName (iOS/Android DB format) → Icon.
 * e.g. "walking" → PersonSimpleWalk, "briskWalking" → PersonSimpleRun
 */
const SERIAL_ICON_MAP: Record<string, Icon> = {
  walking: PersonSimpleWalk,
  briskWalking: PersonSimpleRun,
  running: PersonSimpleRun,
  cycling: Bicycle,
  swimming: SwimmingPool,
  yoga: YinYang,
  strengthTraining: Barbell,
  hiking: Mountains,
  dancing: MusicNotes,
  tennis: TennisBall,
  rowing: Boat,
  martialArts: HandFist,
  skiing: PersonSimpleSki,
  skating: Sneaker,
  basketball: Basketball,
  football: SoccerBall,
  volleyball: Volleyball,
  badminton: Racquet,
  tableTennis: TennisBall,
  climbing: Mountains,
  pilates: PersonArmsSpread,
  jumpRope: Lightning,
  stretching: PersonArmsSpread,
  crossfit: Barbell,
  triathlon: Trophy,
  housework: Broom,
  gardenWork: Plant,
  generalH7Movement: HeartHalf,
  aerobics: PersonSimpleRun,
  other: Star,
};

/** Get the Phosphor icon for an activity type string, with fallback.
 *  Handles both display names ("Walking") and camelCase DB values ("walking"). */
export function iconForActivityType(type: string): Icon {
  return ACTIVITY_ICON_MAP[type as ActivityType]
    ?? SERIAL_ICON_MAP[type]
    ?? Star;
}

/** camelCase serialName → display name lookup */
const SERIAL_DISPLAY_MAP: Record<string, string> = {
  walking: "Walking",
  briskWalking: "Brisk Walking",
  running: "Running",
  cycling: "Cycling",
  swimming: "Swimming",
  yoga: "Yoga",
  strengthTraining: "Strength Training",
  hiking: "Hiking",
  dancing: "Dancing",
  tennis: "Tennis",
  rowing: "Rowing",
  martialArts: "Martial Arts",
  skiing: "Skiing",
  skating: "Skating",
  basketball: "Basketball",
  football: "Football",
  volleyball: "Volleyball",
  badminton: "Badminton",
  tableTennis: "Table Tennis",
  climbing: "Climbing",
  pilates: "Pilates",
  jumpRope: "Jump Rope",
  stretching: "Stretching",
  crossfit: "CrossFit",
  triathlon: "Triathlon",
  housework: "Housework",
  gardenWork: "Garden Work",
  generalH7Movement: "H7 Move",
  aerobics: "Aerobics",
  other: "Other",
};

/** Convert any activity type format to display name.
 *  "briskWalking" → "Brisk Walking", "Walking" → "Walking" */
export function displayNameForActivityType(type: string): string {
  return SERIAL_DISPLAY_MAP[type] ?? type;
}

/** Color per activity type — consistent with iOS/Android */
export function colorForActivityType(type: string): string {
  const t = type.toLowerCase();
  if (t.includes("run") || t.includes("aerobic")) return "#FF8C00";
  if (t.includes("walk") || t.includes("hik")) return "#33B859";
  if (t.includes("cycl") || t.includes("bike")) return "#2673D9";
  if (t.includes("swim") || t.includes("row")) return "#00BCD4";
  if (t.includes("yoga") || t.includes("pilates") || t.includes("stretch")) return "#9C27B0";
  if (t.includes("strength") || t.includes("crossfit") || t.includes("jump")) return "#CC1F33";
  if (t.includes("danc")) return "#E91E63";
  if (t.includes("tennis") || t.includes("badminton") || t.includes("table")) return "#CDDC39";
  if (t.includes("martial")) return "#795548";
  if (t.includes("basket") || t.includes("foot") || t.includes("volley")) return "#FF5722";
  if (t.includes("ski") || t.includes("skat") || t.includes("climb")) return "#607D8B";
  if (t.includes("triathlon")) return "#FFC107";
  if (t.includes("house") || t.includes("garden")) return "#8BC34A";
  if (t.includes("h7")) return "#063A72";
  return "#9E9E9E";
}
