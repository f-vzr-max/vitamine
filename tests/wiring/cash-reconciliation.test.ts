import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const TEST_USER_ID = "wiring-test-user";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(async () => ({ user: { id: TEST_USER_ID, email: "test@example.test", name: "Test User" } })),
  handlers: { GET: vi.fn(), POST: vi.fn() },
  signIn: vi.fn(),
  signOut: vi.fn(),
}));

const { prisma } = await import("@/lib/db");
const { POST: salesPost } = await import("@/app/api/sales/route");
const { GET: cashGet } = await import("@/app/api/cash-reconciliation/route");

function saleRequest(body: unknown) {
  return new NextRequest("http://localhost/api/sales", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("cash reconciliation wiring (C6)", () => {
  it("aggregates revenue by day and by Mon-Sun week", async () => {
    const article = await prisma.article.create({
      data: { name: "Cash Test Article", priceArBalle: 10000, stock: 100, createdBy: "seed" },
    });
    const client = await prisma.client.create({ data: { name: "Cash Test Client", createdBy: "seed" } });

    // Two sales same date, same Mon-Sun week (2026-09-21..2026-09-27).
    await salesPost(
      saleRequest({ articleId: article.id, clientId: client.id, qty: 5, unitPriceAr: 10000, date: "2026-09-22" })
    );
    await salesPost(
      saleRequest({ articleId: article.id, clientId: client.id, qty: 3, unitPriceAr: 20000, date: "2026-09-22" })
    );
    // Third sale, different day, same week.
    await salesPost(
      saleRequest({ articleId: article.id, clientId: client.id, qty: 2, unitPriceAr: 5000, date: "2026-09-24" })
    );

    const res = await cashGet();
    const body = await res.json();

    const day = body.byDay.find((d: { date: string }) => d.date === "2026-09-22");
    expect(day?.totalAr).toBe(110000);

    const week = body.byWeek.find((w: { weekStart: string }) => w.weekStart === "2026-09-21");
    expect(week?.totalAr).toBe(120000);
  });
});
