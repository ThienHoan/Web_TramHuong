# Checkout UX

Updated 2026-11-01. Applies to Traditional (VI) and Zen (EN).

## Customer journey

1. Recipient details: enter name, Vietnamese phone number, street address and, when GHN checkout is enabled, province and ward, so the whole address is entered once. A guest can continue without the former intermediate guest-selection screen. Signed-in profile values and previously saved details prefill the form without overwriting edits. The order summary supports quantity changes, removal and voucher application.
2. Delivery and payment: review/edit recipient information and select payment. The delivery fee calculates automatically from the step 1 address before the order is placed. Traditional retains its existing showroom option; Zen retains COD and SePay. One primary action sits beneath the order totals, including on mobile.

When GHN checkout is enabled, province and ward are chosen in step 1 from GHN's address lists; saved checkout details restore them, and a signed-in profile address is matched by name. If the lists cannot load, a Vietnamese customer can still continue and choose showroom pickup. Step 2 identifies GHN, requests the quote automatically, displays the charge/ETA, offers a retry after a failure or expiry, and blocks ordering until a usable quote is available. The quote and order use the same full address text (street, ward, province) because the API rejects a quote whose recipient changed. It uses the first published active warehouse, matching the prior default; warehouse selection is an operational concern and is no longer exposed to customers. Multi-origin optimization and other carriers are not introduced by this UI change.

Changing payment, recipient or cart details invalidates the quote where applicable. Missing configuration or quote failures leave the order action disabled and display an explanation. Before a quote, the summary explicitly shows an estimated total and an uncalculated delivery charge. When GHN checkout is disabled, the existing legacy address selection and shipping policy remain in use. This change does not enable the feature flag or certify live GHN integration.

## Presentation and accessibility

Shared components and scoped styling live in `apps/web/src/components/checkout/CheckoutUI.tsx` and `checkout.css`. Existing brand colors, typography, headers, footers, Button/Input components and currency formatting are reused. Desktop uses a recipient/delivery column beside a sticky summary; mobile stacks them without horizontal overflow. English checkout also shows the exact VND total alongside the existing converted display.

Fields have visible labels, autocomplete, inline validation, error associations and first-invalid focus. Payment options use native radio inputs. Primary actions support native form submission, including Enter. Busy, error, unavailable quote and empty-cart states are explicit. Failed order submission keeps entered details available for retry.

## Compatibility and limits

The existing order endpoints, quote references, voucher checks, SePay redirects and cart clearing after successful creation are retained. The Zen quantity controls now pass absolute quantities to CartProvider rather than increments. There are no backend, schema, credential or environment changes in this increment.

The pre-existing showroom address/policy in the payment handler still needs operator confirmation before operational use. Live carrier/payment acceptance remains separate work; this UI verification does not certify it.

Update 2026-11-06: order creation, stock and voucher usage now commit in one database transaction with retry-safe idempotency keys. See [checkout/atomic-checkout.md](./checkout/atomic-checkout.md) (migration prepared, not yet installed).

## Verification

- Web TypeScript and scoped ESLint for the six checkout TSX files.
- Browser fixture suite: 24 checks, zero JavaScript errors and zero chart dimension warnings. Coverage includes direct guest entry, field validation, saved voucher restoration, absolute quantity updates, both quote flows, invalidation, SePay payload/error recovery, showroom exemption, missing warehouse, legacy fallback and empty cart.
- Desktop and mobile screenshots inspected, including widths 375px and 390px. Browser API/Supabase traffic is mocked; external requests are blocked. No real order, payment, GHN shipment or configuration write is made.

Run from `apps/web`: `npx tsc --noEmit` and `node scripts/verify-shipping-ui.cjs`. The browser runner restores its temporary route/provider fixture in `finally`; see `docs/shipping/testing.md` for prerequisites.
