-- ============================================
-- 0008 — Clean up pre-0007 activity_logs duplicates
-- ============================================
--
-- Migration 0006 was live for the window between its deploy and 0007
-- (which fixed it). During that window, the PARTIAL unique index on
-- (user_id, source, source_id) could not be inferred by PostgREST, so
-- every iOS/Android auto-import hit:
--
--   ERROR: there is no unique or exclusion constraint matching the
--          ON CONFLICT specification
--
-- The clients logged the error but some earlier retry paths (and the
-- race between `.task` / `scenePhase → .active` on iOS) produced rows
-- that did land through alternate code paths — resulting in ghost
-- duplicates sharing the same (user_id, source, source_id) triple.
-- Users see these on the History screen as pairs of identical
-- HealthKit/Health-Connect workouts with the same start-time,
-- duration, and type.
--
-- 0007 restored the index so no NEW duplicates can be inserted. The
-- client-side dedup (iOS ActivityService, Android ActivityRepository,
-- web useActivities) hides the existing dupes from the UI. This
-- migration is the third leg of the fix — it actually removes the
-- ghost rows from storage so they can't resurface when a client
-- refetches or another device syncs.
--
-- Strategy:
--   • Scope: only rows that are auto-imported (source <> 'manual')
--     and carry a non-null source_id. Manual entries are never
--     deduped (users may legitimately log two identical activities),
--     and pre-0005 rows without source_id are already covered by the
--     (user_id, source, date) constraint from 0004.
--   • Keep the EARLIEST (created_at, id) row per
--     (user_id, source, source_id) group — matches the client-side
--     tiebreak so the UI view is stable across refetches.
--   • Delete everything else in the group.
--
-- Safe to run repeatedly; becomes a no-op once the table has no
-- duplicate (user_id, source, source_id) triples remaining.
--
-- Rollback:
--   Not reversible — the deleted rows were functional duplicates of
--   the kept rows (same upstream sample, same user, same source), so
--   nothing unique is lost. If a row needs to come back, the next
--   HealthKit/Health-Connect sync re-imports it under the same
--   source_id and the unique index from 0007 keeps it single.

with ranked as (
  select
    id,
    row_number() over (
      partition by user_id, source, source_id
      order by created_at asc, id asc
    ) as rn
  from activity_logs
  where source <> 'manual'
    and source_id is not null
)
delete from activity_logs
where id in (
  select id from ranked where rn > 1
);
