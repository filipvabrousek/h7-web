"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { createClient } from "./supabase/client";
import type { H7User, ActivityLog, WeekRecord, SocialPost, PostComment } from "./types";
import {
  computeStatus,
  levelFromWeeklyMinutes,
  levelFromValue,
  startOfWeek,
  WEEKS_FOR_GRACE,
} from "./level-engine";
import { h7Minutes } from "./types";
import type { SupabaseClient } from "@supabase/supabase-js";

// ----------------------------------------------------------------
// Belt-progression helpers
// ----------------------------------------------------------------

/**
 * Record a belt promotion if the user has just reached a higher level than
 * any promotion already recorded for them. The unique (user_id, to_level)
 * constraint on belt_promotions keeps this safe against races — duplicate
 * inserts simply fail and are ignored.
 */
async function maybeRecordPromotion(
  supabase: SupabaseClient,
  userId: string,
  fromLevel: string,
  toLevel: string,
  promotedAt: Date,
) {
  if (fromLevel === toLevel) return;
  const { error } = await supabase.from("belt_promotions").insert({
    user_id: userId,
    from_level: fromLevel,
    to_level: toLevel,
    promoted_at: promotedAt.toISOString(),
  });
  // 23505 = unique_violation (already recorded for this to_level). Ignore it.
  if (error && error.code !== "23505") {
    console.error("Belt promotion insert:", error.message, error.code);
  }
}

// ============================================================
// Supabase data hooks — client-side (singleton client)
// ============================================================

/** Stable singleton — never changes between renders */
function useSupabase() {
  return useMemo(() => createClient(), []);
}

// ============================================================
// Sync status — "Last synced X min ago" badge on History
// ============================================================

export type SyncStatusState = {
  lastSuccessAt: number | null; // epoch ms
  lastError: string | null;
  isSyncing: boolean;
  /** True when the last success is older than the staleness threshold
   *  (10 min) or null. Drives the red-tint state of the badge. */
  isStale: boolean;
};

const SYNC_STATUS_STORAGE_KEY = "h7_sync_status_v1";
const SYNC_STALE_THRESHOLD_MS = 10 * 60 * 1000;

type StoredSyncStatus = { lastSuccessAt: number | null; lastError: string | null };

function loadStoredSyncStatus(): StoredSyncStatus {
  if (typeof localStorage === "undefined") return { lastSuccessAt: null, lastError: null };
  try {
    const raw = localStorage.getItem(SYNC_STATUS_STORAGE_KEY);
    if (!raw) return { lastSuccessAt: null, lastError: null };
    const parsed = JSON.parse(raw) as Partial<StoredSyncStatus>;
    return {
      lastSuccessAt: typeof parsed.lastSuccessAt === "number" ? parsed.lastSuccessAt : null,
      lastError: typeof parsed.lastError === "string" ? parsed.lastError : null,
    };
  } catch {
    return { lastSuccessAt: null, lastError: null };
  }
}

function persistSyncStatus(status: StoredSyncStatus) {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(SYNC_STATUS_STORAGE_KEY, JSON.stringify(status));
  } catch {
    // Quota exceeded / private-browsing; safe to drop — the in-memory
    // state still works for the current session, the user just won't
    // see accurate freshness after reload.
  }
}

/**
 * Global-ish sync-status state. The History page reads `status` to render
 * the badge; `useActivities.refresh` wraps itself in the mutator callbacks.
 *
 * We tick once a minute while mounted so the relative timestamp on the
 * badge doesn't grow stale on a tab the user leaves open. Matches the
 * Compose/SwiftUI behaviour.
 */
