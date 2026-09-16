# Scope validation — liquidation-dashboard

Single max-depth pass (Fable 5.1) over `criteria.md` + `filemap.md` against
`docs/reference/plan-vidage-depot.html`, the gate engine (`gate.ps1`), and this host.
Findings appended in the order found. Verdict is the last line.

## 0. Ground truth measured on this host (2026-09-16, UTC+3)

- `gate.ps1 -Checkpoint screen` over the run dir: `RUN C1..C7`, exit 0, no `GUARD`/`VACUOUS`.
  Trivially green: every cell is `bash scripts/checks/<x>.sh` and none of those scripts exist
  yet. The screen reads cell syntax only; it says nothing about the scripts.
- Engine facts (`gate.ps1:286-289`): rows run **serially**, `-WorkingDirectory` =
  `projects/vitamine` (3 levels above `docs/solve/<slug>`), **hard cap `WaitForExit(120000)`
  per row, a timeout is recorded as FAIL and is indistinguishable from one**. `criteria.md` is
  write-once after freeze, so a row that cannot finish in 120s is red forever.
- Deny list (`gate.ps1:26-29`) scans the CELL only. `curl http` inside `auth-guard.sh` is
  invisible to it. Acceptable only because the target is `127.0.0.1`; the scripts must never
  reach an external host.
- Docker 29.5.3, user in `docker` group. `postgres:16` image cached (`fe03a7605299`);
  **`postgres:16-alpine` is NOT cached** — first run of every PG-backed row pulls from Docker
  Hub. Measured `docker run -d -p 127.0.0.1::5432 postgres:16` → `pg_isready` in **3.1s**,
  random host port assigned (`32768`).
- No host Postgres server binaries (`/usr/lib/postgresql/*/bin/initdb` absent) — Docker is the
  only ephemeral-DB path; `psql` 16.15 client present.
- Node 22.17.0, npm 10.9.2, 12 cores, 47 GB RAM, npm cache 1.6 GB (warm). Ports 3000 and
  5432 free right now.
- npm dist-tags today: `next@latest` = **16.3.5**; `next-auth@latest` = **4.24.15**,
  `next-auth@beta` = **5.0.0-beta.32** (v5 is still beta); `prisma@latest` =
  **8.0.0-rc.15** but `@prisma/client@latest` = **7.10.0** (skew: a bare
  `npm i prisma @prisma/client` installs a CLI one major ahead of the client);
  `vitest@latest` = 5.0.1.
- Calendar (verified with `date`): 2026-09-21 is a **Monday**, so the plan's weeks are
  Mon–Sun. 2026-10-01 → 80 days to 2026-12-20; 2026-10-11 (P1 end) → 70; 2026-11-10 → 40;
  2026-09-21 → 90.

## 1. "Ship means wired" — one row per requirement

| req | rows that claim it | what is actually proven | verdict |
|---|---|---|---|
| 1 shared PG · credential auth · created_by/ts on each record | C2, C3, C5 | C2: audit cols on `Sale` ONLY. C3: `createdBy` matches a **mocked** session (see §5 A8) — never exercises Credentials `authorize()` → bcrypt → JWT → cookie → middleware. C5: proves the door is locked, never that the key opens it. | **PARTIAL — no row proves a real login works.** A server whose middleware returns 401 unconditionally passes all 7 rows. No file creates the 13 accounts (§5 A1). |
| 2 article/price catalog, editable | C2 (table exists) | `/api/articles` GET/POST and `/api/articles/[id]` PATCH are never called by any row. | **NONE.** |
| 3 daily ops log (pressed; sold w/ client, article, qty, price, revenue) | C3, C4 | POST `/api/sales`, POST `/api/press-log` — real callers. But C3 posts only `qty` + `unitPriceAr`; `Sale.articleId` / `Sale.clientId` are never asserted (C2 checks `createdBy`/`createdAt` only). A `Sale` with no article and no client FK passes. | PARTIAL |
| 4 client directory + order/sales history | C3 says "req 3,4,7" | C3 never touches a client. `/api/clients` and `/api/clients/[id]` are uncalled. | **NONE — the "req 4" tag on C3 is false as written.** |
| 5 cash reconciliation by day AND week | C6 | by-day total only. Week bucket unasserted. | PARTIAL |
| 6 roster + rest-day rule "without dropping daily 7h–18h coverage" | C7 | per-employee rest presence only. Coverage half of the rule (plan `#equipe` "sans réduire la couverture horaire quotidienne") is not computed anywhere. | PARTIAL |
| 7 home dashboard: pressed vs P1 targets, sold vs P2 targets, days remaining, revenue-to-date | C3 (`revenueToDate`), C4 (`pressedPct`) | `soldPct`, `daysRemaining`, and the target % for the current week are unasserted. Worse: `soldPct` has **no defined denominator** — see §3 G1. | **PARTIAL, and one number is undefinable as specified.** |
| 8 `next build` | C1 | yes — but see §4 for the 120s cap. | see §4 |
| 9 no `gh` | — | trivially true. | OK |

