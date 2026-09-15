# Tech Debt Audit - Milton CRM

Generated: 2026-09-02
Scope: full repo (`app/`, `lib/`, `components/`, `prisma/`, `scripts/`). Generated Prisma client (`lib/generated/prisma`, ~50k LOC, gitignored) excluded.

## Executive summary

Ranked by impact:

1. **9 API route handlers do zero auth of their own** - including `POST /api/imports`, which does bulk DB writes. Auth is entirely delegated to `proxy.ts` (Next.js middleware). Middleware-only auth is fragile (cf. CVE-2025-29927) and this is personal/RGPD data.
2. **`POST /api/jotform/webhook` is not idempotent** - it calls `prisma.bien.create` unconditionally, so a webhook retry or a re-submission creates duplicate `Bien` rows. The newer pull-sync path (`lib/integrations/jotform/sync.ts`) handles this correctly; the webhook is a stale fork.
3. **Two divergent implementations of JotForm → CRM ingestion** (`app/api/jotform/webhook/route.ts` vs `lib/integrations/jotform/sync.ts`). The webhook version is buggier and probably dead since commit `25c78d8`. Consistency rot + likely dead code.
4. **`sameName()` does not strip accents** while `normalizeName()` in the same file does. Both contact dedupe resolvers use `sameName`, so "Génissel"/"Genissel" fail to match. This is the same failure class as the recorded 2026-07-24 dedup incident.
5. **`Contact.email` has no DB index** despite email-keyed dedupe lookups on every import (`loadContactIdsByEmail`, cross-source matching) and `where: { email: { not: null } }` full scans.
6. **`syncJotformEstimations` calls an external API sequentially inside a ~500-iteration loop** in one request (`maxDuration = 300`) - timeout risk once CityScan is live.
7. **Three near-identical `column-values` route implementations** (contacts / biens / mandats), each with 4–5 copy-pasted per-column distinct-query blocks. ~250 LOC that compress to ~60.
8. **Hand-written 100-line Prisma→JSON serializer** in `app/api/contacts/[id]/route.ts`, mirrored again by the `ContactDetail` type in the drawer and by `mapping.ts`. Every new `ProspectDetail` column needs 3+ coordinated edits.
9. **20 npm advisories (14 high)** via `exceljs`→`uuid` and `valibot`.
10. **`RingoverEvent` grows unbounded** - every webhook event stored forever, no retention.

Overall the codebase is young (9 commits, ~6 weeks, solo) and unusually disciplined for its age: pure logic is well factored and Vitest-covered, zero `any`, zero `console.*`, zero `TODO`, thorough French rationale comments. The debt is concentrated in (a) the HTTP/trust boundary and (b) duplication in the list/filter/detail plumbing.

## Architectural mental model

Next.js 16 App Router + React 19 Server Components, Prisma 7 on a **Supabase Postgres shared with a sibling project (`Cockpit`)** - CRM models coexist with `Fact*`/`KpiSnapshot` tables the CRM never touches. Migrations are hand-written SQL applied with `migrate deploy` (never `migrate dev`) because Supabase's `auth` schema breaks the shadow DB.

Auth: Supabase Auth via `@supabase/ssr`. `proxy.ts` (the Next 16 rename of `middleware.ts`) is the **only** gate - it authenticates (redirect to `/login` if no session) but does no authorization; there are no roles. Webhook/cron routes are bypassed in `proxy.ts` and re-check a shared secret themselves.

Data flow: three ingestion sources, all converging on a unified cross-pôle `Contact`:
- **Excel imports** (`app/api/imports` → `lib/imports/run-import*.ts`) - Apimo prospects/biens, Septéo contacts/biens/impayés/incidents/loyers. Streams NDJSON progress. Dedupe is a deliberate two-phase design: resolve entirely in memory against a pre-loaded candidate set, then batch writes (`createMany` in chunks of 200–500, bounded-concurrency updates).
- **Ringover webhook** (`app/api/ringover/webhook`) - inbound-call matching → `CallLog` + `RingoverEvent` archive.
- **JotForm** - both a webhook (`app/api/jotform/webhook`) and a nightly Vercel cron pull-sync (`app/api/jotform/sync` → `lib/integrations/jotform/sync.ts`) → `Estimation`, with CityScan report generation stubbed (`generateEstimationReport` always throws until API access lands).

