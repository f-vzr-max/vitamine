#!/usr/bin/env bash
# C5: auth wired both ways -- unauthenticated writes rejected, a real login can write.
# Starts on the EXISTING build (never rebuilds unless missing) -- C1 already paid that cost.
set -euo pipefail
cd "$(dirname "$0")/../.."
source scripts/checks/_pg.sh

test -f .next/BUILD_ID || npm run build

export AUTH_SECRET="check-secret-$$-not-for-production"
PORT=$((30000 + ($$ % 10000)))
export AUTH_TRUST_HOST=true
export AUTH_URL="http://127.0.0.1:${PORT}"
BASE_URL="http://127.0.0.1:${PORT}"

npx next start -p "$PORT" -H 127.0.0.1 >/tmp/vt-auth-guard-server-$$.log 2>&1 &
SERVER_PID=$!

COOKIE_JAR=$(mktemp)
cleanup_all() {
  kill "$SERVER_PID" >/dev/null 2>&1 || true
  wait "$SERVER_PID" 2>/dev/null || true
  rm -f "$COOKIE_JAR" "/tmp/vt-auth-guard-server-$$.log"
  cleanup_vt_pg
}
trap cleanup_all EXIT

deadline=$((SECONDS + 30))
until curl -s -o /dev/null "$BASE_URL/login"; do
  if [ "$SECONDS" -ge "$deadline" ]; then
    echo "auth-guard.sh: server did not start in time" >&2
    exit 1
  fi
  sleep 0.3
done

# --- Negative: unauthenticated POST must be 401 ---
NEG_STATUS=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$BASE_URL/api/press-log" \
  -H "Content-Type: application/json" \
  -d '{"date":"2026-09-21","qty":10}')

if [ "$NEG_STATUS" != "401" ]; then
  echo "auth-guard.sh: expected 401 for unauthenticated POST /api/press-log, got $NEG_STATUS" >&2
  exit 1
fi

# --- Positive: create a real user, log in through the real Credentials flow, then POST ---
TEST_EMAIL="checkuser-$$@example.test"
export VT_CHECK_PW="check-pass-$$-$(date +%s%N)"

npx tsx scripts/create-user.ts --email "$TEST_EMAIL" --name "Check User" --password-env VT_CHECK_PW >/dev/null

CSRF_JSON=$(curl -s -c "$COOKIE_JAR" -b "$COOKIE_JAR" "$BASE_URL/api/auth/csrf")
CSRF_TOKEN=$(printf '%s' "$CSRF_JSON" | grep -o '"csrfToken":"[^"]*"' | cut -d'"' -f4)

if [ -z "$CSRF_TOKEN" ]; then
  echo "auth-guard.sh: could not obtain csrf token (got: $CSRF_JSON)" >&2
  exit 1
fi

curl -s -o /dev/null -c "$COOKIE_JAR" -b "$COOKIE_JAR" \
  -X POST "$BASE_URL/api/auth/callback/credentials" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  --data-urlencode "email=${TEST_EMAIL}" \
  --data-urlencode "password=${VT_CHECK_PW}" \
  --data-urlencode "csrfToken=${CSRF_TOKEN}" \
  --data-urlencode "json=true"

POS_STATUS=$(curl -s -o /dev/null -w '%{http_code}' -c "$COOKIE_JAR" -b "$COOKIE_JAR" \
  -X POST "$BASE_URL/api/press-log" \
  -H "Content-Type: application/json" \
  -d '{"date":"2026-09-21","qty":10}')

if [ "$POS_STATUS" != "200" ] && [ "$POS_STATUS" != "201" ]; then
  echo "auth-guard.sh: expected 200/201 for authenticated POST /api/press-log, got $POS_STATUS" >&2
  exit 1
fi

echo "auth-guard.sh: OK (unauth 401, authenticated $POS_STATUS)"
