-- ============================================
-- 0014 — Auto-refresh the demo@h7active.app reviewer account weekly
-- ============================================
--
-- Wraps the one-off seed-demo-reviewer.sql script in a function
-- and schedules it via pg_cron to run every Monday at 04:00 UTC
-- (06:00 CEST in summer, 05:00 CET in winter — comfortably before
-- any reviewer in EU/US business hours wakes up). Result: the
-- demo account always shows fresh activity for "this week" without
-- a human re-running the seed each Monday.
--
-- The function body is intentionally idempotent: it wipes the demo
-- user's existing activity_logs / week_records / activity_log_deletions
-- and re-inserts a deterministic set of rows. Re-running on any day
-- is safe; running mid-week recreates the week from scratch with
-- only Monday's session populated (since that's the seed's design —
-- if the reviewer signs in Wed and there's no Wed activity, that's
-- intentional: it shows H6 maintenance with room for "I just
-- haven't logged today's session yet").
--
-- Supabase exposes pg_cron under the `cron` schema; you don't need
-- to enable it manually on a hosted project (it ships pre-installed,
-- but the `create extension` is harmless if it already exists).

-- pg_cron is Supabase-managed in production but ISN'T present in the
-- stock postgres:16-alpine image our local DB regression tests run
-- against (h7-web/supabase/tests/run.sh). We gate every cron-touching
-- statement on `pg_cron`'s availability so the migration applies
-- cleanly in both environments. The `seed_demo_reviewer()` function
-- itself is created unconditionally — it's just a normal SQL function
-- and is testable without cron — and on Supabase the schedule below
-- arms it automatically. On the local test DB it stays unscheduled
-- but can still be invoked manually with `select seed_demo_reviewer();`
do $$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    create extension if not exists pg_cron;
  else
    raise notice 'pg_cron not available in this Postgres install — skipping extension creation. Schedule will be skipped too; the seed_demo_reviewer() function is still created and can be invoked manually.';
  end if;
end $$;

-- ------------------------------------------------------------
-- The seed function. SECURITY DEFINER so cron can invoke it without
-- needing RLS overrides on profiles / activity_logs / week_records.
-- The function owner is whoever runs this migration (typically
-- `postgres`), which has full table access.
-- ------------------------------------------------------------
create or replace function public.seed_demo_reviewer()
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  demo_user_id uuid;
  current_week_start timestamptz := date_trunc('week', now());
  prev_1 timestamptz := current_week_start - interval '7 days';
  prev_2 timestamptz := current_week_start - interval '14 days';
  prev_3 timestamptz := current_week_start - interval '21 days';
  prev_4 timestamptz := current_week_start - interval '28 days';
