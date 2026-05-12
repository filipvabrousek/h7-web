"use client";

import { useState, useMemo } from "react";
import { X, Search, ChevronRight } from "lucide-react";
import { ACTIVITY_TYPES, PerceivedIntensity, type ActivityType } from "@/lib/types";
import { IntensitySlider } from "./intensity-slider";

const RECENT_ACTIVITIES_KEY = "h7_recent_activities";
const MAX_RECENT = 5;

function getRecentActivities(): ActivityType[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(RECENT_ACTIVITIES_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch { return []; }
}

function saveRecentActivity(type: ActivityType) {
  const recent = getRecentActivities().filter((t) => t !== type);
  recent.unshift(type);
  localStorage.setItem(RECENT_ACTIVITIES_KEY, JSON.stringify(recent.slice(0, MAX_RECENT)));
}

interface Props {
  userId: string;
  /** Optional pre-fill date in `YYYY-MM-DD` form. When provided (e.g. the
   *  user tapped a specific cell in the History calendar), the date input
   *  is seeded to that day instead of today. */
  initialDate?: string;
  onSave: (log: {
    user_id: string;
    date: string;
    duration_minutes: number;
    activity_type: ActivityType;
    source: "manual";
    intensity: number;
  }) => void;
  onClose: () => void;
}

export function LogActivityModal({ userId, initialDate, onSave, onClose }: Props) {
  const [hours, setHours] = useState(0);
  const [minutes, setMinutes] = useState(30);
  const [date, setDate] = useState(() => {
    if (initialDate) return initialDate;
    // Use local date parts to avoid UTC timezone shift
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  });
  const [activityType, setActivityType] = useState<ActivityType>("Walking");
  const [intensity, setIntensity] = useState<PerceivedIntensity>(PerceivedIntensity.CONSCIOUS);
  const [showActivityPicker, setShowActivityPicker] = useState(false);

  const totalMinutes = hours * 60 + minutes;

  const handleSave = () => {
    if (totalMinutes <= 0) return;
    saveRecentActivity(activityType);
    onSave({
      user_id: userId,
      date: date + "T12:00:00",  // Store as local noon to avoid timezone date-boundary shifts
      duration_minutes: totalMinutes,
      activity_type: activityType,
      source: "manual",
      intensity,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40">
      <div className="bg-white dark:bg-gray-900 w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl max-h-[90vh] overflow-y-auto p-6 space-y-5">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold">Log Activity</h2>
            <p className="text-sm text-gray-500">Record your movement</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800">
            <X size={20} />
          </button>
        </div>

        {/* Quick pills — two rows */}
        <div className="space-y-2">
          {[[15, 30, 45, 60], [9, 17, 28, 35]].map((row, idx) => (
            <div key={idx} className="flex gap-2">
              {row.map((m) => (
                <button
                  key={m}
                  onClick={() => { setHours(Math.floor(m / 60)); setMinutes(m % 60); }}
                  className={`flex-1 py-2.5 rounded-lg text-base font-semibold transition ${
                    totalMinutes === m
                      ? "bg-[#1a5494] text-white"
                      : "bg-gray-100 dark:bg-[#242A2A] text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
                  }`}
                >
                  {`${m} min`}
                </button>
              ))}
            </div>
          ))}
        </div>

        {/* Time picker */}
        <div className="flex items-center justify-center gap-4 bg-gray-50 dark:bg-[#242A2A] rounded-2xl py-4">
          <div className="flex flex-col items-center">
            <button onClick={() => setHours((h) => Math.min(h + 1, 12))} className="text-lg">▲</button>
            <span className="text-4xl font-black">{String(hours).padStart(2, "0")}</span>
            <span className="text-xs text-gray-500">hr</span>
            <button onClick={() => setHours((h) => Math.max(h - 1, 0))} className="text-lg">▼</button>
          </div>
          <span className="text-3xl font-bold text-gray-300">:</span>
          <div className="flex flex-col items-center">
            <button onClick={() => setMinutes((m) => Math.min(m + 1, 59))} className="text-lg">▲</button>
            <span className="text-4xl font-black">{String(minutes).padStart(2, "0")}</span>
            <span className="text-xs text-gray-500">min</span>
            <button onClick={() => setMinutes((m) => Math.max(m - 1, 0))} className="text-lg">▼</button>
          </div>
        </div>

        {/* Date */}
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium">Date</span>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="text-sm font-semibold text-blue-600 bg-transparent border-none cursor-pointer"
          />
        </div>

        {/* Activity type */}
        <div>
          <span className="text-sm font-medium block mb-2">Activity Type</span>
          <button
            onClick={() => setShowActivityPicker(true)}
            className="w-full flex items-center justify-between bg-gray-100 dark:bg-[#242A2A] rounded-xl px-4 py-3 text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition"
          >
            <span>{activityType}</span>
            <ChevronRight size={16} className="text-gray-400" />
          </button>
        </div>

        {/* Activity type picker modal */}
        {showActivityPicker && (
          <ActivityTypePicker
            current={activityType}
            onSelect={(type) => { setActivityType(type); setShowActivityPicker(false); }}
            onClose={() => setShowActivityPicker(false)}
          />
        )}

        {/* Intensity */}
        <div>
          <span className="text-sm font-medium block mb-2">Perceived Intensity</span>
          <IntensitySlider value={intensity} onChange={setIntensity} />
        </div>

        {/* Save */}
        <button
          onClick={handleSave}
          disabled={totalMinutes <= 0}
          className="w-full py-3 rounded-2xl bg-[#1a5494] text-white font-bold text-base disabled:opacity-40 hover:bg-[#063a72] transition"
        >
          Save Activity
        </button>
      </div>
    </div>
  );
}

function ActivityTypePicker({
  current,
  onSelect,
  onClose,
}: {
  current: ActivityType;
  onSelect: (type: ActivityType) => void;
  onClose: () => void;
}) {
  const [search, setSearch] = useState("");
  const recent = useMemo(() => getRecentActivities(), []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    const all = [...ACTIVITY_TYPES];
    if (!q) {
      // Recent first, then alphabetical rest
      const recentSet = new Set(recent);
      const rest = all.filter((t) => !recentSet.has(t)).sort((a, b) => a.localeCompare(b));
      return { recent: recent.filter((t) => ACTIVITY_TYPES.includes(t)), rest };
    }
    const matches = all.filter((t) => t.toLowerCase().includes(q)).sort((a, b) => a.localeCompare(b));
    return { recent: [], rest: matches };
  }, [search, recent]);

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/40">
      <div className="bg-white dark:bg-gray-900 w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-bold">Select Activity</h3>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800">
            <X size={20} />
          </button>
        </div>

        {/* Search */}
        <div className="p-4 pb-2">
          <div className="flex items-center gap-2 bg-gray-100 dark:bg-[#242A2A] rounded-xl px-3 py-2">
            <Search size={16} className="text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search activities..."
              autoFocus
              className="flex-1 bg-transparent text-sm outline-none"
            />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-1">
          {filtered.recent.length > 0 && (
            <>
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block mt-2 mb-1">Recent</span>
              {filtered.recent.map((type) => (
                <button
                  key={type}
                  onClick={() => onSelect(type)}
                  className={`w-full text-left px-3 py-2.5 rounded-xl text-sm font-medium transition ${
                    type === current
                      ? "bg-blue-600 text-white"
                      : "hover:bg-gray-100 dark:hover:bg-gray-800"
                  }`}
                >
                  {type}
                </button>
              ))}
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block mt-3 mb-1">All Activities</span>
            </>
          )}
          {filtered.rest.map((type) => (
            <button
              key={type}
              onClick={() => onSelect(type)}
              className={`w-full text-left px-3 py-2.5 rounded-xl text-sm font-medium transition ${
                type === current
                  ? "bg-blue-600 text-white"
                  : "hover:bg-gray-100 dark:hover:bg-gray-800"
              }`}
            >
              {type}
            </button>
          ))}
          {filtered.rest.length === 0 && filtered.recent.length === 0 && (
            <p className="text-center text-sm text-gray-400 py-8">No matching activities</p>
          )}
        </div>
      </div>
    </div>
  );
}
