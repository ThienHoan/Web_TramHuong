# P2-03a — PageSpeed mock diagnostics

Design written2026-11-04 before implementation. Scope: one diagnostics feature in existing AnalyticsModule/admin dashboard; no new module, table, migration or live transport. Phase0 schema and source searches show no performance audit equivalent. Existing flags/executor/AuthGuard/RolesGuard and Button/Table/Select/admin styling reused.

## Provider/access design

References checked04/11: [PSI request](https://developers.google.com/speed/docs/insights/v5/reference/pagespeedapi/runpagespeed), [guide](https://developers.google.com/speed/docs/insights/v5/get-started), [lab versus field](https://developers.google.com/speed/docs/insights/v5/about), [Lighthouse numeric audit contract](https://github.com/GoogleChrome/lighthouse/blob/main/types/lhr/audit-result.d.ts). GET runPagespeed takes url/strategy and repeated category values. We explicitly model mobile/desktop and performance/accessibility/best-practices/seo. API key/project quota and actual authorized public origin unconfirmed; no universal quota inferred, billing or keyless production call. Guide warns CrUX field data may disappear from PSI. No separate CrUX API (fixed11providers).

- Default FEATURE_PAGESPEED_AUDIT_ENABLED=false, global kill switch wins; only registry mock and NODE_ENV development/test executes. Every mode has schedulerEnabled=false. No job on GET, pageview, polling or cron.
- Fixed synthetic HTTPS origin `https://mock.example.invalid`, six target IDs: VI/EN home, product listing, representative fixture PDP. These paths match route structure; the product slug is synthetic and live URL approval is still pending. No submitted URL/query/hash/headers/cookies/token. Cart is a session drawer, checkout depends on cart/session: excluded; never measure order/success/payment/account/admin pages or authenticated content.
- GET `/admin/seo/pagespeed/summary` and POST `/admin/seo/pagespeed/audits` are ADMIN-only/no-store. POST accepts only `{source:"mock",targetId:<enum>,strategy:"mobile"|"desktop"}`. No arbitrary URL or force/cache bypass.
- One explicit audit per request. Per-target/strategy success cached24hours, at most30samples/pair in process memory (360total). Cache hits consume no provider quota or extra history. Reuse executor8secondtimeout/one readonly retry/circuit/process30attemptsminute100day, one running audit at a time. No multi-instance budget/durable persistence claim.
- Validate requested/final URL exact whitelist, strategy, timestamps, version, score0..1 and finite numeric units/ranges. Reject runtime/CAPTCHA/error documents, wrong redirects/PII/invalid metrics; retain previous successful sample and safe failure metadata. Store only allowlisted numeric fields, never raw HTML/audit details/screenshots/provider errors.
- Report Lighthouse lab LCP/CLS/TBT separately from field LCP/INP/CLS; absent metrics remain null. TBT must never be renamed INP. This mock ships no real field collector or CWV pass/fail certification; synthetic field availability must be labelled. PSI field access may change, so actual field parsing/retention remains a staging gate.
- Compare only same target/strategy/Lighthouse version within7days. Configurable application thresholds (not Google pass criteria): score drop10points, LCP increase500ms, CLS increase0.05, TBT increase200ms. Missing metrics do not become zero or produce false alerts. Warnings shown in report only; no email/external notifications. Display source/version/time/strategy/cache/freshness/history and comparisons, distinguish unavailable baseline.

Rollback: flagfalse+restart/reload hides panel and rejects new audits; remove controller/factory/panel for code rollback. RAM clears on process restart; no database cleanup. Checkout/SePay/orders/vouchers/GHN/auth/SMTP/revenue dashboard remain unchanged.

Open gates: approved public origin/representative live URLs, key/project quota and rights, actual PSI latency/payload/field staging tests, bounded live transport/timeouts, durable performance_audits history/distributed lock and quota, scheduler activation/retention. Full P2-03/Phase2 remain open. GHN already integrated; no GHN rewrite is authorized by this batch.

## Implemented field/config contract

Field.status always unavailable; fieldLCP/INP/CLS null. Embedded loadingExperience/originLoadingExperience is ignored until actual PSI field schema/units are accepted; no guessed CLS conversion or CWV pass state. Only allowlisted lab numeric metrics/4scores are stored, never raw audits/screenshots/details/provider errors.

Threshold env names: PAGESPEED_SCORE_DROP=10, PAGESPEED_LCP_INCREASE_MS=500, PAGESPEED_CLS_INCREASE=0.05, PAGESPEED_TBT_INCREASE_MS=200. Startup rejects nonfinite/nonpositive/out-of-range values with name-only errors. `.env.example` updated, real env untouched. These tolerances are application regression warnings, not Google CWV criteria. Warnings stay in report, no email delivery hook.

## Actual acceptance04/11/2026

- Backend54PageSpeed casesPASS (41service+13HTTP), full41suites/470testsPASS, `/tmp/tramhuong-pagespeed-final-tests.json`. Existing checkout/orders/SePay/voucher/auth/GHN/contact/purchase suites retained; fixtures, not hosted certification.
- Frontend10contract/fetch casesPASS; webtsc/scopedESLint and APIbuild/scopedESLintPASS. Coverage: cache/no duplicate history, strategies, missing metrics, regressions/version/stale baseline, URL/unit/time/runtime/CAPTCHA, concurrency/retry/budget, auth/banned/RBAC/strictPOST and timeout. Initial test assumptions about clock parity and an error sentinel matching the word PRIVATE in exclusion metadata were corrected.
- Browser mobilehome synthetic05/11:86points/2200msLCP/0.04CLS/160msTBT; cache stays1sample. QAadvanceDay→06/11:71/3000ms/0.12/410ms,4warnings/2history. Openhistory shows both. Desktop separate81/2000ms/0.12/320ms,1sample/no baseline. VIlongPDPselector375px no overflow; EN375report/alerts visible, documentWidth375. Default viewport restored; VI left open. Screenshot `/private/tmp/pagespeed-mock.png`.
- Shared demo contact18HTTP and purchase26HTTP checksPASS afterfixture changes (6parallel captures→1row/1quota). No SQL change, SQL suites not repeated. Webproductionbuild skipped to avoid inherited realenv/prerender requests; isolatedNext compiled VI/ENroutes. Synthetic PostgreSQL local only, no Supabase/provider/billing/DNS/realtransaction.

## Changed-file manifest (repository-relative)

- API `src/analytics/pagespeed.adapter.ts`, `.service.ts`, `.controller.ts`, service/controller`.spec.ts`; existing `analytics.module.ts` registers factory/controller, no newmodule. `.env.example`4thresholddefaults, `package.json` test:pagespeed.
- Web `src/lib/pagespeed.ts`, `src/components/admin/PagespeedPanel.tsx`, `src/app/[locale]/admin/dashboard/page.tsx`2linemount; `scripts/test-pagespeed.cjs` runs realTS/injectedfetch; package test:pagespeed. Existing Button/Table/Select/adminCSS reused, no dependency/productionCSS change.
- `apps/api/scripts/demo-contact-protection.cjs`: mockflag, real service with synthetic clock/adapter override, QA-only advanceDay route; no OSclock/productauth change. `apps/web/scripts/fixtures/analytics-lab.tsx`: panel+advanceDay control in disposableNext only. Product app has no lab route/control.
- Docs01/03/07/12/progress + p2-03a-evidence.json.

## Next checkpoint

Phase2 live gates stay open: GA4/GSC/PSI account rights/durable storage/hosted staging acceptance. NextP3-01 is read-only comparison with existing GHN implementation/plan, honoring owner instruction not to rebuild GHN; reuse and record blockers, thenP4-01 SMTP abstraction/Resendmock preservingSMTPdefault. No automatic live activation, commit or push.
