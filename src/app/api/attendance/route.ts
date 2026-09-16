import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { isValidDateStr } from "@/lib/targets";

const VALID_STATUSES = ["PRESENT", "DEMIE-J", "ABS", "OFF"];

function isValidMonthStr(month: string): boolean {
  return /^\d{4}-\d{2}$/.test(month);
}

export async function GET(request: NextRequest) {
  const month = request.nextUrl.searchParams.get("month") ?? new Date().toISOString().slice(0, 7);
  if (!isValidMonthStr(month)) {
    return NextResponse.json({ error: "invalid month" }, { status: 400 });
  }

  const [employees, records] = await Promise.all([
    prisma.employee.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.attendanceRecord.findMany({
      where: { date: { startsWith: month } },
      select: { employeeId: true, date: true, status: true },
    }),
  ]);

  return NextResponse.json({ month, employees, records });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { employeeId, date, status } = body;

  if (
    typeof employeeId !== "string" ||
    typeof date !== "string" ||
    !isValidDateStr(date) ||
    typeof status !== "string" ||
    !VALID_STATUSES.includes(status)
  ) {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  const createdBy = session.user.id as string;

  try {
    // PRESENT is the implicit default (no stored exception), so a status reset back to
    // it deletes the row instead of storing a redundant one.
    if (status === "PRESENT") {
      await prisma.attendanceRecord.deleteMany({ where: { employeeId, date } });
      return NextResponse.json({ employeeId, date, status: "PRESENT" });
    }

    const record = await prisma.attendanceRecord.upsert({
      where: { employeeId_date: { employeeId, date } },
      update: { status, createdBy },
      create: { employeeId, date, status, createdBy },
    });
    return NextResponse.json(record, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "attendance update failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
