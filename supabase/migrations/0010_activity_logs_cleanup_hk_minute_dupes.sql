-- ============================================
-- 0010 — Collapse HK same-minute / same-duration / same-type dupes
-- ============================================
--
-- Different from 0008 (which removed exact `(user_id, source, source_id)`
-- duplicates that slipped past the broken partial index in 0006).
-- This one targets a real-world data shape we observed in production:
-- the same workout written multiple times to Apple Health by either
-- Garmin Connect (sync retries write a new HKWorkout each pass) or
-- multiple apps recording the same activity (Garmin Connect + Apple
-- Watch native + Strava-to-HK). Each HK entry carries a unique
-- `HKWorkout.uuid`, so the auto-source unique index in 0007 can't
-- catch them — every UUID is technically distinct.
--
-- A user reported 3-4 copies of every workout from the last 7 days
-- in their History tab. Spot check via:
--
--   select date_trunc('minute', date), activity_type, duration_minutes,
--          count(*), array_agg(distinct source_id)
--   from activity_logs where user_id = '<uuid>' and source = 'healthkit'
--   group by 1, 2, 3 having count(*) > 1;
--
-- Strategy:
--   • Scope: source = 'healthkit' only (Garmin & Fitbit don't have the
--     same multi-app write pattern; manual is intentionally exempt).
--   • Group by (user_id, source, date_trunc('minute', date),
--               duration_minutes, activity_type) — bucketing the
--     timestamp to the minute absorbs sub-second drift between
--     re-syncs.
--   • Keep the earliest (created_at, id) row per group; delete the
--     rest. Matches the tiebreak the iOS / Android client-side
--     dedup uses, so the server-stored row matches what the UI
--     would have shown anyway.
--
-- Safe to run repeatedly — becomes a no-op once each minute-bucket
-- has at most one row.

with ranked as (
  select
    id,
    row_number() over (
      partition by user_id,
                   source,
                   date_trunc('minute', date),
                   duration_minutes,
                   activity_type
      order by created_at asc, id asc
    ) as rn
  from activity_logs
  where source = 'healthkit'
)
delete from activity_logs
where id in (
  select id from ranked where rn > 1
);
