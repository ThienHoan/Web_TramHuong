# TramHuong Smart Logistics — Phase 0 audit

This document preserves the **pre-change Phase0 baseline**. Current implementation and acceptance status are in [implementation-progress.md](implementation-progress.md); the baseline “missing” entries below are audit findings, not the current feature inventory.

## Implemented architecture after Phases 1–8

Existing Next.js routes call the existing Nest API/proxy. ShippingModule composes the typed GHN transport/provider, address and trusted quote services, versioned LogisticsRepository, fulfillment, tracking/inbox worker, operational workflows, private evidence and provider registry. Existing AuthGuard/RolesGuard, cache, scheduler, Supabase and commerce pricing are reused. No new queue or carrier dependency was added.

Two additive DB entities cover durable aggregates plus an owner-readable sanitized Realtime projection; see [database design](database-design.md). No remote SQL was executed. Both storefronts share an opt-in quote component; the existing order create service validates the reference before its existing voucher/stock writes. Commercial/payment/shipping states remain separate. Fulfillment is explicit admin action after eligible payment; a payment callback never creates a waybill.

Resolved baseline discrepancies: Zen now uses the same legacy 30k/300k pricing, no invented tax, strict order DTO and SePay identifier; opted-in quotes provide server totals in both skins. SePay write errors no longer acknowledge success/send success email, concurrent writes use status/payment compare-and-swap, and late payments preserve SHIPPED/COMPLETED status. A DB exception records late online payment with active COD. Existing non-atomic voucher/stock creation remains a documented commerce risk, not silently rewritten.

Security boundaries: fixed origins, production mutation hard block, backend-only aggregate data/RPCs, owner tracking, private images, admin financial approvals, durable idempotency and bounded background work. These are source/mock-tested controls, not a certification of the hosted Supabase or GHN account.

Audit date: 2026-11-01. Scope: repository and documented GHN contracts, not a live Supabase schema inspection or GHN account certification. No production data was read or changed for this audit.

## Architecture actually present

