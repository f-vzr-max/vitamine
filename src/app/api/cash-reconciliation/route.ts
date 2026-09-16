import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { computeCashReconciliation } from "@/lib/metrics";

export async function GET() {
  const sales = await prisma.sale.findMany({ select: { date: true, revenueAr: true } });
  const result = computeCashReconciliation(sales);
  return NextResponse.json(result);
}