## 2. Pass-condition arithmetic

All four numeric examples are correct and well chosen:

- C3: 5 × 10 000 = **50 000** ✓
- C4: 1320 / 4000 = 0.33 → **33** ✓ ; 1320 / 6000 = 0.22 → **22** ✓ — both exact, so
  floor/round/toFixed all agree and the row cannot flip on a rounding choice. The second
  assertion (same pressed total, new baseline) also kills the "store % at insert time"
  shortcut — good.
- C6: 5 × 10 000 + 3 × 20 000 = **110 000** ✓
- C7: boolean, no arithmetic.

Notes, non-blocking:
- `===33` needs a JS `number`; a Prisma `Decimal`, a `"33"` string, or `33.0` from
  `toFixed(1)` all fail `===`. The plan should pin "integer percent, `Math.round`, JSON number".
- Ariary amounts are integers, but Prisma `Int` is Postgres `integer` (max 2 147 483 647 Ar).
  4200 pressed + an unquantified pre-pressed stock at plausible per-bale prices puts a
  **season total** near or over that ceiling. Per-row `revenueAr Int` is safe; any
  materialised total column must be `BigInt`, and aggregates should be `SUM()` in Postgres
  (bigint) serialised as a JSON number (< 2^53, fine).

## 3. Gaps against the business plan

