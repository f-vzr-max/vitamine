import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { isValidDateStr } from "@/lib/targets";

export async function GET(request: NextRequest) {
  const date = request.nextUrl.searchParams.get("date") ?? new Date().toISOString().slice(0, 10);
  if (!isValidDateStr(date)) {
    return NextResponse.json({ error: "invalid date" }, { status: 400 });
  }

  const recap = await prisma.dailyRecap.findUnique({ where: { date } });
  return NextResponse.json(recap ?? { date, text: "" });
}

export async function PUT(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { date, text } = body;

  if (typeof date !== "string" || !isValidDateStr(date) || typeof text !== "string") {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  const createdBy = session.user.id as string;
  const trimmed = text.trim();

  if (!trimmed) {
    await prisma.dailyRecap.deleteMany({ where: { date } });
    return NextResponse.json({ date, text: "" });
  }

  const recap = await prisma.dailyRecap.upsert({
    where: { date },
    update: { text: trimmed, createdBy },
    create: { date, text: trimmed, createdBy },
  });
  return NextResponse.json(recap);
}