export function useSyncStatus() {
  const [status, setStatus] = useState<SyncStatusState>(() => {
    const stored = loadStoredSyncStatus();
    const now = Date.now();
    return {
      lastSuccessAt: stored.lastSuccessAt,
      lastError: stored.lastError,
      isSyncing: false,
      isStale: stored.lastSuccessAt == null || now - stored.lastSuccessAt > SYNC_STALE_THRESHOLD_MS,
    };
  });

  // 60s tick so `isStale` flips automatically without needing another sync.
  useEffect(() => {
    const id = window.setInterval(() => {
      setStatus((prev) => {
        const nowStale =
          prev.lastSuccessAt == null || Date.now() - prev.lastSuccessAt > SYNC_STALE_THRESHOLD_MS;
        return nowStale === prev.isStale ? prev : { ...prev, isStale: nowStale };
      });
    }, 60_000);
    return () => window.clearInterval(id);
  }, []);

  const beginSync = useCallback(() => {
    setStatus((prev) => ({ ...prev, isSyncing: true }));
  }, []);

  const endSyncSuccess = useCallback(() => {
    const now = Date.now();
    persistSyncStatus({ lastSuccessAt: now, lastError: null });
    setStatus({
      lastSuccessAt: now,
      lastError: null,
      isSyncing: false,
      isStale: false,
    });
  }, []);

  const endSyncFailure = useCallback((message: string) => {
    setStatus((prev) => {
      // lastSuccessAt is deliberately untouched — the user should still
      // see how old the last *good* data is with the error as context.
      const next: SyncStatusState = {
        ...prev,
        isSyncing: false,
        lastError: message,
      };
      persistSyncStatus({ lastSuccessAt: prev.lastSuccessAt, lastError: message });
      return next;
    });
  }, []);

  return { status, beginSync, endSyncSuccess, endSyncFailure };
}

export function useUser() {
  const [user, setUser] = useState<H7User | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = useSupabase();

  const refresh = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const authUser = session?.user ?? (await supabase.auth.getUser()).data.user;
      console.log("[H7] Auth:", authUser ? `user=${authUser.id}` : "no user");
      if (!authUser) { setLoading(false); return; }
      setUserId(authUser.id);
      const { data, error } = await supabase.from("profiles").select("*").eq("id", authUser.id).single();
      if (error) console.error("Profile fetch:", error.message, error.code, error.details);
      if (data) setUser(data as H7User);
    } catch (err) {
      console.error("useUser error:", err);
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => { refresh(); }, [refresh]);

  const updateUser = async (updates: Partial<H7User>) => {
    if (!userId) return;
    const updated = { ...user, ...updates, updated_at: new Date().toISOString() };
    const { error } = await supabase.from("profiles").upsert(updated);
    if (error) console.error("Profile update:", error.message);
    else setUser(updated as H7User);
  };

  return { user, userId, loading, updateUser, refresh };
}

/**
 * Collapse duplicate auto-imported rows before the UI ever sees them.
 *
 * The authoritative dedupe lives in Postgres as the
 * `activity_logs_auto_source_id_dedupe` unique index on
 * `(user_id, source, source_id)` (migrations 0006/0007). But two things
 * can still leave duplicates in the returned set:
 *
 *   • Historical rows written while the PARTIAL index from 0006 was in
 *     place — PostgREST couldn't infer a partial index from
 *     `on_conflict=user_id,source,source_id`, so the upsert's ON CONFLICT
 *     clause silently fell through and both rows landed. Migration 0007
 *     fixed the schema but doesn't retroactively delete the ghost rows —
 *     migration 0008 does that server-side.
 *   • A concurrent mobile-client race (iOS `.task` + `scenePhase
 *     → .active`, or Android `onResume` + HC observer) that both ran
 *     the auto-import before either committed progress, if either hit
 *     the DB before 0007 was applied. Web doesn't import itself, but it
 *     reads whatever those clients wrote.
 *
 * Belt-and-braces defence: group by the same key the DB uses and keep
 * the earliest `created_at` row so the UI never surfaces the ghost
 * copy even if something slipped through. Manual entries (source ===
 * 'manual', always `source_id === null`) pass through unchanged — the
 * user may legitimately log two identical "Walking 30 min" sessions on
 * the same day. Legacy auto-rows without a `source_id`
 * (pre-migration-0005) also bypass dedup since their natural key is
 * the `(user_id, source, date)` triple already enforced by migration
 * 0004.
 */
