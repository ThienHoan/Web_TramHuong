# P4-03b — accepted shipment → existing mail outbox

Design before code,05/11/2026. Reuse shipping_records kind=shipment, existing
shipping_write_record CAS/RPC/tracking projection, MailModule/outbox/mock Resend.
Existing kind=notification remains the customer tracking feed, not a new mail
queue. Read accepted internal shipment state rather than raw callback status:
tracking can record a provider event even when its transition was rejected.
Do not send email based on that unaccepted provider event.

Add service-only source/capture/publish/resolve/reconcile helpers and one AFTER
row trigger on shipping_records, installed DISABLED. Activate explicitly on TEST
DB after matching app outbox policy suppresses SMTP; enable/pause only this named
trigger. Never replace original shipping/COD/transition functions or update order
payment/status. No live GHN/Resend call, no scheduler or new table/provider.

Qualifying source: existing canonical shipment:staging|production:orderUUID key,
non-null matching order, supported accepted state, bounded ASCII tracking code
and source recipient. Fixed bilingual shipment template contains order reference,
tracking code and accepted state only, no amount or claim that COD was paid.
No fake per-order locale/theme: existing source lacks a verified preference, so
bilingual neutral brand copy is explicit. Broader VI/EN/theme template coverage
remains open. Initial pending/unknown states do not send.

One key per shipment+state+template version. A repeated same-state event is not a
new mail; changed source binding is review-required, UNKNOWN/DEAD never reset.
Payload contains only orderId/shipmentId/status/binding. Resolve owned live mock
lease against current shipment/order binding before simulation; old-state mail
is rejected. This does not lock a provider network call against later source
edits, or guarantee that every historical carrier milestone is delivered.

Known invalid source/conflict → private DEAD shipment_source_review record,
no raw recipient/tracking/body. Other DB failures propagate to preserve source+
outbox transaction atomicity. Shipping RPC is already SECURITY DEFINER; new
helpers are invoker with fixed path and service-only grants. Existing public
tracking projection is unchanged; service private outbox not published realtime.

Bounded ADMIN reconcile-shipments, UUID keyset, at most21read/20processed. Recover
latest qualifying source only, no fabricated historical events, automatic loop,
mutation retry, COD inference or page count scan. Existing private history includes
shipment status/review rows. Exact SQL CAS/projection/rollback/grants/source drift/
dedupe/pause plus actual worker/template/HTTP tests required before claiming local
acceptance. Hosted enable and live delivery remain NOT_EXECUTED.

## Executed local acceptance

54checksPASS with exact smart-logistics/shipment bridge SQL and actual TS repo,
consumer, fixed HBS and MockResend. Default disabled; existing shipping_write_record
function body unchanged; CAS aggregate+tracking projection+outbox roll back
together. Injected store failure rolls back source/projection, invalid recipient
keeps accepted shipment with private DEAD review. Old-state mail rejected before
send, current-state recovery accepted once, unknown not retried after new service
instance. COD order remains PENDING/paymentpending throughout shipment delivery
notifications. Paginated20+5sources, dedupe/roles/pause/metadata and wrong lease
version tested. Two simulations,0mail/GHN/hosted/network calls.

60APIsuites/855testsPASS, build/scopedlintPASS. New unit/HTTP coverage includes
strict source/lease/PII projection, bilingual fixed labels, HTML escaping, no
financial fields, ADMIN guards and mock policy. Tests do not certify a provider
network call, hosted trigger installation or full shipping state workflow.

Review/install integration-shipment-notifications.sql with trigger disabled.
Checker verify-installed-shipment-notifications.sql expects6PASS+DISABLED, then
6PASS+ENABLED only after explicit .enable.sql on TEST DB with app opt-in suppressing
SMTP. .pause.sql disables the producer before revoking its6helper grants.
It does not touch shipping/COD rows, tracking feed, source functions or old triggers.

ADMIN POST /api/admin/notifications/reconcile-shipments uses the same strict
{source:'mock',afterId?:UUID}; latest20shipments only. Mail records are visible
through existing private deliveries list. At-most-once per shipment/state means a
return to the same state does not produce another message. Expired/stale/unknown
work requires review, not key deletion/replay.

If an outbox failure happens AFTER a real carrier already accepted a mutation,
a DB rollback cannot undo that external action. Existing carrier UNKNOWN/manual
reconciliation remains required; never automatically recreate a shipment.
Broader branded/order VI/EN templates, live Resend/webhooks and hosted acceptance
remain open; this bilingual shipment template does not close those gates.
