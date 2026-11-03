# Implementation progress — TramHuong Smart Logistics

Updated: 2026-11-01. Master Plan order: P0 → P1 → P2 → P3. **Independent implementation across Phases0–8 is delivered and fixture-tested. Live GHN staging acceptance is blocked by credentials, account access and operator setup. Production fulfillment remains hard blocked.**

## Current acceptance matrix

| Phase / priority | Implemented scope | Verification / status |
| --- | --- | --- |
| 0 / P0 | Repository/schema/auth/checkout/payment audit; actual Next16/Nest11 architecture and risk inventory | Complete repository audit; original102 tests passed. Hosted schema/account not inspected |
| 1 / P0 | Config/transport, both address schemes, measured quote/preview, expiring reference, checkout revalidation, shared Zen/Traditional panel | Implemented; provider/quote/order tests and browser fixture checks pass; live quote/preview blocked |
| 2 / P0 | Locked unique reservation, deterministic client code, uncertain recovery, eligible actions, labels, fresh shifts, preparation and batch handover | Implemented; race/state/auth tests and PostgreSQL checks pass; live staging create/label blocked |
| 3 / P1 | Authenticated durable callback inbox, state mapping, owner tracking, sanitized Realtime projection, reconnect/backend fallback, both skins | Implemented; webhook/ownership/RLS/worker/browser fixtures pass; hosted Realtime/callback delivery unverified |
| 4 / P1 | Exceptions, severity/assignment/resolution, redelivery gate, return review/inspection, delay/reconciliation alerts | Implemented; local workflow tests pass; carrier actions require staging access |
| 5 / P1 | Separate expected/adjusted/collected/reported/bank ledger, proof dedup, COD approval, late-paid alert | Implemented; replay/financial/SQL tests pass; real bank/GHN reconciliation not certified |
| 6 / P2 | Customer requests/private evidence; admin multipart ticket send/reply/refresh/internal notes and history | Implemented; auth/private evidence/workflow fixtures pass; ticket account permissions/storage setup blocked |
| 7 / P2 | Filtered stored-data metrics, province/warehouse/category allocations, opt-in margin-aware subsidy, scheduled retry/reconciliation | Implemented; empty/state-filter/promotion/jobs tests pass; real data/load acceptance pending |
| 8 / P3 | Multi-shop origin mapping, known local inventory recommendations, typed provider capabilities, future affiliate documentation | Readiness implemented/tested; GHN only. No other carrier/OTP integrations or fabricated GPS |

“Implemented” above describes source and local validation. It does **not** mean every Master Plan live acceptance criterion has passed.

## Final executed checks

- Backend: **27 suites / 246 tests pass**, including original regression suite and new order/SePay coverage. Machine report: logs/shipping-jest.json (ignored local artifact).
- Actual migration SQL in **in-memory PostgreSQL: 28 checks pass**, zero remote writes.
- API build passes; API and web TypeScript checks pass.
- Scoped ESLint passes on shipping/new frontend implementation and new order tests. Whole-repository lint/web production build are not claimed.
- Browser: **14 checks pass, zero JavaScript errors and zero chart dimension warnings**, all API calls mocked, productionWrites0. Admin pagination, old-order preparation, mobile layout, Traditional tracking/support, Zen tracking, both checkout quotes, stale-reference invalidation and overflow guard. Evidence: apps/web/.next/shipping-qa/report.json and screenshots (ignored).
- Fixture route and temporary AuthContext export were removed/restored after browser QA. Real env files stay ignored and were not overwritten.
- No remote migration, full scheduled backend restart, authenticated GHN request, bank transfer, real mail, production shipment, Git commit/push or paid API use.

## Phase reports

### Phase 0 — audit and design

Status: complete in repository scope. Examined existing order items/totals, voucher/stock writes, SePay callback, auth/RBAC, admin, both skins and divergent schema snapshots. Reused existing abstractions. Findings and original102-test baseline remain in architecture.md. No DB/source mutation during audit. External blockers: missing GHN staging setup, measured parcels/origin, hosted schema uncertainty. Next increment was foundation, not a rewrite.

### Phase 1 — foundation and checkout

