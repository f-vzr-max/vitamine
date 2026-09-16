# Criteria — liquidation-dashboard

source_task: Build a multi-user company management dashboard for Gestion Frippes' end-of-year depot liquidation. Next.js on Vercel, shared Postgres DB. Repo is `projects/vitamine` (currently empty except `docs/reference/plan-vidage-depot.html`) — GREENFIELD build, no existing app code.

Business context: Liquidation window 2026-09-21 to 2026-12-20 (13 weeks), two phases.
- Phase 1 (weeks 1-3, ends 2026-10-11): press all remaining loose stock ('vrac') into bales. Capacity 200 bales/day, team of 13, 7 days/week 7h-18h. Weekly cumulative press targets: wk1 33%, wk2 67%, wk3 100% of vrac (baseline ~4200 bales, must be a configurable/enterable baseline, not hardcoded).
- Phase 2 (weeks 4-13, ends 2026-12-20): sell all bales to clients. Weekly cumulative sell targets: wk4 10%, wk5 22%, wk6 35%, wk7 46%, wk8 58%, wk9 69%, wk10 80%, wk11 88%, wk12 95%, wk13 100%.
- 20-30 distinct articles, price per bale in Ariary (Ar), not yet fixed — editable article/price catalog.

Requirements:
1. Shared Postgres data, multi-user credential auth, track who entered each record (created_by/timestamp).
2. Article/price catalog: name, price/balle (Ar), stock — editable, ~25 rows.
3. Daily ops log: bales pressed (date, qty); bales sold (date, client, article, qty, unit price, revenue).
4. Client directory: name, contact, order/sales history.
5. Cash reconciliation: revenue totals vs logged sales, by day and week.
6. Team roster: 13 employees, rest-day compliance (>=1 half-day rest/week without dropping daily 7h-18h coverage).
7. Home dashboard: actual pressed vs phase-1 targets, actual sold vs phase-2 targets, days remaining to 2026-12-20, revenue-to-date — computed live from log entries.
8. `next build` succeeds (Vercel deployability signal); actual Vercel deploy is a later step, not a criteria row.
9. No `gh`-dependent criteria (not installed on this host).

**Assumptions pinning this contract** (repo empty — these are the skeleton names the coder must match):
- Repo root for every check below = `projects/vitamine`.
- Stack: Next.js (App Router, TypeScript) · Prisma + Postgres · Auth.js (NextAuth v5) Credentials provider, JWT session · Vitest for wiring tests.
- Docker (`postgres:16-alpine`) spins an ephemeral DB per check — no dependency on a pre-existing DB. `psql` confirmed present.
- Prisma models: `User`, `Article`, `PressLog`, `Sale`, `Client`, `Employee`, `ShiftAssignment`, `LiquidationConfig`.
- Multi-line check logic lives in `scripts/checks/*.sh`; `criteria.md`'s `check` column stays one re-runnable command per row.

**Validated once (Fable 5.1/max, single pass, see `validation-scope.md`) — fixes folded in below, not re-validated:**
- Decided (non-blocking items from validation): cash reconciliation stays single-source (totals by day/week from logged sales, no separate counted-cash entity — matches req 5 as originally asked, not expanded). Catalog writes: any authenticated user may edit (no admin/staff role split — not asked for). UI copy: French, mobile-first (real users are the team, on personal phones). Exact pins: `next` 16.3.5, `next-auth` 5.0.0-beta.32, `prisma`+`@prisma/client` 7.10.0 (both — `prisma@latest` is an 8.0.0-rc CLI, skewed from the client), `vitest` 5.0.1, `@types/node` ^22 (host is Node 22; vitest 5 peer-requires it). `postgres:16` (cached on host) not `-alpine`, random host port + `trap` cleanup in a shared `scripts/checks/_pg.sh`. Session `maxAge` 60-90d (13-week campaign, personal phones). Auth.js v5 env names: `AUTH_SECRET`/`AUTH_URL`/`AUTH_TRUST_HOST` (not the v4 `NEXTAUTH_*` names). Next 16: route guard file is `src/proxy.ts`, not `middleware.ts`. Pages must fetch/import the same handler the checks exercise (no separate DB read path in the rendered page).

