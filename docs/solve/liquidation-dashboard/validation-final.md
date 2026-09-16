# Final validation — liquidation-dashboard

Single max-depth pass (Fable 5.1) over the SHIPPED tree: `main` @ `49f6e9e`, 2026-09-16T17:24+03:00.
Every claim below was reproduced on this host against the existing `.next` build (same tree as
HEAD: no file under `src/`, `prisma/`, `scripts/` is newer than `.next/BUILD_ID`) and an ephemeral
`postgres:16` via `scripts/checks/_pg.sh`. The live Vercel URL was not reachable from this session
(Vercel MCP returns no team for this account, no `.vercel/` dir, no CLI) — the local `next start`
of the identical build stands in for it. Verdict is the last line.

## 1. Are the checks real? YES — reproduced by mutation

Read every `scripts/checks/*.sh` + paired `tests/wiring/*.test.ts` line by line against
`criteria.md` `pass_when`.

| row | script → test | every `pass_when` clause asserted? | failure mode if the wire breaks |
|---|---|---|---|
| C2 | `schema.sh` | 8 named tables (`grep -qw` each) AND `wc -w == 8` AND 4 audit columns via `information_schema.columns` | any missing → `exit 1`; `_prisma_migrations` excluded so the count is exact |
| C3 | `sales-wiring.sh` → `sales.test.ts` | 201, `createdBy === "wiring-test-user"` (the MOCKED session — proves the handler reads `auth()`), `revenueToDate === 50000`, client history contains the sale id, `stock === 15` | **mutation-tested**: `if (false) await tx.article.update(...)` → `AssertionError: expected 20 to be 15`, exit 1 |
| C4 | `press-wiring.sh` → `press-log.test.ts` | 33 → 22 on the same 1320 (kills "store % at insert"), `soldPct === 5` with pre-pressed 100 + pressed 0, `asOf=2026-10-01` → 80/67, `asOf=2026-11-10` → 58 | numeric `===` on JSON numbers; `Math.round` in `metrics.ts` |
| C5 | `auth-guard.sh` | unauth POST → 401 AND create-user → csrf → callback → cookie-jar POST → 200/201 | two-sided; a 401-everything server fails the positive leg (verified: login through the real flow works, session `expires` 75 d out) |
| C6 | `cash-reconciliation.sh` → `cash-reconciliation.test.ts` | `byDay[2026-09-22] === 110000` AND `byWeek[2026-09-21] === 120000` (includes the third sale) | both buckets asserted, not just day |
| C7 | `roster-rest.sh` → `roster-rest.test.ts` | A non-compliant, B compliant, `2026-09-28` uncovered | **mutation-tested**: `entry.hasRest = true` unconditionally → `expected true to be false`, exit 1 |

Plumbing: `set -euo pipefail` in every script, the script's exit IS vitest's exit; `vitest run
<missing file>` exits 1 (measured), so a renamed test file goes red, not green. No `GUARD`
early-exits, no `|| true` tails on assertions. `_pg.sh` `trap` verified — 0 `vt-*` containers
left after every run here.

One observation, not a defect: on my first probe `_pg.sh` reported "postgres did not become
ready within 30s"; a manual `docker run` of the same image was ready in 3 s and every later run
was fine. Not reproduced; the 30 s deadline is generous. If C2–C7 ever flake in the gate, that
is the place to look.

## 2. Security — live public deployment

**Proxy is compiled and active.** `.next/server/middleware-manifest.json` is empty (legacy
manifest); Next 16 registers the Node-runtime proxy in
`.next/server/functions-config-manifest.json` → `/_middleware`, `runtime: nodejs`, matcher
`/((?!api/auth|_next/static|_next/image|favicon.ico).*)`. Measured on the running build,
unauthenticated:

```
GET  /api/sales, /api/dashboard-summary, /api/clients, /api/cash-reconciliation,
     /api/team/rest-check, /api/config/baseline          -> 401 (all)
POST /api/sales · PATCH /api/articles/x · PUT /api/config/baseline -> 401
GET  /  and  /sales                                       -> 307 -> /login
GET  /login -> 200 · GET /api/auth/csrf -> 200 · GET /api/auth/session -> null [200]
```

So the matcher excludes `/api/auth/*` (login is not self-blocked) and covers every read AND
write route. The GET handlers carry no in-handler `auth()` — they depend on the proxy alone;
every POST/PATCH/PUT handler double-checks `auth()` (defense in depth on the write side only).
Acceptable; noted in §6 as a hardening option.

