#!/usr/bin/env bash
# C3: sales wiring -- POST /api/sales, dashboard revenue, client history, stock decrement.
set -euo pipefail
cd "$(dirname "$0")/../.."
source scripts/checks/_pg.sh
npx vitest run tests/wiring/sales.test.ts
