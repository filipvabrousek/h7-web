-- ============================================================
-- 0003 — Analytics: belt progression + birth year + level stamp
-- ------------------------------------------------------------
-- Adds the data required to answer:
--   1) How long does it take each user to progress H1 -> H2?
--   2) What is the most common activity logged while at H1?
-- segmented by gender and birth year.
--
-- Safe to re-run: every statement is idempotent.
-- ============================================================

-- ------------------------------------------------------------
-- PROFILES: birth_year
-- A small integer column is simpler for analytics bucketing
-- than parsing birth_date (which still exists, unused).
-- ------------------------------------------------------------
alter table profiles
    add column if not exists birth_year integer
    check (birth_year is null or (birth_year between 1900 and 2100));

-- ------------------------------------------------------------
-- ACTIVITY_LOGS: user_level
-- Captures the belt level the user held at the moment the
-- activity was logged. Lets us ask "what activities are H1
-- users doing?" without replaying LevelEngine per user.
-- Stored as TEXT to match the app-side Level enum ("H0"..."H8+").
-- ------------------------------------------------------------
alter table activity_logs
    add column if not exists user_level text;

create index if not exists idx_activity_logs_user_level
    on activity_logs(user_level)
    where user_level is not null;

-- ------------------------------------------------------------
-- BELT_PROMOTIONS: one row per level-up transition
-- Emitted by the client when LevelEngine returns a higher
-- currentLevel than the user previously held. from_level is
-- nullable for the initial promotion (no prior level).
-- ------------------------------------------------------------
create table if not exists belt_promotions (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid not null references auth.users(id) on delete cascade,
    from_level text,
    to_level text not null,
    promoted_at timestamptz not null default now(),
    created_at timestamptz not null default now(),
    unique (user_id, to_level)
);

create index if not exists idx_belt_promotions_user
    on belt_promotions(user_id, promoted_at);
create index if not exists idx_belt_promotions_to_level
    on belt_promotions(to_level);

alter table belt_promotions enable row level security;

drop policy if exists "Users can view own promotions" on belt_promotions;
create policy "Users can view own promotions"
    on belt_promotions for select
    using (auth.uid() = user_id);

drop policy if exists "Users can insert own promotions" on belt_promotions;
create policy "Users can insert own promotions"
    on belt_promotions for insert
    with check (auth.uid() = user_id);

-- Promotions are immutable history; no update/delete policies on purpose.
