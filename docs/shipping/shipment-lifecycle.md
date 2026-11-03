# Shipment lifecycle and operations

Shipping state, commercial order status and payment status are independent. A delivery callback never marks payment settled or rewrites the existing commercial order lifecycle.

## Eligibility and creation

Eligible order: PENDING or PAID, valid trusted snapshot and total, not showroom pickup; SePay/prepaid orders must already be paid. Fresh admin preparation is required for older orders without a snapshot. It uses purchased prices and charged shipping, not today's product price or exhausted current stock.

The deterministic client code is TH plus the order UUID without hyphens. One environment-scoped reservation is committed while locking the order before calling GHN. Repeat after a known successful create returns the existing shipment. An uncertain response leaves the reservation/audit and a CREATION_UNCERTAIN exception. Admin must refresh by client code; it cannot create again with a fresh random id.

Internal path:

SHIPMENT_PENDING → SHIPMENT_CREATED → PICKUP_PENDING → IN_TRANSIT → OUT_FOR_DELIVERY → DELIVERED

Exception states include DELIVERY_FAILED, RETURN_REQUESTED, RETURNING, RETURNED, CANCELLED and MANUAL_REVIEW. Provider mappings are explicit in shipment-state.ts. Unknown values create exceptions; delayed callbacks cannot regress newer progress. Terminal states are protected. Internal ORDER_CONFIRMED/READY_FOR_FULFILLMENT concepts are eligibility checks, not invented GHN codes.

## Admin actions

All mutations require existing auth/roles, feature gates, a request UUID and audit. The provider is consulted for current state before mutation. Conservative application restrictions may be narrower than GHN's complete field/state matrix.

- Cancel: ready_to_pick.
- Return: ADMIN approval; delivery_fail, storing, waiting_to_return, return.
- Redeliver: storing or waiting_to_return.
- COD: ADMIN; ready_to_pick, integer 0–5,000,000 VND, matching local/provider COD; paid order cannot acquire positive COD.
- Recipient/address/note updates use a restricted allowlist and canonical address validation; unsupported fields never proxy through.
- Labels: 1–100 selected created shipments from the same shop. Fixed official staging print URL; token is sensitive and short-lived. Retry only after reviewing the previous attempt.
- Pickup: fetch current shifts, validate selection at creation. Preparation and handover are separate local records; handover requires preparation. Batch handover returns success/failure per distinct order and repeats do not create another handover.
- Customer return request → admin review → eligible GHN return or manual post-delivery return → inspection note on receipt. No automatic refund or stock replenishment.

Production physical mutations remain blocked, including ticket and label-token writes. This release requires staging certification before a separately authorized production implementation change.