export function dedupeActivities(logs: ActivityLog[]): ActivityLog[] {
  const seen = new Map<string, ActivityLog>();
  const result: ActivityLog[] = [];
  for (const log of logs) {
    if (log.source === "manual") {
      // Manual entries are always allowed to repeat — the user may
      // legitimately log two "Walking 30 min" sessions in one day.
      result.push(log);
      continue;
    }
    // Heuristic key for ALL non-manual rows:
    //   `(source, date-truncated-to-minute, duration, type)`.
    // Used to be source_id-keyed only, but in production we
    // observed Apple Health storing the same workout under 3-4
    // different HKWorkout.uuid values (Garmin Connect sync retries
    // write a new HKWorkout each pass; multiple apps writing the
    // same activity create their own). The old source_id key let
    // those land as separate rows; the heuristic key collapses
    // them. Server-side migration 0010 cleans up the historical
    // accumulation; this client change prevents dupes from showing
    // up in the UI even if they slip into the DB. Mirrors iOS
    // ActivityService.dedupeKey + Android ActivityRepository
    // .deduplicate.
    const minuteBucket = log.date.split(".")[0].slice(0, 16); // "2026-04-26T13:16"
    const key = `${log.source}|${minuteBucket}|${log.duration_minutes}|${log.activity_type}`;
    const existing = seen.get(key);
    if (!existing) {
      seen.set(key, log);
      result.push(log);
      continue;
    }
    // Keep the earlier `created_at` — that's the row the server
    // committed first. Ties fall back to lexicographic id ordering.
    let incomingWins: boolean;
    if (log.created_at === null) incomingWins = false;
    else if (existing.created_at === null) incomingWins = true;
    else if (log.created_at < existing.created_at) incomingWins = true;
    else if (log.created_at === existing.created_at) incomingWins = log.id < existing.id;
    else incomingWins = false;
    if (incomingWins) {
      seen.set(key, log);
      const idx = result.findIndex((r) => r.id === existing.id);
      if (idx >= 0) result[idx] = log;
    }
    // else: drop the incoming dup.
  }
  return result;
}

/**
 * Recompute every completed week's `total_minutes` and
 * `level_achieved` from the live `activities` array, then upsert
 * into `week_records` and delete any orphan rows whose week_start
 * isn't in the newly-computed set.
 *
 * Mirrors iOS `ActivityService.rebuildWeekRecords` and Android
 * `ActivityRepository.rebuildWeekRecords`. Called from:
 *   • `useActivities` self-heal pass when stored totals don't
 *     match what `activities` would compute (catches server-side
 *     cleanups, cross-device deletes, the timezone-pair dupes
 *     migration 0011 cleared, etc.)
 *   • The Extend-Staircase toggle handler in profile/page.tsx so
 *     flipping H8-H14 mode actually re-stamps every week's
 *     `level_achieved` against the new `Level.maxAllowed`.
 *
 * Walks records oldest-first applying the grace/demotion rules
 * from `LevelEngine.replayHistory` so `level_achieved` reflects
 * what the user actually held that week (not just the raw
 * minute-bucket result), matching what mobile clients write.
 *
 * Skips the in-progress current week — `computeStatus` handles
 * that separately from live `activities`. Storing a record for
 * an in-progress week would cause `replayHistory` to treat it as
 * a finished fail-week and burn the user's grace prematurely.
 */