- **G1 — pre-pressed stock is not modelled, so phase-2 % is undefinable.** The plan lists it
  as its own unknown (`#objectif` callout: "Volume du stock déjà pressé : non quantifié à ce
  jour — à confirmer en semaine 1") and phase-2 targets are "% du **stock total**" = already
  pressed + newly pressed. `LiquidationConfig` carries only `vracBaselineBales` (C4). Nothing
  says whether the sold denominator is `prePressedStockBales + Σ PressLog.qty`, or
  `Σ Article.stock`, or the vrac baseline. A diligent coder must guess; a guess is unverifiable.
  Fix: add `LiquidationConfig.prePressedStockBales` (enterable, like the vrac baseline) and
  pin `soldPct = round(100 × Σ Sale.qty / (prePressedStockBales + Σ PressLog.qty))`.
- **G2 — the weekly target tables are never checked.** `src/lib/targets.ts` exists in the
  filemap; no row reads it. A typo in `PHASE2_TARGETS` (10/22/35/46/58/69/80/88/95/100) ships
  green. Cheap fix inside C4: `GET /api/dashboard-summary?asOf=2026-10-01` →
  `targetPressedPct===67` (day 10 → week 2); `?asOf=2026-11-10` → `targetSoldPct===58`
  (day 50 → week 8).
- **G3 — `daysRemaining` untestable without an injectable clock.** Add `?asOf=YYYY-MM-DD`
  (default today) to `/api/dashboard-summary`; assert `asOf=2026-10-01` → `daysRemaining===80`
  (measured above). Same `asOf` feeds G2.
- **G4 — coverage half of the rest rule dropped** (req 6, plan `#equipe`). `rest-check` should
  also report, per day, whether both half-days (AM 7h–12h30, PM 12h30–18h, or whatever split
  the plan stage fixes) have at least one assigned employee, and C7 should assert one
  uncovered day is flagged. Otherwise "give everyone Sunday off" is compliant.
- **G5 — C6 asserts day only; req 5 says day AND week.** Add two sales on different days of
  the same Mon–Sun week and assert the week bucket.
- **G6 — `Article.stock` semantics undefined.** The plan's grid has a Stock column per
  article; req 2 says "editable". Is it a live counter decremented by each `Sale`, or a
  week-1 snapshot? If sales never decrement it, the catalog is stale after day 1. Recommend:
  decrement inside the `POST /api/sales` transaction, and assert in C3 (seed stock=20, sell 5,
  `GET /api/articles` → 15). That single assertion also wires req 2 (see §1).
- **G7 — UI language + phone layout.** The plan is French, the team is in Madagascar, users log
  in "from personal phones". Neither language nor responsive layout is stated anywhere. Both
  are MANUAL, but the plan must pin "UI copy in French, mobile-first" or the coder ships an
  English desktop table.
- **G8 — "reconciliation" has one source.** `revenueAr` is computed server-side from
  qty × price (C3), so "revenue totals vs logged sales" compares a sum with itself. Real
  reconciliation needs a second independent input (a counted-cash entry per day:
  `CashCount{date, amountAr, createdBy}`) and a variance column. Operator decision — if the
  intent really is "just totals by day/week", say so in the plan and rename the page.
- **G9 — roles.** Plan step 4 splits the team into pressage / vente-logistique. Optional
  `Employee.role` enum; not required by the task.
- **G10 — `package-lock.json` missing from the filemap.** `npm ci` (C1) refuses to run without
  it. Must be committed; `.gitignore` must not exclude it.
- **G11 — C2 says "all 7 tables"; the assumptions list 8 models** (`User, Article, PressLog,
  Sale, Client, Employee, ShiftAssignment, LiquidationConfig`). The script author will drop one
  to make the count fit. Rewrite to "all 8".
- **G12 — audit columns on every record (req 1), C2 checks `Sale` only.** Add at least
  `PressLog.createdBy/createdAt` to the same script; C4 could assert `createdBy` too.
- **G13 — no account-creation path.** See §5 A1.
- **G14 — Prisma 7/8 file shape.** With `@prisma/client` 7.10.0 the CLI wants
  `prisma.config.ts` (datasource URL lives there, not in `schema.prisma`), a driver adapter
  (`@prisma/adapter-pg` + `pg`) at runtime, and an explicit generator `output`. None of the
  three is in the filemap (`package.json` deps line lists `@prisma/client`, `prisma` only).
  Pin both packages to the SAME version (7.10.0 — not `latest`, which is the 8-rc CLI) and add
  the three items. Confidence: high on the version skew (measured), medium-high on the
  7.x config shape — the plan stage should confirm against the installed package's README
  before writing `schema.prisma`.

## 5. Auth model (Auth.js v5 Credentials + JWT, 13 people on phones)

- **A1 — nobody can create the first account.** No `/api/users`, no admin page, no CLI.
  `prisma/seed.ts` is "fixtures for dev + wiring checks" — if it is also how the 13 real
  accounts get made, real passwords land in the repo. Add `scripts/create-user.ts`
  (`npx tsx scripts/create-user.ts --email … --name … --password-env PW`), and use that same
  script in C5's positive path so account creation is itself wired (see §4/R4).
- **A2 — password reset.** No mail infra. For 13 users the same CLI with `--reset` is enough;
  an admin-only `PATCH /api/users/[id]/password` is the nicer option and needs a
  `User.role ADMIN|STAFF`. Decide in plan; non-blocking.
- **A3 — session length.** Auth.js JWT default `maxAge` is 30 days. The window is 13 weeks and
  the devices are personal phones: set `session.maxAge` explicitly (60–90 days) with
  `updateAge` sliding, so nobody re-types a password mid-campaign.
- **A4 — v5 is still beta (5.0.0-beta.32).** Pin the exact version. The checks are
  library-agnostic (C5 = HTTP status; C3 mocks `@/lib/auth`), so if the beta misbehaves with
  Next 16 a hand-rolled `jose` HS256 cookie session is a criteria-neutral swap.
- **A5 — Next 16: `middleware.ts` is deprecated in favour of `src/proxy.ts` (Node runtime).**
  Filemap names `src/middleware.ts`. On Node runtime the Prisma/bcrypt imports in `auth.ts`
  are fine and no edge-safe split config is needed; on an edge middleware they are a build
  break. Pin `next` to an exact 16.x and name the file `proxy.ts`.
- **A6 — env names.** v5 reads `AUTH_SECRET` / `AUTH_URL`; `.env.example` documents
  `NEXTAUTH_SECRET` / `NEXTAUTH_URL`. Use the v5 names. `AUTH_TRUST_HOST` is auto on Vercel.
- **A7 — matcher.** The guard must exclude `/api/auth/*` or login itself 401s. The
  negative-only C5 cannot catch a wrong matcher; the positive path in R4 does.
- **A8 — C3's `createdBy` assertion forces a mock.** In-process `auth()` calls
  `headers()`/`cookies()`, which throw outside a request scope under vitest. The route
  handlers must import `auth` from `@/lib/auth` (one mockable seam) and the test must
  `vi.mock('@/lib/auth')` BEFORE importing the route module. The plan must state this or the
  first run of C3 dies on "headers was called outside a request scope".
- **A9 — authorisation.** Every logged-in user can `PATCH` prices and stock. Probably wrong for
  a 13-person floor team; needs a decision (admin-only catalog writes?). Non-blocking.
- **A10 — brute force.** 13 users, bcrypt cost 10, Vercel edge in front: acceptable without a
  rate limiter for a 13-week internal tool.
- **A11 — pages must call the tested path.** If `src/app/page.tsx` is a server component that
  queries Prisma directly, `/api/dashboard-summary` can be green while the rendered page
  computes something else. Pages should fetch the same route (or import the same handler
  function) so the checked path is the rendered path.
- **A12 — `next start` off-Vercel needs `AUTH_TRUST_HOST=true`** (or `trustHost: true`), or
  every `/api/auth/*` call fails `UntrustedHost` and the positive path in R4 cannot log in.
  `AUTH_SECRET` must also be set in C5's script or the guard 500s instead of 401.

## 4. Feasibility — Docker-ephemeral Postgres per check, under the 120s row cap

Measured on this host (warm npm cache, minimal Next 16.3.5 scaffold in the scratchpad):

- `npm ci` **28.7s**; `next build` **16.9s** cold, 8.4s warm → C1 ≈ **46s** on a 1-page app.
  The real app (~10 pages, 12 route handlers, `prisma generate` 5–10s, more TS to check)
  should land at **60–80s** — under the cap with ~40s headroom, on THIS host, with a warm
  cache. A cold npm cache alone costs 60–120s and the row times out. So: C1 is feasible as
  written; nothing may be added to its cell, and no check script may re-run `npm ci`.
- Docker PG ready in 3.1s; `prisma migrate deploy` ~5s; one-file `vitest run` ~5–8s → each of
  C2/C3/C4/C6/C7 ≈ **15–25s**. Five rows ≈ 100s aggregate, each far under the per-row cap.
- C5 as worded ("builds+starts server") stacks a second full build (30–45s real) on top of
  server start + curl; with the R4 positive path (PG + migrate + `create-user` + login) it is
  ≈ 70–90s. Feasible, but the closest row to the cap for no reason: reuse C1's output
  (`test -f .next/BUILD_ID || npm run build` inside the script — a fallback, not a skip, and
  invisible to the screen because the cell is the script path). Use a non-default `PORT`,
  bind `HOSTNAME=127.0.0.1`, and see A12 for the two env vars the server needs.

**Per-check ephemeral is the right shape; do not share one instance across rows.** The engine
runs rows serially and re-runs each one individually at `verify` and `pr`, so every row must be
re-runnable standalone. A shared instance makes row N depend on row N−1's side effects: C3's
sale would land in C6's day total, C4's baseline in C3's summary. The price of isolation is
~3s of container start per row. Do it once, correctly, in a shared `scripts/checks/_pg.sh`
(start with `-p 127.0.0.1::5432` for a random host port + unique name `vt-$$`, poll
`docker exec … pg_isready` with a 30s deadline, `prisma migrate deploy`,
`trap 'docker rm -f …' EXIT`) so five scripts cannot drift.

Flakiness sources, each with its fix:

- `postgres:16-alpine` is not cached → first run of every PG row pulls ~100 MB from Docker
  Hub (network dependency inside a check). Use `postgres:16` (cached) and pin it.
- Fixed host ports collide the moment a verifier runs two rows by hand in parallel. Random
  port + `docker port` (measured working above).
- A failed row leaves a container behind → `trap`.
- `prisma generate` must precede vitest (postinstall, or the `_pg.sh` lib); Prisma engines
  download during `npm ci` postinstall (network, one-time).
- **`vitest@5` fails `ERESOLVE` against `create-next-app`'s `@types/node@^20`** (measured:
  vitest 5.0.1 peer-wants `@types/node ^22.0.0 || >=24.0.0`; `tsx` failed as collateral in the
  same command). Bump `@types/node` to `^22` (host is Node 22) before adding vitest/tsx.
