#!/usr/bin/env bash
# C6: cash reconciliation totals match logged sales, by day and by week.
set -euo pipefail
cd "$(dirname "$0")/../.."
source scripts/checks/_pg.sh
npx vitest run tests/wiring/cash-reconciliation.test.ts
