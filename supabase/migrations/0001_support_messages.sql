-- ============================================================
-- H7 — support_messages table + RLS + storage bucket
-- ------------------------------------------------------------
-- Run this in Supabase Dashboard → SQL Editor (once).
-- Safe to re-run: every statement is idempotent.
-- ============================================================

create extension if not exists "uuid-ossp";

-- ---- Table ---------------------------------------------------
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

-- ---- Row Level Security -------------------------------------
alter table support_messages enable row level security;

drop policy if exists "Users can view own support messages" on support_messages;
create policy "Users can view own support messages"
    on support_messages for select
    using (lower(auth.uid()::text) = lower(user_id::text));

drop policy if exists "Users can insert own support messages" on support_messages;
create policy "Users can insert own support messages"
    on support_messages for insert
    with check (
        lower(auth.uid()::text) = lower(user_id::text)
        and is_from_support = false
    );

-- Admin replies arrive via the service_role key, which bypasses RLS,
-- so no "admin" policy is needed here.

-- ---- Storage bucket for photos/videos ------------------------
insert into storage.buckets (id, name, public)
values ('support-media', 'support-media', true)
on conflict (id) do nothing;

drop policy if exists "Users can upload support media" on storage.objects;
create policy "Users can upload support media"
    on storage.objects for insert
    with check (
        bucket_id = 'support-media'
        and auth.role() = 'authenticated'
        and lower((storage.foldername(name))[1]) = lower(auth.uid()::text)
    );

drop policy if exists "Public read support media" on storage.objects;
create policy "Public read support media"
    on storage.objects for select
    using (bucket_id = 'support-media');
