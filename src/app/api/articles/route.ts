import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function GET() {
  const articles = await prisma.article.findMany({ orderBy: { name: "asc" } });
  return NextResponse.json(articles);
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { name, priceArBalle, stock } = body;
  if (typeof name !== "string" || !name.trim() || typeof priceArBalle !== "number" || priceArBalle < 0) {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  const article = await prisma.article.create({
    data: {
      name,
      priceArBalle,
      stock: typeof stock === "number" ? stock : 0,
      createdBy: session.user.id as string,
    },
  });

  return NextResponse.json(article, { status: 201 });
}
