# P8-02 — bounded incremental mock queue

Design05/11/2026 before code. Reuse MerchantModule/products/v1 mapper,
ProductsService, generic integration_outbox/claim/quota/CAS. Manual ADMIN only,
defaultOFF additional FEATURE_MERCHANT_OUTBOX_ENABLED + existing merchant mock
policy/dev-test/kill gates. No cron, account/key/token or Google mutation.

Queue selected source IDs(max20) or reconcile one paginated source page(max20,
including inactive). Read vi translation explicitly. Active eligible source maps
to upsert; explicit is_active=false maps to withdrawal. Missing/invalid source
requires review, never infer deletion from a transient404. Fingerprint canonical
mapped payload, enqueue reference/action/fingerprint only; unchanged latest captured content
dedupes across calls/processes; new price/stock/content creates a new generation.
Captured A→B→A creates three events, even after the first A was accepted.
Re-read source immediately before simulated delivery and refuse obsolete payload.
No change to DB prices/stock or ad budgets. Accepted mock queue is not Google
approved/processed/listed. No unbounded reconciliation loop.

Manual drain uses existing durable consumer; UNKNOWN/lease conflict never retries
a mutation. Per-process provider lock is NOT distributed per-SKU serialization;
live release must add provider version fencing/serialization/reconciliation,
verified account/data source/OAuth rights before choosing a real handler.
Product write→outbox is not atomic in this batch; explicit reconciliation repairs
missed captures. Automatic source hooks/scheduler/full deletion diff remain open.
Do not collapse these code gates into just missing API keys or call all phases
live-complete. Test source changes/stock/archive/invalid/duplicate/stale/unknown
and actual ADMIN HTTP guards, plus existing source tests.

## P8-02b design correction before implementation

Content-only permanent keys miss A→B→A. Add two service-role-only mock RPCs
on the existing outbox: enqueue holds a transaction advisory lock per product,
dedupes against the latest captured generation, and allocates the next generation
for a changed action/fingerprint. No table, product write or live send. Worker
checks latest generation as well as fresh mapped source before simulation.
This serializes enqueue only; it does NOT serialize outbound provider requests
or make source writers atomic. A source transition never captured is invisible.
No mutation replay for a latest UNKNOWN/DEAD/ACCEPTED same-content generation.
First-install/pause scripts and exact SQL A→B→A/roles/restart tests required.

## Executed acceptance — 05/11/2026

24checksPASS with exact SQL + actual MerchantDeliveryService/IntegrationRepository/
MockDeliveryConsumer. ProductsService source is synthetic (not hosted/catalog
mapper evidence from a real account). Six simultaneous same-content requests
create one durable row; captured A→B→A produces generations1/2/3, B is rejected
as stale, latest A accepted. Prior matching-content A is no longer current.
A fresh service/consumer against the same DB does not resend accepted or UNKNOWN.
Three simulated calls, zero Google calls/hosted writes. Role denials and
metadata before/after pausePASS. Full backend58suites/816testsPASS, API build and
scoped lintPASS. No distributed process load/provider fencing certification.

`pnpm --dir apps/api run test:merchant-queue` runs unit/HTTP/exact SQL workflow.
Manual TEST DB first-install: delivery foundation, then integration-merchant-queue.sql
(two invoker RPCs only; no table/trigger/product mutation). SELECT-only
verify-installed-delivery-features.sql expects PASS for the two Merchant RPCs;
three notification RPCs may be CHUA_CAI if omitted. Pause file revokes only these
two service-role grants, preserving generations/outbox. Never delete history or
reset keys to replay ambiguous work. Hosted installation NOT_EXECUTED.

ADMIN routes under `/api`: queue {source:'mock',productIds:[UUID]} (1..20),
reconcile {source:'mock',page:1} (one page20,hasMore), drain {source:'mock'}.
No cron or automatic page loop. Queue/drain responses always synced:false,
googleApproval:null on drain; mock acceptance is not Google listing approval.
Withdraw requires explicit inactive source, never missing-product inference.
Live release still needs source atomicity/deletion diff/full reconciliation,
source-order fencing (including stale concurrent snapshots), serialized outbound
mutation/account/OAuth/data source/live adapter and external acceptance.
