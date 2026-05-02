-- ============================================
-- 0005 — Activity-logs source_id column
-- ============================================
--
-- Follow-up to 0004. The dedupe-on-(user_id, source, date) constraint
-- prevents duplicate INSERTs, but it does not give us a way to map a
-- deletion event from HealthKit (`HKDeletedObject.uuid`) or Health
-- Connect (`DeletionChange.recordId`) back to the Supabase row it
-- represents — the platform delete payload carries only the upstream
-- sample identifier, not the start timestamp we'd need to reconstruct
-- the (user_id, source, date) tuple.
--
-- This migration adds a nullable `source_id` column that stores the
-- upstream identifier (HK sample UUID or HC record metadata id) at
-- import time, so incremental-sync paths can later resolve a deletion
-- change-event to the exact row to remove.
--
-- The column is NULLABLE — existing rows (imported before this column
-- existed) have no source_id, and manual entries never will. The
-- partial index excludes null values so it stays small.
--
-- Populated by:
--   • h7-iOS      — HealthKitService.fetchWorkoutsIncremental (workout.uuid)
--   • h7-android  — HealthConnectService.mapResponse (session.metadata.id)
--
-- Consumed by:
--   • SupabaseService.deleteActivitiesBySourceIds(userId, source, sourceIds)
--
-- Rollback:
--   drop index if exists activity_logs_source_id;
--   alter table activity_logs drop column if exists source_id;

alter table activity_logs
  add column if not exists source_id text;

create index if not exists activity_logs_source_id
  on activity_logs (user_id, source_id)
  where source_id is not null;
