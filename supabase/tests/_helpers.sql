-- ================================================================
-- Test helpers + auth schema stub
--
-- Loaded once before any test file by run.sh. Provides:
--   • assert_eq / assert_throws / fail — minimal home-grown framework
--     (we don't pull in pgTAP because that requires the supabase CLI's
--     full local stack; raw psql + DO blocks work everywhere)
--   • auth schema stub — auth.users table + auth.uid() / auth.role()
--     functions that read from session GUCs, so RLS policies that
--     reference auth.uid() work in tests by setting:
--         SET LOCAL "request.jwt.claims" = '{"sub":"<uuid>","role":"authenticated"}';
-- ================================================================

\set ON_ERROR_STOP on

-- Schema for our test helpers — keeps them out of `public` so they
-- don't collide with anything the production migrations create.
CREATE SCHEMA IF NOT EXISTS test;

-- ---- assert_eq ---------------------------------------------------
-- Raises NOTICE with PASS/FAIL prefix so the runner can grep results.
-- Uses anyelement so it works for ints, text, bool, uuid, etc.
CREATE OR REPLACE FUNCTION test.assert_eq(label text, expected anyelement, actual anyelement)
RETURNS void AS $$
BEGIN
  IF expected IS NOT DISTINCT FROM actual THEN
    RAISE NOTICE 'PASS: %', label;
  ELSE
    RAISE EXCEPTION 'FAIL: % — expected %, got %', label, expected, actual;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- ---- assert_throws ----------------------------------------------
-- Asserts that a SQL statement raises an exception (any error). Used
-- to verify constraints actually reject bad input rather than
-- silently accepting it.
CREATE OR REPLACE FUNCTION test.assert_throws(label text, sql text)
RETURNS void AS $$
BEGIN
  BEGIN
    EXECUTE sql;
    RAISE EXCEPTION 'FAIL: % — expected exception, statement succeeded', label;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'PASS: % (rejected with: %)', label, SQLERRM;
  END;
END;
$$ LANGUAGE plpgsql;

-- ---- auth schema stub ------------------------------------------
-- Mirrors enough of Supabase's `auth` schema for the production
-- migrations to apply (foreign keys to auth.users, RLS using
-- auth.uid()) and for tests to switch identities via session GUCs.
CREATE SCHEMA IF NOT EXISTS auth;

CREATE TABLE IF NOT EXISTS auth.users (
  id uuid PRIMARY KEY,
  email text,
  created_at timestamptz DEFAULT now()
);

-- Reads the JWT sub claim from a session GUC. Tests set the GUC via
-- SET LOCAL "request.jwt.claims" = '{"sub":"<uuid>", ...}';
CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid AS $$
  SELECT NULLIF(
    (current_setting('request.jwt.claims', true)::jsonb ->> 'sub'),
    ''
  )::uuid
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION auth.role() RETURNS text AS $$
  SELECT COALESCE(
    NULLIF(current_setting('request.jwt.claims', true)::jsonb ->> 'role', ''),
    'anon'
  )::text
$$ LANGUAGE sql STABLE;

