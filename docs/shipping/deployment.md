# Deployment and operational gates

## Current release state

All Phase0–8 areas have source implementation and isolated tests. **Live staging acceptance remains blocked; production fulfillment is not enabled.** Prepared migrations have never been run by the agent against the connected Supabase.

No dependency or paid service was added for shipping. Reuse Nest scheduler, Supabase storage/realtime and existing auth. Do not start the whole backend merely to run tests when its .env points at live data.

## Staged rollout

1. Review existing schema/order integrity and backup on a separate staging project. Apply the two additive shipping migrations there; verify RPC grants, owner RLS, storage restrictive policies and sanitized Realtime.
2. Supply server-only GHN staging configuration, actual warehouse/shop and measured profiles. Keep all shipping flags false while testing backend config/master data.
3. Enable checkout only; verify both skins, guest/authenticated order creation, prices/vouchers/stock, quote expiry/races, showroom and SePay. Live SePay/schema testing remains operator work.
4. After explicit staging acceptance, enable staging fulfillment. Test idempotency, uncertain-create recovery, labels and fresh shifts with the staging account.
5. Register authenticated HTTPS webhook. Check inbox persistence, callback replay, dead-letter recovery and private evidence; enable shipping jobs only after those checks.
6. Validate COD and ticket account permissions, reporting definitions, multiple shops and known inventory.
7. Production requires separate account/config, security/schema review, live staging signoff and an explicitly authorized code change to the hard production mutation block. No automatic staging-to-production switch exists.

## Monitoring and response

Watch HTTP operation/correlation/status logs (no raw PII), OPEN exceptions, PENDING uncertain actions, DEAD inbox, failed fee/reconciliation alerts and late-online-payment active COD alerts. Determine actual rate limits with GHN; do not assume application retry settings are provider guarantees.

Verify mail/payment infrastructure separately; shipping notifications are durable in-app records and tracking updates. No new shipping email/SMS sender is wired. Stale/unknown records must remain visible rather than marked successful.

Retention is deliberately not destructive: no automatic evidence/audit/financial purge. Agree a policy and access logs before real customer uploads.

## Rollback

Set shipping checkout/fulfillment/jobs false, stop portal webhook delivery and deploy the prior compatible app if needed. Keep schemas and shipment history; resolve active carrier shipments before any commercial cancellation. Do not erase COD proof or drop the guard trigger to force an order cancel. Existing live jobs outside ShippingModule have their own controls. Backups and remote changes remain operator-owned.

## Explicit limits

Service type2, one measured light parcel under20kg, dimensions<=200cm, declared value<=5m; no speculative new-to-legacy address crosswalk. One account token must be authorized for all configured shops. Labels max100/same shop, photos max6/ticket, report max10k/year. Local warehouse availability is recommendation input, not transactional stock reservation. Future carriers/affiliate OTP/maps are not called.

Existing stock decrement and voucher consumption during order creation remain separate calls; a full commerce transaction migration was not bundled into shipping. Do not claim the repository or live financial system is fully certified from mock logistics tests.

