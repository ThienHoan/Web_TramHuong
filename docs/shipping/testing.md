# Verification and remaining acceptance

Updated 2026-11-01. Tests never create a real GHN shipment, send real mail, transfer money or write remote Supabase. Live staging tests are separate and not yet executed.

## Executed evidence

- Full backend regression: 27 suites, 246 tests pass (including original102 tests and logistics/order regressions).
- In-memory PostgreSQL verification: 28 checks pass against actual migration SQL. Tests cover CAS, racing reservation, snapshot/price protection, COD atomicity/replay, cancellation guard, late online payment alert, positive COD rejection for paid orders, projection redaction, owner RLS and restrictive private-bucket policies.
- API Nest build and API/web TypeScript checks.
- Scoped ESLint on shipping implementation and new frontend files.
- Browser fixture QA: 24 checks pass, zero JavaScript errors and zero chart dimension warnings; see implementation-progress.md. It covers admin pagination, preparation of existing orders, mobile admin layout, both tracking skins, support, both checkout layouts and quote invalidation. Additional checkout checks cover guest validation, saved vouchers, quantity controls, payment changes, failed-order recovery, showroom exemption, unavailable origin, legacy fallback, empty cart and 375px/390px layouts. Browser API responses are fixtures, not live integration proof.

## Reproduce

From apps/api:

~~~powershell
npm test -- --runInBand --json --outputFile=../../logs/shipping-jest.json
node scripts/verify-logistics-sql.cjs
npm run build
npx eslint "src/shipping/**/*.ts" src/common/commerce-pricing.ts src/orders/shipping-checkout.spec.ts src/orders/payment-persistence.spec.ts
~~~

From apps/web:

~~~powershell
npx tsc --noEmit
node scripts/verify-shipping-ui.cjs
~~~

The browser runner needs the existing dev web server, installed Chrome and playwright-core (PLAYWRIGHT_CHROME_PATH can override Chrome; PLAYWRIGHT_CORE_PATH can select an already installed runtime). It temporarily creates an isolated dev-only QA route/provider fixture, intercepts API and Supabase traffic, blocks remote requests/WebSockets, restores original AuthProvider bytes and removes the exact fixture route in finally. Do not run concurrent edits to AuthProvider while this fixture runs. Artifacts are ignored under .next/shipping-qa. No auth bypass is left in application routes.

Loopback is restricted in the execution sandbox; isolated Jest HTTP/browser fixtures were run with loopback access. They do not bootstrap the real scheduled AppModule. SQL uses PGlite in memory.

## Coverage boundaries

Config/client tests: default-off, fixed origin, production guard, allowlisted operations, secret-safe errors, bounded retries/response/timeout and no mutation retry. Address/provider tests: both schemes, string ward codes, parent/activity/eligibility, invalid route/fee/parcel/recipient.

Workflow tests: trusted quotes/expiry/revalidation, purchased historical prices, no fabricated measures, idempotent reservation/create, auth/owner/roles, callback dedup/schema/order/unknown states, worker retry/lease/dead letter, returns and inspection, separate COD proof, ticket authorization/private evidence checks, empty analytics, state filters, promotion margin and unknown inventory. Order integration checks real OrdersService with mock persistence, including expired quote before mutations and SePay snapshot totals. Payment persistence regression covers write failure, late payment, terminal orders and concurrent callbacks.

Mock and SQL fixtures cannot certify GHN token/shop permissions, actual provider schema variants, Supabase hosted Realtime/Storage, bank callbacks, email delivery or production load. Run the setup/deployment acceptance sequence on isolated staging before enabling features. Full web production build and whole-repository lint are not claimed by these scoped checks.





Configuration regression coverage includes out-of-range/fractional padding blocked before API, accepted integer boundaries, server validation details visible within the modal, input retention/retry, and desktop/mobile chart dimensions. Backend246-test count above is the previous backend run; this frontend-only increment used scoped web type/lint checks and the14-case browser suite, with API bounds unchanged.

The subsequent checkout UI increment expands that browser suite to24 checks and repeats web TypeScript/scoped checkout lint. It does not rerun or change the backend suite. See docs/checkout-ux.md for the customer journey and verification limits.
