-- ============================================
-- 0011 — Collapse week_records timezone duplicates
-- ============================================
--
-- A user reported pairs of week_records like:
--
--   week_start            total  level
--   2026-04-13 00:00:00   1338   14
--   2026-04-12 22:00:00   1338   14
--
-- Same week, same totals, week_starts exactly 2 hours apart.
-- Cause: one row was stamped with `week_start` at UTC midnight on
-- Monday, the other at LOCAL midnight on Monday (CET = UTC+2 in
-- summer / UTC+1 in winter). Both `(user_id, week_start)` tuples
-- pass the existing unique constraint on week_records because the
-- timestamps are technically distinct, but they represent the
-- same logical week. The downstream effect: `LevelEngine.replay
-- History` walks the duplicates and inflates `consecutiveAtStatus`
-- by 2 per real week, which mostly nets out — but it bloats the
-- table, double-counts in any cloud-side analytics that aggregate
-- week_records, and made debugging the user's H2-vs-H14 belt
-- mismatch harder than it needed to be.
--
-- This migration collapses the dupes by joining each pair on
-- (user_id, total_minutes, level_achieved) where week_starts are
-- within 24 hours of each other, keeping the EARLIER row and
-- deleting the later one. The 24-hour bound is tight enough that
-- two genuine consecutive weeks (always ≥7 days apart) never
-- collide, but loose enough to catch any reasonable timezone offset
-- including DST quirks. Same-totals join keeps the migration safe
-- in the unlikely case two rows ended up in the same 24-hour window
-- with genuinely different data — only structurally identical rows
-- get collapsed.
--
-- Going forward: iOS `rebuildWeekRecords` (in this same release)
-- now wipes orphan week_records on every rebuild so new dupes
-- can't accumulate even if a write came in with a different
-- timezone interpretation. Run this migration once to clean up
-- the historical accumulation.
--
-- Safe to run repeatedly — becomes a no-op once each user has
-- one row per logical week.

with pairs as (
  select a.id as keep_id, b.id as drop_id
  from week_records a
  join week_records b on
        a.user_id = b.user_id
    and a.total_minutes = b.total_minutes
    and a.level_achieved = b.level_achieved
    and a.is_grace_week = b.is_grace_week
    and a.week_start < b.week_start
    and b.week_start - a.week_start < interval '1 day'
)
delete from week_records
where id in (select drop_id from pairs);
