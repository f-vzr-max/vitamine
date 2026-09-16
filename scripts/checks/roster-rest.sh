#!/usr/bin/env bash
# C7: roster rest-day compliance and daily coverage, from real shift data.
set -euo pipefail
cd "$(dirname "$0")/../.."
source scripts/checks/_pg.sh
npx vitest run tests/wiring/roster-rest.test.ts
