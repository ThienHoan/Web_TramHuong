# P8-03 — per-product outbound send fence (Merchant mock)

Design before code 05/11/2026. Reuses MerchantModule, MerchantDeliveryService,
products/v1 mapper, the generic `integration_outbox` claim/finish and the P8-02
per-product generations. No Google account, OAuth, SDK, scheduler or live send.

## Gap being closed

P8-02 serializes **enqueue** per product, and the worker checks "latest
generation + fresh source" before simulating. That check and the send are not
atomic, and nothing stops two instances sending the same product at once:

1. Worker A checks gen 1 is current, starts sending gen 1 (content A).
2. Source changes; gen 2 (content B) is enqueued; worker B claims it, checks it is
   current and sends B.
3. A's slow request lands after B's → provider ends on stale content A.

## Design

One additive TEST DB migration after foundation + merchant queue:

- Table `integration_merchant_send_fence` (service-role only, RLS on): per
  product `started_generation` (monotonic), `accepted_generation`, in-flight
  generation/token/until, `last_outcome`. No product data or payload.
- `integration_merchant_begin_send_mock(outbox id, lease token, version)`:
  verifies the caller still owns a live WORKING merchant mutation lease, takes
  the same per-product advisory lock as enqueue, then:
  - row is not the latest generation/fingerprint → `stale` (never sent);
  - generation ≤ `started_generation` → `stale` (this or newer already began;
    an UNKNOWN generation is never re-sent);
  - another generation still in flight (unexpired) → `busy`;
  - otherwise acquire: `started_generation = g`, in-flight token, 60 s lease.
- `integration_merchant_end_send_mock(token, ACCEPTED|UNKNOWN|REJECTED)`
  clears the in-flight slot only for the matching token; ACCEPTED advances
  `accepted_generation`. A superseded token → PT409.
- `integration_merchant_defer_mock(outbox id, lease token, version)`: for a
  `busy` (or fence-unreachable) row, returns it to QUEUED after 30 s and gives
  back the claim attempt, **only if** the fence proves this generation never
  started. Otherwise PT409 → the lease expires → UNKNOWN (conservative).
- `integration_merchant_fence_ready_mock()`: preflight so a missing/paused
  fence makes drain 503 before any row is claimed (no rows burned to DEAD).

Worker order: validate payload → re-read source and compare fingerprint →
`begin_send` → simulate → `end_send` → consumer `finish`. Simulated provider
errors end the fence as UNKNOWN (or REJECTED for a definitive rejection); the
outbox row follows existing rules (mutation never retried).

Generic consumer gets one backward-compatible hook: a handler may throw
`IntegrationDeferred`; when the caller passed a `defer` callback the row is
deferred instead of finished, counted as `deferred`. Other providers unchanged.

## Guarantees and limits

- At most one in-flight send per product across instances; sends start in
  generation order; an older generation never starts after a newer one.
- The 60 s fence lease must exceed the transport deadline (consumer executor
  8 s). If a request outlives its fence, ordering is not guaranteed: Merchant
  API has no conditional write, so live release still needs read-back
  reconciliation. Not a provider-side fence.
- A deferral consumes one mock budget unit (reserved before the handler) —
  conservative over-count.
- Not in scope: source-write atomicity, deletion diff, scheduler, live account.

## Verification required

Exact SQL in PGlite with the real service/repository/consumer and two workers:
in-flight gen 1 + new gen 2 → gen 2 deferred, then sent after gen 1 (order
A, B); older generation after newer started → stale; duplicate begin → stale;
crashed in-flight expires → newer acquires, old token PT409; defer refused once
started; lease/row ownership checks; roles; repeat install; pause → drain 503
with zero claims. Plus unit tests, existing P8-02 workflow and full API suite.

## Acceptance — local, 05/11/2026

