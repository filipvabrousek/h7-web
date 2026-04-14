"use client";

import { useEffect, useState } from "react";
import { Globe, X } from "lucide-react";
import { iconForActivityType } from "@/lib/activity-icons";
import { useUser, useActivities, useWeekRecords } from "@/lib/hooks";
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

  const [extended, setExtended] = useState(false);
  const [selectedLevel, setSelectedLevel] = useState<LevelDef | null>(null);
  useEffect(() => {
    setExtended(localStorage.getItem("h7_extended_staircase") === "true");
  }, []);

  const visibleLevels = extended ? LEVELS : LEVELS.filter((l) => l.value <= 7);

  return (
    // Page background: white in light mode, near-black in dark mode (system bg).
    <div className="space-y-4 bg-white dark:bg-black -mx-4 -my-4 px-4 py-4 min-h-screen">
      <h1 className="text-2xl font-bold">My Path</h1>

      {/* Level ladder — every belt card uses the fixed H7 belt surface gray
          so H1 (white) and H7 (black) remain visible in both modes. */}
      <div className="space-y-2">
        {visibleLevels.filter((l) => l.value > 0).map((l) => {
          const isCurrent = l.value === status.currentLevel.value;
          const isAchieved = l.value <= status.currentLevel.value;
          return (
            <button
              key={l.value}
              onClick={() => setSelectedLevel(l)}
              className={`w-full flex items-center gap-3 rounded-2xl p-4 transition ${
                !isAchieved ? "opacity-50" : ""
              }`}
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
                    YOUR LEVEL
                  </span>
                )}
                <div className="font-bold text-lg" style={{ color: "#1A1A1F" }}>
                  {l.beltName}
                </div>
                <div className="text-sm" style={{ color: "rgba(26,26,31,0.7)" }}>
                  {l.dailyMinutes} MIN DAILY
                </div>
              </div>

              <span className="text-gray-600">›</span>
            </button>
          );
        })}
      </div>

      {/* Grace explanation */}
      <div className="bg-gray-100 dark:bg-gray-900 rounded-2xl p-4">
        <h3 className="text-sm font-bold mb-2">How Grace Works</h3>
        <p className="text-xs text-gray-500 leading-relaxed">
          After 3 consecutive weeks at the same level, you earn a grace week. If you slip one week,
          grace keeps you at your level. Grace is consumed on use and must be re-earned with another
          3 consecutive weeks.
        </p>
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

const RECOMMENDED_ACTIVITIES: Record<number, string[]> = {
  1: ["Walking", "Stretching", "Housework", "Garden Work"],
  2: ["Walking", "Stretching", "Housework", "Yoga", "Cycling", "Garden Work"],
  3: ["Brisk Walking", "Cycling", "Swimming", "Yoga", "Dancing", "Hiking"],
  4: ["Brisk Walking", "Running", "Cycling", "Swimming", "Yoga", "Dancing", "Hiking", "Strength Training"],
  5: ["Running", "Cycling", "Swimming", "Strength Training", "Hiking", "Tennis", "Dancing", "Rowing"],
  6: ["Running", "Cycling", "Swimming", "Strength Training", "Hiking", "Tennis", "CrossFit", "Rowing", "Martial Arts"],
  7: ["Running", "Cycling", "Swimming", "Strength Training", "Hiking", "Tennis", "CrossFit", "Rowing", "Martial Arts", "Triathlon"],
};

function recommendedFor(level: number): string[] {
  if (level >= 8) return RECOMMENDED_ACTIVITIES[7];
  return RECOMMENDED_ACTIVITIES[level] ?? [];
}

const LEVEL_DESCRIPTIONS: Record<number, string> = {
  0: "Start your journey!",
  1: "Just 9 minutes a day. Start with gentle walks and light household activity. The goal is simply to move regularly.",
  2: "17 minutes daily. Add slightly longer walks or try yoga. You should notice improved energy and easier stair climbing.",
  3: "26 minutes daily. Time to explore new activities! Try cycling, swimming, or dance classes.",
  4: "35 minutes daily. Great foundation! You can add strength training and tackle longer hikes.",
  5: "43 minutes daily. You're an active person now! Consider sports, rowing, or varied workout routines.",
  6: "52 minutes daily. Impressive dedication! Mix high and low intensity activities for sustainable fitness.",
  7: "60 minutes daily — the pinnacle! You're among the most active people. Enjoy the full spectrum of movement.",
  8: "69 minutes daily. Beyond black belt — you're pushing into elite territory. Vary your training to stay injury-free.",
  9: "77 minutes daily. Diamond-level commitment! Consider periodized training with recovery days built in.",
  10: "86 minutes daily. Ruby intensity — mix endurance with strength and flexibility for a complete athlete profile.",
  11: "94 minutes daily. Sapphire dedication! You're training like a semi-professional. Listen to your body.",
  12: "103 minutes daily. Emerald mastery — nearly two hours of daily movement. Focus on quality and recovery.",
  13: "111 minutes daily. Gold standard! Multi-sport training and active lifestyle are your norm.",
  14: "120 minutes daily — the ultimate level. Two hours of daily movement. You are a true master of fitness.",
};


function LevelDetailModal({ level, onClose }: { level: LevelDef; onClose: () => void }) {
  const activities = recommendedFor(level.value);
  const description = LEVEL_DESCRIPTIONS[level.value] ?? "";
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
          aria-label="Close"
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
              <div className="text-[11px] text-gray-500 mt-0.5">Weekly</div>
            </div>
            <div className="px-5 py-2 rounded-xl bg-gray-100 dark:bg-gray-900 text-center min-w-[88px]">
              <div className="text-xl font-bold">{level.dailyMinutes}&apos;</div>
              <div className="text-[11px] text-gray-500 mt-0.5">Daily avg</div>
            </div>
          </div>
        </div>

        {/* Description block */}
        <div className="space-y-2">
          <h3 className="text-base font-bold">Recommended Activities</h3>
          {description && (
            <p className="text-sm text-gray-500 leading-relaxed">{description}</p>
          )}
        </div>

        {/* Activity cards grid (2 columns) */}
        {activities.length > 0 && (
          <div className="grid grid-cols-2 gap-3">
            {activities.map((name) => {
              const Icon = iconForActivityType(name);
              return (
                <div
                  key={name}
                  className="flex flex-col items-center justify-center gap-2 h-[110px] rounded-xl"
                  style={{ backgroundColor: H7_BELT_SURFACE }}
                >
                  <Icon size={28} color="#1A5494" weight="bold" />
                  <span
                    className="text-[13px] font-semibold text-center px-2 leading-tight"
                    style={{ color: "#1A1A1F" }}
                  >
                    {name}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* More details on H7 website */}
        <a
          href="https://h7.cz"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 w-full py-3 rounded-xl text-sm font-bold transition"
          style={{
            color: "#1A5494",
            backgroundColor: "rgba(26,84,148,0.10)",
          }}
        >
          <Globe size={16} />
          More details on H7 website
        </a>
      </div>
    </div>
  );
}
