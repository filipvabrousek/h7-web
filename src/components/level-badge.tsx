"use client";

import { levelFromValue, LEVELS } from "@/lib/level-engine";
import { badgeColor, badgeTextColor } from "@/lib/dashboard-color-rules";

export function LevelBadge({ level, size = 40 }: { level: number; size?: number }) {
  // Pinned by `badgeColor` / `badgeTextColor` in dashboard-color-rules
  // — do NOT inline. Kept the `level: number` external API for caller
  // convenience; the conversion to LevelDef is local. The helpers
  // mirror iOS `LevelBadgeView.badgeColor(for:)` and Android
  // `DashboardColorRules.badgeColor(level)`.
  const l = levelFromValue(level);
  return (
    <div
      className="rounded-full flex items-center justify-center font-black"
      style={{
        width: size,
        height: size,
        backgroundColor: badgeColor(l),
        color: badgeTextColor(l),
        fontSize: size * 0.4,
      }}
    >
      H{level}
    </div>
  );
}

export function LevelBadgeCard({
  level,
  beltName,
  streak,
  dailyTarget,
}: {
  level: number;
  beltName: string;
  streak: number;
  dailyTarget: number;
}) {
  return (
    <div className="rounded-2xl p-4 flex items-center gap-4 bg-gray-200 dark:bg-[#242A2A]">
      <LevelBadge level={level} size={56} />
      <div className="flex-1">
        <div className="font-black text-base tracking-wide text-black dark:text-white uppercase">
          {beltName}
        </div>
        <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mt-0.5">
          {streak > 0 ? `${streak} week streak` : "start your streak"}
        </div>
      </div>
      <div className="text-right">
        <div className="text-2xl font-black text-black dark:text-white leading-none">
          {dailyTarget}
          <span className="text-lg align-top">&apos;</span>
        </div>
        <div className="text-xs text-gray-500 mt-1">per day</div>
      </div>
    </div>
  );
}

export function LevelPreviewRow() {
  return (
    <div className="flex gap-2 justify-center py-2">
      {LEVELS.slice(1).map((l) => (
        <div key={l.value} className="flex flex-col items-center gap-1">
          <LevelBadge level={l.value} size={28} />
          <span className="text-xs text-gray-500">{l.dailyMinutes}m/d</span>
        </div>
      ))}
    </div>
  );
}
