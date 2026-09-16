import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { computeDaysRemaining, computePressedPct, computeSoldPct, computeTargets } from "@/lib/metrics";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const asOf = searchParams.get("asOf") ?? new Date().toISOString().slice(0, 10);

  const [config, pressedAgg, saleAgg] = await Promise.all([
    prisma.liquidationConfig.upsert({
      where: { id: "singleton" },
      update: {},
      create: { id: "singleton" },
    }),
    prisma.pressLog.aggregate({ _sum: { qty: true } }),
    prisma.sale.aggregate({ _sum: { qty: true, revenueAr: true } }),
  ]);

  const totalPressed = pressedAgg._sum.qty ?? 0;
  const totalSold = saleAgg._sum.qty ?? 0;
  const revenueToDate = saleAgg._sum.revenueAr ?? 0;

  const pressedPct = computePressedPct(config.vracBaselineBales, totalPressed);
  const soldPct = computeSoldPct(config.prePressedStockBales, totalPressed, totalSold);
  const daysRemaining = computeDaysRemaining(asOf);
  const { targetPressedPct, targetSoldPct } = computeTargets(asOf);

  return NextResponse.json({
    asOf,
    totalPressed,
    totalSold,
    revenueToDate,
    pressedPct,
    soldPct,
    daysRemaining,
    targetPressedPct,
    targetSoldPct,
    vracBaselineBales: config.vracBaselineBales,
    prePressedStockBales: config.prePressedStockBales,
  });
}
