"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { AdminStats } from "@/lib/admin/stats-types";
import { BELT_COLORS } from "@/lib/level-engine";
import { Users, Activity, Clock, Flame } from "lucide-react";

const GENDER_COLORS: Record<string, string> = {
  male: "#3b82f6",
  female: "#ec4899",
  other: "#a855f7",
  unknown: "#94a3b8",
};

const PIE_COLORS = ["#063a72", "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#a855f7", "#94a3b8"];

/**
 * Build a recharts Tooltip `formatter` that appends `(xx.x%)` next to the
 * raw count, where percentage is the share of `total` for the hovered slice.
 * Used on every count-based chart so users can read both the absolute number
 * and the relative share without doing the division in their head.
 *
 * Safe against an empty dataset (total === 0) — returns the raw value
 * unchanged so the tooltip still renders something sensible.
 */
function countWithPct(total: number) {
  // Recharts' Tooltip `formatter` types `value` as `ValueType | undefined`
  // (where ValueType = number | string | (number | string)[]). Accept the
  // loosest input and coerce defensively — undefined / NaN / array values
  // fall back to the raw stringified value so the tooltip still renders.
  return (value: unknown, name: unknown): [string, string] => {
    const num = typeof value === "number" ? value : Number(value);
    const label = String(name ?? "");
    if (!Number.isFinite(num) || total <= 0) return [String(value ?? ""), label];
    const pct = (num / total) * 100;
    return [`${num.toLocaleString()} (${pct.toFixed(1)}%)`, label];
  };
}

