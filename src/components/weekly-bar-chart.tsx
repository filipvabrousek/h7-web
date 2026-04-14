"use client";

import { colorForLevel, textColorForLevel, startOfWeek, isSameDay, levelFromWeeklyMinutes, rollingAverageLevel, formatDate, normalizeDate, parseDate } from "@/lib/level-engine";
import { h7Minutes, type ActivityLog } from "@/lib/types";
import { useState } from "react";

/**
 * Belt color — TRUE in both light and dark mode.
 * H1 stays white, H7 stays black; the gray container below the chart provides
 * contrast so both extremes remain visible.
 */
function chartColor(level: number): string {
  return colorForLevel(level);
}

/** Text color contrasting with the belt color above */
function chartTextColor(level: number): string {
  return textColorForLevel(level);
}

interface DayData {
  label: string;
  minutes: number;
  level: number;
}

/* Fixed neutral gray matching iOS/Android h7BeltSurface */
const BELT_SURFACE = "#C7CACE";
const BELT_TEXT = "#191A1E";

export function DailyBarChart({ activities }: { activities: ActivityLog[] }) {
  const weekStart = startOfWeek();
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  const rawMinutes: number[] = days.map((_, i) => {
    const date = new Date(weekStart);
    date.setDate(date.getDate() + i);
    const dateStr = formatDate(date);
    return activities
      .filter((a) => normalizeDate(a.date) === dateStr)
      .reduce((sum, a) => sum + h7Minutes(a), 0);
  });

  const dayData: DayData[] = days.map((label, i) => ({
    label,
    minutes: rawMinutes[i],
    level: rollingAverageLevel(rawMinutes, i).value,
  }));

  const maxMinutes = Math.max(...dayData.map((d) => d.minutes), 60);
  const CHART_PX = 110; // bar drawing area in pixels

  return (
    <div className="rounded-2xl p-4" style={{ backgroundColor: BELT_SURFACE }}>
      <h3 className="text-base font-bold mb-3" style={{ color: BELT_TEXT }}>This Week</h3>
      <div className="flex items-end gap-2 rounded-xl p-2" style={{ backgroundColor: "rgba(0,0,0,0.06)" }}>
        {dayData.map((day) => {
          const heightPx = day.minutes > 0 ? Math.max((day.minutes / maxMinutes) * CHART_PX, 4) : 4;
          return (
            <div key={day.label} className="flex-1 flex flex-col items-center gap-1">
              {day.minutes > 0 && (
                <span className="text-xs font-bold" style={{ color: BELT_TEXT }}>{day.minutes}</span>
              )}
              <div
                className="w-full rounded-t-md transition-all"
                style={{
                  height: `${heightPx}px`,
                  backgroundColor:
                    day.minutes > 0
                      ? chartColor(day.level)
                      : "transparent",
                }}
              />
              <span className="text-xs font-semibold" style={{ color: "rgba(25,26,30,0.6)" }}>{day.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface WeekData {
  weekStart: Date;
  minutes: number;
  level: number;
  isCurrent: boolean;
  label: string;
}

export function WeeklyProgressChart({ activities }: { activities: ActivityLog[] }) {
  const [selected, setSelected] = useState<number | null>(null);
  const currentWeekStart = startOfWeek();

  const TOTAL_WEEKS = 24;
  const weeks: WeekData[] = Array.from({ length: TOTAL_WEEKS }, (_, i) => {
    const ws = new Date(currentWeekStart);
    ws.setDate(ws.getDate() - (TOTAL_WEEKS - 1 - i) * 7);
    const we = new Date(ws);
    we.setDate(we.getDate() + 6);

    const mins = activities
      .filter((a) => {
        const d = parseDate(a.date);
        return d >= ws && d <= we;
      })
      .reduce((sum, a) => sum + h7Minutes(a), 0);

    return {
      weekStart: ws,
      minutes: mins,
      level: levelFromWeeklyMinutes(mins).value,
      isCurrent: isSameDay(ws, currentWeekStart),
      label: `${ws.getDate()}/${ws.getMonth() + 1}`,
    };
  });

  const maxMins = Math.max(...weeks.map((w) => w.minutes), 420);

  const BAR_WIDTH = 24; // px
  const BAR_GAP = 6; // px
  const CHART_PX = 128; // bar drawing area height in pixels

  return (
    <div className="rounded-2xl p-4" style={{ backgroundColor: BELT_SURFACE }}>
      <div className="flex justify-between items-center mb-3">
        <div>
          <h3 className="text-base font-bold" style={{ color: BELT_TEXT }}>Weekly Progress</h3>
          <p className="text-sm" style={{ color: "rgba(25,26,30,0.5)" }}>Last {weeks.length} weeks</p>
        </div>
        {weeks.length > 0 && (
          <span
            className="text-sm font-black px-2.5 py-1 rounded-md"
            style={{
              backgroundColor: chartColor(weeks[weeks.length - 1].level),
              color: chartTextColor(weeks[weeks.length - 1].level),
            }}
          >
            H{weeks[weeks.length - 1].level}
          </span>
        )}
      </div>

      {/* Horizontally scrollable chart area */}
      <div className="overflow-x-auto -mx-2 px-2">
        <div className="rounded-xl p-2 inline-block" style={{ backgroundColor: "rgba(0,0,0,0.06)" }}>
          <div
            className="flex items-end"
            style={{ gap: `${BAR_GAP}px`, height: `${CHART_PX}px` }}
          >
            {weeks.map((week, i) => {
              const heightPx = week.minutes > 0 ? Math.max((week.minutes / maxMins) * CHART_PX, 3) : 3;
              return (
                <div
                  key={i}
                  className="flex items-end cursor-pointer"
                  style={{ width: `${BAR_WIDTH}px`, height: `${CHART_PX}px` }}
                  onClick={() => setSelected(selected === i ? null : i)}
                >
                  <div
                    className="w-full rounded-t transition-all"
                    style={{
                      height: `${heightPx}px`,
                      backgroundColor:
                        week.minutes > 0 ? chartColor(week.level) : "transparent",
                      outline: selected === i ? `2px solid ${BELT_TEXT}` : "none",
                    }}
                  />
                </div>
              );
            })}
          </div>

          <div className="flex mt-1" style={{ gap: `${BAR_GAP}px` }}>
            {weeks.map((week, i) => {
              const showLabel = week.isCurrent || (weeks.length - 1 - i) % 4 === 0;
              return (
                <span
                  key={i}
                  className="text-center text-xs whitespace-nowrap overflow-visible"
                  style={{
                    width: `${BAR_WIDTH}px`,
                    fontWeight: week.isCurrent ? 700 : 400,
                    color: week.isCurrent ? BELT_TEXT : "rgba(25,26,30,0.4)",
                  }}
                >
                  {showLabel ? week.label : ""}
                </span>
              );
            })}
          </div>
        </div>
      </div>

      {selected != null && weeks[selected] && (
        <div className="mt-3 rounded-lg p-3 flex justify-between items-center text-sm" style={{ backgroundColor: "rgba(0,0,0,0.06)" }}>
          <div>
            <div className="font-semibold" style={{ color: BELT_TEXT }}>{weeks[selected].label}</div>
            <div className="text-xs" style={{ color: "rgba(25,26,30,0.5)" }}>
              {weeks[selected].isCurrent ? "Current week" : "Completed"}
            </div>
          </div>
          <div className="text-right">
            <div className="font-bold" style={{ color: BELT_TEXT }}>{weeks[selected].minutes} min</div>
            <span
              className="text-xs font-black px-2 py-0.5 rounded"
              style={{
                backgroundColor: chartColor(weeks[selected].level),
                color: chartTextColor(weeks[selected].level),
              }}
            >
              H{weeks[selected].level}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
