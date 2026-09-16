import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { isValidDateStr } from "@/lib/targets";

export async function GET() {
  const notes = await prisma.attendanceNote.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json(notes);
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { employeeId, date, text } = body;

  if (
    typeof employeeId !== "string" ||
    typeof text !== "string" ||
    !text.trim() ||
    (date !== undefined && date !== null && (typeof date !== "string" || !isValidDateStr(date)))
  ) {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  const note = await prisma.attendanceNote.create({
    data: { employeeId, date: date ?? null, text: text.trim(), createdBy: session.user.id as string },
  });
  return NextResponse.json(note, { status: 201 });
}

export async function DELETE(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const id = request.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "missing id" }, { status: 400 });
  }

  await prisma.attendanceNote.deleteMany({ where: { id } });
  return NextResponse.json({ ok: true });
}
