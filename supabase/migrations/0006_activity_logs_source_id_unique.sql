-- ============================================
-- 0006 — Source-id based dedupe for auto-imported activities
-- ============================================
--
-- Migration 0004 added a partial unique index on
--   (user_id, source, date) where source <> 'manual'
-- as the auto-import dedupe key. In practice this turned out to be too
-- coarse: when Garmin Connect reprocesses a workout and re-writes it to
-- Apple Health (or Health Connect) with a fresh HK sample UUID but the
-- SAME `startDate`, the refreshed workout carries a different `source_id`
-- but the same (user_id, source, date) tuple — so the upsert at migration
-- 0004's conflict target silently drops it. End result on the device:
-- the user's freshly-synced Garmin activity never appears in H7.
--
-- This migration introduces a tighter dedupe key — `source_id` — which
-- IS the authoritative identity of an auto-imported sample (same UUID ↔
-- same workout). Different `source_id` values must produce different
-- rows, even if they share a start timestamp.
--
--   1. New partial unique index on (user_id, source, source_id) where
--      source_id is not null. This is what every auto-sync client now
--      conflicts against.
--
--   2. The existing (user_id, source, date) index is narrowed to rows
--      WITHOUT a source_id — it keeps protecting legacy rows from
--      pre-0005 imports that never got a UUID stamp, but no longer
--      collides with distinct modern samples that share a start time.
--
-- Client changes land alongside this migration in:
--   • h7-iOS      — SupabaseService.upsertAutoSourceActivity
--   • h7-android  — SupabaseService.upsertAutoSourceActivity
--   • h7-web      — useActivities.addActivity (for auto-sources)
--
-- Rollback:
--   drop index if exists activity_logs_auto_source_id_dedupe;
--   drop index if exists activity_logs_auto_source_dedupe;
--   create unique index activity_logs_auto_source_dedupe
--     on activity_logs (user_id, source, date)
--     where source <> 'manual';

-- 0. Ensure `source_id` exists. This duplicates the add-column from
--    migration 0005 so that 0006 is self-contained and safe to apply to
--    databases where 0005 was skipped. `add column if not exists` and the
--    matching index `if not exists` make both statements idempotent when
--    0005 has already run.
alter table activity_logs
  add column if not exists source_id text;

create index if not exists activity_logs_source_id
  on activity_logs (user_id, source_id)
  where source_id is not null;

-- 1. Authoritative: same sample UUID for the same source + user → one row.
create unique index if not exists activity_logs_auto_source_id_dedupe
  on activity_logs (user_id, source, source_id)
  where source <> 'manual' and source_id is not null;

-- 2. Narrow the start-timestamp index so it no longer collides with
--    distinct modern samples that legitimately share a start time.
--    Drop + recreate is required because Postgres doesn't let you ALTER
--    the WHERE clause of a partial index in place.
drop index if exists activity_logs_auto_source_dedupe;

create unique index if not exists activity_logs_auto_source_dedupe
  on activity_logs (user_id, source, date)
  where source <> 'manual' and source_id is null;
