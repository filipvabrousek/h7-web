-- ============================================
-- Seed demo@h7active.app for App Store / Play Store reviewers
-- ============================================
--
-- Idempotent: re-running wipes the demo user's data and re-seeds.
-- Safe to run any day of the week — week boundaries are computed
-- relative to `now()` so the "current week" section always shows
-- live activity for whatever day the reviewer signs in.
--
-- What the reviewer sees after this runs:
--   • Profile: "Demo Reviewer", 178 cm / 75 kg, born 1990-06-15
--   • Banked status: H6 Brown Belt, 4-week streak → grace earned
--   • Current week: Monday morning run + Monday strength session
--     (~75 min) — projects toward H6 maintenance, dashboard shows
--     a live progress bar.
--   • History tab: 4 prior weeks fully populated with varied
--     activities (Running, Cycling, Walking, Strength, Yoga) all
--     at ~370–410 min/week so the calendar consistency view shows
--     a clean filled grid and the activity log scrolls.
--   • All entries are source = 'manual' so Apple's reviewer doesn't
--     need HealthKit permissions to see data.
--
-- Prerequisite: the demo@h7active.app user must already exist in
-- auth.users. Create it first via Supabase Dashboard → Authentication
-- → Users → "Add user" → email `demo@h7active.app` + a memorable
-- password. Then run this script.

DO $$
DECLARE
  demo_user_id uuid;

  -- Anchor: Monday 00:00 of the current ISO week, in the session's
  -- timezone. PostgreSQL's date_trunc('week', ...) is ISO-week aware
  -- (always returns Monday) so this works regardless of when the
  -- reviewer signs in during the week.
  current_week_start timestamptz := date_trunc('week', now());
  prev_1 timestamptz := current_week_start - interval '7 days';
  prev_2 timestamptz := current_week_start - interval '14 days';
  prev_3 timestamptz := current_week_start - interval '21 days';
  prev_4 timestamptz := current_week_start - interval '28 days';
