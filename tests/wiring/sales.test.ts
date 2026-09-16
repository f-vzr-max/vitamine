import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const TEST_USER_ID = "wiring-test-user";

// A8: route handlers import auth from a single mockable seam (@/lib/auth).
// Mock before importing any route module that transitively imports it.
vi.mock("@/lib/auth", () => ({
  auth: vi.fn(async () => ({ user: { id: TEST_USER_ID, email: "test@example.test", name: "Test User" } })),
  handlers: { GET: vi.fn(), POST: vi.fn() },
  signIn: vi.fn(),
  signOut: vi.fn(),
}));

const { prisma } = await import("@/lib/db");
const { POST: salesPost } = await import("@/app/api/sales/route");
const { GET: dashboardGet } = await import("@/app/api/dashboard-summary/route");
const { GET: clientGet } = await import("@/app/api/clients/[id]/route");
const { GET: articlesGet } = await import("@/app/api/articles/route");

describe("sales wiring (C3)", () => {
  it("POST /api/sales wires revenue, createdBy, client history, and stock decrement", async () => {
    const article = await prisma.article.create({
      data: { name: "Test Article", priceArBalle: 10000, stock: 20, createdBy: "seed" },
    });
    const client = await prisma.client.create({
      data: { name: "Test Client", createdBy: "seed" },
    });

    const request = new NextRequest("http://localhost/api/sales", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ articleId: article.id, clientId: client.id, qty: 5, unitPriceAr: 10000 }),
    });

    const postRes = await salesPost(request);
    expect(postRes.status).toBe(201);
    const sale = await postRes.json();
    expect(sale.createdBy).toBe(TEST_USER_ID);

    const summaryRes = await dashboardGet(new NextRequest("http://localhost/api/dashboard-summary"));
    const summary = await summaryRes.json();
    expect(summary.revenueToDate).toBe(50000);

    const clientRes = await clientGet(new Request(`http://localhost/api/clients/${client.id}`), {
      params: Promise.resolve({ id: client.id }),
    });
    const clientDetail = await clientRes.json();
    expect(clientDetail.sales.some((s: { id: string }) => s.id === sale.id)).toBe(true);

    const articlesRes = await articlesGet();
    const articles = await articlesRes.json();
    const updated = articles.find((a: { id: string }) => a.id === article.id);
    expect(updated.stock).toBe(15);
  });
});
