import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { isValidDateStr } from "@/lib/targets";

export async function GET() {
  const sales = await prisma.sale.findMany({ orderBy: { date: "desc" } });
  return NextResponse.json(sales);
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { articleId, clientId, qty, unitPriceAr, date } = body;

  if (
    typeof articleId !== "string" ||
    typeof clientId !== "string" ||
    !Number.isInteger(qty) ||
    qty <= 0 ||
    !Number.isInteger(unitPriceAr) ||
    unitPriceAr < 0 ||
    (date !== undefined && (typeof date !== "string" || !isValidDateStr(date)))
  ) {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  const saleDate = typeof date === "string" ? date : new Date().toISOString().slice(0, 10);
  const revenueAr = qty * unitPriceAr;
  const createdBy = session.user.id as string;

  try {
    // Decrement stock in the same transaction as the sale insert (G6) -- a Sale row can
    // never exist without the corresponding stock movement having happened too.
    const sale = await prisma.$transaction(async (tx) => {
      const article = await tx.article.findUnique({ where: { id: articleId } });
      if (!article) throw new Error("article not found");
      if (article.stock < qty) throw new Error("insufficient stock");

      await tx.article.update({
        where: { id: articleId },
        data: { stock: { decrement: qty } },
      });

      return tx.sale.create({
        data: { articleId, clientId, qty, unitPriceAr, revenueAr, date: saleDate, createdBy },
      });
    });

    return NextResponse.json(sale, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "sale failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
