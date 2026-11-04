# P1 execution and delivery foundation

## P1-02c — mock execution policy

`src/integrations/integration-executor.ts` is exported by existing IntegrationsModule. No new public route, SDK, credential read or fetch transport. `runMock(provider, operation, read|mutation, injectedMock)` only runs when the existing registry returns mock; disabled/staging/production configurations never invoke the callback. All results carry source=mock, correlation ID and attempt count; errors expose fixed codes only, never exception messages/payloads. GHN keeps its existing client.

Defaults:8s deadline, at most1 read retry (absolute max2), backoff200ms×2^attempt +0–99ms jitter, provider circuit opens after3 availability failures for30s, one half-open probe. Concurrent older successes cannot close a newer circuit generation. Mutations are never retried; timeout/unavailable means UNKNOWN and must be reconciled before any later send. A timeout rejects promptly even when a mock ignores AbortSignal, but its concurrency slot remains held until actual settlement; at most4 such calls/provider by default.

Mock-only process budgets:100 attempts/UTC day/provider,30/minute; reservation before await; failures/retries consume attempts; once-per-day60/80/95% notices. These are **not durable live usage accounting or invoice limits**. Registry live quota remains0 and live access blocked; next batch supplies a separate durable store before live activation. Settings are bounded in code, not user-supplied request data.

Actual checks03/11/2026: Jest11suites/92tests PASS, including21 executor scenarios and71 prior selected regression; API build PASS; scoped integrations ESLint PASS after fixing2 unbound-method references in test logging capture. Frontend/browser checks not rerun: no frontend changes. No remote SQL/provider request, mail, payment, shipping, account mutation or billing. Sources: [Node AbortController](https://nodejs.org/api/globals.html#class-abortcontroller), [PostgreSQL SELECT locking](https://www.postgresql.org/docs/17/sql-select.html), [INSERT conflict semantics](https://www.postgresql.org/docs/17/sql-insert.html).

Rollback: remove executor provider/export and its2files; registry/default-off flags continue to protect new paths. No DB rollback needed. Legacy Gemini/Merchant call paths are not gated by this executor until their dedicated migration batches.

## P1-02d — durable delivery and usage schema

Prepared `apps/api/migrations/integration-delivery-foundation.sql` and non-destructive rollback `integration-delivery-foundation.pause.sql`; **NOT APPLIED remotely**. This is a separate migration from the permissions patch the owner already applied. It is first-install SQL; a repeat attempt refuses atomically rather than silently modifying an existing schema.

Reuse review: owner export has no generic outbox/daily usage equivalent. GHN already stores inbox/event/COD/notification in shipping_records; those records, RPCs, tables and triggers are untouched. user_events requires product_id and has no delivery dedupe/lease contract, so it is not repurposed. No additional notification_deliveries or integration_inbox table is created.

New tables, private to service_role:

- integration_outbox: unique(provider,environment,dedupe_key); event type, read/mutation, bounded object payload, state/attempts/version, token+deadline lease, provider message ID and fixed error code. Dedupe keys must use a recipient hash when needed, never raw email/phone. Do not store secrets; PII in rendered email bodies should be avoided until retention/access policy is finalized.
- integration_usage_daily: unique(provider,environment,UTC day,metric), used/hard limit/once-only warning thresholds; integer requests/tokens/emails/milli_credits. No config/credential table. Quota0 denies every reservation; each mock call requires an explicit bounded limit.

RPC contracts:

| RPC | Contract |
| --- | --- |
| integration_claim(provider,environment,limit≤20,lease5–300s) | Mock only. Bounded stale-lease sweep + SKIP LOCKED claims, increment version/attempts, distinct random lease token. Expired mutations→UNKNOWN, expired reads→QUEUED or DEAD at8 attempts. |
| integration_finish(id,token,version,outcome,messageId?,errorCode?) | Exact unexpired WORKING lease only. ACCEPTED is not DELIVERED; UNKNOWN needs reconciliation, DEAD needs operator action. RETRY only for read operations, bounded backoff and max8 attempts. No automatic mutation retry. |
| integration_reserve_usage(provider,environment,metric,amount,hardLimit) | Mock only. Lock daily row, atomic check+increment; every retry/failure counts conservatively. Mismatched same-day limit→policy conflict; exceed→PT429. Returns newly crossed60/80/95 thresholds once per day. No client-supplied accounting day. |

Tables RLS-enabled with no public/client policies, anon/authenticated have no table or RPC privileges; service_role keeps private backend access. Both RPC environment guards and existing registry block live execution. No queue worker, default-enabled cron, provider transport, producer/source transaction hook or API endpoint is added by this schema batch. In particular, SePay/order updates do **not yet** emit events; do not claim atomic payment-event delivery before that producer hook is implemented and tested together.

57 checks PASS against the exact SQL/pause in PostgreSQL in-memory. Cases: ACLs, duplicate keys, distinct provider scope, mock-only enforcement, claim competition, stale tokens/versions, accepted vs delivered, uncertain mutation/no retry, read timeout recovery/exhaustion/backoff, transaction rollback, quota0/hard stop/policy mismatch/provider/metric scope, warning thresholds, competing usage reservations, repeat-install refusal preserving counts, pause preserving all rows. PGlite queues Promise.all operations on one engine; this tests reservation/claim outcomes, not a multi-connection PostgreSQL load certification. SELECT/row-lock/ON CONFLICT semantics were reviewed in official PostgreSQL17 docs. Initial test helper expanded a volatile composite function with `(function()).*`, causing repeated finalization; fixed helper to `SELECT * FROM integration_finish(...)`, then57checks passed. The RPC implementation was not weakened to permit duplicate finalization.

Rollback: stop consumer jobs/disable flags, run pause SQL to revoke service-role execution on these3RPCs; keep outbox/usage tables for reconciliation, no automatic DROP or deletion. A paused mutation with unknown external outcome must be reconciled before resume; quota counts are not blindly refunded. Resume requires explicit regrant after operator review, not rerunning first-install SQL.

Next: typed repository and consumers with mock adapters, then Turnstile server/form contracts; flags remain OFF. Before any real provider integration, use durable quota reservations on its call path, operator-approved account limits, SDK timeout handling, source event transaction hooks and provider-specific outcome reconciliation. The mock memory executor is not promoted to a financial usage ledger.


## P1-02e — repository và consumer mock (03/11/2026)

`integration-database.types.ts` gắn hợp đồng additive tables/RPC vào Database hiện có; dùng type aliases để tương thích Supabase GenericSchema. `integration.repository.ts` dùng SupabaseService hiện có: dedupe key + canonical payload conflict check, claim đúng mock/provider/lease, reserve quota trước callback, finish theo token/version. Không có DB query lúc constructor/module khởi tạo.

`mock-delivery.consumer.ts` chỉ chạy khi được gọi tường minh, requireMock trước truy cập DB, mỗi lease tương ứng một reservation/callback, readRetries=0 trong executor để retry do durable queue quản lý. Mutations bất định UNKNOWN; read transient RETRY; quota DEAD; không gọi lại callback khi CAS finish xung đột; accepted chỉ tăng sau finish thành công. Guard overlap trong process cộng lease CAS từ SQL. Không cron/producer/hook orders/mail.

16 tests mới (9repo/7consumer) PASS; SQL57checks vẫn PASS; backend full35suites/339tests PASS sau tích hợp contact. Hosted migration chưa được agent xác minh, không hứa consumer đã chạy trên Supabase. Rollback: không gọi consumer, flags off; nếu pause RPC cần dùng file pause có sẵn và giữ rows. Không có migration mới trong batch này, không thay GHN aggregate.
