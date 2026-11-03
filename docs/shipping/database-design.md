# Database design

Updated 2026-11-01. SQL is prepared locally, **not applied to remote Supabase**.

## Incremental persistence

smart-logistics.sql adds two entities rather than duplicate orders, users or product catalogs:

| Entity | Purpose / access |
| --- | --- |
| shipping_records | Durable typed operational aggregates. Backend service-role access only; RLS and revoked anon/authenticated table/RPC grants. |
| shipping_tracking | Sanitized shipment projection: id, order_id, owner_id, state, tracking_code, eta, updated_at. Authenticated owner SELECT only; the only shipping table added to Realtime. |

Record kinds: warehouse, profile, inventory, quote, shipment, action, inbox, event, exception, return, cod, ticket, notification, promotion. JSON objects hold the kind-specific schema, validated by DTOs/services. UUID FK references existing orders and users; unique key implements business idempotency; monotonically increasing version implements compare-and-swap. Sensitive JSON is never published to browser subscriptions.

Indexes cover kind/state/created_at, order/kind, owner/kind, shop/tracking lookup. A unique environment/shop/tracking-code index prevents duplicate carrier associations. Commercial orders retain items, totals, voucher data and payment status. Canonical address/parcel/price/configuration snapshots are attached under orders.shipping_info.shipping_snapshot; old fields remain intact.

This single aggregate store keeps migration scope small but provides less SQL field-level typing than one table per entity. Backend validation and versioned RPCs are mandatory. Reporting is bounded to 10,000 matching records per report and one-year date ranges; larger installations should extract indexed reporting projections before raising limits.

## Transaction boundaries

- shipping_write_record: insert at version zero or update exact previous version; immutable owner/order links; shipment write updates sanitized projection in the same transaction.
- shipping_reserve_shipment: lock order, validate eligible commercial/payment status and exact trusted snapshot/total; reserve exactly one shipment and expected COD ledger entry before external IO.
- shipping_attach_snapshot: lock legacy order, reject price changes or existing shipment, merge only trusted snapshot.
- shipping_complete_cod: lock shipment/action; validate versions/action identity/current paid status/limits; atomically update shipment COD, adjustment ledger and audit completion. Positive COD cannot be introduced for a paid order.
- shipping_guard_order_cancel: prevent commercial cancel/expiry while an unresolved carrier shipment exists. Cancelled/returned shipments allow existing order transition logic to proceed.
- shipping_alert_paid_cod: late online payment with positive carrier COD inserts a high-severity exception once. It neither reverses payment nor silently edits the carrier COD.

External GHN requests cannot share a PostgreSQL transaction. Pending audit/reservation plus explicit reconciliation handles uncertain outcomes; no blind create retry.

## Private evidence

shipping-evidence-storage.sql creates a private JPEG-only, 2 MB bucket. Restrictive storage.objects policies prevent anon/authenticated access even if an old permissive policy exists for other buckets. Backend verifies bucket privacy, owner and path; transforms JPEG/PNG input to stripped JPEG; authorized signed URLs last 60 seconds. No change to existing product image buckets.

## Retention and rollback

The receiver persists only normalized allowed metadata, never the full raw webhook payload, shipper phone, POD URL or recipient content. Operational records, evidence and financial proof currently have **no automatic purge**. Operator must agree a retention/financial preservation policy before real customer use; backups follow the Supabase project policy.

Disable flags and webhook delivery to roll back application behavior. Preserve shipment/COD/audit records and the cancel guard while any carrier order remains unresolved. Do not drop tables/functions or reset ledger data as a rollback shortcut. No destructive down migration is supplied.

