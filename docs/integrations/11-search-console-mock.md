# P2-02a — Search Console mock, design before implementation

Date: 2026-11-04. Scope: one SEO reporting feature in existing AnalyticsModule and one panel in the existing ADMIN dashboard. No module/table duplication, hosted migration, OAuth exchange, DNS change or provider call.

## Evidence and decisions

Phase0 schema export has no GSC relation; `user_events` requires product_id and describes user behaviour, not property/day metrics (04-schema-review.md). Existing registry `search_console`, default-OFF flag, IntegrationExecutor, AuthGuard/RolesGuard and UI components are reused. This batch keeps synthetic metrics in bounded process memory; restart clears them. Durable `seo_search_metrics_daily` and encrypted OAuth/rotation remain a later separately tested migration, not an implied live sync implementation.

Official references checked 04/11/2026: [query contract](https://developers.google.com/webmaster-tools/v1/searchanalytics/query), [quotas](https://developers.google.com/webmaster-tools/limits), [OAuth](https://developers.google.com/webmaster-tools/v1/how-tos/authorizing). Scope is `webmasters.readonly`. Dates use America/Los_Angeles. Query asks for final web data with date/query/page/device/country dimensions. Top rows are incomplete even after pagination; missing dates are unknown, never filled with zero. Official rowLimit maximum is 25,000; local mock uses 100 and at most two pages/day. Search Analytics site/user 1,200 QPM, project 40,000 QPM/30M QPD plus load limits are ceilings, not our targets. No billing enabled; external calls/cost are zero in this batch.

## Contract and acceptance

- GET `/admin/seo/search-console/summary`, POST `/admin/seo/search-console/sync`, both ADMIN-only and no-store. POST accepts only `{source:"mock"}`; no arbitrary URL/property/credential input. Invalid body fails before sync.
- Flag `FEATURE_SEARCH_CONSOLE_SYNC_ENABLED=false` by default; kill switch wins. Only registry mock + NODE_ENV development/test executes. Staging/production returns blocked. Real property verification/OAuth absent is explicit; scheduler remains disabled in every mode.
- Server chooses 14 Pacific dates ending three days before today: seven current and seven preceding. This conservative lag is our policy, not a Google completeness guarantee. Explicit manual sync only; no job on page view, interval or cron. Small bounded reads reuse executor timeout, one read retry, process quota/circuit breaker; one in-flight sync per process. Mock quotas are not a distributed production budget.
- Validate adapter response dimensions/metrics/day/property and duplicate dimension keys. Stage a replacement per day, publish the entire 14-day window only after every requested page validates. This is a bounded rolling mock snapshot, not durable incremental sync. Failed reads leave previous data and last successful timestamp intact; safe failure code/time shown, no raw errors/tokens. At most28 distinct page reads per invocation (retries also count against executor attempt quotas) and200 rows/day; report local truncation separately from inherent API top-row limits.
- Summary shows source, persistence, queried window, missing dates, latest data date, last attempt/success, stale (>26h) status, per-query click change, page CTR, weighted position and product-page opportunity list. Comparisons with a missing day are marked incomplete; retained-row metrics are not property totals. Locale paths are not treated as theme identities; Zen/Traditional segmentation needs verified distinct URLs.
- New UI is a small panel using existing admin styling/Button/Table. No metrics before successful sync; mock and missing/blocked/error/loading states labelled. No effect on revenue query, cart, checkout, SePay, GHN, email or orders.

Rollback: set existing flag false and restart; POST becomes unavailable and GET hides synthetic rows. Kill switch also disables. Remove panel/service/controller for code rollback; no schema/data rollback needed.

Open gates: verified property and readonly grant, credential encryption/key rotation, durable incremental storage and cross-instance lock/quota, scheduled sync, real response staging acceptance, anonymized query/privacy retention and theme URL mapping. P2-02/Phase2 remain incomplete until those gates pass. No live transport is shipped by this batch.

## Acceptance04/11/2026

- API scoped:34testsPASS (24 service cases +10HTTP cases). Actual full backend regression39suites/416testsPASS, JSON `/tmp/tramhuong-gsc-final-tests.json`. Includes existing orders/SePay persistence, shipping, vouchers, auth, contacts and purchase policies; this is fixture coverage, not hosted financial certification.
- Frontend7schema/fetch testsPASS, tsc and scoped ESLintPASS; API build/scoped ESLintPASS. Initial sandbox blocked HTTP port binding; rerun with permitted loopback execution passed. Initial scoped lint found unused DTO, response any access and control regex; corrected before final full regression. No new dependency.
- Browser: never-synced→manual sync14days/4queries/2missingdates/1product opportunity. Repeat preserves25clicks/4,800impressions for the first query rather than adding. Forced process minute cap produces quota UI, retains last success timestamp/rows; navigation reload reads retained success and last failure. Retrying in next minute succeeds. VI/EN at375px have documentWidth375; table scrolls within panel. Default viewport814px has no page overflow. Viewport override reset, VI demo left open. Screenshot `/private/tmp/search-console-mock.png`.
- Shared demo fixture regression: contact18HTTP assertionsPASS, purchase26HTTP checksPASS (6parallel requests→1row/1quota). Only synthetic auth/DB; no provider, Supabase, real bank or OAuth. No SQL changes this batch, so SQL suites were not repeated. Web production build skipped to avoid existing env/prerender outbound; disposable Next compiled the tested routes.

## Changed-file manifest (repository-relative)

- `apps/api/src/analytics/search-console.adapter.ts`, `search-console.service.ts`, `search-console.controller.ts` and both `.spec.ts` files; `analytics.module.ts` registers factory/controller in existing module.
- `apps/web/src/lib/search-console.ts`, `src/components/admin/SearchConsolePanel.tsx`, `src/app/[locale]/admin/dashboard/page.tsx` (2line integration); existing Button/Table/admin styles reused. No style framework/global production CSS edits.
- `apps/api/package.json`, `apps/web/package.json` add test:seo scripts; `apps/web/scripts/test-search-console.cjs` runs real TS contract/fetch with injected transport, no network.
- `apps/api/scripts/demo-contact-protection.cjs` adds flag/synthetic ADMIN identity to the existing demo; `apps/web/scripts/fixtures/analytics-lab.tsx` mounts the same panel in disposable app only. Fixture token is never accepted by hosted Supabase auth; no auth override in product code.
- docs01/03/07/11/progress + `p2-02a-evidence.json`.

Impact/cost: no orders/checkout/SePay/GHN/voucher/mail/AnalyticsService edits, database writes, OAuth grant, billing, DNS, transaction or git commit/push. All historical dirty files preserved. Real API account quota/permissions have not been tested; future live use must retain explicit budget/rights gates. Next planned independent module: P2-03 PageSpeed whitelist/mock diagnostics while GSC live/durable gates remain tracked.
