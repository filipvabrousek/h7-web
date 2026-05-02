-- ================================================================
-- Unique-constraint invariants
--
-- Catches: a future migration accidentally dropping the (user_id,
-- week_start) unique constraint on week_records, which would let
-- the client write two week records for the same week and produce
-- compute-status divergence between platforms.
-- ================================================================

\set ON_ERROR_STOP on

BEGIN;

INSERT INTO auth.users (id) VALUES ('22222222-2222-2222-2222-222222222222');

-- ---- week_records.(user_id, week_start) ------------------------
INSERT INTO week_records (user_id, week_start, total_minutes, level_achieved)
VALUES ('22222222-2222-2222-2222-222222222222', '2026-04-27', 420, 7);

SELECT test.assert_throws(
  'week_records: cannot insert duplicate (user_id, week_start)',
  $$
    INSERT INTO week_records (user_id, week_start, total_minutes, level_achieved)
    VALUES ('22222222-2222-2222-2222-222222222222', '2026-04-27', 999, 14);
  $$
);

-- Different user, same week — must succeed (uniqueness is per-user).
INSERT INTO auth.users (id) VALUES ('22222222-2222-2222-2222-222222222223');
INSERT INTO week_records (user_id, week_start, total_minutes, level_achieved)
VALUES ('22222222-2222-2222-2222-222222222223', '2026-04-27', 60, 1);
SELECT test.assert_eq(
  'week_records: uniqueness is scoped per-user (different user, same week, both rows present)',
  2::int,
  (SELECT count(*)::int FROM week_records WHERE week_start = '2026-04-27')
);

-- ---- activity_log_deletions tombstone primary key --------------
-- Composite PK is (user_id, source, source_id). Re-inserting the
-- same triple should fail rather than create a duplicate tombstone.
INSERT INTO activity_log_deletions (user_id, source, source_id)
VALUES ('22222222-2222-2222-2222-222222222222', 'healthkit', 'sample-uuid-abc');

SELECT test.assert_throws(
  'activity_log_deletions: composite PK rejects duplicate (user, source, source_id)',
  $$
    INSERT INTO activity_log_deletions (user_id, source, source_id)
    VALUES ('22222222-2222-2222-2222-222222222222', 'healthkit', 'sample-uuid-abc');
  $$
);

ROLLBACK;
