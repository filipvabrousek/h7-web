-- ============================================
-- 0004 — Activity-logs deduplication constraint
-- ============================================
--
-- Auto-imported activities from HealthKit / Garmin / Fitbit are re-synced
-- on every app launch, scenePhase → .active, HK observer wake, and
-- Android ON_RESUME. Historically the client-side `isDuplicate` check
-- was our only defense against double-inserting the same workout — and
-- it scanned in-memory state, so concurrent sync paths (e.g. foreground
-- return overlapping with an HKObserverQuery wake on iOS) could race
-- and produce duplicate rows in Supabase.
--
-- This migration adds a PARTIAL unique index on the identity triple
-- that uniquely pins an auto-imported workout:
--   (user_id, source, date)
-- where `date` is the workout's start timestamp (timestamptz, precise
-- to the microsecond). Two workouts from the same source for the same
-- user cannot share a start timestamp — the constraint is naturally
-- safe.
--
-- The index is PARTIAL (`where source <> 'manual'`) so manual entries
-- remain free to duplicate: a user can legitimately log "Walking
-- 30 min" twice on the same day, and the app must accept both.
--
-- Clients must now insert with `ON CONFLICT DO NOTHING` (or supabase
-- upsert with `ignoreDuplicates: true`) targeting these columns. The
-- iOS/Android/Web client-side changes live in:
--   • h7-iOS      — ActivityService.importFromHealthKit (supabase upsert)
--   • h7-android  — ActivityRepository.importFromHealthConnect (upsert)
--   • h7-web      — useActivities.addActivity (upsert; for auto-sources)
--
-- Rollback: `drop index if exists activity_logs_auto_source_dedupe;`

create unique index if not exists activity_logs_auto_source_dedupe
on activity_logs (user_id, source, date)
where source <> 'manual';
