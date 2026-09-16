import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const body = await request.json();
  const data: { priceArBalle?: number; stock?: number; name?: string } = {};
  if (typeof body.priceArBalle === "number") data.priceArBalle = body.priceArBalle;
  if (typeof body.stock === "number") data.stock = body.stock;
  if (typeof body.name === "string" && body.name.trim()) data.name = body.name;

  try {
    const article = await prisma.article.update({ where: { id }, data });
    return NextResponse.json(article);
  } catch {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
}
