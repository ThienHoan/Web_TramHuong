# P9-02 — operational metrics on the admin health panel + integrated rollback test

Design before code 05/11/2026. Reuses the P9-01 `GET /integrations/admin/health`
(ADMIN, no-store), `IntegrationHealthService`, the dashboard
`IntegrationHealthPanel` and every durable store already built. No new table,
no provider probe, no billing source, no polling/cron.

## What "real metrics" means here

All numbers come from the TEST DB mock stores, labelled `test_db_mock`. They are
real counts of what this system did, not provider-side delivery, Google
reports or spend. The master plan requires the admin to distinguish verified,
missing and mock data, so the label is part of the contract.

| Provider | Source | lastSuccessAt | failRate (window) | quota today |
|---|---|---|---|---|
| resend | outbox `resend` | last ACCEPTED (mock) | (UNKNOWN+DEAD)/(terminal) | `emails` |
| ga4 | outbox `ga4` (purchase capture) | last ACCEPTED | same | `requests` |
| merchant | outbox `merchant` + send fence | last ACCEPTED | same (DEAD includes superseded stale generations) | `requests`, in-flight count |
| search_console | `seo_search_sync_state` | last_synced_at | null (no per-attempt history) | `requests` |
| pagespeed | `seo_pagespeed_*` | newest stored sample | null | `requests` |
| ghn, gemini, pgvector, cloudinary, google, turnstile | none durable | null | null | null |

Also per provider: backlog counts (queued/working now; accepted/unknown/dead in
window), last error code of the latest attempt (fixed codes only), quota alert
(`ok`/`warn_60`/`warn_80`/`warn_95`/`exhausted`). `estimatedMonthlySpend`
stays null: mock has no billing and no spend source exists.

## Contract

- One additive TEST DB migration `integration-ops-metrics.sql`: a single STABLE
  invoker RPC `integration_ops_metrics_mock(window_days 1..31)`, service-role
  only, aggregates only (counts, timestamps, fixed codes) — no payload, order,
  email, query or URL. Optional stores (GSC/PSI/fence) are read only if
  installed (`to_regclass`), so the RPC works with just the foundation.
  Pause revokes it.
- Default OFF `FEATURE_INTEGRATION_OPS_METRICS_ENABLED`. Off → response
  unchanged (`metricsSource: unavailable_no_runtime_probe`, metrics null). On
  and `INTEGRATIONS_ENV=mock` → reads the RPC (7-day window). Store error or
  malformed response → `metricsSource: store_unavailable`, metrics null, the
  configuration part still returned (health must stay readable; the label is
  explicit, not a silent fallback). Strict parser bounds every number.
- Web schema accepts the three sources; numbers allowed only with
  `test_db_mock`. Panel shows per-provider last success, quota today with alert,
  window failure share and backlog, plus a footer stating the data is test-DB
  mock activity, not provider metrics. Manual refresh only.

## Integrated + rollback test (master plan Phase 9 / step 4)

One PGlite DB with every mock migration (foundation, purchase, notifications,
merchant queue + fence, GSC, PSI, ops metrics). Real TS services drive: GA4
purchase capture, notification capture/drain (one accepted, one UNKNOWN),
Merchant queue/drain (accepted + UNKNOWN), GSC sync, PSI audit. The real health
service must report exactly the resulting counts/quota/failRate. Then every
pause script runs: health stays 200 with `store_unavailable`, each feature
fails closed (503) and no outbox/usage/sample/snapshot row is lost.

Not in scope: live provider metrics, GA4 Data API, staff role view, audit log
of dashboard reads, logistics/marketing pages (existing pages remain).

## Acceptance — local, 05/11/2026

Implemented as designed, with one correction found during the browser/API check:
Search Console and PageSpeed first showed `available: true` with "0 requests"
while the lab ran them from RAM (no durable store). Their numbers now count
only when that module's own persistence flag is on **and** its store is
installed; otherwise the row shows no metrics. Unit-tested both ways.

- Files: `migrations/integration-ops-metrics.sql` + `.pause.sql`; checker
  `docs/integrations/verify-installed-ops-metrics.sql`;
  `src/integrations/ops-metrics.repository.ts` (strict parser),
  `strict-flag.ts` (moved from analytics util, re-exported there),
  `integration-health.service.ts` (`report()`, `providerMetrics`),
  `integration-health.controller.ts` (uses `report()`),
  `integrations.module.ts`, `integration-database.types.ts`; tests
  `ops-metrics.spec.ts`, updated `integration-health.spec.ts`,
  `scripts/verify-ops-integration.cjs`; web `lib/integration-health.ts`,
  `components/admin/IntegrationHealthPanel.tsx`,
  `scripts/test-integration-health.cjs`; QA lab
  `scripts/demo-contact-protection.cjs` (`--ops-metrics-fixture`,
  `QA_API_PORT`/`QA_WEB_PORT`); `.env.example`; `package.json` `test:ops`.
