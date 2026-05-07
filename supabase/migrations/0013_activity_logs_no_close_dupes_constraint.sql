-- ============================================
-- 0013 — Server-side prevention: exclusion constraint blocking
--        same-workout duplicates within a 15-minute window
-- ============================================
--
-- Defence in depth on top of:
--   • client-side dedup heuristic (iOS/Android/Web all collapse
--     same-instant rows in-memory),
--   • the source_id unique index from migration 0007,
--   • the cleanup migrations 0010 (HK same-minute) and 0012
--     (Health Connect tz-offset).
--
-- All three of those still leave a hole: if a NEW writer ships
-- with a date-formatting bug (or a third-party Health Connect
-- data provider does), it can land a row at a UTC instant that
-- collides with an existing correct row from another source.
-- This constraint catches it at the DB so the duplicate never
-- persists.
--
-- Implementation: PostgreSQL EXCLUSION CONSTRAINT using btree_gist
-- (a standard extension supported on Supabase). The constraint
-- forbids any two non-manual rows for the same user + source +
-- activity type + duration whose date ranges overlap a
-- ±15-minute window.
--
-- IMMUTABLE wrapper:
-- The naive form
--   tstzrange(date - interval '15 minutes',
--             date + interval '15 minutes', '[]')
-- fails with "functions in index expression must be marked
-- IMMUTABLE" because Postgres marks `timestamptz - interval` as
-- STABLE (not IMMUTABLE) even when the interval is purely
-- seconds-based — `interval` can hold months/days/years which
-- depend on session timezone for DST. We wrap the construction
-- in an IMMUTABLE SQL function. Marking the wrapper IMMUTABLE
-- is safe because `interval '15 minutes'` has no DST/calendar
-- ambiguity; this is the standard Postgres pattern for tstzrange
-- exclusion constraints.
--
-- Trade-offs:
--   • False positive risk: a user doing two genuinely distinct
--     workouts of the same type+duration within 15 minutes of
--     each other (e.g. two consecutive 30-min walks at 09:00
--     and 09:10) would be rejected on insert. We judge this
--     acceptable — it's an unusual pattern and the user can
--     either edit the duration or use manual entry (exempt).
--   • Manual entries are explicitly exempt — users may
--     legitimately log identical "Walking 30 min" sessions on
--     the same day (e.g. multiple short walks logged from
--     memory).
--   • Window size 15 min covers sub-minute drift between
--     re-syncs from the same source (Garmin Connect rounds to
--     second, Health Connect to nanosecond, etc.) AND any
--     small clock skew between writers. It does NOT catch
--     hour-aligned timezone-offset bugs — those are a separate
--     class of bug, fixed at the writer level (see migration
--     0012 prose) and at client-side dedup normalization.

create extension if not exists btree_gist;

-- Immutable window-builder. The function body uses the STABLE
-- `timestamptz - interval` operator internally, but the result is
-- deterministic because '15 minutes' contains no DST-sensitive
-- components (only seconds), so we can safely promote the wrapper
-- to IMMUTABLE. Postgres requires IMMUTABLE for any function used
-- in an index expression.
create or replace function activity_dedup_window(d timestamptz)
returns tstzrange
language sql
immutable
parallel safe
as $$
  select tstzrange(d - interval '15 minutes', d + interval '15 minutes', '[]');
$$;

-- Drop existing constraint if re-running (defensive; first install
-- skips silently).
alter table activity_logs drop constraint if exists activity_logs_no_close_dupes;

alter table activity_logs add constraint activity_logs_no_close_dupes
exclude using gist (
  user_id           with =,
  source            with =,
  activity_type     with =,
  duration_minutes  with =,
  -- ±15 min range around the row's date via the IMMUTABLE wrapper.
  -- Two rows whose ranges overlap (&&) are considered duplicates
  -- and the second INSERT is rejected with constraint_violation.
  activity_dedup_window(date) with &&
)
where (source != 'manual');

-- Cross-source variant: drop `source` from the equality match so
-- the constraint catches HealthKit + Health Connect writing the
-- same workout via independent SDK paths. Commented out by default
-- because it's stricter than the per-source variant above and
-- could falsely block legitimate edge cases. Uncomment after the
-- writer-fix in HealthConnectService.kt has had time to bake.
--
-- alter table activity_logs drop constraint if exists activity_logs_no_cross_source_dupes;
-- alter table activity_logs add constraint activity_logs_no_cross_source_dupes
-- exclude using gist (
--   user_id           with =,
--   activity_type     with =,
--   duration_minutes  with =,
--   activity_dedup_window(date) with &&
-- )
-- where (source != 'manual');
