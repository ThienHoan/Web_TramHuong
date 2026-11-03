# Webhook and realtime processing

Official contract: [GHN Order callback](https://developer.ghn.vn/vi/docs/webhook/callback-order-status). Configure a shared x-ghn-secret custom header in the portal. This implementation does not invent HMAC signing.

## Ingestion

POST /api/shipping/webhooks/ghn authenticates the configured secret (at least 32 characters) with constant-time digest comparison before persistence. GHN must be enabled; ShopID must match an active configured warehouse. Global request limits apply.

Validate PascalCase fields and ISO Time. Keep selected normalized metadata only: shop/code/type/time/status, COD and transfer date, fee, weight. Dedup key includes environment, shop, code, type, time. Conflicting content for the same key raises an exception. Unknown event types are retained and require review. A durable inbox write precedes the acknowledgement; a failed write is not acknowledged as success.

## Worker

Reuse existing Nest scheduler; no Redis/BullMQ. SHIPPING_JOBS_ENABLED defaults false. Minute drain claims rows with CAS, retries bounded exponential backoff, recovers leases after two minutes, and moves eight failed attempts to DEAD plus an exception. ADMIN can review/requeue DEAD rows or explicitly drain.

Processing handles provider state, normalized event, notification and financial postings through separate durable idempotency keys. CAS conflicts are retried by the worker. Older timestamps cannot overwrite newer progress; terminal state regression is rejected. Failures after partial persistence are recoverable without another financial posting. Events more than five minutes in the future fail into retry/review.

Unknown status/type, changed weight/fee/COD and unexpected transitions create exceptions. “cod” is provider-reported remittance, never bank confirmation. Refresh safely reads detail (by client code if creation was uncertain) and current fees; it does not retry a mutation.

Hourly reconciliation processes a stored page cursor, up to 100 records per sweep, skips terminal shipments, and generates overdue/missing-event alerts with daily deduplication. It does not poll GHN on page renders.

## Customer authorization

GET /api/shipping/track/:orderId first enforces owner or authorized staff. Returns sanitized timeline, current state/ETA/code, latest notifications and support request statuses. No full address, phone, internal notes, costs, evidence paths or carrier credentials are returned.

Realtime subscribes only to shipping_tracking under owner RLS, then refetches the authorized backend view. Reconnect/focus refetch and visible-tab 60-second backend fallback are implemented; none polls GHN directly. Guest detailed tracking has not been broadened: existing guest order lookup remains, while authenticated account owners use the new detail page.

No courier GPS or actual route is invented. Ticket callbacks are not enabled because that callback schema/account setup is unverified; explicit ticket refresh is available instead.

