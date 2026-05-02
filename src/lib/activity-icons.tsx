"use client";

/**
 * Phosphor activity icons — shared across all pages.
 * Same icon set used on iOS and Android for cross-platform parity.
 */
import React from "react";
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
  Disc,
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
  "Aerobics": PersonSimpleRun,
  // Phosphor 2.x has no trampoline glyph — Lightning captures the bouncy
  // feel, matching iOS (`.lightning` fallback) and the web nodality site.
  "Trampoline": Lightning,
  // Phosphor 2.x has no frisbee glyph — Disc is the closest round-object
  // icon, matching iOS (`.disc`) and Android (`CustomActivityIcons.FrisbeeDisc`).
  "Frisbee": Disc,
  "Other": Star,
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
  trampoline: Lightning,
  frisbee: Disc,
  other: Star,
};

/** Get the Phosphor icon for an activity type string, with fallback.
 *  Handles:
 *    - display names ("Walking") via ACTIVITY_ICON_MAP
 *    - camelCase DB values ("walking") via SERIAL_ICON_MAP
 *    - descriptive multilingual labels ("Long-distance swimming 5–10 km",
 *      "Maratón", "MTB horská kola", "Spartan Beast") via keyword match
 *      on a case-insensitive, diacritics-stripped copy of the string.
 *  Keyword matching is ordered longest-first inside each theme so that
 *  e.g. "cycling" beats "cycle" and "triathlon" beats "run". */
export function iconForActivityType(type: string): Icon {
  const exact = ACTIVITY_ICON_MAP[type as ActivityType] ?? SERIAL_ICON_MAP[type];
  if (exact) return exact;

  // Lower-case + strip diacritics so "Maratón" / "Diaľkové plávanie" / "Plavání"
  // all fall into the right bucket.
  const k = type
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  // Order matters: check more specific keywords first so that
  // "Ultra cyklistika" hits the cycling bucket, not the running one, etc.
  if (k.includes("triathlon") || k.includes("triatlon") || k.includes("ironman")) return Trophy;
  if (k.includes("mtb") || k.includes("cycl") || k.includes("bike") || k.includes("bicyc") || k.includes("cykl") || k.includes("gravel") || k.includes("kolo")) return Bicycle;
  if (k.includes("scoot") || k.includes("kolobe")) return Bicycle;
  if (k.includes("swim") || k.includes("plav") || k.includes("swimrun") || k.includes("aquawalk")) return SwimmingPool;
  if (k.includes("row") || k.includes("veslov") || k.includes("kayak") || k.includes("canoe")) return Boat;
  if (k.includes("marathon") || k.includes("maraton") || k.includes("jogging") || k.includes("run") || k.includes("beh") || k.includes("bezk") || k.includes("sprint") || k.includes("ultra") || k.includes("aerobik") || k.includes("aerobic")) return PersonSimpleRun;
  if (k.includes("hik") || k.includes("turist") || k.includes("nordic") || k.includes("trek")) return PersonSimpleWalk;
  if (k.includes("walk") || k.includes("chuz") || k.includes("chodz") || k.includes("schod") || k.includes("stairs")) return PersonSimpleWalk;
  if (k.includes("yoga") || k.includes("joga") || k.includes("joga")) return YinYang;
  if (k.includes("tai-chi") || k.includes("tai chi") || k.includes("taichi")) return YinYang;
  if (k.includes("pilates") || k.includes("stretch") || k.includes("pretahov") || k.includes("protah")) return PersonArmsSpread;
  if (k.includes("crossfit")) return Barbell;
  if (k.includes("strength") || k.includes("silov") || k.includes("posilov") || k.includes("fitko") || k.includes("fitness") || k.includes("gym") || k.includes("barbell") || k.includes("weight")) return Barbell;
  if (k.includes("trampol")) return Lightning;
  if (k.includes("frisbee") || k.includes("ultimate") || k.includes("disc golf")) return Disc;
  if (k.includes("jump") || k.includes("skip")) return Lightning;
  if (k.includes("tennis") || k.includes("tenis") || k.includes("badmin") || k.includes("bedmin") || k.includes("squash") || k.includes("padel")) return Racquet;
  if (k.includes("table tennis") || k.includes("stol tenis") || k.includes("stoln") || k.includes("ping")) return TennisBall;
  if (k.includes("martial") || k.includes("box") || k.includes("kickbox") || k.includes("karate") || k.includes("judo") || k.includes("jiu")) return HandFist;
  if (k.includes("basket")) return Basketball;
  if (k.includes("foot") || k.includes("fotbal") || k.includes("futbal") || k.includes("soccer")) return SoccerBall;
  if (k.includes("volley") || k.includes("volejbal")) return Volleyball;
  if (k.includes("florbal") || k.includes("floorball") || k.includes("hockey") || k.includes("hokej")) return Racquet;
  if (k.includes("ski") || k.includes("skialp") || k.includes("snowboard") || k.includes("lyz") || k.includes("bezk")) return PersonSimpleSki;
  if (k.includes("skat") || k.includes("inline") || k.includes("rolle") || k.includes("brusl")) return Sneaker;
  if (k.includes("climb") || k.includes("lez") || k.includes("horoleze") || k.includes("mountain") || k.includes("mountaineer")) return Mountains;
  if (k.includes("dan") || k.includes("tanec") || k.includes("tanc") || k.includes("zumba")) return MusicNotes;
  if (k.includes("parkour")) return Lightning;
  if (k.includes("garden") || k.includes("zahrad")) return Plant;
  if (k.includes("house") || k.includes("clean") || k.includes("uklid")) return Broom;
  if (k.includes("play") || k.includes("hra")) return Star;
  if (k.includes("ellipt") || k.includes("orbitr") || k.includes("trenaz")) return Bicycle;
  if (k.includes("spartan") || k.includes("ocr") || k.includes("biathlon") || k.includes("race") || k.includes("closed") || k.includes("zavod") || k.includes("preteky")) return Trophy;
  if (k.includes("golf")) return Trophy;
  if (k.includes("h7") || k.includes("commut") || k.includes("doprav") || k.includes("dojiz")) return HeartHalf;
  if (k.includes("tabata") || k.includes("hiit") || k.includes("interval")) return Lightning;
  if (k.includes("bag") || k.includes("break") || k.includes("exercise") || k.includes("cvice") || k.includes("cvicen")) return Barbell;

  return Star;
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
  trampoline: "Trampoline",
  frisbee: "Frisbee",
  other: "Other",
};

