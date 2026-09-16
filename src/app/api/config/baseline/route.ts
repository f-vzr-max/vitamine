import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function GET() {
  const config = await prisma.liquidationConfig.upsert({
    where: { id: "singleton" },
    update: {},
    create: { id: "singleton" },
  });
  return NextResponse.json(config);
}

export async function PUT(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const data: { vracBaselineBales?: number; prePressedStockBales?: number } = {};
  if (typeof body.vracBaselineBales === "number") data.vracBaselineBales = body.vracBaselineBales;
  if (typeof body.prePressedStockBales === "number") data.prePressedStockBales = body.prePressedStockBales;

  const config = await prisma.liquidationConfig.upsert({
    where: { id: "singleton" },
    update: data,
    create: { id: "singleton", ...data },
  });

  return NextResponse.json(config);
}
