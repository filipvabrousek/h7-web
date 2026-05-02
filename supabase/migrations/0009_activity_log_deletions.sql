-- ============================================
-- 0009 — Activity-log deletion tombstones
-- ============================================
--
-- When a user explicitly deletes an auto-imported workout in H7, the
-- row was removed from `activity_logs` but no record was kept that the
-- user *meant* to remove it. The next HealthKit / Health Connect sync
-- ran fetchWorkouts → importFromHealthKit, found no matching row in
-- the cloud (since we just deleted it), saw the dedup unique index
-- had no conflict to honor, and re-inserted the workout — resurrecting
-- it within seconds of the user pressing delete.
--
-- This table holds the (user_id, source, source_id) triple of every
-- explicitly-deleted auto-imported workout. The mobile clients fetch
-- it on every load and filter incoming HK/HC samples against it
-- before upserting; resurrected rows can no longer slip through.
--
-- Manual entries (source = 'manual', source_id IS NULL) don't need a
-- tombstone because they're never re-imported from anywhere — they
-- exist only because the user typed them in. So this table is
-- restricted to the source values used by the auto-import paths.
--
-- The primary key matches the conflict target on activity_logs'
-- partial unique index from migration 0007 — same shape, opposite
-- intent (one says "this row exists", the other says "the user
-- doesn't want this row to exist").

create table if not exists activity_log_deletions (
    user_id    uuid not null references auth.users(id) on delete cascade,
    source     text not null check (source in ('manual', 'healthkit', 'garmin', 'fitbit')),
    source_id  text not null,
    deleted_at timestamptz not null default now(),
    primary key (user_id, source, source_id)
);

create index if not exists idx_activity_log_deletions_user
    on activity_log_deletions(user_id);

alter table activity_log_deletions enable row level security;

create policy "Users can view own deletions"
    on activity_log_deletions for select
    using (auth.uid() = user_id);

create policy "Users can insert own deletions"
    on activity_log_deletions for insert
    with check (auth.uid() = user_id);

-- Allow users to clear a tombstone (e.g. if they want to re-import a
-- workout they previously deleted by mistake, they can manually
-- remove the tombstone). Update isn't needed — the row is immutable
-- once written.
create policy "Users can delete own deletions"
    on activity_log_deletions for delete
    using (auth.uid() = user_id);