export async function rebuildWeekRecords(
  supabase: SupabaseClient,
  userId: string,
  activities: ActivityLog[],
  existingWeekRecords: WeekRecord[],
): Promise<WeekRecord[]> {
  const currentWeekStart = startOfWeek(new Date()).toISOString();

  // Bucket activities by week.
  const bucketed = new Map<string, number>();
  for (const a of activities) {
    const ws = startOfWeek(new Date(a.date)).toISOString();
    bucketed.set(ws, (bucketed.get(ws) ?? 0) + h7Minutes(a));
  }

  // Walk oldest-first applying the same grace / demotion rules
  // replayHistory uses, so the persisted level_achieved matches
  // what the user actually held week-by-week.
  const sortedWeeks = [...bucketed.entries()].sort((a, b) =>
    a[0].localeCompare(b[0]),
  );
  const newRecords: Array<Omit<WeekRecord, "id" | "created_at"> & { id?: string }> = [];
  let statusLevel = levelFromValue(0);
  let consecutiveAtStatus = 0;
  for (const [weekStart, minutes] of sortedWeeks) {
    if (weekStart >= currentWeekStart) continue; // skip in-progress / future
    const achieved = levelFromWeeklyMinutes(minutes);
    let graceUsed = false;
    if (achieved.value >= statusLevel.value) {
      if (achieved.value > statusLevel.value) {
        statusLevel = achieved;
        consecutiveAtStatus = 1;
      } else {
        consecutiveAtStatus++;
      }
    } else {
      const graceAvailable = consecutiveAtStatus >= WEEKS_FOR_GRACE;
      if (graceAvailable) {
        graceUsed = true;
        consecutiveAtStatus = 0;
      } else {
        statusLevel = levelFromValue(Math.max(0, statusLevel.value - 1));
        consecutiveAtStatus = achieved.value >= statusLevel.value ? 1 : 0;
      }
    }
    const existing = existingWeekRecords.find((r) => r.week_start === weekStart);
    // Conditionally include `id` only when an existing row carries
    // one. Sending `{ id: undefined, ... }` causes Supabase's
    // PostgREST client to serialize id as explicit null, which
    // violates the column's NOT NULL constraint instead of letting
    // Postgres pick `default uuid_generate_v4()`. Omitting the key
    // entirely is what triggers the default.
    const baseRecord = {
      user_id: userId,
      week_start: weekStart,
      total_minutes: minutes,
      level_achieved: graceUsed ? statusLevel.value : achieved.value,
      is_grace_week: graceUsed,
    };
    newRecords.push(
      existing?.id
        ? { id: existing.id, ...baseRecord }
        : baseRecord,
    );
  }

  // Delete orphan rows — week_starts in cloud that don't appear
  // in the newly-computed bucket set. Catches timezone-pair
  // dupes (one row at UTC midnight, another at local midnight
  // for the same logical week — see migration 0011).
  const validWeekStarts = new Set(newRecords.map((r) => r.week_start));
  const orphanIds = existingWeekRecords
    .filter((r) => !validWeekStarts.has(r.week_start))
    .map((r) => r.id);
  if (orphanIds.length > 0) {
    const { error: delError } = await supabase
      .from("week_records")
      .delete()
      .in("id", orphanIds);
    if (delError) console.error("rebuild orphan delete:", delError.message);
  }

  // Upsert each fresh record. Server unique constraint is
  // (user_id, week_start), so we let Postgres dedupe on conflict
  // — the existing.id we threaded through above keeps PKs stable
  // when a row already exists.
  if (newRecords.length > 0) {
    const { error: upError } = await supabase
      .from("week_records")
      .upsert(newRecords, { onConflict: "user_id,week_start" });
    if (upError) console.error("rebuild upsert:", upError.message);
  }

  // Return the canonical post-rebuild set so callers can update
  // local state without an extra round-trip. Refetch ID columns
  // for any rows where we couldn't reuse an existing one.
  const { data } = await supabase
    .from("week_records")
    .select("*")
    .eq("user_id", userId);
  return (data as WeekRecord[] | null) ?? [];
}

/**
 * Optional hooks into the sync-status pipeline. When `useActivities` is
 * the page's primary data source (History, Dashboard), the consumer can
 * pass these from `useSyncStatus()` so the "Last synced" badge reflects
 * every refresh — initial load, tab-visibilitychange, and manual
 * refreshes. Pages that don't show the badge can omit them.
 */
type ActivitiesSyncCallbacks = {
  beginSync?: () => void;
  endSyncSuccess?: () => void;
  endSyncFailure?: (message: string) => void;
};

