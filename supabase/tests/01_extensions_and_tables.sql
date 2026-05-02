-- ================================================================
-- Schema invariants — extensions, tables, columns
--
-- Catches: a future migration accidentally dropping the uuid-ossp
-- extension, renaming a critical table, or dropping a column the
-- mobile clients depend on. None of these would surface as a
-- migration failure (PostgreSQL allows them) but all of them break
-- the running app.
-- ================================================================

\set ON_ERROR_STOP on

BEGIN;

-- uuid-ossp must be present — week_records, activity_logs, weight_entries
-- all use uuid_generate_v4() as their default id.
SELECT test.assert_eq(
  'uuid-ossp extension is enabled',
  1,
  (SELECT count(*)::int FROM pg_extension WHERE extname = 'uuid-ossp')
);

-- Core tables that mobile + web clients all depend on.
SELECT test.assert_eq(
  'profiles table exists',
  1,
  (SELECT count(*)::int FROM information_schema.tables
   WHERE table_schema = 'public' AND table_name = 'profiles')
);
SELECT test.assert_eq(
  'activity_logs table exists',
  1,
  (SELECT count(*)::int FROM information_schema.tables
   WHERE table_schema = 'public' AND table_name = 'activity_logs')
);
SELECT test.assert_eq(
  'activity_log_deletions tombstone table exists (migration 0009)',
  1,
  (SELECT count(*)::int FROM information_schema.tables
   WHERE table_schema = 'public' AND table_name = 'activity_log_deletions')
);
SELECT test.assert_eq(
  'week_records table exists',
  1,
  (SELECT count(*)::int FROM information_schema.tables
   WHERE table_schema = 'public' AND table_name = 'week_records')
);
SELECT test.assert_eq(
  'weight_entries table exists',
  1,
  (SELECT count(*)::int FROM information_schema.tables
   WHERE table_schema = 'public' AND table_name = 'weight_entries')
);
SELECT test.assert_eq(
  'support_messages table exists',
  1,
  (SELECT count(*)::int FROM information_schema.tables
   WHERE table_schema = 'public' AND table_name = 'support_messages')
);

-- Critical columns the iOS / Android / web clients all read.
-- (We don't enumerate every column — just the ones whose absence
-- would cause a deserialization crash on the client.)
SELECT test.assert_eq(
  'activity_logs.source_id column exists (migration 0005)',
  1,
  (SELECT count(*)::int FROM information_schema.columns
   WHERE table_schema = 'public'
     AND table_name = 'activity_logs'
     AND column_name = 'source_id')
);
SELECT test.assert_eq(
  'activity_logs.intensity column exists',
  1,
  (SELECT count(*)::int FROM information_schema.columns
   WHERE table_schema = 'public'
     AND table_name = 'activity_logs'
     AND column_name = 'intensity')
);
SELECT test.assert_eq(
  'week_records.is_grace_week column exists',
  1,
  (SELECT count(*)::int FROM information_schema.columns
   WHERE table_schema = 'public'
     AND table_name = 'week_records'
     AND column_name = 'is_grace_week')
);

-- The activity_logs.source CHECK constraint should reject unknown
-- sources — guards against a typo'd migration introducing a new
-- enum value that the clients don't understand.
SELECT test.assert_throws(
  'activity_logs.source rejects unknown values (CHECK constraint)',
  $$
    INSERT INTO auth.users (id) VALUES ('11111111-1111-1111-1111-111111111111');
    INSERT INTO activity_logs (user_id, date, duration_minutes, activity_type, source)
    VALUES ('11111111-1111-1111-1111-111111111111', now(), 30, 'Walking', 'definitely_not_a_source');
  $$
);

ROLLBACK;
