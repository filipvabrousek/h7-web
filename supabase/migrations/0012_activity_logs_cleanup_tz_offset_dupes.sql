-- ============================================
-- 0012 — Collapse same-workout duplicates created by the Android
--        Health Connect timezone bug
-- ============================================
--
-- Different from 0010 (which collapsed same-MINUTE duplicates from
-- HealthKit's multi-write pattern). The bug this migration heals
-- left rows at *different* UTC instants for the same real-world
-- workout, because the Android HealthConnectService used to render
-- session.startTime via
--   `.atZone(systemDefault()).toLocalDateTime()` → ISO_LOCAL_DATE_TIME
-- which dropped the timezone offset. Postgres received a naive
-- ISO string like "2026-05-03T10:00:00", interpreted it as UTC, and
-- stored it as 10:00 UTC — even though the actual workout instant
-- was 08:00 UTC (= 10:00 CEST). iOS HealthKit imports the SAME
-- workout via SDK paths that DO include the offset and land at the
-- correct 08:00 UTC. Result: the History tab shows two rows for
-- the same workout, exactly the local-timezone offset apart
-- ("Running 10:00 2h46m + Running 08:00 2h46m on 3 May" reported
-- from the field on a CEST device).
--
-- The Android writer is fixed in HealthConnectService.kt — it now
-- calls `session.startTime.toString()` directly, which Instant
-- serialises with a `Z` suffix. New imports land at the correct
-- UTC instant, but the historical data still has both rows.
--
-- Strategy:
--   • Group by (user_id, activity_type, duration_minutes) —
--     dropping `source` so we collapse cross-source dupes too
--     (the same workout from HealthKit + Health Connect is the
--     dominant pattern; healthkit + healthkit dupes are already
--     handled by 0010).
--   • Within each group, look at pairs whose dates are within
--     a window equal to the largest plausible local-tz offset
--     from UTC (we use 14h to cover any timezone, including
--     places like Pacific/Kiritimati at +14:00).
--   • Keep the row with the SMALLEST UTC second-of-day —
--     under the timezone-offset bug, the buggy row is shifted
--     LATER in UTC than the correct one, so "earliest UTC"
--     biases toward the well-formed row. Ties fall back to the
--     earliest created_at, then lexicographic id.
--   • Delete the rest.
--
-- Safe to run repeatedly — becomes a no-op once each group has
-- exactly one row.

with grouped as (
  select
    id,
    user_id,
    activity_type,
    duration_minutes,
    date,
    created_at,
    -- Round date to the nearest hour-bucket so we group rows that
    -- are off by an integer number of hours (which is what every
    -- real-world timezone offset is). Two rows within the same
    -- hour-bucket-after-rounding are treated as candidates.
    extract(epoch from date)::bigint / 3600 as hour_bucket
  from activity_logs
  where source != 'manual'
),
-- For each (user, type, duration) tuple, walk the rows ordered by
-- date and group together rows whose dates are within ±14 h of the
-- group's first row.
clusters as (
  select
    g.*,
    -- A row's "cluster index" within its (user, type, duration)
    -- group is the count of preceding rows whose date is more
    -- than 14h before this one. Rows in the same cluster get
    -- the same cluster_id.
    sum(case when prev_date is null or date - prev_date > interval '14 hours' then 1 else 0 end)
      over (
        partition by user_id, activity_type, duration_minutes
        order by date
        rows between unbounded preceding and current row
      ) as cluster_id
  from (
    select
      g.*,
      lag(date) over (
        partition by user_id, activity_type, duration_minutes
        order by date
      ) as prev_date
    from grouped g
  ) g
),
-- Within each cluster, rank by "earliest UTC second-of-day" then
-- created_at then id, and keep rank=1.
ranked as (
  select
    id,
    row_number() over (
      partition by user_id, activity_type, duration_minutes, cluster_id
      order by extract(epoch from date)::bigint % 86400 asc,
               created_at asc,
               id asc
    ) as rn
  from clusters
)
delete from activity_logs
where id in (
  select id from ranked where rn > 1
);