Implemented: fixed-origin allowlisted client, validated config, safe envelopes/decoders, bounded timeout/read retry, no mutation retry, cache, both address schemes and eligibility. Trusted product/profile/origin quote, server price/voucher, COD-fee convergence, optional promotions, actual/customer/subsidy separation, five-minute owner/context-bound reference and fresh checkout revalidation. Simultaneous identical same-owner quote requests coalesce with a bounded in-flight map; checkout revalidation always bypasses coalescing and reads current data.

Created: src/shipping/ghn, contracts, DTOs, address/quote services/controllers/specs, repository/types/module; shared ShippingQuotePanel and availability hook. Modified: AppModule, order DTO/controller/module/service, commerce-pricing utility, ZenCheckout, TraditionalCheckout/GuestCheckoutForm/payment_select and order types; only .env.example configuration.

Database: prepared aggregate/CAS/projection/quote schema in smart-logistics.sql. No remote execution.

Tests: original foundation34 client/config then86 shipping tests; expanded quote/order tests in final246. Browser verifies both quote skins and invalidation. API/web typechecks/build pass. Fixed synchronous preview rejection inconsistency, Zen fee/tax/payment/DTO discrepancies, stale quote while phone changes and mobile overflow found by tests.

Security: browser cannot specify authoritative weights/prices; references bind owner/cart/recipient/payment/voucher; no name-to-legacy-code guess. Existing guest/showroom and disabled checkout preserved. Limits: measured service2 single parcel only; live staging fee/preview unverified. Next was P0 fulfillment.

### Phase 2 — fulfillment

Implemented: eligible order checks, order lock and atomic local reservation/expected COD, deterministic TH client code, once-only external create, ambiguous outcome review by client-code lookup, current provider state checks, field-restricted updates, admin COD/return approval, protected single/batch labels, dynamic shifts and local preparation/handover with per-order batch failures.

Created: fulfillment.service/state mapper/tests, admin operations and preparation dialog. Modified: operation allowlist/client production gate, repository SQL/RPC types and admin navigation/page.

Database: reservation/legacy snapshot/COD completion/cancellation guard in same additive migration. Tests cover duplicate/racing create, uncertain retries, current state and approval; SQL verifies locking/version/price boundaries. Initial fulfillment5 tests passed and expanded regression remains green.

Security: production mutations hard blocked in transport; no configuration bypass. Labels same shop/max100. Limits: real carrier creation/printing still blocked; pending external outcomes require reconciliation. Next P1 tracking.

### Phase 3 — callback and tracking

Implemented: portal-configured shared-header authentication, schema normalization, environment/shop dedup, durable asynchronous inbox, CAS leases/retries/dead letters, explicit status mapping, owner-only tracking, sanitized projection, both skin pages/reconnect/focus/backend fallback. Latest notifications and customer request statuses sanitized.

Created: tracking controller/service, jobs/specs, tracking pages. Database: inbox/event/notification kinds and owner projection policy/publication. Security tests reject forged/other-owner requests, malformed/duplicate/conflicting/delayed/unknown events; SQL tests owner RLS and redaction. Browser tests both skins/mobile.

No raw webhook payload, recipient or internal note is published. Limits: hosted realtime/HTTPS webhook not live tested; no courier GPS; guest detailed access was not broadened. Next P1 exceptions.

### Phase 4 — operational exceptions and returns

Implemented: durable failure/return/cancel/unknown/change alerts; overdue/missing-event checks; active staff assignment, resolution notes and audit; approved eligible redelivery/return; customer request, admin review and receiving inspection. No automatic refund/stock replenishment.

Files: operations service/controller/DTOs, tracking processor/jobs and admin tabs/detail forms. DB: exception/return/action aggregates. Tests validate approval and receive preconditions, terminal/out-of-order mapping and retry behavior. Account eligibility remains a live blocker. Next P1 COD.

### Phase 5 — COD and SePay integrity

Implemented: atomic expected/adjusted ledger, separate reported/collected/bank receipts, proof identity dedup, outstanding/difference, explicit admin approval. Late online payment raises high-severity active-COD alert without undoing money/status. Positive COD updates for paid orders are blocked in API and transaction.

Files: operations/fulfillment/tracking services, admin COD view, cod-reconciliation.md; order payment-persistence.spec.ts. Modified existing verifyPayment only after dependency audit: inspect DB errors, compare current status/payment, avoid duplicate success mail, retain SHIPPED/COMPLETED for late payment and reject terminal-state revival.

