import { describe, expect, it } from "vitest";

const { prisma } = await import("@/lib/db");
const { GET: restCheckGet } = await import("@/app/api/team/rest-check/route");

const DATES_A = ["2026-09-21", "2026-09-22", "2026-09-23", "2026-09-24", "2026-09-25", "2026-09-26", "2026-09-27"];
// 2026-09-28 is deliberately skipped by both employees -> zero-coverage day.
const DATES_B = ["2026-09-29", "2026-09-30", "2026-10-01", "2026-10-02", "2026-10-03", "2026-10-04", "2026-10-05"];

describe("roster rest-day compliance (C7)", () => {
  it("flags a non-resting employee, a compliant one, and an uncovered day", async () => {
    const employeeA = await prisma.employee.create({ data: { name: "Employee A", createdBy: "seed" } });
    const employeeB = await prisma.employee.create({ data: { name: "Employee B", createdBy: "seed" } });

    for (const date of DATES_A) {
      await prisma.shiftAssignment.create({
        data: { employeeId: employeeA.id, date, half: "AM", isRestHalfDay: false, createdBy: "seed" },
      });
    }

    for (const [i, date] of DATES_B.entries()) {
      await prisma.shiftAssignment.create({
        data: {
          employeeId: employeeB.id,
          date,
          half: "AM",
          isRestHalfDay: i === 3, // one rest half-day mid-week
          createdBy: "seed",
        },
      });
    }

    const res = await restCheckGet();
    const body = await res.json();

    const a = body.employees.find((e: { employeeId: string }) => e.employeeId === employeeA.id);
    const b = body.employees.find((e: { employeeId: string }) => e.employeeId === employeeB.id);
    expect(a?.compliant).toBe(false);
    expect(b?.compliant).toBe(true);

    const gapDay = body.coverage.find((c: { date: string }) => c.date === "2026-09-28");
    expect(gapDay?.covered).toBe(false);
  });
});
