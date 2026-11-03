# GHN capabilities — verified contract and integration status

Reviewed 2026-11-01, starting from [official overview](https://developer.ghn.vn/vi/docs/getting-started/overview). **Documentation verification, source implementation, fixture test and account certification are different statuses. The initial staging probe returned401. After operator token replacement, a read-only shop-membership probe returned200 and the province list returned200/34 entries with the authorized staging shop. Only these reads are verified; quote/preview/fulfillment/webhook/ticket and full live acceptance remain unverified.**

## Common boundary

Fixed origins: staging https://dev-online-gateway.ghn.vn, production https://online-gateway.ghn.vn. Paths below are relative to /shiip/public-api. Token and ShopId are server-only headers; numeric shop must be authorized for that account. [Token documentation](https://developer.ghn.vn/vi/docs/token/get-token).

Parse HTTP status plus code/message/data envelope and runtime-validate data. Do not log raw message or request/recipient content. No provider rate-limit number or SLA has been verified. Reads retry only network/timeout/429/502/503/504, bounded0–2 retries with backoff; auth/validation/schema failures do not retry. Preview and all mutations single-attempt. Mutations are hard blocked for production in GhnClient; dev cannot select production access. Redirects rejected, timeout/response size bounded.

## Read and preview operations implemented

| Official source | Method / path | Required input → decoded subset / boundary |
| --- | --- | --- |
| [Old province](https://developer.ghn.vn/vi/docs/master-data/get-province) | GET /master-data/province | No input → ProvinceID/ProvinceName |
| [Old district](https://developer.ghn.vn/vi/docs/master-data/get-district) | GET /master-data/district | province_id → DistrictID/Name/SupportType |
| [Old ward](https://developer.ghn.vn/vi/docs/master-data/get-ward) | GET /master-data/ward | district_id → WardCode string/Name/SupportType |
| [New province](https://developer.ghn.vn/vi/docs/master-data/get-province-new) | GET /v3/master-data/province/all | offset/limit<=200 → _id/name/parent_id/status |
| [New ward](https://developer.ghn.vn/vi/docs/master-data/get-ward-new) | GET /v3/master-data/ward/all-by-province-id | province_id, pagination → same subset; active/membership validated |
| [Services](https://developer.ghn.vn/vi/docs/master-data/get-service) | POST /v2/shipping-order/available-services | shop_id/from_district/to_district → service_type_id/service_id/name |
| [Fee](https://developer.ghn.vn/vi/docs/order/calculate-fee) | POST /v2/shipping-order/fee | legacy district/ward, measured weight/dimensions, service, declared value/COD → total and numeric fee subset |
| [Leadtime](https://developer.ghn.vn/vi/docs/order/leadtime) | POST /v2/shipping-order/leadtime | legacy routing/service → Unix-seconds ETA |
| [Preview](https://developer.ghn.vn/vi/docs/order/preview) | POST /v2/shipping-order/preview | create-compatible recipient/parcel/items/service/payment fields → total_fee, estimated_delivery_time, empty order_code required |
| [Detail](https://developer.ghn.vn/vi/docs/order/info) | GET /v2/shipping-order/detail | order_code → shop/client code/status/COD/leadtime; expected identity checked |
| [By client code](https://developer.ghn.vn/vi/docs/order/info-by-client-code) | GET /v2/shipping-order/detail-by-client-code | deterministic client_order_code → same identity/state subset; uncertain create recovery |
| [Actual fees](https://developer.ghn.vn/vi/docs/order/fee) | GET /v2/shipping-order/soc | order_code → matching order_code/detail.total. Missing total is unknown: shortened official example is insufficient to reconstruct all charges |
| [Pickup shift](https://developer.ghn.vn/vi/docs/master-data/pick-shift) | GET /v2/shift/date | No body → id/title/from_time/to_time; fetch fresh, never hardcode date-dependent IDs |
| [Ticket detail](https://developer.ghn.vn/vi/docs/ticket/detail) | GET /ticket/detail | ticket_id → id/status/status_id; ticket permission/ownership required |

Master data is cached five minutes per environment/shop. Old ward IDs stay strings. SupportType delivery eligibility is checked. New IDs are a different scheme; no authoritative conversion to old district/ward was verified. New addresses use the documented name-based preview/create contract with is_new_to_address. No endpoint for guessed name-to-code mapping exists.

Application restriction: single light service_type_id2 parcel under20kg, measured grams/cm, each dimension<=200cm, insurance<=5m VND. Heavy/multiple parcels are explicitly rejected rather than mapped to service5 speculatively. Browser cannot supply trusted money or measures.

## Mutations implemented, staging-gated

| Official source | Method / path | Input → response subset / app eligibility / recovery |
| --- | --- | --- |
| [Create](https://developer.ghn.vn/vi/docs/order/create) | POST /v2/shipping-order/create | validated preview fields plus deterministic client_order_code (max50), optional fresh pick_shift → order_code/total_fee/ETA. Unique DB reservation precedes IO; uncertain result reconciled by client code |
| [Update](https://developer.ghn.vn/vi/docs/order/update) | POST /v2/shipping-order/update | order_code + restricted note/contact/address fields. Field/state matrix applied; canonical new address names only when supplied. No arbitrary fields/OTP COD update |
| [Cancel](https://developer.ghn.vn/vi/docs/order/cancel) | POST /v2/switch-status/cancel | order_codes → per-order order_code/result must match. Application restricts ready_to_pick |
| [Return](https://developer.ghn.vn/vi/docs/order/return) | POST /v2/switch-status/return | order_codes → checked per-order result; ADMIN, delivery_fail/storing/waiting_to_return/return |
| [Redelivery](https://developer.ghn.vn/vi/docs/order/delivery-again) | POST /v2/switch-status/storing | order_codes → checked result; storing/waiting_to_return |
| [Update COD](https://developer.ghn.vn/vi/docs/order/update-cod) | POST /v2/shipping-order/updateCOD | order_code/cod_amount → envelope success. ADMIN, ready_to_pick, max5m (create COD max50m), no positive COD for paid orders |
| [Labels](https://developer.ghn.vn/vi/docs/order/print) | POST /v2/a5/gen-token | order_codes → sensitive token; app max100/same shop. Staging print host dev-online-gateway.ghn.vn/a5/public-api/printA5, token about30min per docs |
| [Ticket create](https://developer.ghn.vn/vi/docs/ticket/create) | POST /ticket/create | FormData order_code/category/description/optional attachments → numeric id. ADMIN and account ticket permission |
| [Ticket reply](https://developer.ghn.vn/vi/docs/ticket/create-feedback) | POST /ticket/reply | FormData ticket_id/description/optional attachments → envelope acknowledgement. No JSON body; no private GHN note inferred |

Ticket text<=2000; app accepts only JPEG/PNG uploads, strips to private JPEG, max3/request and6/ticket, 2MB each (narrower than provider file limits). Internal notes are local restricted audit records. External send/reply attempts are not blindly retried; uncertain attempts stay visible.

Shared failures: auth/IP/shop restrictions, invalid location/route/value, not found, forbidden account ticket permissions, provider5xx. Local errors are classified/sanitized; per-order failures are not treated as batch success. State checks and account ownership do not guarantee a request will succeed before staging certification.

## Callback, status and deferred capabilities

- [Order callback](https://developer.ghn.vn/vi/docs/webhook/callback-order-status): implemented authenticated shared-header receiver; normalized PascalCase event data, durable inbox, environment/shop/code/type/time dedup, delayed/unknown-event handling. No assumed HMAC. cod callbacks remain provider reports; bank proof separate.
- [Status list](https://developer.ghn.vn/vi/docs/master-data/order-status) and [reason list](https://developer.ghn.vn/vi/docs/master-data/reason-code): explicit status mapper; unknown states require review. Failure reasons are not translated into invented categories. money_collect_picking/delivering are transit stages, scrap requires manual review.
- [Shop list](https://developer.ghn.vn/vi/docs/shop/get-shop): GET /v2/shop/all with Token, optional offset/limit; data.shops[]._id is the authorized ShopId. Verified by read-only operator diagnostic after token replacement, without logging names/phones/addresses. Not integrated into the app adapter/UI; warehouse mapping remains explicit. [Shop create](https://developer.ghn.vn/vi/docs/shop/create-shop) remains unimplemented; no shop was created.
- [Ticket callback](https://developer.ghn.vn/vi/docs/webhook/callback-ticket): receiver not implemented; schema/account certification remains open. Use authorized explicit ticket refresh.
- [Affiliate OTP](https://developer.ghn.vn/vi/docs/affiliate/get-otp), [create shop](https://developer.ghn.vn/vi/docs/affiliate/create-shop-by-otp), [add staff](https://developer.ghn.vn/vi/docs/affiliate/add-staff-by-otp): future seller onboarding documentation only. No OTP or account provisioning workflow for ordinary customers.
- [Stations](https://developer.ghn.vn/vi/docs/master-data/get-station): no implementation; not required for core delivery.
- No verified live courier GPS capability. No map dependency or fabricated path.

