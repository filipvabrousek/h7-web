#!/usr/bin/env bash
# deploy.sh — stage + commit + push this repo to GitHub.
#
# Vercel is wired to origin/main, so a successful push triggers a production
# deploy automatically.
#
# Usage:
#   ./deploy.sh                  # commit message = timestamp
#   ./deploy.sh "fix login bug"  # custom commit message
#
# Secrets note: `git add -A` picks up everything not in .gitignore.
# .env*, .vercel, build artifacts are already ignored — audit .gitignore
# before committing new config files.

set -euo pipefail

# Always operate on the repo this script lives in, regardless of CWD.
cd "$(dirname "$0")"

MESSAGE="${1:-deploy: $(date '+%Y-%m-%d %H:%M:%S %Z')}"

if [ -t 1 ]; then
  BOLD=$'\033[1m'; DIM=$'\033[2m'; GREEN=$'\033[32m'; RED=$'\033[31m'; RESET=$'\033[0m'
else
  BOLD=""; DIM=""; GREEN=""; RED=""; RESET=""
fi

branch=$(git rev-parse --abbrev-ref HEAD)
remote_url=$(git remote get-url origin 2>/dev/null || echo "")
if [ -z "$remote_url" ]; then
  echo "${RED}✗ no 'origin' remote configured${RESET}" >&2
  exit 1
fi
echo "${BOLD}▸ $(basename "$PWD")${RESET} ${DIM}($branch → $remote_url)${RESET}"

git add -A

# `git diff --cached --quiet` exits non-zero when something IS staged.
if ! git diff --cached --quiet; then
  git commit -m "$MESSAGE" >/dev/null
  echo "  ${GREEN}✓ committed${RESET} ${DIM}($MESSAGE)${RESET}"
else
  echo "  ${DIM}· working tree clean${RESET}"
fi

# -u on first push so the branch tracks origin; plain push thereafter.
if git rev-parse --abbrev-ref --symbolic-full-name "@{upstream}" >/dev/null 2>&1; then
  git push
else
  git push -u origin "$branch"
fi
echo "  ${GREEN}✓ pushed to origin/$branch${RESET} ${DIM}— Vercel deploy triggered${RESET}"
