import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;

  const client = await prisma.client.findUnique({
    where: { id },
    include: { sales: { include: { article: true }, orderBy: { date: "desc" } } },
  });

  if (!client) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  return NextResponse.json(client);
}