begin
  select id into demo_user_id
  from auth.users
  where email = 'demo@h7active.app';

  if demo_user_id is null then
    -- Don't raise — cron failures spam the Supabase logs and there's
    -- no admin to surface to. Just no-op silently. The seed will start
    -- working automatically the next Monday after the reviewer account
    -- is created in Auth.
    raise notice 'seed_demo_reviewer: demo@h7active.app not found in auth.users — skipping.';
    return;
  end if;

  -- Wipe + re-seed (same logic as supabase/seed-demo-reviewer.sql).
  delete from activity_log_deletions where user_id = demo_user_id;
  delete from activity_logs          where user_id = demo_user_id;
  delete from week_records           where user_id = demo_user_id;

  insert into profiles (id, username, email, height_cm, weight_kg, gender, birth_date, country, birth_year, created_at, updated_at)
  values (
    demo_user_id, 'Demo Reviewer', 'demo@h7active.app',
    178, 75, 'other', '1990-06-15T00:00:00Z'::timestamptz, 'CZ', 1990,
    now() - interval '120 days', now()
  )
  on conflict (id) do update set
    username   = excluded.username,
    email      = excluded.email,
    height_cm  = excluded.height_cm,
    weight_kg  = excluded.weight_kg,
    gender     = excluded.gender,
    birth_date = excluded.birth_date,
    country    = excluded.country,
    birth_year = excluded.birth_year,
    updated_at = now();

  insert into week_records (user_id, week_start, total_minutes, level_achieved, is_grace_week)
  values
    (demo_user_id, prev_4, 380, 6, false),
    (demo_user_id, prev_3, 395, 6, false),
    (demo_user_id, prev_2, 365, 6, false),
    (demo_user_id, prev_1, 410, 6, false);

  -- Week -4
  insert into activity_logs (user_id, date, duration_minutes, activity_type, source, intensity, user_level) values
    (demo_user_id, prev_4 + interval '6 hours 30 minutes',  60, 'Running',           'manual', 'moderate', 'H6'),
    (demo_user_id, prev_4 + interval '1 day 17 hours',      75, 'Cycling',           'manual', 'moderate', 'H6'),
    (demo_user_id, prev_4 + interval '2 days 7 hours',      45, 'Walking',           'manual', 'light',    'H6'),
    (demo_user_id, prev_4 + interval '4 days 18 hours',     90, 'Strength Training', 'manual', 'moderate', 'H6'),
    (demo_user_id, prev_4 + interval '5 days 9 hours',     110, 'Cycling',           'manual', 'vigorous', 'H6');

  -- Week -3
  insert into activity_logs (user_id, date, duration_minutes, activity_type, source, intensity, user_level) values
    (demo_user_id, prev_3 + interval '7 hours',                    55, 'Running',           'manual', 'moderate', 'H6'),
    (demo_user_id, prev_3 + interval '1 day 18 hours 30 minutes',  80, 'Cycling',           'manual', 'vigorous', 'H6'),
    (demo_user_id, prev_3 + interval '2 days 12 hours',            60, 'Yoga',              'manual', 'light',    'H6'),
    (demo_user_id, prev_3 + interval '3 days 17 hours',            70, 'Walking',           'manual', 'moderate', 'H6'),
    (demo_user_id, prev_3 + interval '5 days 8 hours 30 minutes', 130, 'Cycling',           'manual', 'vigorous', 'H6');

  -- Week -2
  insert into activity_logs (user_id, date, duration_minutes, activity_type, source, intensity, user_level) values
    (demo_user_id, prev_2 + interval '8 hours',         50, 'Walking',           'manual', 'moderate', 'H6'),
    (demo_user_id, prev_2 + interval '1 day 19 hours',  75, 'Strength Training', 'manual', 'moderate', 'H6'),
    (demo_user_id, prev_2 + interval '3 days 7 hours',  65, 'Running',           'manual', 'vigorous', 'H6'),
    (demo_user_id, prev_2 + interval '4 days 18 hours', 85, 'Cycling',           'manual', 'moderate', 'H6'),
    (demo_user_id, prev_2 + interval '5 days 10 hours', 90, 'Yoga',              'manual', 'light',    'H6');

  -- Week -1
  insert into activity_logs (user_id, date, duration_minutes, activity_type, source, intensity, user_level) values
    (demo_user_id, prev_1 + interval '7 hours 30 minutes',  70, 'Running',           'manual', 'moderate', 'H6'),
    (demo_user_id, prev_1 + interval '1 day 18 hours',      85, 'Cycling',           'manual', 'vigorous', 'H6'),
    (demo_user_id, prev_1 + interval '2 days 12 hours',     55, 'Walking',           'manual', 'moderate', 'H6'),
    (demo_user_id, prev_1 + interval '3 days 19 hours',     95, 'Strength Training', 'manual', 'moderate', 'H6'),
    (demo_user_id, prev_1 + interval '5 days 9 hours',     105, 'Cycling',           'manual', 'vigorous', 'H6');

  -- ------------------------------------------------------------
  -- Current week — all 7 days seeded at once on every Monday cron
  -- run. Reviewer signing in any day Mon-Sun sees a fully populated
  -- week with varied activities. Trade-off vs. day-by-day seeding:
  -- yes, on Monday morning the row for Sunday's "future" workout
  -- exists, but reviewers don't notice the timestamp metaphysics —
  -- they see a complete, usable demo. Total 410 min → comfortably
  -- in H6 maintenance band (360 ≤ 410 < 420), so the badge stays
  -- Brown Belt and the progress bar reads "H6 target met".
  -- ------------------------------------------------------------
  insert into activity_logs (user_id, date, duration_minutes, activity_type, source, intensity, user_level) values
    (demo_user_id, current_week_start + interval '6 hours 45 minutes',          60, 'Running',           'manual', 'moderate', 'H6'),
    (demo_user_id, current_week_start + interval '1 day 17 hours 30 minutes',   75, 'Cycling',           'manual', 'vigorous', 'H6'),
    (demo_user_id, current_week_start + interval '2 days 12 hours',             50, 'Walking',           'manual', 'moderate', 'H6'),
    (demo_user_id, current_week_start + interval '3 days 18 hours',             80, 'Strength Training', 'manual', 'moderate', 'H6'),
    (demo_user_id, current_week_start + interval '4 days 7 hours',              45, 'Yoga',              'manual', 'light',    'H6'),
    (demo_user_id, current_week_start + interval '5 days 9 hours',              75, 'Cycling',           'manual', 'vigorous', 'H6'),
    (demo_user_id, current_week_start + interval '6 days 10 hours 30 minutes',  25, 'Walking',           'manual', 'light',    'H6');
