# P2-03b — opt-in durable PageSpeed mock history and budget

Design before code 05/11/2026. Same pattern as P2-02b (26). Existing
PagespeedService/controller, mock adapter, normalizer, regression comparison,
registry/executor and IntegrationRepository remain the boundaries. No API key,
real URL, PSI/CrUX call, scheduler or production transport in this batch.
Origin stays `https://mock.example.invalid`; only the six allowlisted target IDs
and mobile/desktop are storable. Field data stays `unavailable`/null.

## Schema (one additive TEST DB migration)

`seo_pagespeed_audit_state` — one row per (target_id, strategy): version, last
attempt, last fixed error code, lease token/expiry. `seo_pagespeed_samples` —
allowlisted numeric lab metrics only (4 scores 0–100, LCP/TBT ms, CLS), Lighthouse
version, measured/stored time; PK (target, strategy, measured_at), FK to state.
No URL, raw audit, screenshot, provider error or field columns. Both absent from
the observed schema; no generic table, no duplicate analytics module. RLS on, no
anon/authenticated table or EXECUTE grants, fixed search_path, invoker functions.
Installer refuses to run twice; pause revokes the 4 RPCs only.

## Behaviour

Default OFF `FEATURE_PAGESPEED_PERSISTENCE_ENABLED`. Off → existing RAM path and
demo unchanged. On (and existing PSI local mock policy enabled) → GET summary and
POST audits read/write the store; missing/paused/malformed store is 503, never a
silent RAM fallback. A restarted instance serves history with zero provider calls.

`begin(target,strategy)` locks the pair row. A sample stored < 24 h ago (DB clock)
→ `cached`: no lease, no budget, no history growth (existing contract). An active
lease on that pair → 409. Otherwise version+1, 60 s lease, last attempt = now,
returns the pair's latest measured time for the TS non-incremental check.
Different pairs may run on different instances; one running audit per process
remains. Lease is not renewed: executor bound is 8 s × 2 attempts + backoff.

Each actual read attempt (including the executor retry) reserves the existing
durable UTC `requests` budget for `pagespeed`, hard 100/day, before the adapter.
A budget-store outage is `STORAGE_UNAVAILABLE`: no retry, no provider call, no
circuit count (lesson from P2-02b). `record` requires the current unexpired
token/version, matching pair, valid ranges, measured time strictly newer than the
pair's latest and within [DB now − 1 day, DB now + 5 min]; inserts one sample,
keeps the newest 30 per pair (existing history bound, derived mock rows) and
clears lease/error atomically. Any failure keeps previous samples; `fail` stores
a fixed code only with the matching token/version; a stale owner cannot write.

Web schema accepts `persistence: "database"`; panel copy switches from "RAM,
clears on restart" to "test DB, survives restart". No redesign/toggle.

## Verification required

Exact SQL in PGlite with the actual TS repository/service: metadata
CHUA_CAI→PASS, restart read without provider, cache hit consumes nothing, lease
409 / expired lease / stale owner PT409, cross-pair write refused, invalid and
non-incremental samples rolled back, 30-sample trim, durable budget 100/day,
roles denied, repeat install refused, pause → 503 with rows kept. Unit + HTTP DI
(flag off/on/missing store/invalid flag), web contract, full API regression.

Not in scope: approved public URLs, API key/project quota, real field contract,
scheduler, retention beyond 30 mock samples, hosted install. P2-03 stays open.

## Acceptance — local, 05/11/2026

Implemented as designed; no scope change.

- Files: `migrations/pagespeed-durable-mock.sql` + `.pause.sql`;
  `src/analytics/pagespeed.repository.ts` (new), `mock-store.util.ts` (new,
  shared error codes/strict flag/timestamp helpers, now also used by the Search
  Console repository), `pagespeed.service.ts` (`report()`, optional store, DB
  cache/lease path), `pagespeed.controller.ts` (GET uses `report()`),
  `analytics.module.ts` (store injected only when the flag is `true`),
  `integration-database.types.ts` (4 RPC types); tests `pagespeed.store.spec.ts`,
  `pagespeed.store-http.spec.ts`, `scripts/verify-pagespeed-store.cjs`; checker
  `docs/integrations/verify-installed-pagespeed-store.sql`; web
  `lib/pagespeed.ts` schema + `PagespeedPanel.tsx` storage copy; `.env.example`.
- Exact SQL (PGlite, 58 checks PASS) with the real repository/service as
  `service_role`: metadata `CHUA_CAI`→`PASS`; first audit 1 sample/1 budget
  unit; restarted instance reads it with 0 provider calls; second audit within
  24 h (DB clock) is `cached` with no budget/row; aged sample → new sample,
  comparison `comparable`; lease on home_vi/desktop → 409 for that pair only,
  catalog_vi/mobile still recorded; expired lease → new version, stale owner
  `record`/`fail` → `PT409`; cross-pair, wrong strategy, future, too old,
  non-incremental, non-mock source, missing/string metrics → `22023`, score
  101/bad version → `23514`, no rows changed; owner whose lease expired cannot
  publish, unknown error text refused, fixed `TIMEOUT` recorded; invalid
  provider data recorded, history kept; 32 records → newest 30 kept; usage at
  100 → 429 before any provider call; anon/authenticated denied on 4 RPCs + 2
  tables; repeat install refused; pause → RPC checks `FAIL`, tables `PASS`,
  GET/POST 503, rows and usage preserved.
- Mutation checks: removing the cross-pair guard and removing the function
  `REVOKE` each made the script fail; migration restored byte-identical.
- Unit (29) + HTTP DI (4): flag parsing, restart with regressions, cross-instance
  cache, budget per attempt incl. retry, 409 before budget, durable 429, store
  outage → `STORAGE_UNAVAILABLE` with no retry/provider/circuit, invalid and
  non-incremental never stored, failed publication keeps history, missing store
  503, disabled/blocked never touch the store, parser and repository mapping.
- Full API 64 suites/924 tests PASS, `nest build` PASS, scoped ESLint PASS.
  Search Console after the shared-helper refactor: 70 Jest + 50 SQL PASS. Web
  `test:pagespeed` 11 + `test:seo` 8 PASS, `tsc` + scoped ESLint PASS. Browser
  not re-run (one conditional sentence; lab still runs RAM mode).
- Not run: hosted TEST DB install, any PSI/CrUX call, multi-process load
  (PGlite is one connection, races are sequential).

### Operator steps (TEST DB only, when wanted)

1. Foundation installed (`integration-delivery-foundation.sql`).
2. Run `apps/api/migrations/pagespeed-durable-mock.sql` once in the TEST DB SQL
   Editor, then `docs/integrations/verify-installed-pagespeed-store.sql` → six
   rows `PASS`.
3. Backend env (local/dev only): `INTEGRATIONS_ENV=mock`,
   `FEATURE_PAGESPEED_AUDIT_ENABLED=true`,
   `FEATURE_PAGESPEED_PERSISTENCE_ENABLED=true`; restart.
4. Admin dashboard → PageSpeed → run one audit; restart backend; the sample and
   history remain, panel says history is in the test DB. A repeat within 24 h
   shows the cached result and spends no budget.

Rollback: persistence flag `false` + restart (RAM again, DB rows kept). To stop
DB access: stop backend workers, then run the `.pause.sql`. Never delete rows as
rollback.

### Still open

Approved public URLs, API key/project quota, real PSI field contract,
scheduler with lease renewal, hosted install acceptance, integrated live
acceptance. P2-03 is not closed live. Next: Merchant outbound per-product fencing.