UI: server-rendered list pages (`contacts`/`biens`/`mandats`) with URL-driven Excel-style column filters + sort + pagination (`lib/*/queries.ts` centralize all Prisma reads). Detail views are client-side drawers fed by `GET /api/{entity}/[id]` JSON, not routes.

This matches the README. One deviation worth flagging: the README's "Structure" section still lists `app/api/jotform/webhook` as the JotForm path without noting it's been superseded by the cron sync (see F003).

## Findings

| ID | Category | File:Line | Severity | Effort | Description | Recommendation |
|----|----------|-----------|----------|--------|-------------|----------------|
| F001 | Security | app/api/imports/route.ts:757; app/api/contacts/[id]/route.ts:13; app/api/contacts/column-values/route.ts:29; app/api/biens/column-values/route.ts:23; app/api/mandats/column-values/route.ts; app/api/biens/[id]/route.ts; app/api/mandats/[id]/route.ts; app/api/calls/active/route.ts; app/api/notifications/route.ts | High | M | None of these handlers verify a session - all trust `proxy.ts` alone. `/api/imports` performs bulk `createMany`/`update`. A middleware bypass or a matcher regression exposes reads of all personal data and destructive writes. | Add a shared `await requireUser()` helper (wrapping `createClient().auth.getUser()`) at the top of every non-webhook route. Cheap defense in depth. |
| F002 | Correctness | app/api/jotform/webhook/route.ts:961 | High | S | `submission.bienAdresse ? prisma.bien.create(...)` runs on every call - no upsert, no `resolveBien`. JotForm retries or duplicate submissions create duplicate `Bien` rows (and orphan the previous `Estimation.bienId`). | If the webhook is kept (see F003), route it through `resolveBien` / upsert on `source_sourceRef` like `sync.ts` does. |
| F003 | Consistency / dead code | app/api/jotform/webhook/route.ts:1-1002 vs lib/integrations/jotform/sync.ts | High | S | Two implementations of JotForm→Contact/Bien/Estimation ingestion that have drifted (webhook lacks cross-source bien matching, `answers`/`submittedAt` capture, and idempotent bien handling). Commit `25c78d8` added the pull-sync "en alternative au webhook". | Confirm with maintainer whether JotForm still posts to the webhook. If not, delete `app/api/jotform/webhook/` and its `proxy.ts` bypass entry. If yes, make it call `syncJotformEstimations`-shared helpers. |
| F004 | Correctness | lib/contacts/dedupe.ts:38-40 | High | S | `sameName(a,b)` = `a.trim().toLowerCase() === b.trim().toLowerCase()` - no NFD/accent stripping, unlike `normalizeName` (line 30) right above it. `resolveContactMatch` and `resolveContactByIdentity` both rely on `sameName`, so accented vs unaccented spellings of the same person don't dedupe. Same class as the 2026-07-24 incident. | Make `sameName` delegate to `normalizeName`. Add a regression test with an accented pair. Re-run the dedupe backfill. |
| F005 | Performance | prisma/schema.prisma:233-234 (Contact); lib/imports/run-import.ts:66-76 | High | S | `Contact.email` is unindexed. `loadContactIdsByEmail()` runs `findMany({ where: { email: { not: null } } })` on every contact import; cross-source email match + JotForm flows also filter on email. | Add `@@index([email])` to `Contact` (hand-written migration per README process; check `Cockpit/prisma/migrations` first). |
| F006 | Performance / resource | lib/integrations/jotform/sync.ts:1157-1242 | High | M | Per-submission loop (~500) does: `estimation.findUnique`, `contact.upsert`, `resolveBien` (1–2 queries), `estimation.upsert`, then an `await generateEstimationReport()` external call - all sequential, in one HTTP request capped at 300s. Once CityScan is live this will time out and leave a partial sync. | Split into (a) fast DB reconciliation pass, (b) a separate bounded-concurrency pass for report generation, or move report generation to its own per-estimation job. Persist progress so a re-run resumes. |
| F007 | Duplication | app/api/contacts/column-values/route.ts:60-120; app/api/biens/column-values/route.ts:44-90; app/api/mandats/column-values/route.ts | Medium | M | Three routes, each a chain of `if (column === "x")` blocks running the same `findMany({ distinct:[col], select:{col}, orderBy, take: MAX+1 })` shape with `{ ...qFilter, not: null }`. ~15 copies of one query. | Extract `distinctColumnValues(model, where, column, q)` into `lib/filters/column-values.ts`; each route becomes a column list + a `buildWhere` reference. |
| F008 | Type / contract debt | app/api/contacts/[id]/route.ts:20-140; components/entity-drawers/contact-drawer-content.tsx:38-90 | Medium | M | ~100-line manual field-by-field object literal converting Prisma → JSON (Decimal→string, Date→ISO), then a hand-kept `ContactDetail` TS type mirroring it in the drawer. Schema, serializer, and type drift independently. | Use a single serializer helper (`superjson`, or a typed `toContactDto(contact)` colocated with `getContactById`) and derive the client type from its return type. |
| F009 | Consistency | app/api/jotform/webhook/route.ts:945; app/api/jotform/sync/route.ts; lib/integrations/jotform/sync.ts:1173 | Medium | S | `prisma.contact.upsert({ where: { id: matchId ?? "__none__" } })` - the "impossible id" sentinel to force a create. Works, but it's a non-obvious idiom repeated in 3 places and bypasses Prisma's intent. | Replace with an explicit `matchId ? update(...) : create(...)` branch, or a small `upsertByOptionalId` helper. |
| F010 | Correctness (footgun) | lib/imports/run-import-biens.ts:475 | Medium | S | `function parseInt(value)` shadows the global `parseInt` for the whole module. Any later code (or a refactor) expecting the built-in gets the custom rounding wrapper silently. | Rename to `parseIntOrUndefined`. |
| F011 | Resource hygiene | prisma/schema.prisma:438-447; app/api/ringover/webhook/route.ts:863 | Medium | S | `RingoverEvent.create` on every inbound webhook event of every type, retained forever. No pruning, no TTL. Grows monotonically with call volume. | Add a retention policy (cron delete `> 90d`, or a Postgres partition) and document the intent. |
| F012 | Security | app/api/ringover/webhook/route.ts:835-838; app/api/jotform/webhook/route.ts:922 | Medium | S | Auth secret accepted from `?secret=` query string (Ringover fallback + JotForm primary). Query strings land in Vercel/CDN access logs and browser history. | Move to a header (`Authorization` / `X-Webhook-Secret`). Keep the JWT path as primary for Ringover; drop the query fallback once the real webhook key is configured. |
| F013 | Performance | app/api/ringover/webhook/route.ts:855; app/api/jotform/webhook/route.ts:934; lib/imports/run-import-biens.ts:483 | Medium | M | Every webhook loads a large slice of `Contact` into memory (`{ telephone: { not: null } }`, or all `JOTFORM` rows, or the entire table for owner matching) then linear-scans in JS. Fine at current volume, O(n) per request forever. | For webhooks, query candidates by normalized phone/email directly (needs the phone/email already normalized at write time, or a functional index). Keep the in-memory approach only for the batch imports where it's justified. |
| F014 | Dependency debt | package.json:11-16 (exceljs, transitive uuid; valibot) | Medium | M | `npm audit`: 20 advisories (6 moderate, 14 high). `exceljs` pulls a vulnerable `uuid`; `valibot`/`prisma` also flagged. `valibot` isn't a direct dep - something pulls it transitively. | `npm audit fix`; evaluate `exceljs` upgrade (breaking) or a lighter XLSX reader given only tabular parsing is used (`lib/imports/excel-parser.ts`). Run `npx depcheck` to find the `valibot` source. |
| F015 | Observability | lib/imports/run-import.ts:267, 378; run-import-biens.ts:658 | Low | S | `processed += 1` mutated from concurrent `mapWithConcurrency` callbacks. Safe in single-threaded JS but the progress bar can jump/stall non-monotonically. | Compute `processed` from a completed-count returned by the concurrency helper, or use an atomic increment closure. |
| F016 | Performance | lib/pagination.ts:11-14 | Low | S | `parsePage` accepts any positive integer; `skip: (page-1)*50` → unbounded deep OFFSET on `contact`/`bien`. | Clamp `page` to `totalPages` server-side (needs count first, already computed in `listContacts`). |
| F017 | Error handling | lib/integrations/jotform/sync.ts:1236-1240 | Low | S | Bare `catch {}` swallows every CityScan error silently for all ~500 iterations. When CityScan is live, a systemic failure (bad key, quota) is invisible. | Log the error (structured) and count failures into `JotformSyncResult`; only treat "not wired yet" as non-fatal. |
| F018 | Security / config | next.config.ts:1-7 | Low | S | Empty config - no `headers()` for CSP, HSTS, `X-Frame-Options`, `Referrer-Policy`. | Add a baseline security-headers block. |
| F019 | Repo hygiene | Devis_CRM_Milton_Immobilier-2.pdf; devis.md; scope.md; .env (on disk) | Low | S | 382 KB client sales PDF + quote/scope docs committed to repo root. `.env` (real secrets, gitignored) sits in the working tree - verify it's excluded from every deploy bundle. | Move client docs to `docs/` or out of the repo. Confirm `.env` isn't shipped (it isn't referenced by `next` build, but check the Vercel "Include files outside root" settings). |
| F020 | Feature dark | lib/integrations/cityscan/client.ts:24-30 | Low | S | `generateEstimationReport` always `throw`s. Every estimation stays `en_attente`; the whole estimation-automation feature is inert in prod and there's no signal surfaced to users/ops. | Gate behind `CITYSCAN_API_KEY` presence and surface a "CityScan non connecté" state on the estimations page rather than silent `en_attente`. |
| F021 | Consistency | lib/db/prisma.ts:11-15 | Low | S | `globalForPrisma.prisma` is only cached when `NODE_ENV !== "production"`. In prod every serverless invocation constructs a fresh `PrismaClient` + `PrismaPg` pool. The comment justifies short-lived pooled connections, but the standard pattern caches in prod too (module scope already does, effectively - but the guard makes intent ambiguous). | Cache unconditionally on `globalThis`; let the pooler handle connection limits. |

## Top 5 - if you fix nothing else

### 1. F001 - In-route auth helper
```ts
// lib/auth/require-user.ts
import { createClient } from "@/lib/supabase/server"
export async function requireUser() {
  const { data: { user } } = await (await createClient()).auth.getUser()
  if (!user) throw new Response("Non autorisé.", { status: 401 })
  return user
}
```
Call it first thing in every `app/api/**/route.ts` that isn't a webhook/cron. ~1 line per route, ~9 routes.

### 2. F003 + F002 - Kill or fix the JotForm webhook
Confirm in the JotForm dashboard whether the form still posts to `/api/jotform/webhook`. If the nightly cron pull-sync is the source of truth (it is idempotent and does cross-source matching), delete `app/api/jotform/webhook/route.ts` and remove `/api/jotform/webhook` from `NO_SESSION_PATHS` in `proxy.ts`. That erases finding F002 entirely and removes a 90-line divergent code path.

### 3. F004 - Accent-insensitive name matching
```ts
export function sameName(a: string, b: string): boolean {
  return normalizeName(a) === normalizeName(b)
}
```
Add to `lib/contacts/dedupe.test.ts`: `expect(resolveContactMatch([{...nom:"Génissel"...}], {nom:"GENISSEL"...})).toBe(id)`. Then re-run the dedupe merge script over existing data.

### 4. F007 - One `column-values` helper
```ts
// lib/filters/column-values.ts
export async function distinctColumnValues<M>(
  delegate: { findMany: Function }, where: object, column: string,
  q: string, max = 100,
) {
  const qf = q ? { contains: q, mode: "insensitive" as const } : undefined
  const rows = await delegate.findMany({
    where: { ...where, [column]: qf ? { ...qf, not: null } : { not: null } },
    distinct: [column], select: { [column]: true },
    orderBy: { [column]: "asc" }, take: max + 1,
  })
  const values = rows.map(r => r[column]).filter(Boolean)
  return { values: values.slice(0, max), hasMore: values.length > max }
}
```
Each route drops to a `COLUMNS` list, a `buildWhere` ref, and the couple of genuinely special cases (`persona` array, `source` enum, `categorie` on `Mandat`).

### 5. F005 - Index `Contact.email`
Hand-written migration (per README): `CREATE INDEX "Contact_email_idx" ON "Contact"("email");`. Check `Cockpit/prisma/migrations` first, apply with `prisma migrate deploy`, mirror the `@@index([email])` into `schema.prisma`.

## Quick wins (Low effort × Medium+ severity)

- [ ] F004 - `sameName` → `normalizeName`
- [ ] F005 - add `@@index([email])` on `Contact`
- [ ] F002/F003 - delete the JotForm webhook if unused
- [ ] F009 - replace the `"__none__"` upsert sentinel
- [ ] F010 - rename shadowed `parseInt`
- [ ] F012 - webhook secret to header, not query string
- [ ] F014 - `npm audit fix`
- [ ] F018 - baseline security headers in `next.config.ts`

## Things that look bad but are actually fine

- **Loading the entire candidate set into memory for dedupe** (`loadCandidates`, `loadOwnerCandidates`) and doing O(n·m) `Array.find` matching. For batch Excel imports this is the *right* call - the comment at `run-import.ts:29` explains it: per-row upserts are ~2 round trips × 3700 rows. In-memory resolve + batched write is correct. (The webhook case, F013, is different - that runs per request.)
- **Hand-written SQL migrations, no `prisma migrate dev`.** Forced by the shared Supabase `auth` schema breaking the shadow DB. Correctly documented in the README with the cross-repo coordination rule. Not debt.
- **`proxy.ts` instead of `middleware.ts`.** Correct for Next.js 16 (the file was renamed). Not a mistake.
- **`fillBlanks<E, I>` with the `keyof` casts** (`lib/biens/dedupe.ts:60`). The `E`/`I` split (Decimal read type vs number write type) is deliberate and the comment explains it; it only ever checks presence, never type. Leave it.
- **`Boolean(...)` wrapper around the filter chain** in `contacts/page.tsx:56` with its 4-line comment. That's a real React JSX gotcha (`{0 && ...}` renders "0"). The comment earns its place.
- **`force-dynamic` on every dashboard page.** Correct - every page is per-user authenticated data with no cache key.
- **The generated Prisma client's ~50k LOC.** Gitignored, regenerated on `prisma generate`. Ignore it (as this audit did).
- **NDJSON streaming for import progress instead of a job queue** (`app/api/imports/route.ts:29`). Explicitly matches a documented Cockpit decision ("pas de worker séparé pour le volume attendu"). Reasonable for ~3700 rows.

## Open questions for the maintainer

1. **Is `/api/jotform/webhook` still configured in JotForm**, or has the nightly cron pull-sync fully replaced it? (Determines whether F002/F003 is a fix or a delete.)
2. **`RingoverEvent` retention** - is the full event archive intentionally permanent (audit/debugging), or is a 90-day window acceptable? (F011)
3. **CityScan** - expected to go live this quarter? If so, F006 (sequential external calls in the sync loop) needs addressing before it does.
4. **`.env` on disk** - is the Vercel project configured to include files outside the app root in the build? If not, F019's `.env` concern is moot.
5. **`valibot`** appears in `npm audit` but isn't a direct dependency - do you know what pulls it? (`shadcn` CLI? a Prisma 7 peer?) Affects whether F014 is fixable without a major bump.
6. The `categorie` filter on `ContactListFilters` (`lib/contacts/queries.ts:23`) is wired into `buildContactWhere` but no UI seems to set it - intentional API surface for later, or leftover?
