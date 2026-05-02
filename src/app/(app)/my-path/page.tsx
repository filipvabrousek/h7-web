"use client";

import { useEffect, useState } from "react";
import { Globe, X } from "lucide-react";
import { ActivityIcon } from "@/lib/activity-icons";
import { useUser, useActivities, useWeekRecords } from "@/lib/hooks";
import { useI18n, type TKey } from "@/lib/i18n";
import {
  findActivityDetailByEnglishName,
  getLevelInfo,
  type LevelActivityDetail,
} from "@/lib/level-activity-details";
import {
  computeStatus,
  LEVELS,
  colorForLevel,
  textColorForLevel,
  H7_BELT_SURFACE,
  type LevelDef,
} from "@/lib/level-engine";

export default function MyPathPage() {
  const { userId } = useUser();
  const { activities } = useActivities(userId);
  const { records } = useWeekRecords(userId);
  const status = computeStatus(activities, records);
  const { t } = useI18n();

  const [extended, setExtended] = useState(false);
  const [selectedLevel, setSelectedLevel] = useState<LevelDef | null>(null);
  useEffect(() => {
    setExtended(localStorage.getItem("h7_extended_staircase") === "true");
  }, []);

  const visibleLevels = extended ? LEVELS : LEVELS.filter((l) => l.value <= 7);

  return (
    // Page background: white in light mode, near-black in dark mode (system bg).
    <div className="space-y-4 bg-white dark:bg-black -mx-4 -my-4 px-4 py-4 min-h-screen">
      <h1 className="text-2xl font-bold">{t("myPath.title")}</h1>

      {/* Level ladder — every belt card uses the fixed H7 belt surface gray
          so H1 (white) and H7 (black) remain visible in both modes. */}
      <div className="space-y-2">
        {visibleLevels.filter((l) => l.value > 0).map((l) => {
          const isCurrent = l.value === status.currentLevel.value;
          // Every level renders at full opacity. The current one is
          // signposted by the navy ring around its belt circle and the
          // "YOUR LEVEL" chip; future levels stay readable so users can
          // scan the staircase without squinting. This matches the
          // aspirational tone — the belts you haven't earned yet are
          // a preview, not a lock screen.
          return (
            <button
              key={l.value}
              onClick={() => setSelectedLevel(l)}
              className="w-full flex items-center gap-3 rounded-2xl p-4 transition"
              style={{ backgroundColor: H7_BELT_SURFACE }}
            >
              {/* Belt circle — true belt color, no inner gray track. Current level
                  gets a navy ring around it. */}
              <div
                className="rounded-full flex items-center justify-center font-black flex-shrink-0"
                style={{
                  width: 52,
                  height: 52,
                  backgroundColor: colorForLevel(l.value),
                  color: textColorForLevel(l.value),
                  fontSize: 18,
                  boxShadow: isCurrent ? "0 0 0 3px #1A5494" : undefined,
                }}
              >
                H{l.value}
              </div>

              <div className="flex-1 text-left">
                {isCurrent && (
                  <span
                    className="inline-block text-xs font-black px-2 py-0.5 rounded mb-1"
                    style={{ color: "#1A5494", backgroundColor: "rgba(26,84,148,0.18)" }}
                  >
                    {t("myPath.yourLevel")}
                  </span>
                )}
                <div className="font-bold text-lg" style={{ color: "#1A1A1F" }}>
                  {l.beltName}
                </div>
                <div className="text-sm" style={{ color: "rgba(26,26,31,0.7)" }}>
                  {l.dailyMinutes} {t("myPath.minDaily")}
                </div>
              </div>

              <span className="text-gray-600">›</span>
            </button>
          );
        })}
      </div>

      {/* Grace explanation */}
      <div className="bg-gray-100 dark:bg-gray-900 rounded-2xl p-4">
        <h3 className="text-sm font-bold mb-2">{t("myPath.graceTitle")}</h3>
        <p className="text-xs text-gray-500 leading-relaxed">{t("myPath.graceBody")}</p>
      </div>

      {/* Belt detail modal — bg white in light, black in dark.
          H1 needs a black border in light mode (white-on-white).
          H7 needs a white border in dark mode (black-on-black). */}
      {selectedLevel && (
        <LevelDetailModal level={selectedLevel} onClose={() => setSelectedLevel(null)} />
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────
// Level → list of activity *labels* shown in the grid. For H1..H7 we use
// the richly-detailed activity records from `level-activity-details.ts`
// (which also drive the tap-to-open detail sheet). H0 and H8+ have no
// detail data, so they fall back to a short static list.
// ────────────────────────────────────────────────────────────────────────

const FALLBACK_ACTIVITIES: Record<number, string[]> = {
  0: [],
  8: ["Running", "Cycling", "Swimming", "Strength Training", "Hiking", "Tennis", "CrossFit", "Rowing", "Martial Arts", "Triathlon"],
  9: ["Running", "Cycling", "Swimming", "Strength Training", "Hiking", "Tennis", "CrossFit", "Rowing", "Martial Arts", "Triathlon"],
  10: ["Running", "Cycling", "Swimming", "Strength Training", "Hiking", "Tennis", "CrossFit", "Rowing", "Martial Arts", "Triathlon"],
  11: ["Running", "Cycling", "Swimming", "Strength Training", "Hiking", "Tennis", "CrossFit", "Rowing", "Martial Arts", "Triathlon"],
  12: ["Running", "Cycling", "Swimming", "Strength Training", "Hiking", "Tennis", "CrossFit", "Rowing", "Martial Arts", "Triathlon"],
  13: ["Running", "Cycling", "Swimming", "Strength Training", "Hiking", "Tennis", "CrossFit", "Rowing", "Martial Arts", "Triathlon"],
  14: ["Running", "Cycling", "Swimming", "Strength Training", "Hiking", "Tennis", "CrossFit", "Rowing", "Martial Arts", "Triathlon"],
};

function LevelDetailModal({ level, onClose }: { level: LevelDef; onClose: () => void }) {
  const { t, code } = useI18n();
  const info = getLevelInfo(code, level.value);
  // Selected activity TYPE — represented by the array of variants
  // sharing the same `name`. Tapping a tile opens a sheet that lists
  // every variant (e.g. Running tile → Systematic training, Trail
  // Running, Stroller, Orienteering — all four shown together).
  // Mirrors the iOS / Android behavior after the same fix landed there.
  const [selectedActivities, setSelectedActivities] = useState<LevelActivityDetail[] | null>(null);

  // Lock body scroll while modal is open. Also close nested sheet on Esc.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (selectedActivities) setSelectedActivities(null);
      else onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose, selectedActivities]);

  // Assemble the grid rows — one tile per unique activity type
  // (deduplicated by `name`, since the same activity-type name is used
  // for every variant of that type, e.g. "Běh" for Systematic training,
  // Trail Running, Stroller, Orienteering). Each row carries the FULL
  // list of variants so the detail sheet can render them all.
  //
  // H1..H7 pull directly from the level-activity-details source of truth.
  // H8+ have no dedicated content — we fall back to a short static list,
  // probing `findActivityDetailByEnglishName` to attach matches from a
  // lower level when possible.
  const rows: Array<{ label: string; details: LevelActivityDetail[] }> = (() => {
    if (info) {
      const byName = new Map<string, LevelActivityDetail[]>();
      const order: string[] = [];
      for (const a of info.activities) {
        if (!byName.has(a.name)) {
          byName.set(a.name, []);
          order.push(a.name);
        }
        byName.get(a.name)!.push(a);
      }
      return order.map((name) => ({ label: name, details: byName.get(name)! }));
    }
    return (FALLBACK_ACTIVITIES[level.value] ?? []).map((n) => {
      const matched = findActivityDetailByEnglishName(code, n);
      return { label: matched?.name ?? n, details: matched ? [matched] : [] };
    });
  })();

  const descriptionText =
    info?.description ??
    t((`level.h${level.value}.desc` as unknown) as TKey);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md max-h-[90vh] overflow-y-auto bg-white dark:bg-black rounded-t-3xl sm:rounded-3xl p-6 space-y-5"
      >
        {/* Close button — top right */}
        <button
          type="button"
          onClick={onClose}
          aria-label={t("common.close")}
          className="absolute top-4 right-4 w-9 h-9 rounded-full bg-gray-200 dark:bg-[#242A2A] text-gray-600 dark:text-gray-300 flex items-center justify-center hover:bg-gray-300 dark:hover:bg-gray-700 transition"
        >
          <X size={18} />
        </button>

        {/* Header */}
        <div className="flex flex-col items-center gap-3 pt-4">
          <div
            className="rounded-full flex items-center justify-center font-black"
            style={{
              width: 80,
              height: 80,
              backgroundColor: colorForLevel(level.value),
              color: textColorForLevel(level.value),
              fontSize: 28,
              border:
                level.value === 1
                  ? "2px solid black"
                  : level.value === 7
                    ? "2px solid white"
                    : undefined,
            }}
          >
            H{level.value}
          </div>
          <h2 className="text-2xl font-bold">{level.beltName}</h2>
          <div className="flex gap-3">
            <div className="px-5 py-2 rounded-xl bg-gray-100 dark:bg-gray-900 text-center min-w-[88px]">
              <div className="text-xl font-bold">{level.weeklyMinutes}&apos;</div>
              <div className="text-[11px] text-gray-500 mt-0.5">{t("myPath.weekly")}</div>
            </div>
            <div className="px-5 py-2 rounded-xl bg-gray-100 dark:bg-gray-900 text-center min-w-[88px]">
              <div className="text-xl font-bold">{level.dailyMinutes}&apos;</div>
              <div className="text-[11px] text-gray-500 mt-0.5">{t("myPath.dailyAvg")}</div>
            </div>
          </div>
        </div>

        {/* Level subtitle + description */}
        <div className="space-y-2">
          {info?.subtitle && (
            <h3 className="text-base font-bold">{info.subtitle}</h3>
          )}
          {descriptionText && (
            <p className="text-sm text-gray-500 leading-relaxed">{descriptionText}</p>
          )}
        </div>

        {/* Activity cards grid (2 columns) */}
        {rows.length > 0 && (
          <>
            <h3 className="text-base font-bold">{t("myPath.recommendedActivities")}</h3>
            <div className="grid grid-cols-2 gap-3">
              {rows.map(({ label, details }, i) => {
                const clickable = details.length > 0;
                const Wrapper: "button" | "div" = clickable ? "button" : "div";
                return (
                  <Wrapper
                    key={`${label}-${i}`}
                    type={clickable ? "button" : undefined}
                    onClick={clickable ? () => setSelectedActivities(details) : undefined}
                    aria-label={clickable ? label : undefined}
                    className={`relative flex flex-col items-center justify-center gap-2 h-[110px] rounded-xl ${
                      clickable
                        ? "cursor-pointer transition hover:brightness-95 focus:outline-none focus:ring-2 focus:ring-[#1A5494]"
                        : ""
                    }`}
                    style={{ backgroundColor: H7_BELT_SURFACE }}
                  >
                    <ActivityIcon type={label} size={28} color="#1A5494" weight="bold" />
                    <span
                      className="text-[13px] font-semibold text-center px-2 leading-tight"
                      style={{ color: "#1A1A1F" }}
                    >
                      {label}
                    </span>
                    {clickable && (
                      <span
                        aria-hidden
                        className="absolute top-2 right-2 text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center"
                        style={{ color: "#1A5494", backgroundColor: "rgba(26,84,148,0.12)" }}
                      >
                        i
                      </span>
                    )}
                  </Wrapper>
                );
              })}
            </div>
          </>
        )}

        {/* More details on H7 website */}
        <a
          href="https://h7-web.vercel.app/"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 w-full py-3 rounded-xl text-sm font-bold transition"
          style={{
            color: "#1A5494",
            backgroundColor: "rgba(26,84,148,0.10)",
          }}
        >
          <Globe size={16} />
          {t("myPath.moreOnWeb")}
        </a>
      </div>

      {/* Nested activity-detail sheet — lists every variant of the
          tapped activity type (mirrors iOS / Android). */}
      {selectedActivities && selectedActivities.length > 0 && (
        <ActivityDetailSheet
          activities={selectedActivities}
          onClose={() => setSelectedActivities(null)}
        />
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────
// ActivityDetailSheet — nested modal shown on top of the belt-detail
// modal. Receives every variant of the tapped activity type and renders
// them as a stack of subtitle + description blocks under a single
// activity-type header. Mirrors iOS `ActivityDetailSheet.details` and
// Android `detailsFor`.
// ────────────────────────────────────────────────────────────────────────

function ActivityDetailSheet({
  activities,
  onClose,
}: {
  activities: LevelActivityDetail[];
  onClose: () => void;
}) {
  const { t } = useI18n();
  // `name` is identical across all entries (that's what we deduped on)
  const headerName = activities[0]?.name ?? "";
  return (
    <div
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md max-h-[85vh] overflow-y-auto bg-white dark:bg-black rounded-t-3xl sm:rounded-3xl p-6 space-y-4"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label={t("common.close")}
          className="absolute top-4 right-4 w-9 h-9 rounded-full bg-gray-200 dark:bg-[#242A2A] text-gray-600 dark:text-gray-300 flex items-center justify-center hover:bg-gray-300 dark:hover:bg-gray-700 transition"
        >
          <X size={18} />
        </button>

        {/* Activity-type header (icon + display name) — single one for
            the whole sheet, since all variants share the same type. */}
        <div className="flex items-center gap-4 pt-4 pr-10">
          <div
            className="flex-shrink-0 rounded-xl flex items-center justify-center"
            style={{ width: 56, height: 56, backgroundColor: H7_BELT_SURFACE }}
          >
            <ActivityIcon type={headerName} size={36} color="#1A5494" weight="bold" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-lg font-bold leading-tight">{headerName}</div>
          </div>
        </div>

        <div className="h-px bg-gray-200 dark:bg-gray-800" />

        {/* One block per variant: subtitle + description, separated by
            a thin divider. */}
        <div className="space-y-5">
          {activities.map((a, i) => (
            <div key={`${a.subtitle ?? ""}-${i}`} className="space-y-2">
              {a.subtitle && (
                <div className="text-base font-semibold leading-snug">
                  {a.subtitle}
                </div>
              )}
              {a.desc && (
                <p className="text-[15px] leading-relaxed whitespace-pre-wrap text-gray-700 dark:text-gray-300">
                  {a.desc}
                </p>
              )}
              {i < activities.length - 1 && (
                <div className="h-px bg-gray-200 dark:bg-gray-800 mt-5" />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