export function StatsDashboard({ stats }: { stats: AdminStats }) {
  // Pre-compute totals once per render so the tooltip formatters stay pure
  // and don't re-sum on every hover event.
  const levelTotal = stats.levelDistribution.reduce((s, d) => s + d.count, 0);
  const genderTotal = stats.genderBreakdown.reduce((s, d) => s + d.count, 0);
  const ageTotal = stats.ageBuckets.reduce((s, d) => s + d.count, 0);
  const bmiTotal = stats.bmiBuckets.reduce((s, d) => s + d.count, 0);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Stats overview</h1>
        <p className="text-sm text-gray-500 mt-1">
          Live data from Supabase. Refresh the page for the latest numbers.
        </p>
      </header>

      {/* KPI cards — single column on the narrowest viewports so labels and
          values don't get clipped, two columns once the sidebar drawer is
          collapsed (sm), four across once there's real desktop room (lg). */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Kpi icon={Users} label="Total users" value={stats.totalUsers.toLocaleString()} />
        <Kpi icon={Flame} label="Active (7d)" value={stats.activeUsers7d.toLocaleString()} sub={`${stats.activeUsers30d} in 30d`} />
        <Kpi icon={Activity} label="Activities logged" value={stats.totalActivities.toLocaleString()} />
        <Kpi
          icon={Clock}
          label="H7 minutes"
          value={stats.totalMinutes.toLocaleString()}
          sub={`${Math.round(stats.totalMinutes / 60).toLocaleString()} hours`}
        />
      </div>

      {/* Level distribution */}
      <Card title="Users at each level" subtitle="Based on the user's most recent week record">
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stats.levelDistribution} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="displayName" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
              <Tooltip
                cursor={{ fill: "rgba(0,0,0,0.04)" }}
                contentStyle={{ borderRadius: 8, fontSize: 12 }}
                formatter={countWithPct(levelTotal)}
              />
              <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                {stats.levelDistribution.map((d) => (
                  <Cell key={d.level} fill={BELT_COLORS[d.level]?.color ?? "#94a3b8"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Average weeks per level */}
      <Card title="Weeks at each level before progressing" subtitle="Average length of completed level runs">
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stats.averageWeeksPerLevel} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="displayName" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip
                cursor={{ fill: "rgba(0,0,0,0.04)" }}
                contentStyle={{ borderRadius: 8, fontSize: 12 }}
                formatter={(value, _name, item) => {
                  const payload = (item as { payload?: { sampleSize?: number } })?.payload;
                  return [`${value} weeks (n=${payload?.sampleSize ?? 0})`, "Average"];
                }}
              />
              <Bar dataKey="averageWeeks" radius={[6, 6, 0, 0]}>
                {stats.averageWeeksPerLevel.map((d) => (
                  <Cell key={d.level} fill={BELT_COLORS[d.level]?.color ?? "#94a3b8"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Demographics row */}
      <div className="grid lg:grid-cols-3 gap-6">
        <Card title="Gender">
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stats.genderBreakdown}
                  dataKey="count"
                  nameKey="gender"
                  innerRadius={45}
                  outerRadius={75}
                  paddingAngle={2}
                >
                  {stats.genderBreakdown.map((g) => (
                    <Cell key={g.gender} fill={GENDER_COLORS[g.gender] ?? "#94a3b8"} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ borderRadius: 8, fontSize: 12 }}
                  formatter={countWithPct(genderTotal)}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="Age distribution">
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.ageBuckets} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="range" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ borderRadius: 8, fontSize: 12 }}
                  formatter={countWithPct(ageTotal)}
                />
                <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="BMI distribution">
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.bmiBuckets} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="category" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ borderRadius: 8, fontSize: 12 }}
                  formatter={countWithPct(bmiTotal)}
                />
                <Bar dataKey="count" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Activities by level */}
      <Card title="Most used activities by level" subtitle="Top 5 activity types per current level">
        {stats.topActivitiesByLevel.length === 0 ? (
          <Empty>No activities logged yet.</Empty>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {stats.topActivitiesByLevel.map((row) => (
              <div
                key={row.level}
                className="rounded-xl border border-gray-100 dark:border-gray-800 p-4 bg-gray-50/40 dark:bg-gray-900/40"
              >
                <div className="flex items-center gap-2 mb-3">
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: BELT_COLORS[row.level]?.color ?? "#94a3b8" }}
                  />
                  <h3 className="text-sm font-semibold">{row.displayName}</h3>
                </div>
                <ActivityBars activities={row.activities} />
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Activities by gender */}
      <Card title="Most used activities by gender" subtitle="Top 5 activity types per gender">
        {stats.topActivitiesByGender.length === 0 ? (
          <Empty>No activities logged yet.</Empty>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {stats.topActivitiesByGender.map((row) => (
              <div
                key={row.gender}
                className="rounded-xl border border-gray-100 dark:border-gray-800 p-4 bg-gray-50/40 dark:bg-gray-900/40"
              >
                <div className="flex items-center gap-2 mb-3">
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: GENDER_COLORS[row.gender] ?? "#94a3b8" }}
                  />
                  <h3 className="text-sm font-semibold capitalize">{row.gender}</h3>
                </div>
                <ActivityBars activities={row.activities} />
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* H1 → H2 progression duration (by gender × birth year) */}
      <Card
        title="Time from H1 to H2"
        subtitle="Median days between the first H1 promotion and the first H2 promotion, segmented by gender and birth-year bucket. Cells with 0 samples are hidden."
      >
        <ProgressionMatrix
          rows={stats.h1ToH2Duration}
          renderValue={(cell) =>
            cell.sampleSize === 0 ? null : (
              <>
                <div className="text-lg font-bold">{cell.medianDays ?? "—"} <span className="text-xs font-normal text-gray-500">d</span></div>
                <div className="text-xs text-gray-500">avg {cell.averageDays ?? "—"}d · n={cell.sampleSize}</div>
              </>
            )
          }
        />
      </Card>

      {/* Top H1 activity (by gender × birth year) */}
      <Card
        title="Most common activity while at H1"
        subtitle="Across all activity logs stamped with user_level = H1. Segmented by gender and birth-year bucket."
      >
        <ProgressionMatrix
          rows={stats.topH1Activity}
          renderValue={(cell) =>
            cell.sampleSize === 0 ? null : (
              <>
                <div className="text-sm font-semibold">{cell.topActivity ?? "—"}</div>
                <div className="text-xs text-gray-500">
                  {cell.topActivityCount} / {cell.sampleSize} logs
                </div>
              </>
            )
          }
        />
      </Card>
    </div>
  );
}

// ---- Progression matrix ----------------------------------------------------

interface MatrixRow {
  gender: string;
  birthYearBucket: string;
  sampleSize: number;
}

const BUCKET_COLUMNS = [
  "<1960",
  "1960s",
  "1970s",
  "1980s",
  "1990s",
  "2000s",
  "2010+",
  "Unknown",
];

const GENDER_ROWS = ["male", "female", "other", "unknown"];

function ProgressionMatrix<T extends MatrixRow>({
  rows,
  renderValue,
}: {
  rows: T[];
  renderValue: (cell: T) => React.ReactNode;
}) {
  const byKey = new Map<string, T>();
  for (const r of rows) byKey.set(`${r.gender}|${r.birthYearBucket}`, r);

  // Drop bucket columns where every gender has 0 samples — keeps the table readable.
  const visibleBuckets = BUCKET_COLUMNS.filter((b) =>
    GENDER_ROWS.some((g) => (byKey.get(`${g}|${b}`)?.sampleSize ?? 0) > 0),
  );

  if (visibleBuckets.length === 0) {
    return <Empty>Not enough data yet — this populates as users complete promotions.</Empty>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-xs">
        <thead>
          <tr className="border-b border-gray-200 dark:border-gray-800">
            <th className="py-2 pr-4 font-medium text-gray-500 uppercase">Gender</th>
            {visibleBuckets.map((b) => (
              <th key={b} className="py-2 px-3 font-medium text-gray-500 uppercase">{b}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {GENDER_ROWS.map((g) => {
            const hasAny = visibleBuckets.some((b) => (byKey.get(`${g}|${b}`)?.sampleSize ?? 0) > 0);
            if (!hasAny) return null;
            return (
              <tr key={g} className="border-b border-gray-100 dark:border-gray-800/50 last:border-b-0">
                <td className="py-3 pr-4 align-top">
                  <span className="inline-flex items-center gap-2 font-semibold capitalize">
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: GENDER_COLORS[g] ?? "#94a3b8" }}
                    />
                    {g}
                  </span>
                </td>
                {visibleBuckets.map((b) => {
                  const cell = byKey.get(`${g}|${b}`);
                  return (
                    <td key={b} className="py-3 px-3 align-top">
                      {cell && cell.sampleSize > 0 ? renderValue(cell) : <span className="text-gray-300">—</span>}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ---- Sub components --------------------------------------------------------

function Kpi({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl p-5 border border-gray-100 dark:border-gray-800">
      {/* `gap-3` + `min-w-0` on the text column lets the label wrap cleanly
          instead of colliding with the icon when the card gets narrow.
          `shrink-0` on the icon keeps it at a fixed size. */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs uppercase tracking-wider text-gray-500 font-medium">{label}</div>
          <div className="text-2xl font-bold mt-1">{value}</div>
          {sub && <div className="text-xs text-gray-500 mt-1">{sub}</div>}
        </div>
        <div className="shrink-0 w-9 h-9 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
          <Icon size={16} className="text-blue-600" />
        </div>
      </div>
    </div>
  );
}

function Card({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-white dark:bg-gray-900 rounded-2xl p-5 border border-gray-100 dark:border-gray-800">
      <div className="mb-4">
        <h2 className="text-base font-semibold">{title}</h2>
        {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
      </div>
      {children}
    </section>
  );
}

function ActivityBars({ activities }: { activities: { name: string; count: number }[] }) {
  if (activities.length === 0) return <Empty>No data</Empty>;
  const max = Math.max(...activities.map((a) => a.count));
  return (
    <ul className="space-y-2">
      {activities.map((a, i) => (
        <li key={a.name}>
          <div className="flex justify-between text-xs mb-1">
            <span className="font-medium">{a.name}</span>
            <span className="text-gray-500">{a.count}</span>
          </div>
          <div className="h-1.5 bg-gray-100 dark:bg-[#242A2A] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{
                width: `${(a.count / max) * 100}%`,
                backgroundColor: PIE_COLORS[i % PIE_COLORS.length],
              }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-center py-8 text-sm text-gray-400">{children}</div>
  );
}