- **`prisma` / `@prisma/client` version skew.** `prisma@latest` is 8.0.0-rc.15; a bare
  `npm i --save-dev prisma` happened to resolve 7.10.0 here (matching the client), and
  `@prisma/client` only peer-requires `prisma: "*"` — nothing enforces the match. Pin both to
  `7.10.0` explicitly. `node_modules/prisma/config.{js,d.ts}` confirms the 7.x
  `prisma.config.ts` shape assumed in G14.
- Pin `next` `16.3.5`, `next-auth` `5.0.0-beta.32` (exact, it is a beta), `vitest` `5.0.1`.

## Verdict

**MUST change** — each item either lets the build miss a stated requirement or makes a check
wrong or impossible as written:

- **R1** — C2 `pass_when` says "all 7 tables"; the assumptions list 8 models. Rewrite to
  "all 8", and extend the same script to `PressLog.createdBy` + `createdAt` (req 1 says every
  record; G11, G12).
- **R2** — req 2 and req 4 have no wiring row, and C3's "req 4" tag is false. Extend C3: seed
  one `Article` (stock 20) and one `Client`; POST the sale with `articleId` + `clientId`; then
  assert `GET /api/clients/<id>` history contains that sale AND `GET /api/articles` shows
  stock 15 (decrement in the sale transaction, G6 — or if the operator wants a static stock
  column, assert the article row instead, but decide).