DB: complete_cod transaction and paid-COD trigger. Tests include late payment/write failure/concurrent callbacks and28 SQL checks. No bank/GHN settlement verified. Existing stock/voucher create transaction limitation remains. Next P2 support.

### Phase 6 — support and evidence

Implemented: owned request and return submission, persisted request status/history, private validated/stripped images,60-second signed URL, admin GHN multipart send/reply/refresh and local internal notes. External ticket descriptions/attempts are audited; uncertain sends are not blindly retried.

Created evidence service and private storage migration; extended operations/controllers/admin/customer UI. Tests cover cross-role access, private bucket and restrictive policy even under an older permissive storage policy; browser support submission passes. Limits: live ticket permissions/bucket not set; callback-ticket endpoint deliberately deferred pending verification; authorized explicit refresh available. No public product-image storage reused. Next P2 analytics.

### Phase 7 — analytics, promotions and jobs

Implemented: server date/state filters, pagination, explicitly requested reports from bounded durable data, no fabricated empty metrics, costs/subsidies/COD definitions, province/warehouse groups and estimated category allocations. Profit-aware added subsidy requires known cost and preserves existing threshold. Reuse Nest scheduler, bounded inbox retries/dead-letter actions and cursor-paged reconciliation; jobs default off.

Files: operations analytics/sweep, promotion policy/spec, shipping jobs/spec, LogisticsReport/admin page. Tests cover no-data null denominators, state filters, subsidy caps, unknown costs and worker recovery. All metrics formulas in cod-reconciliation.md. Limits: no shipping email/SMS channel or load certification; notifications are durable in-app records. Next P3 expansion.

### Phase 8 — origin/provider readiness

Implemented: multiple active warehouse-to-ShopId mappings; scoped client, origin quotes and known-stock eligibility/fee/ETA recommendation; normalized capability contracts and registry with explicit unsupported providers; affiliate documentation only. Files: provider-registry/contracts, scoped provider/client, recommendation/config DTOs and tests.

DB: warehouse/profile/inventory configuration aggregates; existing catalog/global stock stays authoritative. Unknown local availability produces no recommendation. No future carrier/affiliate/paid map API is called. Limits: recommendation is not a warehouse stock reservation; active account authorization per shop unverified. Next: external staging acceptance.

## Remaining prerequisites and risks

1. Operator reviews/applies smart-logistics.sql and shipping-evidence-storage.sql on isolated staging Supabase, reconciles existing schema/order integrity and confirms grants/RLS/private bucket/Realtime.
2. Configure GHN staging token/shop permissions privately, actual warehouse/package measurements and HTTPS portal header. No secrets requested in chat.
3. Certify quote/preview, both real checkout flows, staging create/recovery/labels/actions, webhook/realtime, ticket permissions and COD against actual bank proof.
4. Agree evidence/audit/financial retention and notification delivery policy. No destructive cleanup has been scheduled.
5. Existing order creation consumes vouchers and changes stock through separate calls. Shipping checks run before those writes but do not make that pre-existing flow atomic. A separately reviewed commerce transaction change remains recommended.
6. Source snapshots differ from hosted DB (including SePay transaction_code). No hosted security certification or live financial guarantee is claimed.
7. Production fulfillment requires staging signoff and explicit authorization for a separate code change; keep default flags off until setup passes.

Next recommended task: follow setup.md on a separate staging project, then execute the deployment.md acceptance sequence. Safe independent code work is complete for this delivery; live acceptance remains blocked by the prerequisites above.

## Operator connection validation

After operator restart, backend reports enabled=true / checkoutEnabled=false. The active ngrok tunnel forwards to port4000; a public status read returned200 and a deliberately unauthenticated webhook request was rejected403. These probes do not certify a valid callback. The subsequent authenticated read-only staging province API returned HTTP401/provider401, classified TOKEN_REJECTED without logging the token or upstream body. No shipment, ticket, financial posting or database write was performed by these probes. Correct the staging API credential privately and restart before further acceptance. Earlier “no authenticated request” statements in phase reports describe implementation/fixture testing before this operator setup probe.



## Operator setup package

Added copy/paste first-install SQL combining the two reviewed migrations in one transaction with explicit existing-schema/already-installed guards, read-only verify-setup.sql and Vietnamese step-by-step huong-dan-cai-dat.md. Exact combined installer passes 3 additional in-memory PostgreSQL checks (fresh install, repeat refusal, unchanged private bucket after refusal). No SQL was executed remotely and no environment value changed. Staging acceptance blockers remain unchanged.

