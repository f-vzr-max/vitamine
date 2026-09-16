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
const { POST: pressLogPost } = await import("@/app/api/press-log/route");
const { POST: salesPost } = await import("@/app/api/sales/route");
const { PUT: baselinePut } = await import("@/app/api/config/baseline/route");
const { GET: dashboardGet } = await import("@/app/api/dashboard-summary/route");

function jsonRequest(url: string, method: string, body: unknown) {
  return new NextRequest(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function summaryAt(asOf?: string) {
  const url = asOf
    ? `http://localhost/api/dashboard-summary?asOf=${asOf}`
    : "http://localhost/api/dashboard-summary";
  const res = await dashboardGet(new NextRequest(url));
  return res.json();
}

describe("press/sell wiring (C4)", () => {
  it("pressedPct scales with a configurable baseline (same pressed total)", async () => {
    await baselinePut(jsonRequest("http://localhost/api/config/baseline", "PUT", { vracBaselineBales: 4000 }));
    await pressLogPost(jsonRequest("http://localhost/api/press-log", "POST", { date: "2026-09-22", qty: 1320 }));

    const summary1 = await summaryAt();
    expect(summary1.pressedPct).toBe(33);

    await baselinePut(jsonRequest("http://localhost/api/config/baseline", "PUT", { vracBaselineBales: 6000 }));
    const summary2 = await summaryAt();
    expect(summary2.pressedPct).toBe(22);
  });

  it("soldPct denominator is prePressedStockBales + sum(PressLog.qty)", async () => {
    await prisma.pressLog.deleteMany();
    await prisma.sale.deleteMany();

    await baselinePut(
      jsonRequest("http://localhost/api/config/baseline", "PUT", { prePressedStockBales: 100 })
    );

    const article = await prisma.article.create({
      data: { name: "Sold Test Article", priceArBalle: 1000, stock: 50, createdBy: "seed" },
    });
    const client = await prisma.client.create({ data: { name: "Sold Test Client", createdBy: "seed" } });

    await salesPost(
      jsonRequest("http://localhost/api/sales", "POST", {
        articleId: article.id,
        clientId: client.id,
        qty: 5,
        unitPriceAr: 1000,
      })
    );

    const summary = await summaryAt();
    expect(summary.soldPct).toBe(5);
  });

  it("daysRemaining and target percentages are driven by ?asOf=", async () => {
    const oct1 = await summaryAt("2026-10-01");
    expect(oct1.daysRemaining).toBe(80);
    expect(oct1.targetPressedPct).toBe(67);

    const nov10 = await summaryAt("2026-11-10");
    expect(nov10.targetSoldPct).toBe(58);
  });
});