| id | description | check_kind | check | pass_when |
|----|-------------|------------|-------|-----------|
| C1 | App builds and typechecks (req 8) | command | `npm ci && npm run build && test -f .next/BUILD_ID` | exit 0 AND `.next/BUILD_ID` exists. Nothing added to this cell — measured ~60-80s on this host, under the engine's 120s cap with limited headroom; no check script may re-run `npm ci`/`npm run build` from scratch. |
| C2 | Schema covers every core entity + audit columns (req 1-6) | command | `bash scripts/checks/schema.sh` | ephemeral Postgres + `prisma migrate deploy` exits 0 iff all **8** tables exist (`User, Article, PressLog, Sale, Client, Employee, ShiftAssignment, LiquidationConfig`) AND `Sale` has `createdBy`+`createdAt` AND `PressLog` has `createdBy`+`createdAt` |
| C3 | Sales wiring: `POST /api/sales` write, dashboard revenue read, client history, and article stock decrement all hit the SAME tables (req 3,4,7 — "ship means wired") | command | `bash scripts/checks/sales-wiring.sh` | seeds one `Article` (stock=20) and one `Client`; calls `/api/sales` POST (qty=5, unitPriceAr=10000, articleId, clientId) then `/api/dashboard-summary` GET; exit 0 iff `revenueToDate===50000` AND inserted row's `createdBy` matches the (mocked, per A8) test session user AND `GET /api/clients/<id>` history contains the sale AND `GET /api/articles` shows that article's stock===15 |
| C4 | Press/sell wiring, configurable baselines, and dashboard targets (req 3,7) | command | `bash scripts/checks/press-wiring.sh` | sets `vracBaselineBales=4000`, posts 1320 pressed, asserts `pressedPct===33`; sets `vracBaselineBales=6000` (same pressed total), asserts `pressedPct===22`; sets `prePressedStockBales=100`, pressed 0, sold 5, asserts `soldPct===5` (denominator = `prePressedStockBales + ΣPressLog.qty`); `GET /api/dashboard-summary?asOf=2026-10-01` asserts `daysRemaining===80` AND `targetPressedPct===67`; `?asOf=2026-11-10` asserts `targetSoldPct===58`; exit 0 iff all hold |
| C5 | Auth is actually wired both ways: unauthenticated writes rejected, a real login can write (req 1) | command | `bash scripts/checks/auth-guard.sh` | starts server on the **existing** build (`test -f .next/BUILD_ID \|\| npm run build`, never a fresh build — C1 already paid that cost), `AUTH_SECRET`+`AUTH_TRUST_HOST=true` set; unauthenticated `curl -X POST /api/press-log` → exit 0 only if HTTP 401 AND creating a user via `scripts/create-user.ts` + logging in through the real Credentials flow (`GET /api/auth/csrf` → `POST /api/auth/callback/credentials`, cookie jar) + `POST /api/press-log` with that cookie → HTTP 200/201 |
| C6 | Cash reconciliation totals match sum of logged sales, by day AND by week (req 5) | command | `bash scripts/checks/cash-reconciliation.sh` | posts two sales same date (5x10000Ar, 3x20000Ar) and a third sale on a different day of the same Mon-Sun week, via `/api/sales`; `GET /api/cash-reconciliation`; exit 0 iff that day's `byDay` total===110000 AND the week's `byWeek` total includes the third sale |
| C7 | Roster rest-day compliance AND daily coverage, from real shift data (req 6) | command | `bash scripts/checks/roster-rest.sh` | seeds `ShiftAssignment` fixtures — Employee A worked all 7 days no rest flag, Employee B has one `isRestHalfDay=true` row, and one calendar day has zero assigned employees; `GET /api/team/rest-check`; exit 0 iff A reports non-compliant, B compliant, AND the zero-coverage day is flagged uncovered |

C1/C2 are infra/schema proof. C3/C4/C6/C7 call real route-handler functions in-process against real ephemeral Postgres — a broken wire makes the numeric assertion false, not just absent. C5 is the one HTTP-level check, now two-sided (proves the door is locked AND that the right key opens it — a server that 401s everything no longer passes). Auth/UI look-and-feel is out of this table (MANUAL/observe), not machine-checkable.

**Wiring note (A8, A11):** route handlers must import `auth` from a single mockable seam (`@/lib/auth`); wiring tests `vi.mock('@/lib/auth')` before importing the route module. Rendered pages must fetch/import the same handler the checks exercise, not a separate direct Prisma read, or a page can silently diverge from the tested path.