Implemented as designed. One fix made before testing: the ownership check
compared payload keys with `!~`, which yields NULL (and passes) when a key is
missing; now `coalesce(...,'')` so a malformed row is refused.

- Files: `migrations/integration-merchant-fence.sql` + `.pause.sql`;
  `src/merchant/merchant-delivery.service.ts` (fence preflight, begin/end,
  defer; the separate `is_current` call is replaced by the atomic check in
  `begin_send`); `src/integrations/mock-delivery.consumer.ts`
  (`IntegrationDeferred`, optional `defer`, `deferred` count);
  `integration.repository.ts` (4 methods) and `integration-database.types.ts`;
  tests `src/merchant/merchant-fence.spec.ts`, `merchant-delivery.spec.ts`
  (mocks), `scripts/verify-merchant-fence.cjs`, `verify-merchant-workflow.cjs`
  (now installs the fence); checker `verify-installed-merchant-fence.sql`.
- Exact SQL, two independent workers (own service + consumer each), 52 checks
  PASS: worker A in flight on gen 1 → worker B claims gen 2 → `deferred:1`,
  row QUEUED, attempts restored to 0, `SEND_FENCE_BUSY`, not due for 30 s (a
  repeat drain claims nothing); A finishes, gen 2 then sends → order
  200000000000 then 300000000000 micros, fence started/accepted 2. Older gen
  after newer started → `stale`; duplicate begin on the same lease → `stale`;
  ended token cannot end twice; defer refused once started. Crashed in-flight
  gen 5: gen 6 `busy` → deferred; after fence expiry gen 6 acquires, gen 5's
  token PT409, gen 5 outbox becomes UNKNOWN on lease recovery. Wrong lease
  token/version, expired lease, non-merchant row, merchant row missing a key →
  PT409; bad outcome 22023. anon/authenticated denied on 5 RPCs + table; repeat
  install refused; pause → 5 RPC checks FAIL, drain 503 with the queued row
  unchanged (state/attempts/version).
- Mutation checks, each detected: no busy check, no monotonic started check,
  no coalesce on payload keys, defer without started proof. Migration restored
  byte-identical.
- Unit 16 cases: preflight 503 before claim; acquired → end ACCEPTED before
  finish; busy/fence-error → deferred, unsent; stale → DEAD; defer refused →
  conflict, not finished; ambiguous → fence+outbox UNKNOWN; definitive reject →
  REJECTED/DEAD; end-ACCEPTED failure → UNKNOWN; other providers without
  `defer` keep DEAD; repository response validation.
- Regression: full API 65 suites/940 PASS; `test:merchant-queue` 85 Jest + 24 +
  52 SQL; `test:notifications` (shares the consumer) 60 Jest + 37 + 19 SQL;
  foundation 57 SQL; build and scoped ESLint PASS; `tsc` shows only the 5
  pre-existing spec typing errors.
- Not run: hosted install, Google calls, real multi-process load (PGlite is one
  connection; the two workers interleave on it).

### Operator steps (TEST DB only, when wanted)

1. Foundation and `integration-merchant-queue.sql` installed.
2. Run `apps/api/migrations/integration-merchant-fence.sql` once; then
   `docs/integrations/verify-installed-merchant-fence.sql` → six rows PASS.
3. Existing flags unchanged (`FEATURE_MERCHANT_SYNC_ENABLED`,
   `FEATURE_MERCHANT_OUTBOX_ENABLED`, public HTTPS `FRONTEND_URL`). Without the
   fence installed, `POST /api/merchant/drain` now returns 503
   `MERCHANT_SEND_FENCE_UNAVAILABLE` and claims nothing.

Rollback: stop drains, run the `.pause.sql` (drain → 503, rows kept). Never
delete fence or outbox rows; UNKNOWN generations are never re-sent.

### Still open

Live account/data source/OAuth and adapter, read-back reconciliation (Merchant
API has no conditional write), source-write atomicity, deletion diff,
scheduler, hosted acceptance.
