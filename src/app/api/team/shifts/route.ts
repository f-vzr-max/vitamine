import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { isValidDateStr } from "@/lib/targets";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { employeeId, date, half, isRestHalfDay } = body;

  if (
    typeof employeeId !== "string" ||
    typeof date !== "string" ||
    !isValidDateStr(date) ||
    (half !== "AM" && half !== "PM") ||
    typeof isRestHalfDay !== "boolean"
  ) {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  try {
    const shift = await prisma.shiftAssignment.create({
      data: { employeeId, date, half, isRestHalfDay, createdBy: session.user.id as string },
    });
    return NextResponse.json(shift, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "shift assignment failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