BEGIN
  -- Resolve demo user.
  SELECT id INTO demo_user_id
  FROM auth.users
  WHERE email = 'demo@h7active.app';

  IF demo_user_id IS NULL THEN
    RAISE EXCEPTION
      'demo@h7active.app not found in auth.users. Create the account first via Supabase Dashboard → Authentication → Users → Add user, then re-run this script.';
  END IF;

  -- ------------------------------------------------------------
  -- Wipe existing data so re-runs produce a clean state.
  -- Order matters: tables with foreign keys to others first.
  -- ------------------------------------------------------------
  DELETE FROM activity_log_deletions WHERE user_id = demo_user_id;
  DELETE FROM activity_logs          WHERE user_id = demo_user_id;
  DELETE FROM week_records           WHERE user_id = demo_user_id;

  -- ------------------------------------------------------------
  -- Profile (upsert in case the row was already there from a
  -- prior onboarding run).
  -- ------------------------------------------------------------
  INSERT INTO profiles (
    id, username, email, height_cm, weight_kg, gender,
    birth_date, country, birth_year, created_at, updated_at
  )
  VALUES (
    demo_user_id,
    'Demo Reviewer',
    'demo@h7active.app',
    178,
    75,
    'other',
    '1990-06-15T00:00:00Z'::timestamptz,
    'CZ',
    1990,
    now() - interval '120 days',  -- account "created" 4 months ago
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    username     = EXCLUDED.username,
    email        = EXCLUDED.email,
    height_cm    = EXCLUDED.height_cm,
    weight_kg    = EXCLUDED.weight_kg,
    gender       = EXCLUDED.gender,
    birth_date   = EXCLUDED.birth_date,
    country      = EXCLUDED.country,
    birth_year   = EXCLUDED.birth_year,
    updated_at   = now();

  -- ------------------------------------------------------------
  -- Week records for the prior 4 weeks, all at H6 (Brown Belt).
  -- 4 consecutive H6 weeks = grace earned (>= weeksForGrace = 3),
  -- so the Dashboard badge shows "4 WEEK STREAK · GRACE AVAILABLE".
  -- ------------------------------------------------------------
  INSERT INTO week_records (user_id, week_start, total_minutes, level_achieved, is_grace_week)
  VALUES
    (demo_user_id, prev_4, 380, 6, false),
    (demo_user_id, prev_3, 395, 6, false),
    (demo_user_id, prev_2, 365, 6, false),
    (demo_user_id, prev_1, 410, 6, false);

  -- ------------------------------------------------------------
  -- Activity logs for prior 4 weeks. ~5 sessions per week, mixed
  -- activity types, totals matching each week_record.total_minutes
  -- so the History tab and the engine's self-heal pass agree.
  -- All UTC `Z` timestamps to avoid the timezone-offset duplicate
  -- bug we just fixed (migrations 0012/0013).
  -- ------------------------------------------------------------

  -- Week -4: 380 min total
  INSERT INTO activity_logs (user_id, date, duration_minutes, activity_type, source, intensity, user_level) VALUES
    (demo_user_id, prev_4 + interval '6 hours 30 minutes',  60, 'Running',           'manual', 'moderate', 'H6'),
    (demo_user_id, prev_4 + interval '1 day 17 hours',      75, 'Cycling',           'manual', 'moderate', 'H6'),
    (demo_user_id, prev_4 + interval '2 days 7 hours',      45, 'Walking',           'manual', 'light',    'H6'),
    (demo_user_id, prev_4 + interval '4 days 18 hours',     90, 'Strength Training', 'manual', 'moderate', 'H6'),
    (demo_user_id, prev_4 + interval '5 days 9 hours',     110, 'Cycling',           'manual', 'vigorous', 'H6');

  -- Week -3: 395 min total
  INSERT INTO activity_logs (user_id, date, duration_minutes, activity_type, source, intensity, user_level) VALUES
    (demo_user_id, prev_3 + interval '7 hours',             55, 'Running',           'manual', 'moderate', 'H6'),
    (demo_user_id, prev_3 + interval '1 day 18 hours 30 minutes', 80, 'Cycling',     'manual', 'vigorous', 'H6'),
    (demo_user_id, prev_3 + interval '2 days 12 hours',     60, 'Yoga',              'manual', 'light',    'H6'),
    (demo_user_id, prev_3 + interval '3 days 17 hours',     70, 'Walking',           'manual', 'moderate', 'H6'),
    (demo_user_id, prev_3 + interval '5 days 8 hours 30 minutes', 130, 'Cycling',    'manual', 'vigorous', 'H6');

  -- Week -2: 365 min total
  INSERT INTO activity_logs (user_id, date, duration_minutes, activity_type, source, intensity, user_level) VALUES
    (demo_user_id, prev_2 + interval '8 hours',             50, 'Walking',           'manual', 'moderate', 'H6'),
    (demo_user_id, prev_2 + interval '1 day 19 hours',      75, 'Strength Training', 'manual', 'moderate', 'H6'),
    (demo_user_id, prev_2 + interval '3 days 7 hours',      65, 'Running',           'manual', 'vigorous', 'H6'),
    (demo_user_id, prev_2 + interval '4 days 18 hours',     85, 'Cycling',           'manual', 'moderate', 'H6'),
    (demo_user_id, prev_2 + interval '5 days 10 hours',     90, 'Yoga',              'manual', 'light',    'H6');

  -- Week -1 (last completed week): 410 min total
  INSERT INTO activity_logs (user_id, date, duration_minutes, activity_type, source, intensity, user_level) VALUES
    (demo_user_id, prev_1 + interval '7 hours 30 minutes',  70, 'Running',           'manual', 'moderate', 'H6'),
    (demo_user_id, prev_1 + interval '1 day 18 hours',      85, 'Cycling',           'manual', 'vigorous', 'H6'),
    (demo_user_id, prev_1 + interval '2 days 12 hours',     55, 'Walking',           'manual', 'moderate', 'H6'),
    (demo_user_id, prev_1 + interval '3 days 19 hours',     95, 'Strength Training', 'manual', 'moderate', 'H6'),
    (demo_user_id, prev_1 + interval '5 days 9 hours',     105, 'Cycling',           'manual', 'vigorous', 'H6');

  -- ------------------------------------------------------------
  -- Current week — all 7 days seeded at once. Reviewer signing in
  -- any day Mon-Sun sees a fully populated week with varied
  -- activities. Total 410 min → comfortably in H6 maintenance
  -- band (360 ≤ 410 < 420), so the badge stays Brown Belt and
  -- the progress bar reads "H6 target met".
  -- ------------------------------------------------------------
  INSERT INTO activity_logs (user_id, date, duration_minutes, activity_type, source, intensity, user_level) VALUES
    (demo_user_id, current_week_start + interval '6 hours 45 minutes',          60, 'Running',           'manual', 'moderate', 'H6'),
    (demo_user_id, current_week_start + interval '1 day 17 hours 30 minutes',   75, 'Cycling',           'manual', 'vigorous', 'H6'),
    (demo_user_id, current_week_start + interval '2 days 12 hours',             50, 'Walking',           'manual', 'moderate', 'H6'),
    (demo_user_id, current_week_start + interval '3 days 18 hours',             80, 'Strength Training', 'manual', 'moderate', 'H6'),
    (demo_user_id, current_week_start + interval '4 days 7 hours',              45, 'Yoga',              'manual', 'light',    'H6'),
    (demo_user_id, current_week_start + interval '5 days 9 hours',              75, 'Cycling',           'manual', 'vigorous', 'H6'),
    (demo_user_id, current_week_start + interval '6 days 10 hours 30 minutes',  25, 'Walking',           'manual', 'light',    'H6');

  RAISE NOTICE 'Seeded demo@h7active.app (user_id=%) with 22 activities across 5 weeks and 4 prior week_records.', demo_user_id;
END $$;
