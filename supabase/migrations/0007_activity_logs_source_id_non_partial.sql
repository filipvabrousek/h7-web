-- ============================================
-- 0007 — Make the source_id dedupe index non-partial
-- ============================================
--
-- Migration 0006 created a PARTIAL unique index:
--   create unique index activity_logs_auto_source_id_dedupe
--     on activity_logs (user_id, source, source_id)
--     where source <> 'manual' and source_id is not null;
--
-- The index itself works for enforcement, but PostgREST (Supabase's
-- REST layer) can't INFER a partial unique index from the
-- `on_conflict=user_id,source,source_id` query parameter — that param
-- only carries column names, not the index's WHERE predicate. Without
-- the predicate, PostgreSQL refuses to resolve it during conflict
-- inference and raises:
--
--   ERROR: there is no unique or exclusion constraint matching the
--          ON CONFLICT specification
--
-- …which surfaces on the iOS/Android clients as "Failed to import
-- activity: there is no unique or exclusion constraint matching the
-- ON CONFLICT specification" on every auto-import after migration 0006.
--
-- Fix: drop the partial index and replace it with a plain (non-partial)
-- unique index on the same columns. Safe under default NULLS DISTINCT
-- semantics because:
--
--   • Manual activities (source = 'manual') always have source_id IS
--     NULL, and PostgreSQL treats each NULL as distinct, so multiple
--     same-day manual entries still coexist without collision.
--   • Auto-imported activities always carry a non-null source_id (HK
--     UUID on iOS, HC metadata.id on Android), so genuine duplicates
--     (same UUID + same user + same source) still collapse to one row.
--
-- The non-partial index can be inferred by PostgREST with just column
-- names, so `upsert(..., onConflict: "user_id,source,source_id",
-- ignoreDuplicates: true)` on the clients now resolves cleanly and
-- compiles to `INSERT … ON CONFLICT (user_id, source, source_id)
-- DO NOTHING` on the Postgres side.
--
-- Rollback:
--   drop index if exists activity_logs_auto_source_id_dedupe;
--   create unique index activity_logs_auto_source_id_dedupe
--     on activity_logs (user_id, source, source_id)
--     where source <> 'manual' and source_id is not null;

drop index if exists activity_logs_auto_source_id_dedupe;

create unique index if not exists activity_logs_auto_source_id_dedupe
  on activity_logs (user_id, source, source_id);
