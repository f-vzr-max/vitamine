import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { computeRestCompliance } from "@/lib/metrics";

export async function GET() {
  const shifts = await prisma.shiftAssignment.findMany({
    include: { employee: true },
    orderBy: { date: "asc" },
  });

  const rows = shifts.map((s) => ({
    employeeId: s.employeeId,
    employeeName: s.employee.name,
    date: s.date,
    isRestHalfDay: s.isRestHalfDay,
  }));

  return NextResponse.json(computeRestCompliance(rows));
}