- No raw SQL anywhere (`$queryRaw`/`$executeRaw`/`Unsafe`: 0 hits). Prisma throughout.
- `revenueAr` is computed server-side (`qty * unitPriceAr`, `sales/route.ts:31`); the client
  never supplies it. `unitPriceAr` IS a per-sale input — that is what `criteria.md` C3 and
  req 3 specify ("unit price" is logged per sale; the UI prefills it from the catalog). Only
  authenticated users can post. Not an attacker-controlled amount in the threat model of a
  13-person credentialed tool.
- CSRF on the app's own POSTs: Auth.js session cookie is `SameSite=Lax` and bodies are JSON,
  so a cross-site form post neither carries the cookie nor parses. Fine.
- Secrets: `.secrets/` and `.env*` gitignored; `git ls-files` shows neither; `git grep` for
  connection strings finds only the ephemeral `checkpass` test container. Clean.
- `create-user.ts` is the only password path (bcrypt cost 10, upsert = reset). No password
  policy — operator-side.

## 3. The four build-log deviations

| deviation | verdict |
|---|---|
| `.env.example` not written (deny-rule) | correct call; the four var names are in the build-log. Fine. |
| `String` dates instead of `DateTime @db.Date` | sound REASON (UTC+2 host shifts DATE-typed values), but the String column is only safe if every writer enforces the format — **it does not** (§4 R1). |
| classic `prisma-client-js` generator | fine; `npm run build` = `prisma generate && next build`, importable from `@prisma/client`, verified working. |
| two unlisted files | `src/app/globals.css` and `prisma/migrations/migration_lock.toml` — both benign and required. |

## 4. Defects found — reproduced

### R1 — unvalidated `date` string bricks the cash page (REVISE)

`POST /api/sales` (`sales/route.ts:30`) and `POST /api/press-log` (`press-log/route.ts:24`) store
ANY string as `date`. Reproduced, authenticated:

```
POST /api/sales {date:""}            -> 201, row stored with date ""
GET  /api/cash-reconciliation        -> 500   (was 200 one request earlier)
server log: RangeError: Invalid time value   (metrics.ts:98 weekStartOf -> toISOString)
POST /api/press-log {date:"2026/09/21"} -> 201, stored as-is
```

One bad row and `/cash` is down for every user, permanently: `cash/page.tsx` does
`res.json()` with no status check, so the page sits on "Chargement..." forever, and there is
NO delete or edit route for `Sale` (§6) — recovery is a direct DB edit. The UI's
`<input type="date" required>` is the only guard; the API contract has none.

Same validation block, same handler: `qty: 2.5` → 201, Postgres truncates `qty` to 2 and
the stock decrement to 2, but `revenueAr` was computed as 250 BEFORE truncation — the ledger
no longer equals qty × price.

Fix (both POST handlers, ~5 lines): reject unless `/^\d{4}-\d{2}-\d{2}$/.test(date) &&
!Number.isNaN(parseDateUTC(date).getTime())`, and `Number.isInteger(qty)` (and
`Number.isInteger(unitPriceAr)`) → 400. Additionally make `weekStartOf` skip/flag an unparsable
date instead of throwing, so a legacy bad row can never 500 the read path.

### R2 — `ShiftAssignment` has no write path; req 6 is unreachable in production (REVISE)

`grep -rn shiftAssignment src prisma/seed.ts scripts` → only `team/rest-check/route.ts`
(`findMany`). No API route, no form on `/team`, not seeded. So `/team`'s two tables — "Repos
hebdomadaire" and "Couverture quotidienne" — can never populate for a real user; the page only
lets you add employee names. C7 is green because `roster-rest.test.ts` seeds the table through
Prisma directly. This is exactly the "built capability with zero production callers" case:
the read side is wired, the write side does not exist. Req 6 ("rest-day compliance") is
therefore not delivered as-is.

Fix: `POST /api/team/shifts` `{employeeId, date, half:"AM"|"PM", isRestHalfDay}` with the
same `auth()` + date validation as R1, and a minimal entry form on `/team` (employee select,
date, half, rest checkbox). Small; same shape as the other five entry forms.

## 5. Deployed-app assumptions (attack 4)

- No `localhost`, no `setInterval`/`setTimeout`, no in-memory state between requests, no
  file writes. `db.ts` caches the client on `globalThis` only outside production; in
  production one client per module instance — correct for serverless.