- Integrated + rollback (one PGlite, 8 migrations, real services), 59 checks
  PASS: GA4 purchase 1 accepted; notifications 1 accepted + 1 UNKNOWN; Merchant
  1 accepted + 1 UNKNOWN through the send fence; GSC sync; PSI audit. Health
  reports `test_db_mock`, 7-day window, resend/merchant failRate 0.5, ga4 0,
  quota numbers equal to `integration_usage_daily`, GSC 14 requests, PSI 1,
  no PII/search text in the payload, spend null everywhere. anon/authenticated
  denied; checker PASS. Then all 8 pause scripts: health still 200 with
  `store_unavailable` and 11 providers; GSC/PSI GET+POST 503; Merchant queue and
  drain 503; notification capture/drain and purchase capture refused; checker
  FAIL; every table row count and outbox state breakdown identical to before.
- Mutation checks: a pause script that deletes samples, an RPC that counts
  UNKNOWN as accepted, and an RPC granted to anon were each detected (the anon
  case first only by the checker, so role checks were added to the script).
- Unit/HTTP 19 new cases (flag, mapping, alerts, RAM-mode gating,
  store_unavailable, non-mock env, parser rejections, real DI with one RPC
  call, paused RPC still 200, flag off zero RPC). Full API 66 suites/959 PASS,
  build and ESLint (src/integrations) PASS; `tsc` only the 5 pre-existing spec
  errors. Web health 9 + Google auth 19 PASS, tsc + scoped ESLint PASS.
- Browser (built-in, QA lab on 4410/4411, pane hidden so viewport emulated):
  VI 1440 and EN 375 show resend 82/100 email · ≥80%, 25%, queue counts; ga4
  and merchant rows; GSC/PSI without numbers (RAM in lab); no horizontal
  overflow (document width = viewport). `store_unavailable` footer verified by
  schema/HTTP tests, not in the browser.
- Not run: hosted install, live provider metrics, staff view/audit log.

### Operator steps (TEST DB only)

1. Foundation installed. Run `apps/api/migrations/integration-ops-metrics.sql`
   once, then `docs/integrations/verify-installed-ops-metrics.sql` → PASS.
2. Backend env (mock only): `FEATURE_INTEGRATION_OPS_METRICS_ENABLED=true`;
   restart. GSC/PSI rows show numbers only if their persistence flags are on.
3. Admin dashboard → "Kết nối dịch vụ" → Làm mới.

Rollback: flag `false` + restart (configuration-only panel), or run the
`.pause.sql` (panel shows "không đọc được số liệu", nothing else changes).

## P9-03 — real-call (live) budget on the panel — 05/11/2026

Owner asked to show Gemini's real-call budget on the dashboard. No new SQL: the
existing ops RPC stays; `OpsMetricsRepository` additionally reads today's
`integration_usage_daily` rows with `environment='staging'` for the allowlisted
live providers (`gemini`), day = the RPC's `usageDay`, ≤20 rows, strict parser
(environment/day/metric/used≤limit/no duplicates). A failure of this secondary
read sets `liveUsageSource:'unavailable'` while mock metrics stay visible.

- Health: per-provider `liveUsage {requestsUsed, requestsLimit, tokensUsed,
  tokensLimit, alert}`, top-level `liveUsageSource` (`test_db|unavailable|null`).
- Web: strict schema (live numbers only with the test-DB source, never above
  their limit); panel row "Lời gọi thật hôm nay (UTC)" + footer explaining it is
  budget reserved before each real call (can exceed actual usage). Fix found in
  the browser: a live-only provider showed "Thành công gần nhất: Chưa có" although
  a call had succeeded; "last success" now appears only for stores that track it.
- Tests: ops/health 43 (8 parser rejections, real query shape, labelled
  unavailable on error/malformed/network); web health 10 + auth 19; integrated
  ops test now installs `integration-live-usage.sql` and pauses it (9 + 9),
  65 checks incl. live usage 1/200 · 749/300000; full API 68 suites/1052 PASS.
- Browser (QA lab 4420/4421, new tab so the owner's tab was untouched): VI 1280
  and EN 375, Gemini row shows only the real-call line, no overflow.
- Hosted read-only (owner TEST DB, 2 requests, 0 writes): `test_db_mock` +
  `liveUsageSource:test_db`, Gemini 1/200 · 749/300000, Search Console 14,
  PageSpeed 1 — exactly what the admin panel will show with the flag on.
