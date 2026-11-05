# P4-02 — durable notification source capture and mock delivery

Design checkpoint05/11/2026 before code. Reuse MailModule/four Handlebars
templates/SMTP EmailProvider, integration_outbox/usage/lease consumer, Supabase
orders as source and existing ADMIN guards. No duplicate notification table,
mail provider, commerce state machine, scheduler or real email.

## Source and consistency

Prepare a service-role RPC that locks a committed order snapshot and inserts
one reference-only mock event atomically with capture. Supported events are
order_confirmation, payment_success and order_status. Derive status/payment/
recipient binding from DB, not request body. Payment success requires the
existing SePay paid/transaction evidence; shipping/COD alone cannot qualify.
Unique key is order+event+source status (one notification per state). Binding
includes recipient hash and source payment fact, never raw email/address in
outbox. Duplicates return original key; changed recipient/payment facts conflict.

This is atomic **snapshot capture + outbox publication**, not an atomic rewrite
of the earlier order/payment transaction. A process crash between the existing
order write and MailService hook can still miss automatic capture. Explicit
ADMIN capture/reconciliation is supported; transactional source-writer migration
remains a separate gate. Do not mislabel this as gap-free source emission.

Resolve an owned WORKING resend/mock mutation lease server-side, verify template/
order/source/recipient binding against current data, then return only required
email snapshot fields. Refuse stale status, changed recipient, cancelled payment
or expired lease. RPC EXECUTE only service_role. No browser recipient/HTML/price
input. Capture/resolve do not modify orders, payment, shipping or customer rows.

## Application and operations

DefaultOFF FEATURE_NOTIFICATION_OUTBOX_ENABLED + existing Resend mock flag,
registrymock, NODE_ENVdev/test and killfalse required. When opt-in, existing
MailService customer methods capture the event instead of sending SMTP; failures
remain nonblocking and never fall back to SMTP/duplicate sends. Defaultoff
retains current SMTP exactly. Admin-alert SMTP is suppressed entirely while the outbox opt-in is on, including
blocked/failed mock capture. There is no real-email fallback. With opt-in off,
existing customer/admin SMTP behavior remains unchanged.

Explicit ADMIN POST capture/drain only, no cron. Drain uses existing durable
claim/usage/CAS and separately injectable MockResendEmailProvider. Resolve source,
render fixed existing template with Handlebars escaping and simulate acceptance;
never call MailerService in the worker. Unknown send or finish conflict does not
resend/fallback. ACCEPTED is not DELIVERED. Rejected/stale events become DEAD;
manual investigation is required rather than automatic mutation retry.
Read-only paginated ADMIN delivery list returns only IDs/event/state/error codes
and timestamps, never recipient, context/HTML/payload. Missing hosted foundation
is explicit503, not an empty success. Source rows and durable queue survive
pause. No automated dead-letter replay or retention deletion.

Manual test-DB installer depends on existing delivery foundation and observed
orders columns; no remote SQL in this batch. Exact SQL/roles/pause/dedupe/lease/
source checks in memory, repository/DI/worker/HTTP tests and commerce regression.
Provider/domain rights, actual Resend transport, live bounce signatures and
gap-free order-source transaction hooks remain open.

Official references checked05/11/2026:
- https://resend.com/docs/dashboard/emails/idempotency-keys
- https://resend.com/docs/api-reference/emails/send-email
- https://resend.com/docs/webhooks/introduction

Resend's24hourprovider dedupe does not replace permanent local event ownership;
provider accepted and mailbox delivered are distinct states.

## Executed local acceptance — 05/11/2026

Exact notification SQL:37checksPASS (source eligibility/binding/lease/roles, six
captures→one durable event, changed facts conflict, pause preserves records).
Actual MailService→NotificationRepository→SQL→consumer→HBS→MockResend workflow:
19checksPASS; accepted survives a new service/provider instance; unknown remains
UNKNOWN and is not sent again. Both durable requests and emails counters used.
SMTP calls0, real emails0, hosted writes0. Full backend58suites/816testsPASS,
including ADMIN HTTP/strict bodies/paginated history privacy and source failures.
Build/scoped lintPASS. No live delivery or hosted-install acceptance implied.

Existing payment-success/status MailService hooks use references when opted in.
Order creation currently does not call sendOrderConfirmation; manual confirmation
capture is available, not an automatic new-order hook. Shipping notification
records are not wired into this email worker. Original source transaction hooks,
reconciliation, live Resend and authenticated bounce/delivery webhooks remain open.

Test commands: `pnpm --dir apps/api run test:notifications`. No credentials needed;
HTTP tests use loopback, SQL uses a memory-only database. Install the generic
delivery foundation first, then integration-notifications.sql once on the confirmed
test project only. Check verify-installed-delivery-features.sql: the three
notification functions must be PASS; two Merchant functions can be CHUA_CAI if
not installed. A paused function intentionally reports FAIL. Do not blindly
rerun an installer on existing objects. No remote SQL was executed by the agent.

ADMIN endpoints under global `/api` prefix: GET admin/notifications/deliveries
(page1..1000,20rows), POST capture {source:'mock',orderId,event}, POST drain
{source:'mock'}. No recipient/HTML/amount accepted from caller. No automatic job.
To stop, turn the outbox flag off/restart; this restores existing SMTP hooks,
so review the original mail configuration before creating further test events.
To stop all mail while keeping capture non-sending, keep outbox opt-in on and
disable Resend/kill the new integration path. For database pause revoke the three
RPC grants using the shipped pause file; retain source/outbox/usage records.
