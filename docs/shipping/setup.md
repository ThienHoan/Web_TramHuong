# Staging setup — TramHuong Smart Logistics

Updated 2026-11-01. Source implementation covers Phases 0–8. **After operator token replacement, read-only shop membership and province lookup succeeded with the authorized staging ShopId; configured ShopId requires correction and backend restart. Full live acceptance remains pending. No remote migration or carrier mutation has been executed by the agent.** Keep fulfillment/jobs disabled until the following staging checks pass.

## 1. Isolate the environment

Use a separate staging Supabase project, staging GHN account and staging shop. Do not point a test instance at the current production Supabase configuration: existing order cleanup/scheduled jobs are outside the shipping flags. Never copy service-role keys into NEXT_PUBLIC variables.

Review the actual database against repository snapshots first. Existing users/products/orders and the existing order integrity migration remain authoritative. Check payment_status/status types, purchased items, transaction_code, order transition RPC and ownership columns. New migrations do not repair unrelated schema drift.

## 2. Apply reviewed SQL to staging only

Apply apps/api/migrations/smart-logistics.sql once, then apps/api/migrations/shipping-evidence-storage.sql. They are additive, transactional migrations; the first is not intended to be rerun. Both were tested with in-memory PostgreSQL, not your live Supabase. Review storage policies/ownership before execution. An existing public shipping-evidence bucket deliberately fails the storage migration; resolve it explicitly rather than making customer evidence public.

The shipping_records table and privileged RPCs are backend-only. Enable Realtime publication for shipping_tracking only. Inspect the owner SELECT policy with two distinct test users; never publish shipping_records.

## 3. Configure server variables privately

Use apps/api/.env.example as the variable inventory. Existing .env was not overwritten.

| Variable | Initial staging value / meaning |
| --- | --- |
| GHN_ENABLED | true only after staging token/shop are ready |
| GHN_ENV | staging |
| GHN_TOKEN / GHN_SHOP_ID | staging account token and numeric shop; server only |
| GHN_TIMEOUT_MS / GHN_READ_RETRIES | 8000 / 1; bounded by config validation |
| GHN_WEBHOOK_SECRET | random value at least 32 characters; portal custom header x-ghn-secret |
| SHIPPING_CHECKOUT_ENABLED | false initially |
| SHIPPING_FULFILLMENT_ENABLED | false initially |
| SHIPPING_JOBS_ENABLED | false initially |

The client fixes GHN origins; it does not accept an arbitrary URL. Production mutations are hard blocked in code, including label-token and ticket writes. There is no environment switch to bypass that block.

## 4. Configure measured business data

Open /vi/admin/shipping as ADMIN. STAFF can operate authorized shipments but cannot approve COD/configuration/returns.

1. Add each warehouse: real GHN ShopId, verified legacy pickup district, actual box tare grams and padding cm, availability. Token must be authorized for every mapped shop.
2. Add packaging profiles for products and, where applicable, variant names used by the existing catalog. Measure weight in grams and dimensions in cm. Missing/inactive profiles block quotes; there is no guessed parcel.
3. Enter warehouse stock only when known. Recommendation uses both local inventory and existing product stock; this local record does not replace or reserve inventory.
4. Add unit costs only when verified. Extra margin-aware promotions remain opt-in and do not qualify when cost is unknown. Existing 300,000 VND free shipping is retained.
5. Enable checkout in staging and verify both VI Traditional and EN Zen. New two-level GHN selectors use provider IDs; old saved names/codes are not converted speculatively.

## 5. Verify staging in order

Obtain quote and preview without creating shipment. Check voucher, price change, quote expiry, guest checkout and showroom exemption. Revalidate SePay totals without real bank transfer; no shipment is created in a payment callback.

Only then enable staging fulfillment. Test one approved staging order, repeat the request, inspect by deterministic client code after a simulated timeout, read labels and pickup shifts. An old order without a trusted snapshot must use “Prepare existing order”; this preserves charged money and requires measured data.

Configure the official portal Order webhook to HTTPS /api/shipping/webhooks/ghn with the custom x-ghn-secret header; account permissions and portal setup are external prerequisites. Test forged, repeated and delayed callbacks. Enable jobs after inbox verification. Check Realtime reconnect and the backend-only 60-second fallback.

Test tickets only if the account has ticket permissions. Evidence stays in the private bucket. No affiliate OTP, paid map, other carrier or production waybill is required.

## Outstanding external blockers

Staging credentials/shop permissions; actual warehouse/package measurements and costs; operator application of SQL; private bucket and Realtime policies; reachable HTTPS webhook. None has been assumed complete. See deployment.md for release/rollback gates.

