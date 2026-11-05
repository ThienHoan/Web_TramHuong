# Remaining integration batches — 05/11/2026

## Localhost live follow-ups — owner update 05/11/2026

Add **P1-03b** (wire existing Siteverify adapter + Cloudflare dummy-key widget
into the contact form) and **P5-01c** (Gemini Free catalog-only transport + durable
token quota). Owner selected Free for localhost; no paid fallback/billing.
P5-01b is already assigned to grounded JSON/SSE chat wiring; do not reuse its ID.
Detailed scope, shared-file boundaries, dependencies and acceptance live in
[31-localhost-turnstile-gemini.md](./31-localhost-turnstile-gemini.md).
These batches are planned, not implemented/live-certified by this update.
Turnstile does not depend on installing every other integration's SQL. Gemini
requires verified durable live-token reservations before provider execution.
Existing mock/default-OFF behavior remains; each real call still needs approval.

Design checkpoint before implementation. User authorized continuing the other
phases. Master plan constraints remain: mock/default OFF, no production migration,
mail/shipment/Ads/billing or commit/push. No new provider credentials are needed
for the local work below.

## P3-01 — GHN reuse checkpoint

Reuse `ShippingModule`, provider/client, quotes, fulfillment, inbox, COD,
tracking and `shipping_records`; never introduce a second shipping integration.
`docs/shipping/implementation-progress.md` records successful staging province
reads after operator setup, while quote/create/callback/COD acceptance stays open.
Rerun existing shipping/order tests; do not send a shipment or webhook to certify
them. Shipping paid state and notification delivery state have separate owners.

## P4-01 — email provider boundary

Reuse `MailModule`, MailerService and four Handlebars templates. Introduce an
`EmailProvider` contract with `accepted`, `rejected`, `unknown`; acceptance is
never proof of mailbox delivery. Keep SMTP as the sole injected transactional
provider. SMTP exceptions yield `unknown`, preserve the existing nonblocking
commerce behavior and fixed privacy-safe failure marker, and are never retried.

Add a separately injectable mock Resend adapter behind the existing registry
flag and shared bounded executor. Require an idempotency key, fingerprint the
message, coalesce concurrent duplicate attempts, refuse conflicting reuse, and
keep unknown outcomes from being resent. The bounded in-process ledger is
explicitly not durable idempotency. It is NOT selected for order emails, does not
read credentials, and has no real transport. No automatic SMTP fallback after an
unknown acceptance. Full P4-02 requires verified hosted foundation, atomic source
events, notification ownership/retention and bounce verification; not closed by
this batch. No new notification/outbox table or migration.

Official references checked 05/11/2026:
- https://resend.com/docs/api-reference/emails/send-email
- https://resend.com/docs/dashboard/emails/idempotency-keys

Resend's provider idempotency window is 24 hours, so a durable local source key
and reconciliation remain necessary; SMTP has no equivalent delivery guarantee.

## P8-01 — replace legacy unconditional Merchant entry point

The current service initializes Content API v2.1 credentials at boot, registers
an unconditional midnight cron and maps nonlocalized product links/fabricated
shipping prices. Replace this path in the existing MerchantModule, keeping its
ADMIN route. Remove the legacy cron/client from runtime; do not activate a new
scheduler. `POST /merchant/sync` requires explicit `{source:"mock"}` and uses the
existing flag/kill switch/executor. No live transport, account or SDK is added.

Build a pure Merchant products/v1 product-input mapper: stable offer ID, vi/VN,
HTTPS canonical localized PDP, DB's active/stock status and effective VND price
using the same discount calculator as storefront. Reject missing/unsafe source
fields, unsupported variants and unknown media. Do not fabricate brand/GTIN,
shipping rates, return policy or certifications. Bound each manual preview to
20 records. Preview is not Google approval, sync success or deletion/reconciliation.
No product write is allowed. Missing account/data source/OAuth/eligibility blocks
live release. Existing legacy SDK dependency can remain in the lockfile, unused.

Official references checked 05/11/2026:
- https://developers.google.com/merchant/api/guides/compatibility/overview
- https://developers.google.com/merchant/api/reference/rest/products_v1/accounts.productInputs/insert
- https://developers.google.com/merchant/api/reference/rest/products_v1/accounts.productInputs
- https://developers.google.com/merchant/api/reference/rest/products_v1/ProductAttributes

The products/v1 insert endpoint needs an account and API data source; price uses
integer amountMicros/currencyCode. Old custombatch is not a Merchant API contract.

## P9-01a — operational health API

Add the planned `GET /integrations/admin/health`, ADMIN only/no-store, to the
existing IntegrationsModule. Report exactly eleven selected integrations;
GHN is reused, ten providers come from the existing immutable registry.
Report configuration and release readiness separately. Every provider has
explicit evidence scope, blockers, fallback and null unknown runtime metrics.
No secret-presence inventory, account probing, invented health percentages,
revenue, last success, quota usage or mock-as-live reporting. The legacy Google
OAuth/Gemini/storage paths are clearly marked as outside new flag coverage until
their own batches are implemented. No DB read/write or external call on health.

