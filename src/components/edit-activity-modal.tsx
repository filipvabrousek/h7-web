"use client";

import { useState, useMemo } from "react";
import { X, Search, ChevronRight, Check } from "lucide-react";
import { ACTIVITY_TYPES, PerceivedIntensity, type ActivityType, type ActivityLog } from "@/lib/types";
import { IntensitySlider } from "./intensity-slider";

interface Props {
  activity: ActivityLog;
  onSave: (log: ActivityLog) => void;
  onClose: () => void;
}

export function EditActivityModal({ activity, onSave, onClose }: Props) {
  const initDuration = activity.duration_minutes;
  const [hours, setHours] = useState(Math.floor(initDuration / 60));
  const [minutes, setMinutes] = useState(initDuration % 60);
  const [date, setDate] = useState(() => {
    // Extract local date from the stored date string
    const d = new Date(activity.date.includes("T") ? activity.date : activity.date + "T00:00:00");
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  });
  const [activityType, setActivityType] = useState<ActivityType>(activity.activity_type);
  const [intensity, setIntensity] = useState<PerceivedIntensity>(() => {
    const val = activity.intensity;
    if (val == null) return PerceivedIntensity.CONSCIOUS;
    if (typeof val === "number" && val >= 1 && val <= 5) return val as PerceivedIntensity;
    const n = Number(val);
    if (!isNaN(n) && n >= 1 && n <= 5) return n as PerceivedIntensity;
    return PerceivedIntensity.CONSCIOUS;
  });
  const [showActivityPicker, setShowActivityPicker] = useState(false);
  const [saved, setSaved] = useState(false);

  const totalMinutes = hours * 60 + minutes;

  const handleSave = () => {
    if (totalMinutes <= 0) return;
    const updated: ActivityLog = {
      ...activity,
      date: date + "T12:00:00",
      duration_minutes: totalMinutes,
      activity_type: activityType,
      intensity,
    };
    onSave(updated);
    setSaved(true);
    setTimeout(() => onClose(), 800);
  };

  if (saved) {
    return (
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40">
        <div className="bg-white dark:bg-gray-900 w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl p-6 flex flex-col items-center gap-3 py-12">
          <div className="w-14 h-14 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
            <Check size={28} className="text-green-600" />
          </div>
          <p className="text-lg font-bold">Saved!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40">
      <div className="bg-white dark:bg-gray-900 w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl max-h-[90vh] overflow-y-auto p-6 space-y-5">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold">Edit Activity</h2>
            <p className="text-sm text-gray-500">Update duration, type, or intensity</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800">
            <X size={20} />
          </button>
        </div>

        {/* Quick pills */}
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
            <button onClick={() => setHours((h) => Math.min(h + 1, 12))} className="text-lg">&#9650;</button>
            <span className="text-4xl font-black">{String(hours).padStart(2, "0")}</span>
            <span className="text-xs text-gray-500">hr</span>
            <button onClick={() => setHours((h) => Math.max(h - 1, 0))} className="text-lg">&#9660;</button>
          </div>
          <span className="text-3xl font-bold text-gray-300">:</span>
          <div className="flex flex-col items-center">
            <button onClick={() => setMinutes((m) => Math.min(m + 1, 59))} className="text-lg">&#9650;</button>
            <span className="text-4xl font-black">{String(minutes).padStart(2, "0")}</span>
            <span className="text-xs text-gray-500">min</span>
            <button onClick={() => setMinutes((m) => Math.max(m - 1, 0))} className="text-lg">&#9660;</button>
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

        {/* Activity type picker */}
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

        {/* Update button */}
        <button
          onClick={handleSave}
          disabled={totalMinutes <= 0}
          className="w-full py-3 rounded-2xl bg-[#1a5494] text-white font-bold text-base disabled:opacity-40 hover:bg-[#063a72] transition"
        >
          Update Activity
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

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    const all = [...ACTIVITY_TYPES];
    if (!q) return all.sort((a, b) => a.localeCompare(b));
    return all.filter((t) => t.toLowerCase().includes(q)).sort((a, b) => a.localeCompare(b));
  }, [search]);

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/40">
      <div className="bg-white dark:bg-gray-900 w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl max-h-[85vh] flex flex-col">
        <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-bold">Select Activity</h3>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800">
            <X size={20} />
          </button>
        </div>
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
        <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-1">
          {filtered.map((type) => (
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
          {filtered.length === 0 && (
            <p className="text-center text-sm text-gray-400 py-8">No matching activities</p>
          )}
        </div>
      </div>
    </div>
  );
}
