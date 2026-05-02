-- ============================================================
-- H7 — Demo Account Seed (for App Store screenshots)
-- ============================================================
--
-- Produces a flattering, realistic-looking profile sitting at
-- H3 (Orange Belt) — a steady, established persona that has
-- been training at Orange volume (180+ min/week across 5–6
-- sessions) for the past two months.
--
-- What the screenshots will show:
--   • Profile WeeklyProgressChart: 8 orange bars, a solid
--     Orange history with minor week-to-week variation.
--   • Dashboard daily-bar chart: Mon/Tue coloured yellow via
--     rolling-average (the week hasn't accumulated to 180 yet),
--     Wed coloured orange as the rolling average crosses the
--     threshold. On Sat the rolling average crosses 240, so all
--     six filled circles in the consistency row flip to H4 Green
--     together — the "everything turns green at the end of the
--     week" beat the screenshots rely on.
--   • Dashboard "This Week" card: once the week's total (210)
--     clears the 180-minute H3 threshold, the progress bar
--     retargets the NEXT rung. Denominator advances to 240
--     and the chip reads "TO H4: 30′ / 1 day" — surfacing the
--     next goal instead of pinning the bar at 100 %. The
--     badge itself stays Orange H3 because the actual weekly
--     total never clears 240.
--
-- USAGE
--   1. In the H7 app (iOS, Android, or web), sign up with:
--        email:    demo@h7active.app      (or edit `demo_email` below)
--        password: <anything you'll remember — you pick it>
--      Finish onboarding so the `profiles` row exists. Optionally,
--      upload an avatar through Profile → Edit before step 2 — the
--      avatar_url sticks around untouched when this script runs.
--   2. In Supabase dashboard → SQL Editor, paste + run this file.
--      It's idempotent: running it again wipes the previous demo
--      data for this user and reseeds from scratch.
--   3. Log in on whichever platform you're capturing screenshots
--      from. All data below will appear immediately (pull to refresh
--      if a card looks stale).
--
-- DATE MODEL
--   Everything is relative to `now()`. Re-running the script days
--   later repositions history so "this week" is always the current
--   ISO week (Monday start), matching iOS `Date.startOfWeek` and
--   Android `DateUtils.startOfWeek`.
--
--   For the fullest daily-bars chart on the Dashboard, run the
--   script on a Wednesday or later so the first three coloured
--   bars (Mon/Tue yellow, Wed orange via rolling average) are
--   visible. On earlier weekdays the future-dated entries stay
--   hidden until their calendar day arrives — iOS filters by
--   `date <= currentDate` and Android by `!isAfter(currentDate)`.
--   Re-running the script each morning has the same effect and
--   keeps things fresh.
--
-- ROLLING-AVERAGE MATHS (why those minute counts)
--   The dashboard colours each bar by
--   `rollingAverageLevel(dailyMinutes, throughDay: index)`,
--   which multiplies the cumulative daily average by 7 to
--   project a weekly total:
--     Mon:   20 / 1 * 7 = 140              → H2 Yellow (≥120)
--     Tue:  (20+30) / 2 * 7 = 175           → H2 Yellow (H3 needs 180)
--     Wed:  (20+30+35) / 3 * 7 ≈ 198.3      → H3 Orange (≥180)
--   From Thursday onward the bars stay orange as the cumulative
--   total climbs past the 180 threshold.
--
-- BELT-LEVEL MATHS (why the badge is Orange without grace)
--   Actual weekly total lands at 210 min → H3.
--   LevelEngine.replayHistory over the 8 orange week_records rows
--   lands statusLevel = H3 with 8 consecutive maintained weeks.
--   Current week total (210) already clears 180 on its own so the
--   badge stays Orange regardless of grace.
--
-- SAFETY
--   The DELETE block is scoped by demo_id. It cannot touch any
--   other user's rows. If the demo user doesn't exist yet, the
--   script fails fast with a clear error.
-- ============================================================

do $$
declare
    -- ====== CUSTOMIZE THESE TWO LINES IF NEEDED ======
    demo_email text := 'demo@h7active.app';
    demo_name  text := 'alex_runs';
    -- =================================================
    demo_id    uuid;
    wk_start   timestamptz;
begin
    ------------------------------------------------------------
    -- Resolve demo user
    ------------------------------------------------------------
    select id into demo_id from auth.users where email = demo_email;
    if demo_id is null then
        raise exception
          'Demo user % not found. Sign up with that email in the app first, then re-run this script.',
          demo_email;
    end if;

    ------------------------------------------------------------
    -- Wipe previous demo data (idempotent reseed)
    ------------------------------------------------------------
    delete from post_comments   where user_id = demo_id;
    delete from post_likes      where user_id = demo_id;
    delete from social_posts    where user_id = demo_id;
    delete from activity_logs   where user_id = demo_id;
    delete from week_records    where user_id = demo_id;
    delete from weight_entries  where user_id = demo_id;

    ------------------------------------------------------------
    -- Profile
    ------------------------------------------------------------
    update profiles set
        username                = demo_name,
        height_cm               = 178,
        weight_kg               = 74.5,
        gender                  = 'male',
        birth_date              = '1991-06-14'::timestamptz,
        country                 = 'CZ',
        initial_weekly_activity = 180,
        updated_at              = now()
    where id = demo_id;

    ------------------------------------------------------------
    -- Anchor: Monday 00:00 UTC of the current ISO week.
    -- Matches iOS Calendar(.iso8601).firstWeekday=2 and the
    -- Android DateUtils.startOfWeek helper.
    ------------------------------------------------------------
    wk_start := date_trunc('week', (now() at time zone 'UTC'))::timestamptz;

    ------------------------------------------------------------
    -- CURRENT WEEK activities — 6 sessions, 210 min total (H3).
    -- Mid-day UTC timestamps keep each log on its intended
    -- weekday in every reasonable user timezone. Mon/Tue are
    -- deliberately small so the dashboard rolling average shows
    -- a yellow → orange crossover on Wednesday.
    --   Mon: 20 min  walking       — rolling avg = 140  → H2
    --   Tue: 30 min  stretching    — rolling avg = 175  → H2
    --   Wed: 35 min  briskWalking  — rolling avg = 198  → H3
    --   Thu: 40 min  yoga
    --   Fri: 40 min  cycling
    --   Sat: 45 min  hiking
    -- Actual weekly total: 210 min = H3 Orange directly.
    --
    -- Every log is stamped at intensity '2' (conscious). Level 1
    -- (casual) is explicitly filtered out of H7 totals by
    -- `ActivityLog.h7Minutes` / `PerceivedIntensity.countsForH7`,
    -- which is why an earlier revision that used '1' showed the
    -- Mon/Tue circles as 0. Keep all current-week and historical
    -- entries at >=2 so they register on the daily bars, the
    -- consistency chart, and the profile weekly chart.
    ------------------------------------------------------------
    insert into activity_logs (user_id, date, duration_minutes, activity_type, source, intensity) values
        (demo_id, wk_start + interval '0 days 12 hours',              20, 'walking',       'manual', '2'),
        (demo_id, wk_start + interval '1 days 12 hours 30 minutes',   30, 'stretching',    'manual', '2'),
        (demo_id, wk_start + interval '2 days 12 hours 15 minutes',   35, 'briskWalking',  'manual', '2'),
        (demo_id, wk_start + interval '3 days 12 hours',              40, 'yoga',          'manual', '2'),
        (demo_id, wk_start + interval '4 days 18 hours',              40, 'cycling',       'manual', '2'),
        (demo_id, wk_start + interval '5 days 10 hours',              45, 'hiking',        'manual', '2');

    ------------------------------------------------------------
    -- HISTORICAL activities — 5–6 entries per past week so the
    -- History list looks populated on scroll AND so the profile
    -- WeeklyProgressChart (which computes level from activities
    -- per week, independently of week_records) renders a solid
    -- 8-bar Orange run.
    --
    -- Per-week totals (min) — every week at H3 Orange (≥180):
    --   W-8 = 195  (5 sessions)
    --   W-7 = 200  (6 sessions)
    --   W-6 = 185  (5 sessions)
    --   W-5 = 210  (6 sessions)
    --   W-4 = 205  (5 sessions)
    --   W-3 = 225  (6 sessions)
    --   W-2 = 220  (5 sessions)
    --   W-1 = 230  (6 sessions)
    ------------------------------------------------------------
    insert into activity_logs (user_id, date, duration_minutes, activity_type, source, intensity) values
        -- Week -8 (orange)  40 + 35 + 30 + 45 + 45 = 195
        (demo_id, wk_start - interval '56 days' + interval '12 hours',              40, 'walking',      'manual', '2'),
        (demo_id, wk_start - interval '54 days' + interval '18 hours',              35, 'cycling',      'manual', '2'),
        (demo_id, wk_start - interval '53 days' + interval '19 hours',              30, 'yoga',         'manual', '2'),
        (demo_id, wk_start - interval '51 days' + interval '10 hours',              45, 'hiking',       'manual', '2'),
        (demo_id, wk_start - interval '50 days' + interval '18 hours',              45, 'briskWalking', 'manual', '2'),
        -- Week -7 (orange)  35 + 25 + 35 + 30 + 40 + 35 = 200
        (demo_id, wk_start - interval '49 days' + interval '12 hours',              35, 'walking',      'manual', '2'),
        (demo_id, wk_start - interval '48 days' + interval '18 hours',              25, 'stretching',   'manual', '2'),
        (demo_id, wk_start - interval '47 days' + interval '17 hours 30 minutes',   35, 'housework',    'manual', '2'),
        (demo_id, wk_start - interval '45 days' + interval '19 hours',              30, 'yoga',         'manual', '2'),
        (demo_id, wk_start - interval '44 days' + interval '18 hours',              40, 'cycling',      'manual', '2'),
        (demo_id, wk_start - interval '43 days' + interval '10 hours',              35, 'hiking',       'manual', '2'),
        -- Week -6 (orange)  40 + 35 + 30 + 45 + 35 = 185
        (demo_id, wk_start - interval '42 days' + interval '12 hours',              40, 'walking',      'manual', '2'),
        (demo_id, wk_start - interval '40 days' + interval '18 hours',              35, 'cycling',      'manual', '2'),
        (demo_id, wk_start - interval '38 days' + interval '8 hours',               30, 'yoga',         'manual', '2'),
        (demo_id, wk_start - interval '37 days' + interval '10 hours',              45, 'hiking',       'manual', '2'),
        (demo_id, wk_start - interval '36 days' + interval '18 hours',              35, 'briskWalking', 'manual', '2'),
        -- Week -5 (orange)  35 + 30 + 40 + 30 + 45 + 30 = 210
        (demo_id, wk_start - interval '35 days' + interval '12 hours',              35, 'walking',      'manual', '2'),
        (demo_id, wk_start - interval '34 days' + interval '18 hours',              30, 'stretching',   'manual', '2'),
        (demo_id, wk_start - interval '33 days' + interval '7 hours',               40, 'cycling',      'manual', '2'),
        (demo_id, wk_start - interval '31 days' + interval '19 hours',              30, 'yoga',         'manual', '2'),
        (demo_id, wk_start - interval '30 days' + interval '10 hours',              45, 'hiking',       'manual', '2'),
        (demo_id, wk_start - interval '29 days' + interval '18 hours',              30, 'briskWalking', 'manual', '2'),
        -- Week -4 (orange)  40 + 45 + 35 + 45 + 40 = 205
        (demo_id, wk_start - interval '28 days' + interval '12 hours',              40, 'walking',      'manual', '2'),
        (demo_id, wk_start - interval '26 days' + interval '18 hours',              45, 'cycling',      'manual', '2'),
        (demo_id, wk_start - interval '25 days' + interval '8 hours',               35, 'yoga',         'manual', '2'),
        (demo_id, wk_start - interval '23 days' + interval '10 hours',              45, 'hiking',       'manual', '2'),
        (demo_id, wk_start - interval '22 days' + interval '18 hours',              40, 'briskWalking', 'manual', '2'),
        -- Week -3 (orange)  40 + 30 + 45 + 35 + 45 + 30 = 225
        (demo_id, wk_start - interval '21 days' + interval '12 hours',              40, 'briskWalking', 'manual', '2'),
        (demo_id, wk_start - interval '20 days' + interval '18 hours',              30, 'stretching',   'manual', '2'),
        (demo_id, wk_start - interval '19 days' + interval '7 hours',               45, 'cycling',      'manual', '2'),
        (demo_id, wk_start - interval '18 days' + interval '19 hours',              35, 'yoga',         'manual', '2'),
        (demo_id, wk_start - interval '16 days' + interval '10 hours',              45, 'hiking',       'manual', '2'),
        (demo_id, wk_start - interval '15 days' + interval '18 hours',              30, 'strengthTraining', 'manual', '2'),
        -- Week -2 (orange)  45 + 45 + 40 + 50 + 40 = 220
        (demo_id, wk_start - interval '14 days' + interval '12 hours',              45, 'briskWalking', 'manual', '2'),
        (demo_id, wk_start - interval '12 days' + interval '18 hours',              45, 'cycling',      'manual', '2'),
        (demo_id, wk_start - interval '10 days' + interval '7 hours',               40, 'yoga',         'manual', '2'),
        (demo_id, wk_start - interval '9 days'  + interval '10 hours',              50, 'hiking',       'manual', '2'),
        (demo_id, wk_start - interval '8 days'  + interval '19 hours',              40, 'swimming',     'manual', '2'),
        -- Week -1 (orange)  45 + 30 + 40 + 35 + 50 + 30 = 230
        (demo_id, wk_start - interval '7 days'  + interval '12 hours',              45, 'briskWalking', 'manual', '2'),
        (demo_id, wk_start - interval '6 days'  + interval '18 hours',              30, 'yoga',         'manual', '2'),
        (demo_id, wk_start - interval '5 days'  + interval '7 hours',               40, 'cycling',      'manual', '2'),
        (demo_id, wk_start - interval '4 days'  + interval '19 hours',              35, 'strengthTraining', 'manual', '2'),
        (demo_id, wk_start - interval '2 days'  + interval '10 hours',              50, 'hiking',       'manual', '2'),
        (demo_id, wk_start - interval '1 days'  + interval '18 hours',              30, 'swimming',     'manual', '2');

    ------------------------------------------------------------
    -- WEEK RECORDS — authoritative for LevelEngine replay.
    -- Levels: H2 = 120 min, H3 = 180 min, H4 = 240 min.
    -- Totals match the activity sums above so replay and the
    -- profile chart (which goes through activities) agree.
    --
    -- Replay outcome:
    --   statusLevel     → H3
    --   consecutive     → 8 (every recorded week at H3)
    --   graceEarned     → true (irrelevant — not needed)
    --   currentWeekLvl  → H3 (actual 210 min, cleared directly)
    --   effectiveLevel  → H3 → Orange badge without grace
    ------------------------------------------------------------
    insert into week_records (user_id, week_start, total_minutes, level_achieved, is_grace_week) values
        (demo_id, wk_start - interval '56 days', 195, 3, false),  -- -8w orange
        (demo_id, wk_start - interval '49 days', 200, 3, false),  -- -7w orange
        (demo_id, wk_start - interval '42 days', 185, 3, false),  -- -6w orange
        (demo_id, wk_start - interval '35 days', 210, 3, false),  -- -5w orange
        (demo_id, wk_start - interval '28 days', 205, 3, false),  -- -4w orange
        (demo_id, wk_start - interval '21 days', 225, 3, false),  -- -3w orange
        (demo_id, wk_start - interval '14 days', 220, 3, false),  -- -2w orange
        (demo_id, wk_start - interval '7 days',  230, 3, false);  -- -1w orange

    ------------------------------------------------------------
    -- Weight entries — gentle downward trend (bi-weekly)
    ------------------------------------------------------------
    insert into weight_entries (user_id, date, weight_kg) values
        (demo_id, wk_start - interval '112 days', 78.2),
        (demo_id, wk_start - interval '98 days',  77.6),
        (demo_id, wk_start - interval '84 days',  76.9),
        (demo_id, wk_start - interval '70 days',  76.4),
        (demo_id, wk_start - interval '56 days',  75.8),
        (demo_id, wk_start - interval '42 days',  75.5),
        (demo_id, wk_start - interval '28 days',  75.1),
        (demo_id, wk_start - interval '14 days',  74.8),
        (demo_id, wk_start + interval '2 days',   74.5);

    ------------------------------------------------------------
    -- Social posts — three recent entries narrating a settled
    -- Orange rhythm rather than a fresh promotion.
    -- user_level = 3 matches the current Orange badge.
    ------------------------------------------------------------
    insert into social_posts (user_id, username, user_level, content, likes_count, comments_count, created_at) values
        (demo_id, demo_name, 3,
         'Another Orange week wrapped. Six sessions, nothing heroic, just the rhythm that seems to stick 🟠',
         11, 2, now() - interval '5 hours'),
        (demo_id, demo_name, 3,
         'The trick at Orange isn''t one monster workout — it''s five honest ones. Showing up beats showing off.',
         9, 1, now() - interval '4 days'),
        (demo_id, demo_name, 3,
         'Two months into Orange and 180 min a week finally feels like the floor, not the ceiling. Onwards.',
         14, 3, now() - interval '12 days');

    ------------------------------------------------------------
    -- Done
    ------------------------------------------------------------
    raise notice 'Demo account % seeded for user %', demo_name, demo_id;
end $$;