export function useActivities(userId: string | null, sync?: ActivitiesSyncCallbacks) {
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = useSupabase();

  // Stash the callbacks in a ref so `refresh`'s identity stays stable
  // across renders — otherwise every status update would rebuild the
  // function, re-fire the mount `useEffect`, and loop.
  const syncRef = useMemo(() => ({ current: sync }), []);
  syncRef.current = sync;

  const refresh = useCallback(async () => {
    if (!userId) { setLoading(false); return; }
    syncRef.current?.beginSync?.();
    let failureMsg: string | null = null;
    try {
      const { data, error } = await supabase
        .from("activity_logs")
        .select("*")
        .eq("user_id", userId)
        .order("date", { ascending: false });
      if (error) {
        console.error("Activities fetch:", error.message, error.code);
        failureMsg = error.message;
      }
      const dedupedActivities = data ? dedupeActivities(data as ActivityLog[]) : [];
      if (data) setActivities(dedupedActivities);

      // Self-heal stale week_records. After server-side data
      // changes that bypass this client's CRUD (SQL migrations
      // 0010 / 0011, deletes from a mobile device, an admin row
      // edit, etc.), the cached `total_minutes` for each week may
      // no longer match what `activities` actually contains.
      // `replayHistory` walks those stale records and produces the
      // wrong belt — same H2-on-Tuesday bug that hit iOS / Android
      // before their fix landed. Mirrors
      // `ActivityService.loadActivities` (iOS) and
      // `ActivityRepository.loadActivitiesSuspending` (Android).
      if (dedupedActivities.length > 0) {
        const { data: weekRecordsRaw } = await supabase
          .from("week_records")
          .select("*")
          .eq("user_id", userId);
        const records = (weekRecordsRaw as WeekRecord[] | null) ?? [];
        const currentWeekStartIso = startOfWeek(new Date()).toISOString();
        const bucketed = new Map<string, number>();
        for (const a of dedupedActivities) {
          const ws = startOfWeek(new Date(a.date)).toISOString();
          bucketed.set(ws, (bucketed.get(ws) ?? 0) + h7Minutes(a));
        }
        const isStale = records.some(
          (r) =>
            r.week_start !== currentWeekStartIso &&
            (bucketed.get(r.week_start) ?? 0) !== r.total_minutes,
        );
        if (isStale) {
          await rebuildWeekRecords(supabase, userId, dedupedActivities, records);
        }
      }
    } catch (err) {
      console.error("useActivities error:", err);
      failureMsg = err instanceof Error ? err.message : String(err);
    }
    setLoading(false);
    if (failureMsg) syncRef.current?.endSyncFailure?.(failureMsg);
    else syncRef.current?.endSyncSuccess?.();
  }, [userId, supabase, syncRef]);

  useEffect(() => { refresh(); }, [refresh]);

  // Re-fetch when the tab regains visibility so activities written to
  // Supabase while the page was backgrounded (e.g. via the mobile apps
  // importing Garmin data through HealthKit / Health Connect) show up
  // without a manual reload. Mirrors iOS `scenePhase == .active` and
  // Android `ON_RESUME` handlers.
  useEffect(() => {
    if (typeof document === "undefined") return;
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        refresh();
      }
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
  }, [refresh]);

  // `source_id` is excluded from the caller-required fields — the web
  // client only ever creates manual rows (source === 'manual'), and
  // those never carry an upstream sample id. Native clients populate
  // `source_id` in their own import paths.
  const addActivity = async (log: Omit<ActivityLog, "id" | "created_at" | "user_level" | "source_id">) => {
    // Fetch this user's week records so computeStatus can see their full history.
    const { data: weekRecordsRaw } = await supabase
      .from("week_records")
      .select("*")
      .eq("user_id", log.user_id);
    const weekRecords = (weekRecordsRaw as WeekRecord[] | null) ?? [];

    // Level the user *held* entering this activity — stamped on the row for analytics.
    const before = computeStatus(activities, weekRecords);
    const levelBefore = before.currentLevel.displayName;

    const row = {
      user_id: log.user_id,
      date: log.date,
      duration_minutes: log.duration_minutes,
      activity_type: log.activity_type,
      source: log.source,
      intensity: log.intensity,
      user_level: levelBefore,
    };

    // Auto-imported rows (healthkit / garmin / fitbit) go through upsert
    // against the auto-source dedupe indexes. Migration 0006 added a
    // `(user_id, source, source_id)` partial unique index as the
    // authoritative dedupe key (same upstream sample id = same workout);
    // the legacy `(user_id, source, date)` index from migration 0004
    // remains only for rows without a source_id. `ignoreDuplicates: true`
    // compiles to `INSERT … ON CONFLICT DO NOTHING`, so a re-synced
    // workout is silently ignored instead of duplicated — mirrors
    // iOS/Android behavior.
    //
    // The web client only ever creates manual rows today, so the auto
    // branch is primarily documentary / future-proofing. Manual entries
    // keep using plain `.insert()` because the partial index excludes
    // `source = 'manual'` on purpose — the user is allowed to log two
    // "Walking 30 min" entries on the same day.
    const isAutoSource = log.source !== "manual";
    // We don't populate `source_id` from the web yet (auto-source imports
    // happen only on native), so the date-based target is the only one
    // that can apply here. When/if the web ever imports auto sources, it
    // should switch to `user_id,source,source_id`.
    const autoConflictTarget = "user_id,source,date";
    const query = isAutoSource
      ? supabase
          .from("activity_logs")
          .upsert(row, { onConflict: autoConflictTarget, ignoreDuplicates: true })
          .select()
      : supabase
          .from("activity_logs")
          .insert(row)
          .select()
          .single();

    const { data, error } = await query;
    if (error) {
      console.error("Add activity:", error.message, error.details, error.hint);
      return;
    }
    // `.upsert(...).select()` returns an array (possibly empty if the row was
    // silently ignored as a duplicate); `.insert(...).select().single()`
    // returns a single row. Normalize.
    const inserted = Array.isArray(data) ? (data[0] as ActivityLog | undefined) : (data as ActivityLog | null);
    if (!inserted) return; // auto-source duplicate silently dropped by the DB

    setActivities((prev) => [inserted, ...prev]);

    // If this activity pushed the user up a level, record the promotion.
    const after = computeStatus([inserted, ...activities], weekRecords);
    const levelAfter = after.currentLevel.displayName;
    if (after.currentLevel.value > before.currentLevel.value) {
      await maybeRecordPromotion(supabase, log.user_id, levelBefore, levelAfter, new Date());
    }
  };

  const updateActivity = async (log: ActivityLog) => {
    const { error } = await supabase
      .from("activity_logs")
      .update({
        date: log.date,
        duration_minutes: log.duration_minutes,
        activity_type: log.activity_type,
        intensity: log.intensity,
      })
      .eq("id", log.id);
    if (error) console.error("Update activity:", error.message);
    else setActivities((prev) => prev.map((a) => (a.id === log.id ? log : a)));
  };

  const deleteActivity = async (id: string) => {
    // Capture the row BEFORE the delete so we can write a tombstone
    // for auto-imported rows. Without this, deleting a HealthKit /
    // Health-Connect-sourced workout in the web client would be
    // reversed by the next iOS / Android sync — the mobile importer
    // would re-fetch the workout from the platform's health store,
    // see no matching row in the cloud, and INSERT it again.
    // Migration 0009 added `activity_log_deletions`; the mobile
    // clients consult it on every refresh and skip resurrected
    // source_ids. Web doesn't import from HK/HC itself, so it only
    // needs to write the tombstone — there's nothing to filter on
    // the way in.
    const removed = activities.find((a) => a.id === id) ?? null;

    const { error } = await supabase.from("activity_logs").delete().eq("id", id);
    if (error) {
      console.error("Delete activity:", error.message);
      return;
    }
    setActivities((prev) => prev.filter((a) => a.id !== id));

    // Tombstone non-manual rows with a non-empty source_id. Manual
    // entries (source === "manual", source_id null) aren't fetched
    // from anywhere on any platform, so a tombstone for them would
    // be dead weight in the table.
    if (
      removed &&
      removed.source !== "manual" &&
      removed.source_id &&
      removed.source_id.length > 0
    ) {
      const { error: tombstoneError } = await supabase
        .from("activity_log_deletions")
        .upsert(
          {
            user_id: removed.user_id,
            source: removed.source,
            source_id: removed.source_id,
          },
          { onConflict: "user_id,source,source_id", ignoreDuplicates: true },
        );
      // Non-fatal: the row itself is already gone, and the in-memory
      // state is updated. If the tombstone INSERT failed (network
      // blip, RLS hiccup) the next mobile sync may transiently
      // re-import the row; but the user can delete again, which will
      // retry the tombstone write. Logged so the failure is visible
      // in the dev console.
      if (tombstoneError) {
        console.error("Record deletion tombstone:", tombstoneError.message);
      }
    }
  };

  return { activities, loading, refresh, addActivity, updateActivity, deleteActivity };
}