- `apps/web`: Next.js **16.1**, React 19, TypeScript, next-intl (the Master Plan's Next.js 14 description is outdated). `/[locale]/checkout` selects Traditional for Vietnamese and Zen for other locales. Shared browser requests use the existing `/api` proxy and bearer-token handling.
- `apps/api`: NestJS 11, Supabase service-role access, global DTO whitelist/validation, rate limiting, Pino logging, cache and `ScheduleModule`. Existing scheduler must be reused; do not add Redis or a second scheduler just for shipping.
- Schema references are split between `db/schema.sql`, `apps/api/supabase/schema.sql`, `apps/api/supabase/db.txt`, handwritten `database.types.ts`, and incremental migrations. These snapshots differ. A production schema reconciliation is a deployment prerequisite, not evidence that new tables already exist.

## Existing functionality and reuse

| Area | Evidence / current behavior | Shipping extension point |
| --- | --- | --- |
| Products/categories | Product/translation tables; variants in JSON, discounts, stock, images; catalog Excel import | Reuse product IDs, prices, active/stock checks. No trusted weight or package dimensions found in snapshots/types. |
| Orders | `OrdersService.create`, items and recipient snapshot in JSON; `tracking_code`; guest lookup and ownership checks; admin orders | Keep order/payment lifecycle. Shipping lifecycle must be separate. Do not add duplicate order table. |
| Pricing | API calculates prices/discounts; shipping 30,000 VND below 300,000 subtotal, otherwise zero; showroom pickup zero | Introduce verified carrier fee separately from customer shipping fee and shop subsidy. Keep existing rule until an explicit opt-in integration is tested. |
| Payment | COD, showroom mapped to COD, SePay AWAITING_PAYMENT and 15-minute deadline; authenticated webhook; cleanup every 5 minutes | Never create shipments in payment callback or tests. Preserve payment totals and states. |
| Vouchers | Server validation and usage count, existing admin configuration | Quote/preview must not consume a voucher; reuse validation. No competing promotion engine in P0. |
| Addresses | Zen and Traditional selectors use provinces.open-api.vn; saved profile contains names | These codes are NOT GHN identifiers. Keep address schemes explicit; never infer a GHN code by matching a name. |
| Customer/admin | Supabase Auth; `AuthGuard`, `RolesGuard`, ADMIN/STAFF/CUSTOMER; banned user check | Reuse guards for later shipment management; public lookup only for non-sensitive master data/quote. |
| Notifications | `MailModule` order confirmation, admin alerts, status mail | Reuse mail, add shipping event deduplication in later phase. No mail sent by quote/preview. |
| Analytics/storage | Existing analytics/admin resources, optimized Supabase image storage | Shipping analytics and attachments are later P1/P2 work, not parallel replacements. |

## Entity relationships

`auth.users -> public.users -> orders` (guest `user_id` may be null). `orders.items` is the runtime purchased-item snapshot; older `order_items` SQL also exists and must not be assumed authoritative. `products -> product_translations`, `products -> categories -> category_translations`; carts reference products/users. `orders.shipping_info` holds the recipient/charged fee, `voucher_code` and `voucher_discount_amount` are order snapshots. Tracking code alone is insufficient for shipment event history, provider operations, COD reconciliation or webhook idempotency.

No shipping provider, warehouse, parcel profile, quote, shipment, tracking event, webhook inbox, COD ledger or carrier ticket implementation was found. No shipping-related RLS policy was found; absence in the repository does not establish the remote database's policy state.

## Risks identified before implementation

1. **P0:** Checkout pricing is inconsistent: Zen displays 35,000 shipping, a 1,000,000 free-shipping threshold and 10% estimated tax; API/Traditional use 30,000 / 300,000 without that tax. Zen also posts district/ward/shipping_fee that the strict order DTO does not accept, and offers `bank_transfer` while API recognizes `sepay`. Resolve using one trusted backend contract in the checkout increment, not by relaxing DTO whitelists globally.
2. **P0:** Product parcel data and verified warehouse/origin are missing. Never replace them with guessed customer-supplied weights or fabricated defaults in real quotes.
3. **P0:** New GHN two-level addresses use a separate ID space; fee/services/leadtime docs still require legacy district IDs. No authoritative new-to-legacy crosswalk was verified. Use documented name-based preview for new addresses; reject an unsupported conversion instead of guessing.
4. **P0:** Order creation currently increments voucher use before insert and updates stock after insert via separate calls. Concurrency/rollback cannot be guaranteed by this flow. SePay `verifyPayment` directly updates the order and does not inspect the write error. These pre-existing concerns require fixture-based regression coverage before changing order submission; do not silently rewrite financial transactions as part of the transport client.
5. **P0:** Order transition RPC/trigger migration exists in the worktree. Do not alter it or run SQL remotely. Separate shipment/payment/order states, avoid fulfillment auto-transitions.
6. **P1:** Existing backend logs include some customer phone data. Shipping client must log only operation/correlation/attempt/status, never recipient payloads, token or raw upstream error text. No public raw GHN proxy.
7. Test runs that bootstrap the full real AppModule could execute existing scheduled work. New integration tests must use isolated Nest modules and mocked provider/database; do not restart the current API against remote credentials for QA.

## Verified external dependencies and blockers

- Official docs reviewed starting at [GHN overview](https://developer.ghn.vn/vi/docs/getting-started/overview); see [capability inventory](ghn-api-capabilities.md). Documentation verification is distinct from a successful account/staging test.
- Presence-only inspection of `apps/api/.env`: no GHN enable flag, environment, token, shop ID or webhook secret configured. No values printed or changed. Staging account/token/shop ownership/IP permissions are **unverified / blocked**.
- No authoritative product parcel measurements, packaging rules or actual pickup warehouse supplied. Live quotes cannot be certified yet. No paid API is necessary for the foundation.
- Webhook authentication must be explicitly configured in the GHN portal; the example secret does not imply a standard GHN signature header.

## Small verified implementation sequence

1. **Phase 1.1, P0:** Add `src/shipping` config, closed allowlist transport, provider contract, tests; register a disabled-by-default ShippingModule; update only `.env.example`, not `.env`. No DB changes and no order/payment changes.
2. **Phase 1.2, P0:** Add typed GHN read-only adapter and master-data/address validation for both schemes; isolated HTTP tests; explicit eligibility and no speculative ID crosswalk. No DB changes.
3. **Phase 1.3, P0:** Trusted parcel persistence/migration and quote/preview application layer, reference/expiry/revalidation, backend pricing tests. Prepare additive SQL, validate locally before any user-managed application. No production migration by agent.
4. **Phase 1.4, P0:** Shared opt-in checkout shipping/pricing contract for both themes; address/quote/cart/payment race tests; reconcile existing Zen discrepancies; preserve legacy checkout when integration disabled. Acceptance requires mock browser tests plus staging certification when credentials become available.
5. Only after Phase 1 gates: Phase 2 P0 fulfillment/idempotency/admin; Phases 3–5 P1 webhook/tracking/exceptions/COD; Phases 6–7 P2 tickets/analytics/promotions; Phase 8 P3 multi-provider/warehouse expansion. No ahead-of-priority mutations.

## Phase 0 verification

- Backend baseline: 13 Jest suites, **102/102 tests pass** using fixtures/mocks. First sandbox run had 12 loopback `EACCES` failures; same suite passed with loopback access. This was a test-environment restriction, not 12 application failures.
- API and web `npx tsc --noEmit`: pass.
- No live checkout, SePay, mail, GHN API, Supabase write, migration, commit or push was performed. Existing tests are not full checkout E2E coverage.
