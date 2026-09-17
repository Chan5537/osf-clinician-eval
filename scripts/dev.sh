#!/usr/bin/env bash
# One command to get a testable app running.
#
#   ./scripts/dev.sh              clinician UI, all 10 cases  (what raters will see)
#   ./scripts/dev.sh 2            clinician UI, first 2 cases (quick pass)
#   ./scripts/dev.sh --dev        internal build: reveal arms, downloads, start over
#   ./scripts/dev.sh --reset      wipe test ratings/sessions first, then start
#   ./scripts/dev.sh --reseed     restore the full 30-row batch first, then start
#
# Flags combine: ./scripts/dev.sh 2 --reset --dev
#
# Checks the environment before starting, so a missing key is a clear message here
# rather than a blank screen or a silent no-backend fallback later.
set -euo pipefail
cd "$(dirname "$0")/.."

MODE=clinician
LIMIT=""
RESET=0
RESEED=0
for arg in "$@"; do
  case "$arg" in
    --dev)    MODE=dev ;;
    --reset)  RESET=1 ;;
    --reseed) RESEED=1 ;;
    ''|*[!0-9]*) echo "unknown argument: $arg" >&2; exit 1 ;;
    *)        LIMIT="$arg" ;;
  esac
done

bold=$(tput bold 2>/dev/null || true); dim=$(tput dim 2>/dev/null || true)
red=$(tput setaf 1 2>/dev/null || true); grn=$(tput setaf 2 2>/dev/null || true)
ylw=$(tput setaf 3 2>/dev/null || true); off=$(tput sgr0 2>/dev/null || true)
ok(){ echo "  ${grn}✓${off} $1"; }
warn(){ echo "  ${ylw}!${off} $1"; }
die(){ echo "  ${red}✗${off} $1" >&2; exit 1; }

echo
echo "${bold}Clinician evaluation — local${off}"
echo

# ---- environment -----------------------------------------------------------
[ -f .env.local ] || die ".env.local is missing. Copy .env.example and fill in the Supabase URL + anon key."
set -a; . ./.env.local; set +a

[ -n "${VITE_SUPABASE_URL:-}" ] || die "VITE_SUPABASE_URL is empty in .env.local — the app would run with NO backend (no sign-in, no saving)."
[ -n "${VITE_SUPABASE_ANON_KEY:-}" ] || die "VITE_SUPABASE_ANON_KEY is empty in .env.local."
ok "backend: ${VITE_SUPABASE_URL}"

# ---- optional maintenance --------------------------------------------------
if [ "$RESEED" = 1 ] || [ "$RESET" = 1 ]; then
  if [ -z "${SUPABASE_SERVICE_ROLE_KEY:-}" ]; then
    die "--reset/--reseed need the service-role key:
      export SUPABASE_SERVICE_ROLE_KEY=<key from Settings -> API Keys>"
  fi
  export SUPABASE_URL="${SUPABASE_URL:-$VITE_SUPABASE_URL}"
fi

if [ "$RESEED" = 1 ]; then
  echo "  restoring the batch…"
  python3 scripts/data/seed_batch.py >/dev/null && ok "batch restored (30 responses)"
fi

if [ "$RESET" = 1 ]; then
  echo "  clearing test data…"
  for t in rating session_state notification_outbox; do
    curl -fsS -X DELETE "${VITE_SUPABASE_URL}/rest/v1/${t}?id=not.is.null" \
      -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" \
      -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" >/dev/null 2>&1 \
    || curl -fsS -X DELETE "${VITE_SUPABASE_URL}/rest/v1/${t}?rater_id=not.is.null" \
      -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" \
      -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" >/dev/null 2>&1 || true
  done
  ok "ratings, sessions and notifications cleared"
fi

# ---- free the port ---------------------------------------------------------
# A server left running from a previous session serves the OLD env vars, which is
# how VITE_CASE_LIMIT silently fails to apply. Always reclaim 5173.
if lsof -ti:5173 >/dev/null 2>&1; then
  lsof -ti:5173 | xargs kill -9 2>/dev/null || true
  sleep 1
  ok "stopped the previous dev server"
fi

# ---- what is about to run --------------------------------------------------
echo
if [ "$MODE" = clinician ]; then
  echo "  ${bold}clinician build${off} ${dim}— no downloads, no reveal, no start-over${off}"
  warn "sign-in is by emailed link only (password sign-in is dev-only)"
  echo "    ${dim}link eaten by a scanner? Dashboard -> Authentication -> Users -> Generate link${off}"
else
  echo "  ${bold}dev build${off} ${dim}— reveal arms, downloads, start over, password sign-in${off}"
fi

if [ -n "$LIMIT" ]; then
  echo "  serving ${bold}${LIMIT}${off} case(s)"
  warn "the completion email needs ALL cases in the database scored — a limited run cannot trigger it"
else
  echo "  serving the full batch"
fi

echo
echo "  ${bold}http://localhost:5173/osf-clinician-eval/${off}"
echo "  ${dim}ctrl-c to stop${off}"
echo

export VITE_APP_MODE="$MODE"
[ -n "$LIMIT" ] && export VITE_CASE_LIMIT="$LIMIT"
exec npm run dev