- **R3** — req 7 is half-specified: add `LiquidationConfig.prePressedStockBales` and pin
  `soldPct = round(100 × Σ Sale.qty / (prePressedStockBales + Σ PressLog.qty))` (G1); add
  `?asOf=YYYY-MM-DD` to `/api/dashboard-summary` and assert in C4: `asOf=2026-10-01` →
  `daysRemaining===80` and `targetPressedPct===67`; `prePressedStockBales=100`, pressed 0,
  sold 5 → `soldPct===5`; `asOf=2026-11-10` → `targetSoldPct===58` (G2, G3).
- **R4** — C5 is one-sided: a server that 401s everything passes. Add the positive control in
  the same script: create the test user through `scripts/create-user.ts` (A1 — the same tool
  that will create the 13 real accounts), log in through the real Credentials flow
  (`GET /api/auth/csrf` → `POST /api/auth/callback/credentials` with a cookie jar), then
  `POST /api/press-log` with the cookie → 200/201, while the unauthenticated POST still →
  401. Reword "builds+starts server" to "starts the server on the existing build" (§4) and
  set `AUTH_SECRET` + `AUTH_TRUST_HOST=true` (A12).
- **R5** — filemap additions/renames the checks depend on: `package-lock.json` (G10),
  `scripts/create-user.ts` (A1), `prisma.config.ts` + `@prisma/adapter-pg` + `pg` (G14),
  `src/middleware.ts` → `src/proxy.ts` (A5), `.env.example` documents `AUTH_SECRET` /
  `AUTH_URL` / `AUTH_TRUST_HOST` (A6, A12), `scripts/checks/_pg.sh` (§4).

**SHOULD** (non-blocking; carry into the plan): C6 week bucket (G5); C7 coverage assertion
(G4); "integer percent, `Math.round`, JSON number" pin (§2); `BigInt`/`SUM()` for totals (§2);
`vi.mock('@/lib/auth')` seam and import order (A8); matcher excludes `/api/auth/*` (A7);
`session.maxAge` 60–90d (A3); French copy, mobile-first (G7); decide whether reconciliation gets
a counted-cash leg (G8); admin-only catalog writes (A9); pages fetch the tested route (A11);
`postgres:16` + random port + `trap` (§4); `@types/node ^22` before vitest (§4); exact version
pins (§4).

SCOPE-VALIDATION: REVISE (R1 C2 "all 7 tables"→"all 8" + PressLog.createdBy/createdAt; R2 C3 posts the sale with articleId+clientId and asserts GET /api/clients/<id> history + GET /api/articles stock — req 2 and req 4 currently have no wiring row and C3's "req 4" tag is false; R3 add LiquidationConfig.prePressedStockBales, pin the soldPct denominator, add ?asOf= to /api/dashboard-summary and assert daysRemaining===80 / targetPressedPct===67 at 2026-10-01, soldPct===5, targetSoldPct===58 at 2026-11-10; R4 C5 adds the positive login path via scripts/create-user.ts + real Credentials flow → 200 on POST /api/press-log, stops rebuilding, sets AUTH_SECRET + AUTH_TRUST_HOST; R5 filemap adds package-lock.json, scripts/create-user.ts, prisma.config.ts, @prisma/adapter-pg + pg, scripts/checks/_pg.sh, renames src/middleware.ts→src/proxy.ts, .env.example uses AUTH_SECRET/AUTH_URL/AUTH_TRUST_HOST)
