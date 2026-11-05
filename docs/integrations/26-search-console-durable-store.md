# P2-02b — opt-in durable Search Console mock snapshot and budget

Design before code05/11/2026. Existing SearchConsoleService/controller, mock
adapter, report math, registry/executor and IntegrationRepository remain the
boundaries. No OAuth/real query/scheduler/production transport in this batch.
Source stays mock sc-domain:mock.example.invalid; never label sample traffic as
real verified property totals. No revenue/order/user mutation.

Add one additive TEST DB migration: service-only seo_search_metrics_daily
(normalized retained rows by property/date/query/page/device/country) and
seo_search_sync_state (last attempt/success/error, published window, generation,
lease token/expiry). Both absent from observed schema. No generic config/table,
second scheduler or duplicate analytics module. RLS enabled, no anon/authenticated
read/write/EXECUTE; invoker helper paths fixed. Installer refuses conflicts,
pause revokes new RPCs only, no row deletion as rollback or remote auto-install.

DefaultOFF FEATURE_SEARCH_CONSOLE_PERSISTENCE_ENABLED. With existing GSC local
mock policy enabled and subflag true, all summaries read durable snapshot;
missing/paused/malformed store is503, never silent RAM fallback. Subflag false
keeps existing RAM behavior and demo. New service instance can read last durable
success with zero provider calls. No startup/GET sync or automatic backgroundjob.

Acquire global120s lease/generation before mock provider reads. Another instance
gets409; expired lease permits a new generation. Every actual read attempt,
including executor read retry, reserves the existing durable UTC requests budget
(hard100/day) before invoking mock adapter. In-process limits remain conservative.
Complete owns current unexpired token/generation, validates all14contiguous dates,
max200rows/date and bound metrics/dimensions, atomically replaces only fetched
mock-derived days and publishes metadata. Invalid/duplicate/partial response or
store failure preserves previous success. Fixed failure code/last attempt persisted
with matching lease; no old worker can overwrite a newer owner. No lease renewal,
live quota/cost certification, retention purge or full-property totals claim.

Pause must be run after workers are stopped; source snapshots/quotas stay intact.
Rows outside refreshed14day window retained privately; retention policy for real
search terms is a future live-data gate. Current migration accepts only synthetic
property/mock source and trusted bounded rows. It is not a live GSC archive.

Web report schema accepts persistence=database as well as process_memory, with
same mock labels/error/empty behavior. Reuse existing panel; no redesign/toggle.
Exact SQL/leases/CAS/roles/pause/idempotency/failed publication/quota +actual
service→repo→memorySQL/restart tests, HTTP DI/missing store and webcontract checks
required. Live property/OAuth/token rotation and scheduler remain separate gates.

## Acceptance — local, 05/11/2026

Implementation follows the design above without scope change.

- Files: `migrations/search-console-durable-mock.sql` + `.pause.sql`;
  `src/analytics/search-console.repository.ts` (new), `search-console.service.ts`,
  `search-console.controller.ts` (GET uses `report()`), `analytics.module.ts`
  (store injected only when the flag is `true`); tests
  `search-console.store.spec.ts`, `search-console.store-http.spec.ts`,
  `scripts/verify-search-console-store.cjs`; checker
  `docs/integrations/verify-installed-search-console-store.sql`; web
  `lib/search-console.ts` schema + `SearchConsolePanel.tsx` storage copy.
- Correction found while finishing: a durable-budget **store outage** inside the
  executor callback was being reported as provider `UNAVAILABLE`, retried and
  counted toward the circuit. It is now `STORAGE_UNAVAILABLE`, non-retryable,
  with no provider call and no circuit count (unit-tested: four outages, then a
  successful sync).
- Exact SQL (PGlite, 50 checks PASS): metadata `CHUA_CAI`→`PASS`; real
  `SearchConsoleRepository`→`IntegrationRepository`→SQL as `service_role`;
  first sync 48 rows/14 budget units; a new service instance reads the same
  snapshot with 0 provider calls; repeat sync keeps 48 rows (version 2); held
  lease → 409 before budget/provider; expired lease → new generation, stale
  owner `complete`/`fail` → `PT409`; owner whose lease expired cannot publish;
  invalid page/window/order/duplicate truncated → rollback, previous rows kept;
  unknown error code refused; invalid provider data recorded, previous success
  kept; usage 99→ one read then 429 at the hard 100/day, repeated sync makes no
  provider call; `anon`/`authenticated` denied on 4 RPCs + 2 tables; repeat
  install refused with data intact; pause → RPC checks `FAIL`, tables `PASS`,
  GET/POST 503, rows/usage preserved.
- Mutation check: removing the function `REVOKE` line made the checker fail as
  expected; migration restored byte-identical (same SHA-1).
- HTTP with real Nest DI: flag `true` + missing store → GET/POST 503 without
  private detail; installed empty store → 200 `persistence: database`, only the
  read RPC called; flag off → RAM and zero RPC; invalid flag stops startup.
- Full API 62 suites/891 tests PASS, `nest build` PASS, scoped ESLint PASS on
  batch files. Web `test:seo` 8 PASS (new: `database` accepted, live/other
  persistence claims rejected), `tsc` + scoped ESLint PASS. Browser not re-run:
  the UI change is one conditional sentence and the lab still runs RAM mode.
- Not run: hosted TEST DB install, any Google call, multi-instance load. PGlite
  is one connection, so lease races are sequential, not concurrent processes.

### Operator steps (TEST DB only, when wanted)

1. Foundation must already be installed (`integration-delivery-foundation.sql`).
2. Run `apps/api/migrations/search-console-durable-mock.sql` once in the TEST DB
   SQL Editor; then run `docs/integrations/verify-installed-search-console-store.sql`
   → all six rows `PASS`.
3. Backend env (local/dev only): `INTEGRATIONS_ENV=mock`,
   `FEATURE_SEARCH_CONSOLE_SYNC_ENABLED=true`,
   `FEATURE_SEARCH_CONSOLE_PERSISTENCE_ENABLED=true`; restart.
4. Admin dashboard → Search Console → "Đồng bộ mẫu". Restart backend; the same
   sample data and success time remain, panel says data is in the test DB.

Rollback: set the persistence flag `false` + restart (back to RAM, DB rows kept).
To stop DB access entirely: stop backend workers, then run the `.pause.sql`.
Never delete rows as rollback.

### Still open

Verified property/OAuth/token rotation, live transport, scheduler with lease
renewal, retention policy for real search terms, PageSpeed durable history,
Merchant outbound fencing, hosted install acceptance. P2-02 is not closed live.