end;
$$;

-- ------------------------------------------------------------
-- Schedule: every Monday at 04:00 UTC. The seed function inserts
-- all 7 days of the new week in one shot, so the reviewer sees a
-- fully populated week regardless of which day they sign in. Past
-- 4 weeks also re-seeded on every run (idempotent wipe + re-insert).
--
-- pg_cron uses standard 5-field cron syntax: min hour dom mon dow.
-- DOW 1 = Monday in pg_cron (matches POSIX, not 0 = Sunday).
-- 04:00 UTC = 06:00 CEST in summer, 05:00 CET in winter — comfortably
-- before any reviewer in EU/US business hours signs in.
--
-- Unschedule any prior identically-named job (or the day-by-day
-- variant from an earlier draft of this migration) so re-running
-- the migration is idempotent and doesn't accumulate duplicate
-- schedules in cron.job.
-- ------------------------------------------------------------
-- Both unschedule + schedule are gated on pg_cron being installed
-- (the `cron` schema only exists when the extension is loaded). On
-- the local test container without pg_cron, the gate skips both and
-- the migration completes — the function still exists and is callable.
do $$
begin
  if not exists (select 1 from pg_extension where extname = 'pg_cron') then
    raise notice 'pg_cron not loaded — skipping cron schedule registration. Schedule the seed manually on environments that have pg_cron (e.g. Supabase production).';
    return;
  end if;

  if exists (select 1 from cron.job where jobname in ('seed_demo_reviewer_weekly', 'seed_demo_reviewer_daily')) then
    perform cron.unschedule(jobname)
    from cron.job
    where jobname in ('seed_demo_reviewer_weekly', 'seed_demo_reviewer_daily');
  end if;

  perform cron.schedule(
    'seed_demo_reviewer_weekly',
    '0 4 * * 1',                          -- every Monday at 04:00 UTC
    $cmd$ select public.seed_demo_reviewer(); $cmd$
  );
end $$;

-- One-shot: also run it NOW so the demo account is fresh immediately
-- after this migration applies, without waiting for the next Monday.
-- Safe in the local test DB too — it just no-ops cleanly when the
-- demo@h7active.app user doesn't exist (the function raises a notice
-- and returns).
select public.seed_demo_reviewer();
