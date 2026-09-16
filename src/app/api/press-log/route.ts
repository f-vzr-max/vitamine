import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function GET() {
  const logs = await prisma.pressLog.findMany({ orderBy: { date: "desc" } });
  return NextResponse.json(logs);
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { date, qty } = body;
  if (typeof qty !== "number" || qty <= 0) {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  const log = await prisma.pressLog.create({
    data: {
      date: typeof date === "string" ? date : new Date().toISOString().slice(0, 10),
      qty,
      createdBy: session.user.id as string,
    },
  });

  return NextResponse.json(log, { status: 201 });
}
