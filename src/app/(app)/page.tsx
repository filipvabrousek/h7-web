"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { useUser, useActivities, useWeekRecords } from "@/lib/hooks";
import { computeStatus, LEVELS, maxLevelValue } from "@/lib/level-engine";
import { LevelBadgeCard } from "@/components/level-badge";
import { DailyBarChart } from "@/components/weekly-bar-chart";
import { LogActivityModal } from "@/components/log-activity-modal";
import { colorForLevel, textColorForLevel, rollingAverageLevel, startOfWeek, formatDate, normalizeDate } from "@/lib/level-engine";
import { h7Minutes } from "@/lib/types";

export default function DashboardPage() {
  const { user, userId, loading: userLoading } = useUser();
  const { activities, loading: actLoading, addActivity } = useActivities(userId);
  const { records } = useWeekRecords(userId);
  const [showLog, setShowLog] = useState(false);

  if (userLoading || actLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  const status = computeStatus(activities, records);
  const level = status.currentLevel;
  const nextLevel = LEVELS[Math.min(level.value + 1, maxLevelValue())];
  const isMaxLevel = nextLevel.value === level.value;
  const weekStart = startOfWeek();

  // Debug: log data summary to help diagnose web/iOS mismatches
  if (typeof window !== "undefined" && activities.length > 0) {
    const weekActivities = activities.filter((a) => {
      const d = new Date(a.date.includes("T") ? a.date : a.date + "T00:00:00");
      return d >= weekStart && d <= new Date();
    });
    console.log("[H7 Debug] userId:", userId);
    console.log("[H7 Debug] Total activities loaded:", activities.length);
    console.log("[H7 Debug] Current week activities:", weekActivities.length);
    console.log("[H7 Debug] Week records loaded:", records.length);
    console.log("[H7 Debug] currentWeekMinutes:", status.currentWeekMinutes);
    console.log("[H7 Debug] currentLevel:", status.currentLevel.displayName, status.currentLevel.beltName);
    console.log("[H7 Debug] weekStreak:", status.weekStreak);
    console.log("[H7 Debug] Sample activity intensities:", activities.slice(0, 5).map(a => ({ type: typeof a.intensity, val: a.intensity, h7: h7Minutes(a), dur: a.duration_minutes })));
  }

  // Weekly consistency dots
  const days = ["M", "T", "W", "T", "F", "S", "S"];
  const today = new Date();
  const todayIdx = (today.getDay() + 6) % 7; // Mon=0

  const dayMinutes = days.map((_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    const ds = formatDate(d);
    return activities.filter((a) => normalizeDate(a.date) === ds).reduce((s, a) => s + h7Minutes(a), 0);
  });

  const progress = status.currentWeekTarget > 0
    ? Math.min((status.currentWeekMinutes / status.currentWeekTarget) * 100, 100)
    : 0;

  return (
    <div className="space-y-4">
      {/* Header */}
      <h1 className="text-2xl font-bold">Dashboard</h1>

      {/* Level Badge */}
      <LevelBadgeCard
        level={level.value}
        beltName={level.beltName}
        streak={status.weekStreak}
        dailyTarget={level.dailyMinutes}
      />

      {/* Weekly Consistency — fixed neutral gray (matches iOS/Android h7BeltSurface) */}
      <div className="rounded-2xl p-4" style={{ backgroundColor: "#C7CACE" }}>
        <h3 className="text-sm font-black tracking-wider mb-4" style={{ color: "#191A1E" }}>
          WEEKLY CONSISTENCY
        </h3>
        {(() => {
          const dayCaps = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
          const totalSoFar = dayMinutes.slice(0, todayIdx + 1).reduce((a, b) => a + b, 0);
          const weekLevel = rollingAverageLevel(dayMinutes, todayIdx);
          const weekHasActivity = totalSoFar > 0;
          return (
            <div className="flex justify-between">
              {dayCaps.map((label, i) => {
                const mins = dayMinutes[i];
                const isElapsed = i <= todayIdx;
                const showFilled = isElapsed && weekHasActivity;
                return (
                  <div key={i} className="flex flex-col items-center gap-2 flex-1">
                    <span className="text-[11px] font-bold tracking-wide" style={{ color: "rgba(25,26,30,0.6)" }}>
                      {label}
                    </span>
                    <div
                      className="w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold"
                      style={
                        showFilled
                          ? {
                              backgroundColor: colorForLevel(weekLevel.value),
                              color: textColorForLevel(weekLevel.value),
                            }
                          : {
                              backgroundColor: "rgba(0,0,0,0.06)",
                              color: "rgba(25,26,30,0.35)",
                            }
                      }
                    >
                      {showFilled ? mins : "–"}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })()}
      </div>

      {/* Daily Bar Chart */}
      <DailyBarChart activities={activities} />

      {/* This week activity progress card — dark, matches iOS */}
      <div className="rounded-2xl p-5 bg-gray-900 dark:bg-gray-950 border border-gray-800">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-baseline gap-1">
              <span className="text-4xl font-black text-white leading-none">
                {status.currentWeekMinutes}
              </span>
              <span className="text-xl font-bold text-gray-500 leading-none">
                /{status.currentWeekTarget}
              </span>
            </div>
            <div className="text-xs font-bold text-gray-400 tracking-wider uppercase mt-2">
              This Week Activity
            </div>
          </div>
          <div className="text-right">
            {!isMaxLevel ? (
              <>
                <div className="text-base font-black text-emerald-400">
                  TO H{nextLevel.value}
                </div>
                <div className="text-base font-bold text-white mt-1">
                  {Math.max(0, status.currentWeekTarget - status.currentWeekMinutes)}&apos; /{" "}
                  {Math.max(0, 7 - dayMinutes.filter((m) => m > 0).length)} days
                </div>
              </>
            ) : (
              <div className="text-base font-black text-emerald-400">MAX LEVEL</div>
            )}
          </div>
        </div>
        {/* progress bar */}
        <div className="h-1 bg-gray-800 rounded-full overflow-hidden mt-4">
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${progress}%`, backgroundColor: colorForLevel(level.value) }}
          />
        </div>
      </div>

      {/* Log Activity — full width */}
      <button
        onClick={() => setShowLog(true)}
        className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-4 rounded-2xl text-base font-bold hover:bg-blue-700 transition"
      >
        <span className="w-6 h-6 rounded-full bg-white text-blue-600 flex items-center justify-center">
          <Plus size={16} strokeWidth={3} />
        </span>
        Log Activity
      </button>

      {/* Log Activity Modal */}
      {showLog && userId && (
        <LogActivityModal
          userId={userId}
          onSave={(log) => addActivity(log)}
          onClose={() => setShowLog(false)}
        />
      )}
    </div>
  );
}
