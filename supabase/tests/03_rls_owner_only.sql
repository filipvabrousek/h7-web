-- ================================================================
-- Row-Level Security — owner-only access
--
-- Catches: a future migration weakening or dropping RLS on profiles,
-- activity_logs, week_records, weight_entries — any of which would
-- let user A read user B's data through the public REST API.
--
-- Pattern: insert two users' data via the table-owner role (RLS
-- doesn't apply to the owner), then drop into the `authenticated`
-- role with each user's JWT in turn and verify each only sees
-- their own rows.
-- ================================================================

\set ON_ERROR_STOP on

BEGIN;

-- Mirror Supabase's role hierarchy enough that RLS evaluates the
-- right policies. The `authenticated` role is what PostgREST hands
-- requests off to once a JWT is verified.
-- Postgres has no `CREATE ROLE IF NOT EXISTS`; emulate via DO block
-- so the test is idempotent across runs against a kept container.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    CREATE ROLE authenticated;
  END IF;
END $$;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
-- The test.assert_* helpers live in the `test` schema; the
-- authenticated role needs USAGE + EXECUTE there too, otherwise the
-- SET LOCAL ROLE switch below would lose access to the assertions.
GRANT USAGE ON SCHEMA test TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA test TO authenticated;

-- Two users, each owning one row in each table.
INSERT INTO auth.users (id) VALUES
  ('33333333-3333-3333-3333-333333333333'),
  ('33333333-3333-3333-3333-333333333334');

INSERT INTO profiles (id, username, email)
VALUES
  ('33333333-3333-3333-3333-333333333333', 'alice_test', 'alice@h7.test'),
  ('33333333-3333-3333-3333-333333333334', 'bob_test',   'bob@h7.test');

INSERT INTO activity_logs (user_id, date, duration_minutes, activity_type, source)
VALUES
  ('33333333-3333-3333-3333-333333333333', now(), 30, 'Walking',  'manual'),
  ('33333333-3333-3333-3333-333333333334', now(), 45, 'Running',  'manual');

INSERT INTO week_records (user_id, week_start, total_minutes, level_achieved)
VALUES
  ('33333333-3333-3333-3333-333333333333', '2026-04-27', 60,  1),
  ('33333333-3333-3333-3333-333333333334', '2026-04-27', 420, 7);

-- ---- act as Alice, expect only Alice's rows --------------------
SET LOCAL "request.jwt.claims" =
  '{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated"}';
SET LOCAL ROLE authenticated;

SELECT test.assert_eq(
  'RLS: alice sees exactly 1 profile (her own)',
  1::int, (SELECT count(*)::int FROM profiles)
);
SELECT test.assert_eq(
  'RLS: alice sees exactly 1 activity_log (her own)',
  1::int, (SELECT count(*)::int FROM activity_logs)
);
SELECT test.assert_eq(
  'RLS: alice sees exactly 1 week_record (her own)',
  1::int, (SELECT count(*)::int FROM week_records)
);

-- Cross-user write attempt must fail under RLS.
SELECT test.assert_throws(
  'RLS: alice cannot insert an activity_log on bob''s behalf',
  $$
    INSERT INTO activity_logs (user_id, date, duration_minutes, activity_type, source)
    VALUES ('33333333-3333-3333-3333-333333333334', now(), 99, 'Running', 'manual');
  $$
);

RESET ROLE;

-- ---- act as Bob, expect only Bob's rows ------------------------
SET LOCAL "request.jwt.claims" =
  '{"sub":"33333333-3333-3333-3333-333333333334","role":"authenticated"}';
SET LOCAL ROLE authenticated;

SELECT test.assert_eq(
  'RLS: bob sees exactly 1 profile (his own)',
  1::int, (SELECT count(*)::int FROM profiles)
);
SELECT test.assert_eq(
  'RLS: bob does NOT see alice''s 60-min walking week',
  0::int, (SELECT count(*)::int FROM week_records WHERE total_minutes = 60)
);

RESET ROLE;

ROLLBACK;
