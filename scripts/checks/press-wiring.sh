#!/usr/bin/env bash
# C4: press/sell wiring, configurable baselines, dashboard targets.
set -euo pipefail
cd "$(dirname "$0")/../.."
source scripts/checks/_pg.sh
npx vitest run tests/wiring/press-log.test.ts
