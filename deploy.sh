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
# Auth note:
# macOS Keychain stays logged in as `nodalityjs` for npm publishing and the
# nodality repos. This script side-steps Keychain for its single push and
# authenticates to GitHub as `filipvabrousek` using a Personal Access Token
# stored outside the repo. Keychain is never read or modified.
#
# One-time setup:
#   1. Create a GitHub PAT (classic, `repo` scope OR fine-grained with
#      Contents:Read/Write on filipvabrousek/h7-web) at
#      https://github.com/settings/tokens
#   2. mkdir -p ~/.config/h7-web && chmod 700 ~/.config/h7-web
#   3. echo "ghp_your_token_here" > ~/.config/h7-web/github-token
#   4. chmod 600 ~/.config/h7-web/github-token
#
# Override the username or token location with env vars if you like:
#   H7_WEB_GH_USER   (default: filipvabrousek)
#   H7_WEB_GH_TOKEN_FILE (default: ~/.config/h7-web/github-token)
#
# Secrets note: `git add -A` picks up everything not in .gitignore.
# .env*, .vercel, build artifacts are already ignored — audit .gitignore
# before committing new config files.

set -euo pipefail

# Always operate on the repo this script lives in, regardless of CWD.
cd "$(dirname "$0")"

MESSAGE="${1:-deploy: $(date '+%Y-%m-%d %H:%M:%S %Z')}"
GH_USER="${H7_WEB_GH_USER:-filipvabrousek}"
TOKEN_FILE="${H7_WEB_GH_TOKEN_FILE:-$HOME/.config/h7-web/github-token}"

if [ -t 1 ]; then
  BOLD=$'\033[1m'; DIM=$'\033[2m'; GREEN=$'\033[32m'; RED=$'\033[31m'; YELLOW=$'\033[33m'; RESET=$'\033[0m'
else
  BOLD=""; DIM=""; GREEN=""; RED=""; YELLOW=""; RESET=""
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

# ── Session-scoped auth as $GH_USER ─────────────────────────────────────
#   credential.helper=        → disable all helpers (incl. osxkeychain) for
#                               this invocation only. Git will ask ASKPASS.
#   GIT_ASKPASS               → our tiny script answers Username + Password.
#   GIT_TERMINAL_PROMPT=0     → never fall back to an interactive TTY prompt
#                               if auth fails; fail fast with a clear error.
# The askpass script lives in a temp file for the duration of the push and
# is deleted on exit (including on failure / Ctrl-C).
if [ ! -r "$TOKEN_FILE" ]; then
  echo "${RED}✗ token file not found: $TOKEN_FILE${RESET}" >&2
  echo "  ${DIM}See the 'One-time setup' block in this script.${RESET}" >&2
  exit 1
fi

# Reject tokens that are world- or group-readable. Don't trust 0644.
perms=$(stat -f '%OLp' "$TOKEN_FILE" 2>/dev/null || stat -c '%a' "$TOKEN_FILE" 2>/dev/null || echo "???")
case "$perms" in
  600|400) ;;
  *) echo "${YELLOW}⚠ $TOKEN_FILE has mode $perms; recommend 600${RESET}" >&2 ;;
esac

ASKPASS=$(mktemp -t h7web_askpass)
# The askpass script reads the token file at call time, so rotating the
# token between pushes doesn't require editing this script.
cat > "$ASKPASS" <<ASKEOF
#!/usr/bin/env bash
case "\$1" in
  Username*) printf '%s' '$GH_USER' ;;
  Password*) tr -d '\n\r' < '$TOKEN_FILE' ;;
esac
ASKEOF
chmod 700 "$ASKPASS"
trap 'rm -f "$ASKPASS"' EXIT INT TERM

push_args=()
if ! git rev-parse --abbrev-ref --symbolic-full-name "@{upstream}" >/dev/null 2>&1; then
  # First push on this branch — set upstream.
  push_args=(-u origin "$branch")
fi

GIT_ASKPASS="$ASKPASS" GIT_TERMINAL_PROMPT=0 \
  git -c credential.helper= push "${push_args[@]}"

echo "  ${GREEN}✓ pushed to origin/$branch as $GH_USER${RESET} ${DIM}— Vercel deploy triggered${RESET}"
