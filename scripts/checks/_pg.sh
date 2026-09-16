#!/usr/bin/env bash
# Shared lib: spins one ephemeral postgres:16 container, waits for it, migrates,
# and exports DATABASE_URL + VT_PG_* for the sourcing check script. Source, don't run.
set -euo pipefail

VT_PG_CONTAINER="vt-$$"
VT_PG_PASSWORD="checkpass"

docker run -d --rm \
  -p 127.0.0.1::5432 \
  -e POSTGRES_PASSWORD="$VT_PG_PASSWORD" \
  --name "$VT_PG_CONTAINER" \
  postgres:16 >/dev/null

cleanup_vt_pg() {
  docker rm -f "$VT_PG_CONTAINER" >/dev/null 2>&1 || true
}
trap cleanup_vt_pg EXIT

VT_PG_PORT=""
deadline=$((SECONDS + 30))
while [ "$SECONDS" -lt "$deadline" ]; do
  VT_PG_PORT=$(docker port "$VT_PG_CONTAINER" 5432/tcp 2>/dev/null | head -1 | cut -d: -f2 || true)
  if [ -n "$VT_PG_PORT" ] && docker exec "$VT_PG_CONTAINER" pg_isready -U postgres >/dev/null 2>&1; then
    break
  fi
  sleep 0.3
done

if [ -z "$VT_PG_PORT" ] || ! docker exec "$VT_PG_CONTAINER" pg_isready -U postgres >/dev/null 2>&1; then
  echo "_pg.sh: postgres did not become ready within 30s" >&2
  exit 1
fi

export VT_PG_CONTAINER VT_PG_PASSWORD VT_PG_PORT
export DATABASE_URL="postgresql://postgres:${VT_PG_PASSWORD}@127.0.0.1:${VT_PG_PORT}/postgres"

npx prisma migrate deploy >/dev/null