/** Convert any activity type format to display name.
 *  "briskWalking" → "Brisk Walking", "Walking" → "Walking" */
export function displayNameForActivityType(type: string): string {
  return SERIAL_DISPLAY_MAP[type] ?? type;
}

/** Returns true for triathlon-adjacent labels (triathlon, triatlon, ironman).
 *  Kept as a standalone predicate so [[ActivityIcon]] can short-circuit to
 *  the composite swim+bike+run rendering without duplicating the keyword
 *  normalisation done in [[iconForActivityType]]. */
function isTriathlonLabel(type: string): boolean {
  if (type === "Triathlon" || type === "triathlon") return true;
  const k = type
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  return k.includes("triathlon") || k.includes("triatlon") || k.includes("ironman");
}

/**
 * Renders the activity icon for any activity-type label, short-circuiting
 * for triathlon to a composite of the three real discipline icons
 * (swim + bike + run) laid out side-by-side.
 *
 * Mirrors iOS `ActivityIconView` and the new Android `ActivityIcon`
 * composable — inner icons are sized at 90% of the caller's [size], the
 * wrapper uses `inline-flex` with `flex-direction: row` so it grows to
 * its natural ~2.7× width and overflows square containers the same way
 * the iOS `HStack` and Android `Row(wrapContentWidth(unbounded = true))`
 * do.
 *
 * Non-triathlon activities delegate to [[iconForActivityType]] and render
 * as a single Phosphor icon, identical to the prior behaviour.
 *
 * API shape matches the `@phosphor-icons/react` component props so call
 * sites can migrate from `<Icon size={N} color={c} weight="bold" />` to
 * `<ActivityIcon type={label} size={N} color={c} weight="bold" />` with
 * no other changes.
 */
export function ActivityIcon({
  type,
  size = 24,
  color,
  weight = "regular",
  className,
  style,
}: {
  type: string;
  size?: number;
  color?: string;
  weight?: "thin" | "light" | "regular" | "bold" | "fill" | "duotone";
  className?: string;
  style?: React.CSSProperties;
}) {
  if (isTriathlonLabel(type)) {
    // Render the triathlon icon as bold "TRI" text inside a square
    // `size` × `size` box — matches iOS `Text("TRI")` and Android
    // `Text("TRI", FontWeight.Black)` renderings. The inner font-size
    // is 48% of the icon size so the three letters fill the frame with
    // breathing room, and the heavy rounded weight reads as an icon
    // rather than a text label next to sibling Phosphor glyphs.
    return (
      <span
        aria-label="triathlon"
        className={className}
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: size,
          height: size,
          lineHeight: 1,
          color,
          fontSize: size * 0.48,
          fontWeight: 900,
          letterSpacing: "-0.02em",
          fontFamily:
            "-apple-system, BlinkMacSystemFont, 'SF Pro Rounded', 'SF Pro Display', system-ui, sans-serif",
          ...style,
        }}
      >
        TRI
      </span>
    );
  }
  // `iconForActivityType` returns one of the module-top Phosphor component
  // references (stable identities across renders), not a freshly created
  // component — but ESLint's `react-hooks/static-components` rule can't
  // prove that statically, so we render via `React.createElement` to
  // bypass the JSX-only check.
  return React.createElement(iconForActivityType(type), {
    size,
    color,
    weight,
    className,
    style,
  });
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
  // Trampoline: pink, matching Android `HistoryScreen.colorForActivityType`.
  if (t.includes("trampol")) return "#E91E63";
  // Frisbee: green, matching Android `HistoryScreen.colorForActivityType`.
  if (t.includes("frisbee") || t.includes("ultimate")) return "#4CAF50";
  // CSS `lightgreen` — matches iOS `Color.h7LightGreen` and Android
  // `Color(0xFF90EE90)` so the catch-all "H7 movement" chip reads the
  // same on every platform.
  if (t.includes("h7")) return "#90EE90";
  return "#9E9E9E";
}
