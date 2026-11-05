# P4-03 — opt-in transactional order notification source

Design before code, 05/11/2026. Reuse orders, source snapshot/capture RPCs and
integration_outbox; do not replace transition_order/enforce_order_transition,
SePay verification, stock/voucher/cart transactions, shipping CAS or SMTP.
Manual TEST DB package only. No hosted apply/real email/provider/env change.

## Transaction boundary and default

Add one AFTER INSERT OR UPDATE row trigger on orders, installed DISABLED in the
same transaction. The operator enables only this named trigger on the confirmed
TEST project, after new app source is deployed with notification outbox opt-in
on and SMTP hooks suppressed. DB enable is separate from process flags; process
kill switch stops workers but cannot disable a database trigger. Disable this
trigger BEFORE pausing underlying capture grants or restoring SMTP. No ALL/USER
trigger toggle, no replacement of existing triggers/functions, no source backfill.

When enabled: insert captures order_confirmation; a qualifying transition into
SePay paid captures payment_success; other changed order status captures
order_status. A simultaneous SePay paid/status transition produces payment only,
not a redundant PAID-status email. Existing MailService captures dedupe against
the same keys. No update on unrelated columns/no-op writes emits an event.
This makes the actual order-row write and publication one transaction, including
writes through existing RPCs. It does not make the pre-existing multi-request
stock/voucher/order workflow atomic or serialize provider sends with source edits.

Wrap only known snapshot-invalid/source-conflict failures into a reference-only
DEAD notification_source_review record. Missing recipient must not roll back a
valid payment merely because an email cannot be rendered. Review rows contain
order/event/status/static reason, no recipient/context/HTML. Do NOT catch other
errors: an unavailable outbox must roll back the opted-in source statement so it
cannot falsely commit without its event. Application payment path must report
persistence failure; never retry a mutation blindly. Default disabled preserves
current source behavior. Exact rollback/failure tests required.

## Reconciliation

Service-role-only bounded RPC: UUID keyset cursor, read at most21 source rows,
process at most20 and return hasMore/nextCursor, no total scan/count loop/cron.
Recover pending confirmation, eligible SePay payment and latest non-pending
status; do not fabricate lost historical transitions. Only source references
from the database; no caller recipients/amount/template. Same permanent event
keys; UNKNOWN/ACCEPTED/DEAD never reset/replay. Invalid source gets private review,
changed binding remains conflict. Include review rows in existing ADMIN history.
ADMIN POST /api/admin/notifications/reconcile strict source:mock,cursor UUID
optional, existing notification flag/local/mock/kill gates. No new UI in this batch.

## Acceptance and operations

Exact PostgreSQL memory SQL: disabled default, source+outbox rollback together,
paid transition dedupe/no double status, process-hook omission, no-op writes,
invalid-recipient review preserving payment, genuine store failure rolling back
source, pagination/source edits/no replay, roles, existing triggers unchanged,
metadata, first-install refusal and pause. Actual TS HTTP/repository path and
commerce regressions; no real .env/AppModule/hosted database/provider.

Official PostgreSQL17 docs checked05/11/2026:
- https://www.postgresql.org/docs/17/trigger-definition.html
- https://www.postgresql.org/docs/17/sql-altertable.html
- https://www.postgresql.org/docs/17/plpgsql-control-structures.html

Shipping notifications require a separate follow-on bridge from existing
shipping_records kind=notification, not a second GHN state machine. Live Resend,
webhooks, templates VI/EN/brand coverage and full live acceptance remain separate.

## Executed local acceptance

Exact SQL + actual TS repository:52checksPASS. Disabled/enable/pause/metadata and
first-install refusal tested; original admin-order-integrity trigger runs against
enum fixture, cancellation restores stock, source/outbox rollback together.
Missing recipient→private review while payment commits; revoked outbox INSERT→
source financial statement rolls back. Keyset20+9pages, duplicate/UNKNOWN and
changed-recipient conflicts preserve original event ownership. No SMTP/network.
Initial checker assertion sorted its labels incorrectly; fixed test expectation
to checker ORDER BY check_name, then reran successfully.

Full backend after both P4-03 batches:60suites/855testsPASS; API build and scoped
mail/integration-types lintPASS. Source triggers remain DISABLED in installers;
no hosted SQL/env change. Source atomicity here is the order row transaction,
not stock/voucher/cart or a distributed provider request.

Operator sequence on confirmed TEST project: keep producer absent/disabled;
review/install source.sql after base notification SQL; run
verify-installed-notification-source.sql (3PASS+DISABLED expected). Deploy app
with notification outbox opt-in +Resend mock/local gates so SMTP is suppressed;
then source.enable.sql explicitly enables only the new named trigger. Expect
3PASS+ENABLED. Create a synthetic test order/paid update, check private outbox,
then drain only mock. To pause, source.pause.sql FIRST, before revoking base
capture grants or restoring SMTP. Process kill is NOT database-trigger pause.
No automatic remote enable/reconcile/backfill was executed.

ADMIN POST /api/admin/notifications/reconcile body {source:'mock',afterId?:UUID};
read/process20orders per request, source cursor/hasMore returned. No client limit
or automatic page loop. It cannot reconstruct every missed historical status.
