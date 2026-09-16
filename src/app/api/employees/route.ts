import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function GET() {
  const employees = await prisma.employee.findMany({ orderBy: { name: "asc" } });
  return NextResponse.json(employees);
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { name } = body;
  if (typeof name !== "string" || !name.trim()) {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  const employee = await prisma.employee.create({
    data: { name, createdBy: session.user.id as string },
  });

  return NextResponse.json(employee, { status: 201 });
}