P9-01a is the API contract only; integrated dashboard UI and E2E release acceptance
remain open. Changes should be verified with real HTTP ADMIN/guest/staff/customer/
banned tests using mocked Supabase auth and zero provider transport.

P9-01b UI extension (before UI code): add a small read-only panel to the existing
admin dashboard, ADMIN only, reusing current flat green dashboard/card/Button/
Skeleton conventions. Strict Zod contract for exactly11unique providers, unknown
runtime metrics remain null, no credential or live provider probe. Public copy
VI/EN distinguishes off/mock/blocked/reused from readiness; show concrete next
steps and the known legacy-flag gap. Manual refresh fetches only health metadata;
no provider enablement or background polling. Mobile stacks each provider's
name/mode/next step; do not add a wide eleven-column monitoring table. Render
loading/error/retry/ready states. The task requests integration wiring, so fetch
handlers are implemented rather than left as design-only stubs. No new design
system or screen/route. Separate isolated fixture preview for desktop/mobile,
schema/fetch tests, typecheck/lint; still no release E2E/live certification.

## Independent follow-ups

## P5-01a — bounded grounded advisor

Before code: legacy ChatService passes free text/history to the model and returns
raw text; it is not a suitable trust boundary for authoritative SKU/price/stock.
Keep those legacy chat routes intact and explicitly outside new flag coverage.
Add the planned `POST /ai/product-advisor` in the existing ChatModule (no second
chat module/session). Strict locale/query/budget/category DTO, public throttled
catalog-only data. Reuse ProductsService.findAll, at most100 active/in-stock
products per snapshot, Vietnamese accent-insensitive lexical ranking and
effective discount calculator. Mark coverage as bounded keyword candidates,
never FTS/vector or full-catalog relevance certification.

DefaultOFF/blocked Gemini policy uses deterministic catalog fallback. Opt-in
local mock uses shared executor and a mock ID-selection adapter only; no SDK,
key, raw query/history, PII or network transport. Accept only selected source
IDs, drop hallucinated/duplicate IDs, re-read catalog after mock selection and
rebuild title/slug/price/stock from that latest snapshot. No generated price,
claim or freeform model text is returned. Unknown provider outcome falls back
to a freshly read bounded catalog rather than failing product discovery.
Empty or unavailable catalog is explicit. No schema migration or embeddings.

Actual Gemini transport/token budget/PII policy, FTS SQL/relevance benchmark and
conditional vector work remain separate release gates. Reuse Google Gemini
structured-output concept (selection contract only), not an assertion that the
existing legacy SDK model was migrated or certified:
https://ai.google.dev/gemini-api/docs/structured-output

## Independent follow-ups (continued)

## P6-01a — reuse and harden existing OAuth callback

Source review finds the existing browser Supabase Google button and PKCE
`/auth/callback`. It currently trusts forwarded host/protocol for redirects,
logs destination/raw exchange errors, and the button omits locale. Before code:
reuse Supabase exchange/cookies and existing session/RBAC; add pure return-path/
origin helpers, keep same-site validated relative returns, prefer existing
NEXT_PUBLIC_SITE_URL in production, and ignore arbitrary forwarded headers.
Keep locale on Google initiation; no visual redesign, new login/session, scope,
token validator, identity table, account merge or hosted settings change.
Require a successful exchange with a session before success redirect; errors
use the existing error page and safe marker only. Cookie-write exceptions must
fail rather than report an authenticated redirect without persisting cookies.

Verify route with injected Next/Supabase/cookie dependencies, covering exchange
errors/replay, missing code, valid session, cookie options, encoded external
paths, malicious forwarded origin, locale and production canonical. No actual
OAuth sign-in, email/account creation or hosted write.

Important external gate: Supabase documents automatic same-email identity
linking. This is NOT proof of meeting the master plan's stronger existing-owner
verification requirement. Hosted linking/provider policy and collision tests
must be reviewed before Phase6 can close; do not create a second auth system to
conceal that gap.

References checked05/11/2026:
- https://supabase.com/docs/guides/auth/auth-identity-linking
- https://supabase.com/docs/guides/auth/social-login/auth-google

P6: keep Supabase Auth OAuth/session and existing callback. Account linking needs
hosted provider configuration/auto-link policy validation and collision tests;
do not add a second JWT or trust email equality.

P7: existing storage/sharp/Next Image stay authoritative. Defer Cloudinary rollout
until the prescribed 10–20 image comparison demonstrates benefit; no source
asset deletion or unmeasured claim of faster media.

External blockers and the remaining GA4 financial/attribution/durable quota and
GSC/PageSpeed installation gates remain open. This design does not certify all
eleven connections or production readiness.
