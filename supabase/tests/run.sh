#!/usr/bin/env bash
# ----------------------------------------------------------------------
# Supabase migration regression tests
#
# Spins up a local Postgres in Docker, applies every migration in
# h7-web/supabase/migrations/ in order, then runs every *.sql file
# in h7-web/supabase/tests/ (except _helpers.sql which is loaded
# first as setup). Each test wraps its own work in BEGIN/ROLLBACK
# so the DB stays clean between tests.
#
# Usage:
#   ./supabase/tests/run.sh           # default: runs everything
#   ./supabase/tests/run.sh --keep    # keep container running between
#                                       runs (faster dev loop, ~2s vs
#                                       ~10s per invocation)
#
# Exit code: 0 on success, 1 on any test failure or setup error.
# ----------------------------------------------------------------------

set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SUPABASE_DIR="$(dirname "$SCRIPT_DIR")"
MIGRATIONS_DIR="$SUPABASE_DIR/migrations"
TESTS_DIR="$SCRIPT_DIR"

CONTAINER_NAME="h7-pgtest"
PG_IMAGE="postgres:16-alpine"
PG_PASSWORD="h7test"
PG_PORT="55432"   # offset from 5432 so it doesn't clash with a local pg

KEEP_CONTAINER=0
for arg in "$@"; do
  case "$arg" in
    --keep) KEEP_CONTAINER=1 ;;
    *) ;;
  esac
done

if [ -t 1 ]; then
  GREEN=$'\033[0;32m'; RED=$'\033[0;31m'; YELLOW=$'\033[1;33m'
  DIM=$'\033[2m'; BOLD=$'\033[1m'; RESET=$'\033[0m'
else
  GREEN=''; RED=''; YELLOW=''; DIM=''; BOLD=''; RESET=''
fi

# ---- Container lifecycle -------------------------------------------

start_container() {
  if docker ps --format '{{.Names}}' | grep -qx "$CONTAINER_NAME"; then
    printf '%sReusing running container %s%s\n' "$DIM" "$CONTAINER_NAME" "$RESET"
    return
  fi
  if docker ps -a --format '{{.Names}}' | grep -qx "$CONTAINER_NAME"; then
    docker rm -f "$CONTAINER_NAME" >/dev/null 2>&1
  fi
  printf 'Starting %s on port %s...\n' "$PG_IMAGE" "$PG_PORT"
  docker run -d --rm \
    --name "$CONTAINER_NAME" \
    -e "POSTGRES_PASSWORD=$PG_PASSWORD" \
    -p "$PG_PORT:5432" \
    "$PG_IMAGE" >/dev/null
  # Wait for Postgres to accept connections.
  local i=0
  until docker exec "$CONTAINER_NAME" pg_isready -U postgres >/dev/null 2>&1; do
    i=$((i + 1))
    if [ $i -gt 30 ]; then
      printf '%sPostgres failed to become ready within 30s%s\n' "$RED" "$RESET" >&2
      docker logs "$CONTAINER_NAME" >&2
      exit 1
    fi
    sleep 0.5
  done
}

cleanup() {
  if [ $KEEP_CONTAINER -eq 1 ]; then
    printf '%sContainer %s left running (--keep)%s\n' "$DIM" "$CONTAINER_NAME" "$RESET"
    return
  fi
  if docker ps --format '{{.Names}}' | grep -qx "$CONTAINER_NAME"; then
    docker rm -f "$CONTAINER_NAME" >/dev/null 2>&1
  fi
}
trap cleanup EXIT

psql_exec() {
  # PGPASSWORD env var is the standard way to pass a password to psql
  # without it ending up in the shell's argv (which would show up in
  # `ps`).
  PGPASSWORD="$PG_PASSWORD" docker exec -i "$CONTAINER_NAME" \
    psql -U postgres -d postgres -v ON_ERROR_STOP=1 "$@"
}

# ---- Setup: reset DB, apply migrations, load helpers --------------

