import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function GET() {
  const clients = await prisma.client.findMany({ orderBy: { name: "asc" } });
  return NextResponse.json(clients);
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { name, contact } = body;
  if (typeof name !== "string" || !name.trim()) {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  const client = await prisma.client.create({
    data: {
      name,
      contact: typeof contact === "string" ? contact : null,
      createdBy: session.user.id as string,
    },
  });

  return NextResponse.json(client, { status: 201 });
}
