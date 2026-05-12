"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { useUser, useActivities, useWeekRecords } from "@/lib/hooks";
import { computeStatus, LEVELS, maxLevelValue } from "@/lib/level-engine";
import { LevelBadgeCard } from "@/components/level-badge";
import { DailyBarChart } from "@/components/weekly-bar-chart";
import { LogActivityModal } from "@/components/log-activity-modal";
import { startOfWeek, formatDate, normalizeDate, calendarDaysRemainingInWeek } from "@/lib/level-engine";
import { WeeklyConsistencyDots } from "@/components/weekly-consistency-dots";
import { ThisWeekCard } from "@/components/this-week-card";
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

      {/* Weekly Consistency — extracted to <WeeklyConsistencyDots>
          so the vitest snapshot suite has a standalone component to
          render. Same rule as before (pure rolling average from
          Monday, pinned by consistency-circle helpers); rendering
          delegated to the leaf component. Mirrors iOS
          `WeeklyConsistencyView` and Android `WeeklyConsistencyCard`. */}
      <WeeklyConsistencyDots dayMinutes={dayMinutes} todayIdx={todayIdx} />

      {/* Daily Bar Chart */}
      <DailyBarChart activities={activities} />

      {/* This-week progress card — extracted to <ThisWeekCard> so the
          vitest snapshot suite has a standalone component to render.
          Same rule as before; rendering delegated to the leaf
          component. Mirrors iOS `WeekProgressView` and Android
          `ThisWeekCard`. */}
      <ThisWeekCard
        currentMinutes={status.currentWeekMinutes}
        targetMinutes={status.currentWeekTarget}
        targetLevel={status.currentWeekTargetLevel}
        isMaxLevel={isMaxLevel}
        daysRemainingInWeek={calendarDaysRemainingInWeek()}
      />

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
