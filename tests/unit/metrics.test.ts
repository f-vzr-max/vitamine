import { describe, expect, it } from "vitest";
import {
  computeCashReconciliation,
  computeDaysRemaining,
  computePressedPct,
  computeRestCompliance,
  computeSoldPct,
  computeTargets,
  weekStartOf,
} from "@/lib/metrics";

describe("computePressedPct", () => {
  it("rounds to an integer percent", () => {
    expect(computePressedPct(4000, 1320)).toBe(33);
    expect(computePressedPct(6000, 1320)).toBe(22);
  });

  it("returns 0 for a non-positive baseline", () => {
    expect(computePressedPct(0, 100)).toBe(0);
  });
});

describe("computeSoldPct", () => {
  it("uses prePressedStock + pressed as the denominator", () => {
    expect(computeSoldPct(100, 0, 5)).toBe(5);
  });

  it("returns 0 when the denominator is zero", () => {
    expect(computeSoldPct(0, 0, 5)).toBe(0);
  });
});

describe("computeDaysRemaining / computeTargets", () => {
  it("matches the measured calendar facts from the campaign plan", () => {
    expect(computeDaysRemaining("2026-10-01")).toBe(80);
    expect(computeDaysRemaining("2026-10-11")).toBe(70);
    expect(computeDaysRemaining("2026-09-21")).toBe(90);

    expect(computeTargets("2026-10-01").targetPressedPct).toBe(67);
    expect(computeTargets("2026-11-10").targetSoldPct).toBe(58);
  });
});

describe("weekStartOf", () => {
  it("returns the Monday of the ISO week", () => {
    expect(weekStartOf("2026-09-22")).toBe("2026-09-21");
    expect(weekStartOf("2026-09-24")).toBe("2026-09-21");
    expect(weekStartOf("2026-09-27")).toBe("2026-09-21"); // Sunday still belongs to the Monday week
  });
});

describe("computeCashReconciliation", () => {
  it("groups by day and by week", () => {
    const result = computeCashReconciliation([
      { date: "2026-09-22", revenueAr: 50000 },
      { date: "2026-09-22", revenueAr: 60000 },
      { date: "2026-09-24", revenueAr: 10000 },
    ]);
    expect(result.byDay.find((d) => d.date === "2026-09-22")?.totalAr).toBe(110000);
    expect(result.byWeek.find((w) => w.weekStart === "2026-09-21")?.totalAr).toBe(120000);
  });
});

describe("computeRestCompliance", () => {
  it("flags per-employee compliance and per-day coverage gaps", () => {
    const result = computeRestCompliance([
      { employeeId: "a", employeeName: "A", date: "2026-09-21", isRestHalfDay: false },
      { employeeId: "a", employeeName: "A", date: "2026-09-22", isRestHalfDay: false },
      { employeeId: "b", employeeName: "B", date: "2026-09-21", isRestHalfDay: true },
      { employeeId: "b", employeeName: "B", date: "2026-09-23", isRestHalfDay: false },
    ]);

    expect(result.employees.find((e) => e.employeeId === "a")?.compliant).toBe(false);
    expect(result.employees.find((e) => e.employeeId === "b")?.compliant).toBe(true);
    // 2026-09-22 is covered by A but not B; the day itself is not uncovered since A has a row.
    const gapDay = result.coverage.find((c) => c.date === "2026-09-22");
    expect(gapDay?.covered).toBe(true);
  });
});
