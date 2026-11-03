# Shipping API reference

All paths below are under existing /api prefix and DTO whitelist/validation. No arbitrary GHN passthrough exists. UI paths: /vi/admin/shipping, /vi/shipping/:orderId and EN equivalents. Bearer tokens use existing Supabase Auth.

## Public and checkout

| Method / path | Input / result |
| --- | --- |
| GET /shipping/status | Safe enabled/provider/checkoutEnabled flags; disabled by default |
| GET /shipping/providers | Registered provider capability inventory, not account certification |
| GET /shipping/warehouses | Active id/name only when checkout enabled |
| GET /shipping/addresses/provinces | New two-level provinces |
| GET /shipping/addresses/wards?provinceId= | New wards |
| GET /shipping/addresses/legacy/provinces | Legacy provinces |
| GET /shipping/addresses/legacy/districts?provinceId= | Legacy districts |
| GET /shipping/addresses/legacy/wards?districtId= | Legacy wards |
| POST /shipping/addresses/validate | scheme legacy/two_level, provinceId, wardCode string, districtId for legacy |
| POST /shipping/quote | items(productId UUID, optional variantId, quantity), warehouseId UUID, recipient(name/phone/address), destination, paymentMethod cod/sepay, optional voucherCode |

Quote result: reference UUID, subtotal, voucherDiscount, actualFee, customerFee, subsidy, total, eta, expiresAt, provider, serviceTypeId. Five-minute durable reference is owner/context-bound and revalidated server-side at POST /orders with shippingQuoteReference. No client price/weight/dimension input is trusted. Showroom exempt; disabled shipping keeps existing order pricing. Unknown prices/profile/address or expired/changed reference fails closed.

## Authenticated customer

| Method / path | Purpose |
| --- | --- |
| GET /shipping/track/:orderId | Owner/staff sanitized tracking, latest notifications and support statuses |
| POST /shipping/support | requestId, orderId, category, description max2000; saves local request, does not directly call GHN |
| GET /shipping/support/:id | Authorized sanitized request status |
| POST /shipping/returns | Same request DTO; review request, never automatic refund |
| POST /shipping/support/:id/evidence | Multipart files; max3/request, 2 MB each JPEG/PNG, max6/ticket |
| GET /shipping/support/:id/evidence/:index | Owner/staff signed URL60sec |
| POST /shipping/recommend | Quote DTO; measured/known-stock origins sorted by fee then ETA |

Detailed tracking/support requires an existing owned shipment. Existing guest order lookup is preserved. Admin-only ticket actions are never exposed as customer mutations.

## Admin / staff

Base /admin/shipping. ADMIN and STAFF use existing guards; ADMIN-only rows noted.

| Method / suffix | Purpose |
| --- | --- |
| GET / | kind, state, orderId, from/to ISO, page>=1, limit1–100; data,total,page,limit. Raw cod kind ADMIN-only |
| GET /staff | Active staff directory for assignment |
| POST /configure | ADMIN; warehouse/profile/inventory/promotion, version CAS; validated measured fields |
| POST /orders/:orderId/prepare | requestId, warehouseId, canonical destination; attach trusted snapshot preserving original money |
| GET /warehouses/:id/shifts | Current dynamic pickup shifts |
| POST /shipments/:orderId | requestId, optional pickShift; unique reservation/create |
| GET /shipments/:orderId | Operational detail |
| POST /shipments/:orderId/details | requestId; restricted recipientName/Phone/Address/destination/note fields |
| POST /shipments/:orderId/action | requestId; action cancel/return/redeliver/updateCod/update, amount or note. return/updateCod ADMIN |
| POST /shipments/:orderId/refresh | Safe lookup/reconcile into durable inbox |
| GET /pickup/:orderId/shifts | Current shifts |
| POST /pickup/:orderId/prepare, /handover | Local warehouse preparation / handover |
| POST /pickup/batch-handover | requestId, orderIds max100; per-order results |
| POST /labels | requestId, orderIds max100; same-shop batch, temporary URL |
| POST /returns/:id/review | ADMIN; requestId, decision approve/reject/receive, note; receive requires inspection |
| POST /exceptions/:id/assign | ADMIN; requestId, active assigneeId |
| POST /exceptions/:id/resolve | ADMIN; requestId, nonempty resolution note |
| GET /cod/:orderId | ADMIN; separate expected/collected/reported/bank/outstanding |
| POST /cod/:orderId | ADMIN; requestId, type collected/bank_confirmed, amount, proof |
| POST /tickets/:id/action | ADMIN; requestId, operation send/reply/refresh/note, optional note. Notes internal only |
| GET /analytics | from/to required, optional current state; bounded report |
| POST /inbox/:id/retry | ADMIN; DEAD inbox only |
| POST /jobs/drain, /jobs/reconcile | ADMIN explicit worker/reconciliation |

POST /shipping/webhooks/ghn uses configured x-ghn-secret rather than a customer token; see webhook-processing.md.

Typical failures: 400 invalid input/unsupported route/parcel/state, 401 authentication, 403 approval/webhook auth, 404 unavailable/other owner, 409 stale quote/version/uncertain operation, 503 disabled/provider/database unavailable. Raw upstream error bodies and secrets are not returned. A 409 on a mutation means review and reconcile; changing request UUID is not permission to repeat an uncertain shipment/ticket action.

