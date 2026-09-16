import {
  computeDaysRemaining as targetDaysRemaining,
  computeTargetPressedPct,
  computeTargetSoldPct,
  parseDateUTC,
} from "@/lib/targets";

export function computePressedPct(vracBaselineBales: number, totalPressedBales: number): number {
  if (vracBaselineBales <= 0) return 0;
  return Math.round((100 * totalPressedBales) / vracBaselineBales);
}

export function computeSoldPct(
  prePressedStockBales: number,
  totalPressedBales: number,
  totalSoldBales: number
): number {
  const denominator = prePressedStockBales + totalPressedBales;
  if (denominator <= 0) return 0;
  return Math.round((100 * totalSoldBales) / denominator);
}

export function computeDaysRemaining(asOf: string): number {
  return targetDaysRemaining(asOf);
}

export function computeTargets(asOf: string): { targetPressedPct: number; targetSoldPct: number } {
  return {
    targetPressedPct: computeTargetPressedPct(asOf),
    targetSoldPct: computeTargetSoldPct(asOf),
  };
}

export type ShiftRow = {
  employeeId: string;
  employeeName: string;
  date: string;
  isRestHalfDay: boolean;
};

export type RestComplianceResult = {
  employees: { employeeId: string; employeeName: string; compliant: boolean }[];
  coverage: { date: string; covered: boolean }[];
};

/**
 * Per-employee rest compliance (>=1 isRestHalfDay row) and per-calendar-day coverage
 * (>=1 assignment from anyone) across the full date span of the seeded shifts.
 */
export function computeRestCompliance(shifts: ShiftRow[]): RestComplianceResult {
  const byEmployee = new Map<string, { employeeName: string; hasRest: boolean }>();
  const datesWithCoverage = new Set<string>();
  let minDate: string | null = null;
  let maxDate: string | null = null;

  for (const shift of shifts) {
    const entry = byEmployee.get(shift.employeeId) ?? { employeeName: shift.employeeName, hasRest: false };
    if (shift.isRestHalfDay) entry.hasRest = true;
    byEmployee.set(shift.employeeId, entry);

    datesWithCoverage.add(shift.date);
    if (minDate === null || shift.date < minDate) minDate = shift.date;
    if (maxDate === null || shift.date > maxDate) maxDate = shift.date;
  }

  const employees = [...byEmployee.entries()].map(([employeeId, v]) => ({
    employeeId,
    employeeName: v.employeeName,
    compliant: v.hasRest,
  }));

  const coverage: { date: string; covered: boolean }[] = [];
  if (minDate !== null && maxDate !== null) {
    let cursor = parseDateUTC(minDate);
    const end = parseDateUTC(maxDate);
    while (cursor.getTime() <= end.getTime()) {
      const dateStr = cursor.toISOString().slice(0, 10);
      coverage.push({ date: dateStr, covered: datesWithCoverage.has(dateStr) });
      cursor = new Date(cursor.getTime() + 24 * 60 * 60 * 1000);
    }
  }

  return { employees, coverage };
}

export type SaleRow = { date: string; revenueAr: number };

export type CashReconciliationResult = {
  byDay: { date: string; totalAr: number }[];
  byWeek: { weekStart: string; totalAr: number }[];
};

/** Monday of the ISO week containing dateStr, as "YYYY-MM-DD". */
export function weekStartOf(dateStr: string): string {
  const d = parseDateUTC(dateStr);
  const isoDow = d.getUTCDay() === 0 ? 7 : d.getUTCDay(); // Mon=1..Sun=7
  const monday = new Date(d.getTime() - (isoDow - 1) * 24 * 60 * 60 * 1000);
  return monday.toISOString().slice(0, 10);
}

export function computeCashReconciliation(sales: SaleRow[]): CashReconciliationResult {
  const byDayMap = new Map<string, number>();
  const byWeekMap = new Map<string, number>();

  for (const sale of sales) {
    byDayMap.set(sale.date, (byDayMap.get(sale.date) ?? 0) + sale.revenueAr);
    const weekStart = weekStartOf(sale.date);
    byWeekMap.set(weekStart, (byWeekMap.get(weekStart) ?? 0) + sale.revenueAr);
  }

  return {
    byDay: [...byDayMap.entries()].map(([date, totalAr]) => ({ date, totalAr })),
    byWeek: [...byWeekMap.entries()].map(([weekStart, totalAr]) => ({ weekStart, totalAr })),
  };
}
