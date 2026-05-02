-- ================================================================
-- Tombstone behaviour (migration 0009)
--
-- Catches: a future migration breaking the
-- (user_id, source, source_id) shape of activity_log_deletions, or
-- removing the table entirely. The mobile clients query this table
-- on every load to skip re-importing HealthKit / Health Connect
-- samples the user has explicitly deleted; if the table is dropped
-- or its shape changes, deleted activities resurrect on the next
-- sync.
--
-- Note: the actual "skip on re-sync" behaviour lives in the iOS /
-- Android clients (the schema only stores the marker rows). What we
-- can verify at the DB layer is that the marker shape is preserved
-- and that joins between activity_logs and the tombstone table
-- behave as the clients expect.
-- ================================================================

\set ON_ERROR_STOP on

BEGIN;

INSERT INTO auth.users (id) VALUES ('44444444-4444-4444-4444-444444444444');

-- A HealthKit-imported activity, then the user deletes it locally.
INSERT INTO activity_logs (id, user_id, date, duration_minutes, activity_type, source, source_id)
VALUES (
  '55555555-5555-5555-5555-555555555555',
  '44444444-4444-4444-4444-444444444444',
  now(), 30, 'Walking', 'healthkit',
  'hk-uuid-aaaa'
);

-- Client deletes the row (DELETE) and writes a tombstone alongside.
DELETE FROM activity_logs WHERE id = '55555555-5555-5555-5555-555555555555';
INSERT INTO activity_log_deletions (user_id, source, source_id)
VALUES ('44444444-4444-4444-4444-444444444444', 'healthkit', 'hk-uuid-aaaa');

SELECT test.assert_eq(
  'tombstone written for deleted HealthKit sample',
  1::int,
  (SELECT count(*)::int FROM activity_log_deletions
   WHERE user_id = '44444444-4444-4444-4444-444444444444'
     AND source = 'healthkit'
     AND source_id = 'hk-uuid-aaaa')
);

-- Re-syncing the same HealthKit sample with the same source_id —
-- the LEFT JOIN pattern the mobile clients use to filter:
SELECT test.assert_eq(
  'mobile-style join: tombstoned source_id is filtered out of import candidates',
  0::int,
  (SELECT count(*)::int
   FROM (VALUES
     ('hk-uuid-aaaa'::text),  -- the tombstoned sample
     ('hk-uuid-bbbb'::text)   -- a different sample, should pass through
   ) AS incoming(source_id)
   LEFT JOIN activity_log_deletions d
     ON d.user_id = '44444444-4444-4444-4444-444444444444'
    AND d.source = 'healthkit'
    AND d.source_id = incoming.source_id
   WHERE incoming.source_id = 'hk-uuid-aaaa'
     AND d.source_id IS NULL)
);
SELECT test.assert_eq(
  'mobile-style join: non-tombstoned source_id passes through',
  1::int,
  (SELECT count(*)::int
   FROM (VALUES
     ('hk-uuid-aaaa'::text),
     ('hk-uuid-bbbb'::text)
   ) AS incoming(source_id)
   LEFT JOIN activity_log_deletions d
     ON d.user_id = '44444444-4444-4444-4444-444444444444'
    AND d.source = 'healthkit'
    AND d.source_id = incoming.source_id
   WHERE incoming.source_id = 'hk-uuid-bbbb'
     AND d.source_id IS NULL)
);

-- Cascade behaviour: deleting the auth.user must take the tombstone
-- with it, otherwise we leak references to users that no longer exist.
DELETE FROM auth.users WHERE id = '44444444-4444-4444-4444-444444444444';
SELECT test.assert_eq(
  'CASCADE: deleting auth.user removes their tombstones',
  0::int,
  (SELECT count(*)::int FROM activity_log_deletions
   WHERE user_id = '44444444-4444-4444-4444-444444444444')
);

ROLLBACK;