- `next.config.ts` `turbopack.root = import.meta.dirname` — build-time only, harmless on Vercel.
- `trustHost: true` hard-coded — fine for Vercel.
- **Migrations are NOT run by the build** (`prisma generate && next build`). The build-log's
  one `migrate deploy` targeted `127.0.0.1:5434` — a container on THIS host, unreachable from
  Vercel. Whatever `DATABASE_URL` the Vercel project carries, the operator must confirm that
  database has `20260916135456_init` applied (`npx prisma migrate deploy` with that URL) and
  the 13 accounts created (`scripts/create-user.ts` with that URL). Symptom if not: `/login`
  renders, every login fails or every page 500s. Not verifiable from this session.

## 6. `?asOf=` (attack 5)

- Auth-gated: unauthenticated `?asOf=…` → 401 (proxy). Read-only computation; no write is
  keyed on it (the `LiquidationConfig` upsert on the same GET is `update: {}`).
- Omitted → `new Date().toISOString().slice(0,10)` = today in UTC; measured
  `asOf:"2026-09-16", daysRemaining:95` — correct. Caveat: Vercel is UTC, users are UTC+3, so
  between 00:00 and 03:00 Madagascar time the dashboard shows yesterday's date and one extra
  day; the entry forms' `today()` default has the same 3-hour window. Business hours are
  07:00–18:00, so this is cosmetic.
- Garbage → 200 with `daysRemaining: null`, `targetPressedPct: 100`, and `targetSoldPct`
  MISSING from the JSON (undefined dropped). No crash, no leak. Should 400 on
  `!/^\d{4}-\d{2}-\d{2}$/` — one line, non-blocking.

## 7. Non-blocking notes (ACCEPT-compatible, listed for the operator)

1. **No edit/delete for `Sale` or `PressLog`** (no `DELETE`/`PATCH` route, no UI). A typo
   (50 instead of 5) permanently corrupts revenue, stock (decremented by 50) and the
   reconciliation; the only fix is the database. Floor-team-on-phones will hit this in week 1.
   Scope decision — not in the criteria — but worth deciding before 2026-09-21.
2. Coverage counts a `isRestHalfDay=true` row as coverage (`metrics.ts:61`), and is per day,
   not per half-day — "everyone rests Sunday AM, nobody assigned" still reads "couvert".
3. Stock oversell race: `findUnique` then `decrement` with no row lock (`sales/route.ts:38-45`).
   Two concurrent sales of the last bales both pass. Use
   `updateMany({ where:{ id, stock:{ gte: qty } }, data:{ stock:{ decrement: qty } } })` and
   check `count === 1`. Unlikely at 13 users; cheap to close.
4. Validation gaps, all authenticated-only, none crash: `PATCH /api/articles/[id]` accepts
   `stock:-5` and `priceArBalle:-1` (POST rejects negatives, PATCH does not); `PUT
   /api/config/baseline` accepts `-1` (pct guards to 0); non-JSON body → unhandled 500 instead
   of 400; Prisma's raw error text (`Invalid prisma.sale.create() invocation … Sale_clientId_fkey`)
   is returned in the 400 body and rendered on the sales page.
5. Read routes rely on the proxy alone (no in-handler `auth()` on GET). Fine while `proxy.ts`
   stays in place; a one-line `auth()` in each GET would make them self-guarding.
6. `weekOf` clamps to week 1 before 2026-09-21, so today the dashboard already shows "Cible
   33 %" for pressing. Cosmetic.
7. Login email is exact-match (no lowercasing). The input is `type="email"`, so phones do not
   autocapitalise it; create accounts in lowercase and it is a non-issue.
8. `dotenv-cli` is an unused devDependency.
9. **Build-log timestamps are estimates, not measurements.** git: `03b12c5` committed
   2026-09-16T17:10:28+03:00, `.next/BUILD_ID` written 17:07:46+03:00; the log says the commit
   was 18:45 and the clean rebuild 18:25. Everything after the first entry runs ~1 h 35 m
   ahead of reality. `run.json` still says `"stage": "scope"`. Docs only, but this repo treats
   a wrong clock as a defect.

FINAL-VALIDATION: REVISE (R1 `POST /api/sales` + `POST /api/press-log` store any string as `date` — reproduced: `date:""` → 201, then `GET /api/cash-reconciliation` → 500 `RangeError: Invalid time value` for every user with no in-app recovery; validate `YYYY-MM-DD` + `Number.isInteger(qty)` → 400 and make `weekStartOf` tolerate a bad row. R2 `ShiftAssignment` has zero production writers — no route, no form, not seeded — so `/team`'s rest-compliance and coverage tables can never populate; req 6 unreachable, C7 green only via direct Prisma seeding; add `POST /api/team/shifts` + a form on `/team`.)
