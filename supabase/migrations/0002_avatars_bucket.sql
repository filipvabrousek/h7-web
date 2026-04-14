-- ============================================================
-- H7 — avatars storage bucket + RLS
-- ------------------------------------------------------------
-- Run this in Supabase Dashboard → SQL Editor (once).
-- Safe to re-run: every statement is idempotent.
-- ============================================================

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- Users may upload into a folder named after their own user id.
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
        and lower((storage.foldername(name))[1]) = lower(auth.uid()::text)
    );

drop policy if exists "Users can delete own avatar" on storage.objects;
create policy "Users can delete own avatar"
    on storage.objects for delete
    using (
        bucket_id = 'avatars'
        and lower((storage.foldername(name))[1]) = lower(auth.uid()::text)
    );

drop policy if exists "Public read avatars" on storage.objects;
create policy "Public read avatars"
    on storage.objects for select
    using (bucket_id = 'avatars');