reset_and_migrate() {
  # Wipe public + auth schemas so re-runs are deterministic. Other
  # schemas (pg_catalog, information_schema) we leave alone.
  psql_exec -q -c '
    DROP SCHEMA IF EXISTS public CASCADE;
    DROP SCHEMA IF EXISTS auth CASCADE;
    DROP SCHEMA IF EXISTS test CASCADE;
    DROP SCHEMA IF EXISTS storage CASCADE;
    CREATE SCHEMA public;
    GRANT ALL ON SCHEMA public TO postgres;
    GRANT ALL ON SCHEMA public TO public;
  ' >/dev/null

  # Helpers FIRST — defines the auth schema stub the migrations need
  # for their `references auth.users` foreign keys.
  psql_exec -q < "$TESTS_DIR/_helpers.sql" >/dev/null

  # Stub the storage schema the support-media migration touches.
  psql_exec -q -c '
    CREATE SCHEMA IF NOT EXISTS storage;
    CREATE TABLE IF NOT EXISTS storage.buckets (
      id text PRIMARY KEY,
      name text,
      public boolean DEFAULT false
    );
    CREATE TABLE IF NOT EXISTS storage.objects (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      bucket_id text REFERENCES storage.buckets(id),
      name text
    );
    CREATE OR REPLACE FUNCTION storage.foldername(name text) RETURNS text[] AS $$
      SELECT string_to_array(name, $TOK$/$TOK$)
    $$ LANGUAGE sql IMMUTABLE;
  ' >/dev/null

  printf 'Applying %d migrations...\n' "$(ls "$MIGRATIONS_DIR" | wc -l | tr -d ' ')"
  local out rc
  for migration in "$MIGRATIONS_DIR"/*.sql; do
    printf '  %s%s%s\n' "$DIM" "$(basename "$migration")" "$RESET"
    # Capture combined output, check psql's exit code directly. We
    # can't use `psql ... | grep -v '^$'` here because `set -o
    # pipefail` makes grep's "no matches" exit-1 propagate as the
    # whole pipeline status — which would falsely flag any migration
    # that produced no output as a failure.
    out=$(psql_exec -q < "$migration" 2>&1)
    rc=$?
    if [ $rc -ne 0 ]; then
      printf '%sMigration failed: %s%s\n' "$RED" "$migration" "$RESET" >&2
      echo "$out" | sed 's/^/  /' >&2
      exit 1
    fi
  done
}

# ---- Run tests -----------------------------------------------------

run_tests() {
  local pass_count=0 fail_count=0 first_failure=''
  printf '\n%sRunning tests...%s\n' "$BOLD" "$RESET"
  for test_file in "$TESTS_DIR"/[0-9]*.sql; do
    local name
    name=$(basename "$test_file" .sql)
    local out
    if out=$(psql_exec -q < "$test_file" 2>&1); then
      # Count PASS / extract them from NOTICE output.
      local file_passes
      file_passes=$(echo "$out" | grep -c "^NOTICE: *PASS:" || true)
      printf '  %s✓%s %s %s(%d assertions)%s\n' \
        "$GREEN" "$RESET" "$name" "$DIM" "$file_passes" "$RESET"
      pass_count=$((pass_count + file_passes))
    else
      printf '  %s✘%s %s\n' "$RED" "$RESET" "$name"
      echo "$out" | sed "s/^/    ${DIM}│${RESET} /" | head -10
      fail_count=$((fail_count + 1))
      [ -z "$first_failure" ] && first_failure="$name"
    fi
  done

  echo
  if [ $fail_count -eq 0 ]; then
    printf '%s✓ %d assertions passed across all test files%s\n' \
      "$GREEN" "$pass_count" "$RESET"
  else
    printf '%s✘ %d test files failed (first: %s)%s\n' \
      "$RED" "$fail_count" "$first_failure" "$RESET" >&2
    exit 1
  fi
}

# ---- Main ----------------------------------------------------------

if ! command -v docker >/dev/null 2>&1; then
  printf '%sdocker not on PATH%s\n' "$RED" "$RESET" >&2
  exit 2
fi

start_container
reset_and_migrate
run_tests
