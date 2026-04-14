#!/usr/bin/env bash
# Start the H7 web app (dev mode) from the project root.
set -euo pipefail

cd "$(dirname "$0")"

if [ ! -d node_modules ]; then
  echo "→ Installing dependencies…"
  npm install
fi

if [ ! -f .env.local ]; then
  echo "✗ Missing .env.local — copy your Supabase keys in before starting." >&2
  exit 1
fi

echo "→ Starting Next.js dev server on http://localhost:3000"
exec npm run dev