### Token replacement retest

After operator replaced GHN_TOKEN, the running backend still returned SHIPPING_AUTH_FAILED. A separate read-only staging request using current .env returned400/shop access rejection. Verified the official GET /v2/shop/all contract and fetched one page using Token only:200, one active authorized shop, configured ShopId not in that page. Using that authorized ShopId for the province request returned200/provider200 and34 entries. Operator must correct GHN_SHOP_ID and restart the backend; .env was not changed by the agent. No full account certification, quote, shipment, mutation, DB write or raw credential/PII logging. Shop membership diagnostic is not a new production application capability.

### Backend/tunnel retest after ShopId correction

After operator corrected GHN_SHOP_ID and restarted, backend status returned200 with enabled=true / checkoutEnabled=false. Both the application province endpoint on localhost4000 and the same endpoint through the existing ngrok tunnel returned200 with34 decoded address records. This confirms the application's staging province lookup path, not quote/preview/shipment/webhook acceptance. No shipment, financial posting or database mutation was performed by these checks. Next: verified warehouse/package setup and authenticated callback validation on isolated staging.

### Portal webhook configuration follow-up

Operator supplied a screenshot of the configured Order URL. Public ngrok status still returns200 with GHN enabled and checkout disabled. An attempted empty-payload webhook validation with the configured shared secret was rejected by automatic approval before execution because it would transmit that credential through third-party ngrok infrastructure. No secret-bearing validation request was sent and no workaround attempted. Authenticated callback acceptance remains unverified; continue with portal header/save verification and measured warehouse/profile setup. No shipment or database event was created.


### Configuration validation and chart sizing fix

Operator's configuration POST400 was correctly caused by paddingCm=21 exceeding the existing API max20. The frontend previously lacked matching constraints/help and hid the server details behind the dialog. Added integer/min/max/required checks with field errors and first-invalid focus before POST; padding guidance clarifies thickness per side in centimetres. Server error arrays are preserved by the shared HTTP helper and displayed inside the still-open dialog, retaining values for retry. API limits are unchanged and measurements are never silently clamped.

Recharts3.6 defaults measured sizes to -1/-1 before first ResizeObserver notification. Existing fixed-height canvases now supply positive initial dimensions, explicit inner heights and min-width0 grid/container sizing. No package update or warning suppression.

Validation: web TypeScript and scoped ESLint pass. Browser fixture suite now passes14 scenarios, including padding21/0/1.5 rejected with no API call, valid boundaries20 and1, mocked400 details in the dialog and successful retry, plus both charts at1440px/390px with positive dimensions, no horizontal overflow and zero dimension warnings. Screenshots inspected. All browser APIs mocked; no real config/DB/carrier writes. Temporary auth/route fixture cleaned up.

### Checkout usability increment — Traditional and Zen

Replaced the confusing checkout presentation with shared branded two-step recipient/delivery-payment layouts, responsive order summaries and one primary action after totals. Guests enter details directly; saved/profile details, voucher application/restoration and existing COD/SePay routes are retained. Inline validation, first-invalid focus, empty/busy/error states and failed-order recovery are visible. Fixed Zen quantity controls to pass absolute values to CartProvider.

GHN is presented as the configured carrier with province/ward, quote charge and ETA; customers no longer choose an operational warehouse. The existing first-active-origin default remains. Pending/failed/unavailable quotes block ordering and show uncalculated shipping instead of a fabricated fee. Legacy flag-off shipping and Traditional showroom behavior remain. No backend/schema/environment changes or real carrier/order mutations were made. See docs/checkout-ux.md for scope and remaining operational limits.

Validation: web TypeScript and scoped checkout ESLint pass. The isolated browser suite now passes24 scenarios with zero JavaScript errors and zero chart dimension warnings; it adds guest validation, voucher carry-over, absolute quantity updates, payment-triggered quote invalidation, SePay payload/error retention, showroom exemption, unavailable origin blocking, legacy fallback, empty cart and Zen375px to earlier coverage. Desktop/mobile screenshots inspected. All browser APIs are mocked and temporary route/provider fixtures removed. Live staging acceptance remains separate.
