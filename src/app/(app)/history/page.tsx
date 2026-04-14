"use client";

import { useState, useMemo } from "react";
import { useUser, useActivities } from "@/lib/hooks";
import { h7Minutes } from "@/lib/types";
import type { ActivityLog } from "@/lib/types";
import {
  colorForLevel,
  textColorForLevel,
  levelFromWeeklyMinutes,
  startOfWeek,
  formatDate,
  normalizeDate,
} from "@/lib/level-engine";
import { ChevronLeft, ChevronRight, Trash2, X, Pencil } from "lucide-react";
import { EditActivityModal } from "@/components/edit-activity-modal";
import { iconForActivityType, colorForActivityType, displayNameForActivityType } from "@/lib/activity-icons";

type Period = "week" | "month" | "all";

// ---- helpers ---------------------------------------------------------------

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function endOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 1);
}

/** Match iOS/Android formatDuration: show `h` only when total hours >= 100 */
function formatDuration(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h >= 100) return `${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}


function aggregateByType(
  acts: ActivityLog[]
): { type: string; totalMinutes: number; count: number }[] {
  const map = new Map<string, { totalMinutes: number; count: number }>();
  for (const a of acts) {
    const cur = map.get(a.activity_type) ?? { totalMinutes: 0, count: 0 };
    cur.totalMinutes += a.duration_minutes;
    cur.count += 1;
    map.set(a.activity_type, cur);
  }
  return Array.from(map.entries())
    .map(([type, v]) => ({ type, ...v }))
    .sort((a, b) => b.totalMinutes - a.totalMinutes);
}

// ---- page ------------------------------------------------------------------

export default function HistoryPage() {
  const { userId } = useUser();
  const { activities, updateActivity, deleteActivity } = useActivities(userId);
  const [period, setPeriod] = useState<Period>("week");
  const [deleteTarget, setDeleteTarget] = useState<ActivityLog | null>(null);
  const [editingActivity, setEditingActivity] = useState<ActivityLog | null>(null);
  const [displayMonth, setDisplayMonth] = useState(() => startOfMonth(new Date()));

  const tabs: { key: Period; label: string }[] = [
    { key: "week", label: "Week" },
    { key: "month", label: "Month" },
    { key: "all", label: "All Time" },
  ];

  // --- filtered activities per tab (month tab keyed to displayMonth) ----
  const filteredActivities = useMemo(() => {
    if (period === "all") return activities;
    if (period === "week") {
      const from = startOfWeek(new Date());
      const to = new Date(from);
      to.setDate(to.getDate() + 7);
      return activities.filter((a) => {
        const d = new Date(a.date.includes("T") ? a.date : a.date + "T00:00:00");
        return d >= from && d < to;
      });
    }
    // month
    const from = displayMonth;
    const to = endOfMonth(displayMonth);
    return activities.filter((a) => {
      const d = new Date(a.date.includes("T") ? a.date : a.date + "T00:00:00");
      return d >= from && d < to;
    });
  }, [activities, period, displayMonth]);

  const totalMinutes = filteredActivities.reduce((s, a) => s + h7Minutes(a), 0);
  const sessionCount = filteredActivities.length;

  const avgPerDay = useMemo(() => {
    if (sessionCount === 0) return 0;
    const now = new Date();
    const days =
      period === "week"
        ? ((now.getDay() + 6) % 7) + 1 // Mon-based weekday index + 1
        : period === "month"
          ? new Date(displayMonth.getFullYear(), displayMonth.getMonth() + 1, 0).getDate()
          : Math.max(1, Math.ceil((now.getTime() - new Date(activities[activities.length - 1]?.date ?? now).getTime()) / 86400000));
    return Math.round(totalMinutes / Math.max(1, days));
  }, [sessionCount, period, displayMonth, totalMinutes, activities]);

  // --- calendar grid (always shows `displayMonth`) -----------------------
  const calendarCells = useMemo(() => {
    const year = displayMonth.getFullYear();
    const month = displayMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startPad = (firstDay.getDay() + 6) % 7; // Mon-start

    const cells: {
      date: Date | null;
      minutes: number;
      isToday: boolean;
      isFuture: boolean;
    }[] = [];

    for (let i = 0; i < startPad; i++) {
      cells.push({ date: null, minutes: 0, isToday: false, isFuture: false });
    }
    const today = new Date();
    for (let d = 1; d <= lastDay.getDate(); d++) {
      const date = new Date(year, month, d);
      const dateStr = formatDate(date);
      const mins = activities
        .filter((a) => normalizeDate(a.date) === dateStr)
        .reduce((s, a) => s + h7Minutes(a), 0);
      cells.push({
        date,
        minutes: mins,
        isToday: date.toDateString() === today.toDateString(),
        isFuture: date > today,
      });
    }
    return cells;
  }, [activities, displayMonth]);

  const aggregated = useMemo(
    () => aggregateByType(filteredActivities),
    [filteredActivities]
  );

  const monthLabel = displayMonth
    .toLocaleDateString("en", { month: "long", year: "numeric" })
    .toUpperCase();

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">
        {period === "week" ? "Week" : period === "month" ? "Month" : "All Time"}
      </h1>

      {/* Period tabs */}
      <div className="flex gap-1 bg-gray-100 dark:bg-[#242A2A] rounded-xl p-1">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setPeriod(tab.key)}
            className={`flex-1 py-2 text-sm font-semibold rounded-lg transition ${
              period === tab.key
                ? "bg-white dark:bg-gray-700 shadow-sm text-blue-600 dark:text-blue-400"
                : "text-gray-500"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Month navigator — only on Month tab (matches iOS/Android) */}
      {period === "month" && (
        <div className="flex items-center justify-between">
          <button
            onClick={() =>
              setDisplayMonth(
                new Date(displayMonth.getFullYear(), displayMonth.getMonth() - 1, 1)
              )
            }
            className="p-2 text-blue-500 hover:text-blue-600 transition"
            aria-label="Previous month"
          >
            <ChevronLeft size={22} />
          </button>
          <span className="text-lg font-bold">
            {displayMonth.toLocaleDateString("en", { month: "long", year: "numeric" })}
          </span>
          <button
            onClick={() =>
              setDisplayMonth(
                new Date(displayMonth.getFullYear(), displayMonth.getMonth() + 1, 1)
              )
            }
            className="p-2 text-blue-500 hover:text-blue-600 transition"
            aria-label="Next month"
          >
            <ChevronRight size={22} />
          </button>
        </div>
      )}

      {/* Navy stats card — matches iOS & Android */}
      <div
        className="rounded-2xl flex items-center"
        style={{ backgroundColor: "#063A72", padding: "20px 8px" }}
      >
        <StatBlock value={`${sessionCount}`} label="activities" />
        <StatDivider />
        <StatBlock value={formatDuration(totalMinutes)} label="total" />
        <StatDivider />
        <StatBlock value={`${avgPerDay}`} label="avg min/day" />
      </div>

      {/* Consistency calendar — fixed neutral gray surface (matches iOS h7BeltSurface)
          so both white (H1) and black (H7) belt tiles stay visible in any mode */}
      <div className="rounded-2xl p-4" style={{ backgroundColor: "#C7CACE" }}>
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-bold tracking-wider" style={{ color: "#191A1E" }}>CONSISTENCY</span>
          <span className="text-xs font-bold tracking-wider" style={{ color: "rgba(25,26,30,0.5)" }}>
            {monthLabel}
          </span>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 gap-1 mb-1">
          {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
            <span
              key={i}
              className="text-center text-xs font-bold"
              style={{ color: "rgba(25,26,30,0.8)" }}
            >
              {d}
            </span>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-1">
          {calendarCells.map((cell, i) => {
            if (!cell.date) {
              return <div key={i} />;
            }
            const active = cell.minutes > 0 && !cell.isFuture;
            const level = active
              ? levelFromWeeklyMinutes(cell.minutes * 7).value
              : 0;
            const bg = active
              ? colorForLevel(level)
              : "rgba(0,0,0,0.06)";
            const fg = active
              ? textColorForLevel(level)
              : cell.isFuture
                ? "rgba(25,26,30,0.25)"
                : "rgba(25,26,30,0.8)";

            return (
              <div
                key={i}
                className={`rounded-lg flex flex-col items-center justify-center ${
                  cell.isToday ? "ring-2" : ""
                }`}
                style={{
                  height: 54,
                  backgroundColor: bg,
                  color: fg,
                  ...(cell.isToday ? { "--tw-ring-color": "#1A5494" } as React.CSSProperties : {}),
                }}
              >
                <span className="text-sm font-bold leading-tight">
                  {cell.date.getDate()}
                </span>
                {active && (
                  <span className="text-[10px] font-semibold leading-tight">
                    {cell.minutes}&apos;
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* All activities — aggregated by type */}
      <div className="space-y-2">
        <h3 className="text-sm font-bold tracking-wider py-2">ALL ACTIVITIES</h3>
        {aggregated.length === 0 ? (
          <p className="text-center text-sm text-gray-400 py-8">
            No activities yet
          </p>
        ) : (
          aggregated.map((row) => {
            const tint = colorForActivityType(row.type);
            const TypeIcon = iconForActivityType(row.type);
            return (
              <div
                key={row.type}
                className="bg-white dark:bg-[#242A2A] rounded-2xl p-4 flex items-center gap-4"
              >
                <div
                  className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: `${tint}2E` }}
                >
                  <TypeIcon size={22} color={tint} weight="bold" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-base font-semibold truncate">
                    {displayNameForActivityType(row.type)}
                  </div>
                  <div className="text-xs text-gray-500">
                    {row.count === 1 ? "1 session" : `${row.count} sessions`}
                  </div>
                </div>
                <div className="text-lg font-bold whitespace-nowrap">
                  {formatDuration(row.totalMinutes)}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Individual activity log */}
      <div className="space-y-2">
        <h3 className="text-sm font-bold tracking-wider py-2">ACTIVITY LOG</h3>
        {filteredActivities.length === 0 ? (
          <p className="text-center text-sm text-gray-400 py-8">
            No activities in this period
          </p>
        ) : (
          filteredActivities.map((a) => {
            const tint = colorForActivityType(a.activity_type);
            const ActIcon = iconForActivityType(a.activity_type);
            const d = new Date(a.date.includes("T") ? a.date : a.date + "T00:00:00");
            return (
              <div
                key={a.id}
                className="bg-white dark:bg-[#242A2A] rounded-2xl p-4 flex items-center gap-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                onClick={() => setEditingActivity(a)}
              >
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: `${tint}2E` }}
                >
                  <ActIcon size={16} color={tint} weight="bold" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold truncate">
                    {displayNameForActivityType(a.activity_type)}
                  </div>
                  <div className="text-xs text-gray-500">
                    {d.toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                    {" · "}
                    {formatDuration(a.duration_minutes)}
                    {a.source !== "manual" && ` · ${a.source}`}
                  </div>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); setEditingActivity(a); }}
                  className="p-2 rounded-lg text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition flex-shrink-0"
                  aria-label="Edit activity"
                >
                  <Pencil size={14} />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); setDeleteTarget(a); }}
                  className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition flex-shrink-0"
                  aria-label="Delete activity"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            );
          })
        )}
      </div>

      {/* Edit activity modal */}
      {editingActivity && (
        <EditActivityModal
          activity={editingActivity}
          onSave={(updated) => { updateActivity(updated); setEditingActivity(null); }}
          onClose={() => setEditingActivity(null)}
        />
      )}

      {/* Delete confirmation dialog */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40">
          <div className="bg-white dark:bg-gray-900 w-full sm:max-w-sm sm:rounded-2xl rounded-t-2xl p-6 space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold text-red-500">Delete Activity</h2>
              <button onClick={() => setDeleteTarget(null)} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800">
                <X size={20} />
              </button>
            </div>
            <p className="text-sm text-gray-500">
              Are you sure you want to delete <span className="font-semibold text-gray-900 dark:text-gray-100">{deleteTarget.activity_type}</span> ({formatDuration(deleteTarget.duration_minutes)})? This action cannot be undone.
            </p>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 py-3 rounded-xl bg-gray-100 dark:bg-[#242A2A] text-sm font-medium"
              >
                Cancel
              </button>
              <button
                onClick={() => { deleteActivity(deleteTarget.id); setDeleteTarget(null); }}
                className="flex-1 py-3 rounded-xl bg-red-600 text-white text-sm font-bold hover:bg-red-700 transition"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ---- stats sub-components --------------------------------------------------

function StatBlock({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex-1 flex flex-col items-center text-center">
      <span
        className="text-[28px] font-bold leading-none"
        style={{ color: "#EBFE00" }}
      >
        {value}
      </span>
      <span className="mt-1 text-[13px]" style={{ color: "rgba(255,255,255,0.7)" }}>
        {label}
      </span>
    </div>
  );
}

function StatDivider() {
  return (
    <div
      className="w-px h-10"
      style={{ backgroundColor: "rgba(255,255,255,0.15)" }}
    />
  );
}
