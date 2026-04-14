-- ============================================================
-- H7active — Complete Database Schema
-- Run this in Supabase Dashboard → SQL Editor (once).
-- ============================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================
-- PROFILES
-- ============================================
create table if not exists profiles (
    id uuid primary key references auth.users(id) on delete cascade,
    username text not null,
    email text not null,
    height_cm double precision,
    weight_kg double precision,
    gender text check (gender in ('male', 'female', 'other')),
    birth_date timestamptz,
    country text,
    avatar_url text,
    initial_weekly_activity integer,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

alter table profiles enable row level security;
create policy "Users can view own profile" on profiles for select using (auth.uid() = id);
create policy "Users can insert own profile" on profiles for insert with check (auth.uid() = id);
create policy "Users can update own profile" on profiles for update using (auth.uid() = id);

-- Auto-update updated_at
create or replace function update_updated_at()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql;

create trigger profiles_updated_at
    before update on profiles
    for each row execute function update_updated_at();

-- ============================================
-- ACTIVITY LOGS
-- ============================================
create table if not exists activity_logs (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid not null references auth.users(id) on delete cascade,
    date timestamptz not null,
    duration_minutes integer not null check (duration_minutes > 0),
    activity_type text not null,
    source text not null default 'manual' check (source in ('manual', 'healthkit', 'garmin', 'fitbit')),
    intensity text,
    created_at timestamptz default now()
);

create index if not exists idx_activity_logs_user_date on activity_logs(user_id, date desc);

alter table activity_logs enable row level security;
create policy "Users can view own activities" on activity_logs for select using (auth.uid() = user_id);
create policy "Users can insert own activities" on activity_logs for insert with check (auth.uid() = user_id);
create policy "Users can update own activities" on activity_logs for update using (auth.uid() = user_id);
create policy "Users can delete own activities" on activity_logs for delete using (auth.uid() = user_id);

-- ============================================
-- WEEK RECORDS
-- ============================================
create table if not exists week_records (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid not null references auth.users(id) on delete cascade,
    week_start timestamptz not null,
    total_minutes integer not null default 0,
    level_achieved integer not null default 0,
    is_grace_week boolean not null default false,
    created_at timestamptz default now(),
    unique(user_id, week_start)
);

create index if not exists idx_week_records_user on week_records(user_id, week_start desc);

alter table week_records enable row level security;
create policy "Users can view own week records" on week_records for select using (auth.uid() = user_id);
create policy "Users can insert own week records" on week_records for insert with check (auth.uid() = user_id);
create policy "Users can update own week records" on week_records for update using (auth.uid() = user_id);

-- ============================================
-- WEIGHT ENTRIES
-- ============================================
create table if not exists weight_entries (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid not null references auth.users(id) on delete cascade,
    date timestamptz not null,
    weight_kg double precision not null check (weight_kg > 0),
    created_at timestamptz default now()
);

create index if not exists idx_weight_entries_user on weight_entries(user_id, date desc);

alter table weight_entries enable row level security;
create policy "Users can view own weight entries" on weight_entries for select using (auth.uid() = user_id);
create policy "Users can insert own weight entries" on weight_entries for insert with check (auth.uid() = user_id);
create policy "Users can delete own weight entries" on weight_entries for delete using (auth.uid() = user_id);

-- ============================================
-- SOCIAL POSTS
-- ============================================
create table if not exists social_posts (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid not null references auth.users(id) on delete cascade,
    username text not null,
    user_level integer,
    content text,
    media_url text,
    media_type text check (media_type in ('photo', 'video')),
    link_url text,
    link_title text,
    likes_count integer default 0,
    comments_count integer default 0,
    is_liked_by_me boolean default false,
    created_at timestamptz default now()
);

alter table social_posts enable row level security;
create policy "Anyone can view posts" on social_posts for select using (true);
create policy "Users can insert own posts" on social_posts for insert with check (auth.uid() = user_id);
create policy "Users can update own posts" on social_posts for update using (auth.uid() = user_id);
create policy "Users can delete own posts" on social_posts for delete using (auth.uid() = user_id);

-- ============================================
-- POST LIKES
-- ============================================
create table if not exists post_likes (
    id uuid primary key default uuid_generate_v4(),
    post_id uuid not null references social_posts(id) on delete cascade,
    user_id uuid not null references auth.users(id) on delete cascade,
    created_at timestamptz default now(),
    unique(post_id, user_id)
);

alter table post_likes enable row level security;
create policy "Anyone can view likes" on post_likes for select using (true);
create policy "Users can insert own likes" on post_likes for insert with check (auth.uid() = user_id);
create policy "Users can delete own likes" on post_likes for delete using (auth.uid() = user_id);

-- ============================================
-- POST COMMENTS
-- ============================================
create table if not exists post_comments (
    id uuid primary key default uuid_generate_v4(),
    post_id uuid not null references social_posts(id) on delete cascade,
    user_id uuid not null references auth.users(id) on delete cascade,
    username text not null,
    user_level integer,
    content text,
    reply_to_username text,
    created_at timestamptz default now()
);

alter table post_comments enable row level security;
create policy "Anyone can view comments" on post_comments for select using (true);
create policy "Users can insert own comments" on post_comments for insert with check (auth.uid() = user_id);
create policy "Users can delete own comments" on post_comments for delete using (auth.uid() = user_id);

-- ============================================
-- SUPPORT MESSAGES
-- ============================================
create table if not exists support_messages (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid not null references auth.users(id) on delete cascade,
    username text not null,
    text text,
    media_url text,
    media_type text check (media_type in ('photo', 'video')),
    is_from_support boolean not null default false,
    created_at timestamptz not null default now()
);

create index if not exists idx_support_messages_user_created
    on support_messages(user_id, created_at desc);

alter table support_messages enable row level security;
create policy "Users can view own support messages"
    on support_messages for select
    using (auth.uid() = user_id);
create policy "Users can insert own support messages"
    on support_messages for insert
    with check (auth.uid() = user_id and is_from_support = false);

-- ============================================
-- STORAGE: avatars bucket
-- ============================================
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do update set public = true;

drop policy if exists "Users can upload own avatar" on storage.objects;
create policy "Users can upload own avatar"
    on storage.objects for insert
    with check (
        bucket_id = 'avatars'
        and auth.role() = 'authenticated'
        and lower((storage.foldername(name))[1]) = lower(auth.uid()::text)
    );

drop policy if exists "Users can update own avatar" on storage.objects;
create policy "Users can update own avatar"
    on storage.objects for update
    using (
        bucket_id = 'avatars'
        and auth.role() = 'authenticated'
        and lower((storage.foldername(name))[1]) = lower(auth.uid()::text)
    );

drop policy if exists "Users can delete own avatar" on storage.objects;
create policy "Users can delete own avatar"
    on storage.objects for delete
    using (
        bucket_id = 'avatars'
        and auth.role() = 'authenticated'
        and lower((storage.foldername(name))[1]) = lower(auth.uid()::text)
    );

drop policy if exists "Public read avatars" on storage.objects;
create policy "Public read avatars"
    on storage.objects for select
    using (bucket_id = 'avatars');

-- ============================================
-- STORAGE: support-media bucket
-- ============================================
insert into storage.buckets (id, name, public)
values ('support-media', 'support-media', true)
on conflict (id) do nothing;

drop policy if exists "Users can upload support media" on storage.objects;
create policy "Users can upload support media"
    on storage.objects for insert
    with check (
        bucket_id = 'support-media'
        and auth.role() = 'authenticated'
        and (storage.foldername(name))[1] = auth.uid()::text
    );

drop policy if exists "Public read support media" on storage.objects;
create policy "Public read support media"
    on storage.objects for select
    using (bucket_id = 'support-media');
