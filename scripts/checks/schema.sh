#!/usr/bin/env bash
# C2: all 8 tables exist, Sale and PressLog carry createdBy+createdAt.
set -euo pipefail
cd "$(dirname "$0")/../.."
source scripts/checks/_pg.sh

psql_query() {
  PGPASSWORD="$VT_PG_PASSWORD" psql -h 127.0.0.1 -p "$VT_PG_PORT" -U postgres -d postgres -t -A -c "$1"
}

ACTUAL_TABLES=$(psql_query "SELECT string_agg(table_name, ' ' ORDER BY table_name) FROM information_schema.tables WHERE table_schema='public' AND table_name != '_prisma_migrations';")

EXPECTED_TABLES="Article Client Employee LiquidationConfig PressLog Sale ShiftAssignment User"
for t in $EXPECTED_TABLES; do
  if ! grep -qw "$t" <<<"$ACTUAL_TABLES"; then
    echo "schema.sh: missing table $t (found: $ACTUAL_TABLES)" >&2
    exit 1
  fi
done

TABLE_COUNT=$(wc -w <<<"$ACTUAL_TABLES")
if [ "$TABLE_COUNT" -ne 8 ]; then
  echo "schema.sh: expected exactly 8 tables, found $TABLE_COUNT ($ACTUAL_TABLES)" >&2
  exit 1
fi

for spec in "Sale:createdBy" "Sale:createdAt" "PressLog:createdBy" "PressLog:createdAt"; do
  table="${spec%%:*}"
  column="${spec##*:}"
  found=$(psql_query "SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='$table' AND column_name='$column';")
  if [ "$found" != "1" ]; then
    echo "schema.sh: missing column ${table}.${column}" >&2
    exit 1
  fi
done

echo "schema.sh: OK (8 tables, audit columns present)"
