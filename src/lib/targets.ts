/**
 * Weekly cumulative targets from the liquidation plan (docs/reference/plan-vidage-depot.html).
 * Campaign: 2026-09-21 (Mon, week 1) -> 2026-12-20 (Sun, week 13).
 */
export const CAMPAIGN_START = "2026-09-21";
export const CAMPAIGN_END = "2026-12-20";

/** Phase 1 (weeks 1-3): cumulative % of vrac pressed into bales. */
export const PHASE1_TARGETS = [33, 67, 100];

/** Phase 2 (weeks 4-13): cumulative % of total stock sold. */
export const PHASE2_TARGETS = [10, 22, 35, 46, 58, 69, 80, 88, 95, 100];

const DAY_MS = 24 * 60 * 60 * 1000;

/** Parses a YYYY-MM-DD string as a UTC midnight instant, so day math is not host-timezone-dependent. */
export function parseDateUTC(dateStr: string): Date {
  return new Date(`${dateStr}T00:00:00.000Z`);
}

function daysBetween(fromStr: string, toStr: string): number {
  return Math.round((parseDateUTC(toStr).getTime() - parseDateUTC(fromStr).getTime()) / DAY_MS);
}

/** 1-indexed campaign week for a given date; clamped to [1, 13] once the campaign has started. */
export function weekOf(dateStr: string): number {
  const daysSinceStart = daysBetween(CAMPAIGN_START, dateStr);
  const week = Math.floor(daysSinceStart / 7) + 1;
  return Math.max(1, Math.min(13, week));
}

export function computeDaysRemaining(asOf: string): number {
  return daysBetween(asOf, CAMPAIGN_END);
}

export function computeTargetPressedPct(asOf: string): number {
  const week = weekOf(asOf);
  if (week <= PHASE1_TARGETS.length) return PHASE1_TARGETS[week - 1];
  return 100;
}

export function computeTargetSoldPct(asOf: string): number {
  const week = weekOf(asOf);
  const phase2Week = week - PHASE1_TARGETS.length;
  if (phase2Week < 1) return 0;
  if (phase2Week > PHASE2_TARGETS.length) return 100;
  return PHASE2_TARGETS[phase2Week - 1];
}