export function useWeekRecords(userId: string | null) {
  const [records, setRecords] = useState<WeekRecord[]>([]);
  const supabase = useSupabase();

  useEffect(() => {
    if (!userId) return;
    supabase
      .from("week_records")
      .select("*")
      .eq("user_id", userId)
      .order("week_start", { ascending: false })
      .then((result: { data: WeekRecord[] | null; error: unknown }) => {
        if (result.error) console.error("Week records fetch:", result.error);
        if (result.data) setRecords(result.data);
      });
  }, [userId, supabase]);

  return { records };
}

export function usePosts() {
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = useSupabase();

  const refresh = useCallback(async () => {
    try {
      await supabase.auth.getSession();
      const { data, error } = await supabase
        .from("social_posts")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) console.error("Posts fetch:", error.message, error.code, error.details, error.hint);
      if (data) setPosts(data as SocialPost[]);
    } catch (err) {
      console.error("usePosts error:", err);
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => { refresh(); }, [refresh]);

  const addPost = async (post: Omit<SocialPost, "id" | "created_at" | "likes_count" | "comments_count">) => {
    const { data, error } = await supabase
      .from("social_posts")
      .insert({
        user_id: post.user_id,
        username: post.username,
        user_level: post.user_level,
        text: post.text,
        image_url: post.image_url,
      })
      .select()
      .single();
    if (error) console.error("Add post:", error.message, error.details, error.hint);
    if (data) setPosts((prev) => [data as SocialPost, ...prev]);
  };

  return { posts, loading, refresh, addPost };
}

export function useComments(postId: string | null) {
  const [comments, setComments] = useState<PostComment[]>([]);
  const supabase = useSupabase();

  const refresh = useCallback(async () => {
    if (!postId) return;
    const { data, error } = await supabase
      .from("post_comments")
      .select("*")
      .eq("post_id", postId)
      .order("created_at", { ascending: true });
    if (error) console.error("Comments fetch:", error.message);
    if (data) setComments(data as PostComment[]);
  }, [postId, supabase]);

  useEffect(() => { refresh(); }, [refresh]);

  const addComment = async (comment: Omit<PostComment, "id" | "created_at">) => {
    const { data, error } = await supabase
      .from("post_comments")
      .insert({
        post_id: comment.post_id,
        user_id: comment.user_id,
        username: comment.username,
        text: comment.text,
        reply_to_username: comment.reply_to_username,
      })
      .select()
      .single();
    if (error) console.error("Add comment:", error.message);
    if (data) setComments((prev) => [...prev, data as PostComment]);
  };

  return { comments, refresh, addComment };
}

export function useLikes(userId: string | null) {
  const supabase = useSupabase();

  const likePost = async (postId: string) => {
    if (!userId) return;
    const { error } = await supabase.from("post_likes").insert({
      post_id: postId,
      user_id: userId,
    });
    if (error) console.error("Like:", error.message);
  };

  const unlikePost = async (postId: string) => {
    if (!userId) return;
    const { error } = await supabase
      .from("post_likes")
      .delete()
      .eq("post_id", postId)
      .eq("user_id", userId);
    if (error) console.error("Unlike:", error.message);
  };

  return { likePost, unlikePost };
}

export function useSignOut() {
  const supabase = useSupabase();
  return async () => {
    await supabase.auth.signOut();
    window.location.href = "/app/login";
  };
}
