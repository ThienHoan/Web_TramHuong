# Multi-API implementation progress

Updated: 05/11/2026 (Asia/Ho_Chi_Minh). Spec: `../TRAMHUONG_MASTER_API_IMPLEMENTATION_PLAN.md`. Scope đúng11 providers. GHN REUSE, không triển khai lại. Không commit/push.

## Gate status

- [x] P0-01 repository inventory, core service/route/SQL/UI/CI tracing và baseline.
- [x] P0-02 official docs11/11, capability/cost/access matrix, state ownership và migration decision list.
- [x] Repository design gate: state machine và migrations proposed/blocked đã ghi **trước khi sửa code**.
- [x] DB-01 observed DB metadata: owner đã cung cấp đủ13 sections; reviewed in 04-schema-review.md. Không còn chỉ dựa repository snapshots.
- [x] ENV-01 owner xác nhận database thử nghiệm ngày03/11/2026. Production vẫn không được phép; không còn hỏi lại môi trường. Apply remote cần SQL access/tool phù hợp, không dùng secret để gọi endpoint chạy SQL không công bố.
- [ ] ACCESS-01 quyền/quota/credentials provider live: NEEDS_ACCOUNT, không gọi authenticated production APIs để kiểm tra.
- [x] Phase0 audit/design gate: hoàn tất với observed ERD + migration decisions dựa metadata thật; giới hạn env, Data API exposure, enum labels, auth triggers và missing account rights được ghi rõ. Đây không phải production readiness signoff.
- [x] P1-01 config/flags/default mock policy infrastructure (10 non-GHN providers); không phải10 provider adapters đã triển khai.
- [ ] P1-02 durable quota/outbox/inbox adaptation (depends DB-01), timeout/circuit/log redaction.
- [x] P1-02a permission migration/rollback + local verification + signup compatibility; remote apply OWNER_REPORTED_SUCCESS03/11/2026; metadata verification pending.
- [x] P1-02b logging privacy: Supabase bootstrap bỏ URL/key-prefix/key-length, SMTP failure bỏ recipient/raw error; regression71tests PASS.
- [x] P1-02c mock executor timeout/read retry/circuit/concurrency/rate/day budgets + safe telemetry;92tests PASS. Live transports/usage not activated.
- [x] P1-02d durable outbox/usage additive migration + RPC contracts/pause +57localSQLchecks PASS; hosted apply NOT_EXECUTED, consumers/source transaction hooks pending.
- [x] P1-02e typed repository + explicit mock consumer:16new tests PASS; no source hooks/cron/live activation.
- [x] P1-03 Turnstile mock + server policy + existing contact form integration, local browser/HTTP acceptance PASS; Cloudflare live BLOCKED pending rights/keys/wiring/staging acceptance.
- [x] P2-01a GA4 consent +8pre-purchase funnel mock,35web tests/13policy-RBAC tests and local browser acceptance PASS; defaultOFF.
- [x] P2-01b authenticated-owner server mock purchase, durable order/payment dedupe, quota and default-OFF subflag; local acceptance PASS.
- [ ] GA4 hosted install + guest receipt capability + full ecommerce attribution/DebugView acceptance; P1 hosted/source-event gates remain open.
- [ ] P2 GA4 full gate → GSC → PSI; P3 GHN compatibility review; P4 SMTP/Resend; P5 Gemini/FTS/vector conditional; P6 Google reuse; P7 Cloudinary conditional; P8 Merchant v1 migration; P9 admin acceptance.

## Batch P0-01 — inventory and baseline

SCOPE: Audit hiện hữu, không đổi business code. REUSED: Orders/SePay/voucher/auth/SMTP/shipping modules, theme adapters, SQL fixture engines. FILES: 00-repository-audit.md, repository-inventory.md, baseline-evidence.json, implementation-progress.md. MIGRATIONS: none; not executed remotely. FLAGS: existing flags unchanged.

TESTS RUN: backend build PASS; jest27 suites/246 tests PASS sau approval local listen (sandbox attempt 24 suites/210 tests pass, 3 suites bị EPERM); backend lint FAIL baseline110 errors/2 warnings; web lint PASS0/0; web typecheck stale generated route FAIL rồi next typegen+typecheck PASS; logistics SQL28 checks PASS in-memory. Install skipped vì dependencies có sẵn. Web production build/browser/live tests NOT RUN (outbound fonts/prerender and no isolated fixture server); không lấy prior GHN screenshots làm bằng chứng mới. Lệnh `pnpm test -- --runInBand` ban đầu không tìm tests vì wrapper truyền separator, đã sửa sang pnpm exec jest; không tính invocation đó là test regression.

EXTERNAL ACCESS: public documentation only. COST: không bật thêm dịch vụ, không outbound authenticated calls, không giao dịch/mail/shipment thật. RISKS: pre-existing non-atomic voucher/order/stock writes, incomplete payment transaction uniqueness validation, unknown hosted schema, legacy Merchant cron/Gemini direct calls. ROLLBACK: documentation only; next typegen chỉ tái tạo ignored artifacts. NEXT: P0-02 design.

## Batch P0-02 — technical design and access

FILES: 01-capability-matrix.md, 02-architecture-and-dataflow.md, 03-cost-and-access-register.md; inventory environment **names only**. REUSED: GHN inbox/COD/notification aggregates, Supabase Auth identities, Nest scheduler/cache/throttler, SMTP + sharp + Next/Image. DECISIONS: không tạo shipping_v2/orders_new/new session; config registry không cần DB table; ERD/migration cụ thể deferred DB-01. CONTRACTS:11 providers và actual vs proposed routes, auth/PII/outcome expectations.

VERIFICATION: docs checked against official provider pages03/11/2026; Merchant Content API sunset detected, PSI field-data availability caveat, Gemini quota account-dependent. Baseline carried from P0-01, chưa có business diff để rerun frontend journeys. COST/ROLLBACK: no runtime changes/no billable activity. NEXT SAFE ACTION: P1-01 typed default-off mock registry + policy tests; independent of DB. DB-dependent schema workers stay blocked until verified staging schema.

## Batch P0-03 — owner-supplied actual schema review

STATUS: Phase0 audit/design complete; live release/DB changes remain blocked. FILES: 04-schema-review.md + updates to00/02/implementation-progress; source attachment not copied to Git. EVIDENCE: 17 public tables/195 columns/44 policies/14 functions/66 constraints/65 indexes, PostgreSQL17.6; 13 section shape/counts parsed offline, Markdown pipe escape normalized. Observed existing shipping CAS/inbox/COD/notifications and auth.identities, user_events/product-required schema checked; no duplicate module/table created.

FINDINGS: users protected-column/public PII policies, authenticated blog writes, direct order/contact insert concerns, non-unique SePay transaction index. Source-grounded NEEDS_VALIDATION only; security-audit guidance requires stronger OS isolation before security fixture execution, not demonstrated here. No exploit/security execution, hosted endpoint call or DB write. No severity/production vulnerability claim. Existing baseline246 tests is prior batch evidence, not rerun for documentation-only review.

DEPENDENCIES: DB-01 metadata gap resolved for design; ENV-01 and access/account/security-validation gates remain. NEXT: P1-01 isolated default-off registry/mock policy, no DB migration or live adapter. Historical notes below describe state before owner supplied full metadata; current Gate status takes precedence.

## Latest operator update — 03/11/2026

Owner báo đã chạy integration-permissions.sql thành công trên Supabase thử nghiệm. Mark apply OWNER_REPORTED_SUCCESS, không phải agent-verified metadata/endpoint acceptance. Không yêu cầu chạy lại migration. Chưa có report sau apply để chứng nhận grants/RLS thực hoặc live OTP/checkout; các kiểm thử local42/28 vẫn là local evidence. SQL-access blocker của agent không còn chặn batch này vì operator đã apply. Historical NOT_APPLIED/PENDING notes below are superseded for this migration only.

## Resume instructions

### Test handoff — user asks how to verify infrastructure

FILES: apps/api/package.json thêm duy nhất test:integrations alias; docs/integrations/verify-installed-foundation.sql +07-testing-guide.md + progress. Không thay runtime/schema/env. Alias chạy11selected Jest suites +2SQL memory scripts, dừng nếu bước trước fail. ACTUALLY RUN: pnpm run test:integrations PASS92Jest tests +42permission checks +57delivery checks, no remote calls. Existing negative-test shipping errors appear in logs but suites pass; guide explains interpreting final status.

Metadata checker ACTUALLY VERIFIED on memory fixture in4states: before install, permission-only9PASS/5CHUA_CAI, both migrations14PASS, paused3RPC checksFAIL. One SELECT metadata-only, no customer rows/provider RPCs. Hosted run not performed by agent; owner can run it in test SQL Editor. UI regression steps supplied; not claimed executed. Permission apply remains OWNER_REPORTED_SUCCESS; delivery migration installation unconfirmed. Cost0, no commit/push; rollback testing alias/guide/checker only. Current task narrowed to test instructions; no unrelated provider work started in this turn.

### Batch P1-02d — additive outbox/usage foundation

FILES: migrations/integration-delivery-foundation.sql, .pause.sql, scripts/verify-integration-delivery.cjs, docs06-executor-and-delivery.md, p1-02d-evidence.json + progress. Scope1additive migration + related tests, no existing commerce/shipping changes. REUSED existing GHN aggregate/inbox/COD/notification without duplicate table; private generic non-GHN outbox and UTC usage are absent from owner snapshot and now proposed separately. No config/identities table or external API added.

TESTS RUN: exact SQL+pause PostgreSQL in-memory PASS57checks, remoteRequests0/productionWrites0. Includes lease/token/version/claim recovery, no mutation auto-retry, retry max8/read backoff, private grants/RLS, dedupe, quota atomic reservations/60/80/95 notices, first-install repeat refusal and preserving data on pause. Test helper initially evaluated volatile finish multiple times via composite SELECT expansion; fixed to FROM single evaluation; no loosening of CAS. PGlite claim/quota competition is one-engine queued concurrency, not multi-instance load proof. No TS changes after preceding92Jest/build/lint pass, so not rerun unrelated tests for SQL-only batch.

FLAGS/COST: no worker/cron/provider enabled; RPC claim/reserve/finish mock-only with production/staging blocked. Neither source order/payment transactions nor existing SMTP have outbox hooks yet. No hosted schema change; permission migration OWNER_REPORTED_SUCCESS applies to previous permissions file only. New foundation SQL remains NOT_EXECUTED until operator uses tested first-install package. ROLLBACK: flags off + pause RPC execution, preserve all rows/leases/usage, never drop unknown/delivered records. NEXT: P1-02e typed repository/mock consumers+quota reservation boundary, then P1-03 Turnstile. Full Phase1 still incomplete; don't call all11 APIs implemented.

### Batch P1-02c — bounded mock execution

FILES: src/integrations/integration-executor.ts + .spec.ts, integrations.module.ts, docs06-executor-and-delivery.md, p1-02c-evidence.json + progress. REUSED: existing registry, Nest Logger, native AbortController/timers/crypto; GHN client remains untouched. No new SDK/route/schema/env key. Flag off/global kill/staging/prod prevent mock callback invocation. Read retries bounded, mutations never retried and ambiguous outcomes UNKNOWN; hung tasks retain concurrency leases. Circuit one-probe/generation guard and mock-only quota/rate reservations/60/80/95 notices are process-local; live requires durable accounting before activation.

TESTS: Jest11suites/92tests PASS; pnpm build API PASS; ESLint src/integrations PASS. Initial executor tests45pass but2test-only unbound-method lint errors fixed; final92 includes21executor+24config+47other selected regression. No browser/frontend rerun needed for this backend-only batch; no full app startup/provider credentials/network call. COST0; flags unchanged/default OFF. No migration in this batch. ROLLBACK: remove executor provider/files, registry unaffected. NEXT: P1-02d durable outbox/usage additive schema with local tests, then worker/adapter consumption and Turnstile; do not mark full Phase1 complete yet.

### Batch P1-02b — log privacy (cross-cutting logging change)

FILES: src/mail/mail.service.ts + .spec.ts; src/supabase/supabase.service.ts + .spec.ts; p1-02-evidence.json; implementation-progress.md. REUSED: existing Nest Logger, SMTP provider/templates and Supabase client settings. Supabase init no longer logs URL/prefix/key length; SMTP error logs only MAIL_DELIVERY_FAILED, preserves nonblocking behavior and one send call. No sender/recipient/template/routing changes. No credential or error payload sent to logs; no false delivered status.

TESTS RUN: scoped Jest10suites/71tests PASS (mail privacy2, Supabase init privacy1 +68 existing/new-integration regression). Exact command in p1-02-evidence.json. API pnpm build PASS; scoped ESLint4files PASS. Logistics SQL28 checks PASS in-memory, revalidates separate GHN/COD/CAS state path. P1-02a42checks+web login lint/typecheck remain evidence from preceding batch in this turn. No hosted account/DB/OTP/SMTP/provider call and no full backend bootstrap.

COST/FLAGS: no new outbound calls/billing, existing integration flags OFF. This is privacy correction in existing logs, not a provider enablement. RISK: raw SMTP stack details no longer available in application logs; fixed failure marker retained, structured provider outcome telemetry remains future outbox work. ROLLBACK: revert2services; would restore old sensitive logging so prefer a narrower diagnostic fix. No database rollback needed. NEXT: shared bounded transport + durable outbox/quota in P1-02c, followed by Turnstile mock/server policy. Hosted permission patch still NOT_APPLIED; operator can run tested SQL package without waiting for further implementation.

### Batch P1-02a — permission repair package

OWNER STEERING: "db ... đang thử nghiệm" resolves ENV-01; tiếp tục safe implementation/test. FILES: migrations/integration-permissions.sql + .rollback.sql, scripts/verify-integration-permissions.cjs, login/page.tsx signup precheck removal, docs05-permissions-rollout.md + progress. REUSED: existing users/posts/orders/contact backend service-role paths, AuthGuard/RolesGuard, all payment/GHN state machinery. New tables/modules0; no row writes remotely. Repair is existing-path permission tightening, not a new provider feature; provider flags unchanged/off.

TESTS ACTUALLY RUN: exact forward+rollback in-memory PostgreSQL PASS42checks; env allowlist, synthetic rows, remoteRequests0/productionWrites0. Web scoped login ESLint PASS; web tsc --noEmit PASS. No full app boot or live OTP/email/payment/shipment. These are authored migration regression checks, not stronger isolated exploit certification. Dedicated audit sandbox bootstrap EPERM/abort134; Docker daemon absent. No severity upgrade or claim of hosted vulnerability reproduction.

SQL ACCESS: available connectors lack Supabase SQL execution; native Brave getApp timeout44s. No authenticated remote request/SQL apply performed. Package is concrete and ready for operator SQL Editor; details/backup/verify/rollback in05. Rollback restores snapshot's old insecure permissions and is emergency-only. Risks: alternate direct clients may now need backend; schema-only snapshot may be stale; auth trigger definitions and view options were not exported. No billing/new outbound costs.

NEXT SAFE: P1-02b logging privacy; P1-02 transport/durable outbox/quota; P1-03 Turnstile mock route integration. Remote policy acceptance awaits apply+metadata re-export, not permission to work locally. Historical ENV-01 notes below are superseded by current gate status.

### Batch P1-01 — registry và startup validation

SCOPE: Một module IntegrationsConfig. REUSED: Nest ConfigModule/ConfigService; GHN giữ config cũ. ADDED: `apps/api/src/integrations/integrations.config.ts`, `.module.ts`, `.config.spec.ts`. MODIFIED: `apps/api/src/app.module.ts` import module, `apps/api/.env.example` template only. Docs/evidence:04-schema-review.md, schema-review-evidence.json, p1-01-evidence.json,00/02/progress. Không sửa .env thực, checkout/payment/voucher/auth/shipping/mail/chat/merchant call paths.

FEATURE FLAGS: 10 FEATURE_* theo Master Plan mặc định false; INTEGRATIONS_ENV=mock, INTEGRATIONS_KILL_SWITCH=false. Không tạo FEATURE_GHN alias. Flag=true chỉ cho mock mode; staging/production mode BLOCKED kể cả có credential/approval env. Per-provider off và kill switch ngăn requireMockIntegration; cấu hình invalid reject ở startup và lỗi chỉ có key name, không echo value/secret. Registry frozen, không đọc credential. Quota/spend0 và approval/lastChecked=null là metadata chặn live; chưa có durable quota monitor, không hứa giới hạn hóa đơn hiện hữu.

Metadata correction: columns195 gồm173 cột của17 base tables và22 cột relation products_with_discounts. Check đầu giả định chỉ base tables fail; sửa phân loại và rerun PASS. Definition/security options của view chưa export nên gate dùng view cho AI/feed còn NEEDS_VALIDATION; không coi17 base tables là toàn bộ public relations.

TESTS RUN: `pnpm exec jest --runInBand --silent --runTestsByPath src/integrations/integrations.config.spec.ts src/orders/orders.service.spec.ts src/orders/payment-persistence.spec.ts src/orders/shipping-checkout.spec.ts src/orders/order-validation.spec.ts src/vouchers/vouchers.service.spec.ts src/users/users.security.spec.ts src/shipping/ghn/ghn.config.spec.ts --json --outputFile=/tmp/tramhuong-p1-01-tests.json` → PASS8 suites/68 tests (24 new policy/module +44 existing mocked regression). `pnpm build` API → PASS. `pnpm exec eslint src/integrations --no-fix` → PASS. Ordinary feature/regression tests do not bootstrap full app or execute supplied SQL security fixtures. Export metadata shape/reference checks → PASS13 sections/17 tables/195 column references. No browser/frontend rerun: no frontend code change; prior whole repo lint debt remains documented.

EXTERNAL ACCESS: public PostgreSQL/Supabase docs only; no authenticated provider/database access. MIGRATIONS: none. COST: incremental outbound0, no billing. RISK: new flags are not wired to legacy Gemini/Merchant/Google login yet; **off does not shut down existing call paths**. Metadata RLS concerns remain NEEDS_VALIDATION, not live validated. No secret in registry/client or source attachment retained in Git.

ROLLBACK: remove IntegrationsModule import, new module files and example env block; no data rollback required. Disabled provider needs corresponding FEATURE flag=false and backend restart; kill switch applies to new policy users only. NEXT: P1-02a prepare focused permission remediation/local fixtures + log redaction, then shared bounded transport/durable outbox design; database apply and live release remain gated by ENV-01/operator approval/security validation. No commit/push.

### DB-01 export follow-up

User gửi kết quả chỉ gồm managed auth table names (kết quả SELECT cuối của script cũ). Chưa có columns/constraints/RLS/triggers/functions public; không đủ đóng DB-01 và chưa xác nhận môi trường của output. Đã sửa inspect-staging-schema.sql để trả một dòng schema_report JSON chứa đủ13 sections, vẫn transaction READ ONLY; không thực thi trên hosted DB. Operator chạy bản mới trên local/staging, export toàn bộ schema_report và review/redact function constants trước gửi.

Verification thực chạy: exact revised SQL trên PGlite in-memory PASS, đúng1 dòng JSON/13 sections, từng section là array và database.server_version có giá trị. Không hosted access; rollback thay đổi này chỉ cần dùng lại script metadata cũ, không ảnh hưởng runtime/schema.

DB-01 handoff: `inspect-staging-schema.sql` là truy vấn metadata có READ ONLY transaction; **NOT EXECUTED**. Operator xác nhận đúng local/staging, review/redact function definitions nếu có constants nhạy cảm, cung cấp schema-only output cùng migration history. Không cần gửi rows orders/users hoặc secret. Chưa finalize ERD hoặc tạo migration nào. Theo yêu cầu hoàn thành Phase0 trước, P1 chưa bắt đầu; next safe action là nhận/xác minh metadata DB, sau đó P1-01. Các gợi ý config/mock ở trên chỉ là phương án kỹ thuật, không phải phase đã hoàn thành.

Đọc file này + git status + diff trước batch mới. Giữ deletion MASTER_IMPLEMENTATION_PLAN.md, file plan untracked và .agent/ của user. Mỗi batch≤1 module hoặc1 additive migration, ghi tests thực/skip/blocker/rollback, không dùng env thật để bootstrap app có cron. Không commit/push, deploy, DNS, billing, production requests hoặc real transactions. Provider missing access → explicit mock; mock không được hiển thị là dữ liệu thực.


### Batch P1-02e — typed repository and explicit mock consumer

FILES: apps/api/src/integrations/integration-database.types.ts, integration.repository.ts/.spec.ts, mock-delivery.consumer.ts/.spec.ts, integrations.module.ts, integrations.config.spec.ts; apps/api/src/common/types/database.types.ts; docs06/progress. REUSED SupabaseService, existing additive private outbox/RPC and executor; no new table/module/provider SDK. Scope: enqueue dedupe payload equivalence, claim scope/lease checks, durable quota-before-handler, finish CAS, explicit mock drain. No cron/source financial hooks.

TESTS ACTUALLY RUN: repository9+consumer7+config24=40PASS, backend build/scoped lintPASS; final full backend35suites/339testsPASS and existing SQL42+57checksPASS. GenericSchema compatibility initially failed with interfaces; replaced integration schema interfaces with type aliases and recompiled successfully. Counts accepted only after finish succeeds; conflicts never reexecute handler. Flags off or nonmock blocks drain before DB. Hosted migration installation remains UNVERIFIED, no RPC called remotely. COST0, no env edits/commit/push. ROLLBACK no consumer invocation + flags off; preserve durable rows; prior pauseSQL available. NEXT P1-03 contact mock.

### Batch P1-03 — contact protection visible acceptance

FILES: apps/api/src/integrations/turnstile.adapter.ts/.spec.ts, contact-protection.service.ts/.spec.ts, integrations.module.ts; contacts/contacts.controller.ts + contacts.module.ts; app.module.ts token redaction; web contact/page.tsx, components/contact/ContactProtection.tsx, hooks/useContactProtection.ts, services/contact-service.ts; API scripts demo-contact-protection.cjs + verify-contact-http.cjs, package.json; docs08-contact-protection.md,07testing guide/progress. No migration/table or duplicate contacts module. Reused original contact create/adminguards/throttle, shared registry/executor and Traditional Button/palette.

FEATURES: default-off, server status; mock only development/test + loopback Origin; random hashed RAM tokens, single-use300s/action/hostname/time validation; no token persistence/logs; frontend loading/unavailable/retry/expiry/verified, token reset after any submit, retain form on failed save. Off skips verify and hides widget; enabled staging/production returns503, never emits mock token. Siteverify adapter contract authored with injected fake transport, deadline/body cap/redirect:error; NOT registered/wired/live. No Cloudflare SDK loaded or challenge solved. Existing contact page prose remains Vietnamese; new widget has VI/EN.

TESTS ACTUALLY RUN: full backend35suites/339testsPASS (includes29new adapter/contact cases); test:integrations15suites/137testsPASS +42permissionSQL +57deliverySQLPASS. API build/scoped ESLintPASS; web tsc/scoped ESLintPASS. Local HTTP fixture18assertionsPASS (missing/replay/host/origin/size/validation/outage/off/save boundary). IAB390x844+1440x1000 no horizontal overflow; mockready→verified→success resets form/token; deliberate503save retains input; unavailable blocks; short fixture expiry reblocks; off hides/permits submit; ENwidgetverified. Screenshots /private/tmp/contact-protection-mobile.png and desktop.png captured (demo font Arial, not brand font certification). Fixture stores RAM only, no AppModule/cron/envreal/Supabase/mail/provider; own demo ports4400/4401. No live bot/load/checkout journey claimed; commerce/GHN regression mocked via full suite.

COST/IMPACT:0provider calls/DBwrites/billing/DNS/real transactions; defaultOFF, checkout/SePay/order/voucher/SMTP/auth flows unchanged in this batch. BLOCKER: live Cloudflare rights/sitekey/secret/approvedhostnames + transport/widgetCSP/quota/staging acceptance. ROLLBACK flagfalse+restart (widget hidden, old contact flow); full code rollback must keep frontend/statusroute compatible. Deploy backend route before frontend; status unavailable/404 fails closed for contact only. Docs08 holds official sources verified03/11/2026. No commit/push. NEXT: close remaining Phase1 acceptance/source hooks/hostedmetadata, then Phase2GA4→GSC→PSI in separate default-off batches. Full Phase1/live11API not complete.


### Batch P2-01a — consent and nonfinancial GA4 funnel mock

DATE:03–04/11/2026, final local acceptance04/11. SCOPE1functional analytics module across FE adapters and existing AnalyticsModule, no migrations. REUSED registry/defaultOFF, native timers/observer/React context, CartProvider/product discounts, Zen/Traditional cards/PDP/checkout, Button, internal DB revenue dashboard. No gtag/GTM collector existed; one shared mock strategy added. P1local plumbing supplies policy; full P1hosted/security/source-event and Turnstile noncontact routes remain open as listed in09; this mock does not activate or bypass them.

FILES: API analytics/collection-policy.service.ts/.spec.ts, analytics.controller.ts/.module.ts, package.json; FE lib/ga4/contract.ts + tracker.ts, components/analytics/{AnalyticsProvider,AnalyticsConsent,useProductCardAnalytics}, locale layout, CartProvider, both product cards/details and checkout components, payment_select page; QA scripts/demo-contact-protection.cjs --analytics, web scripts/test-analytics.cjs + fixtures/analytics-lab.tsx, web package.json; docs01/03/07/09/progress +p2-01a-evidence.json. Details/relative file manifest in09.

FUNCTION:8GA4pre-purchase enums, stable product ID/VND/item subtotal, privacy allowlist/no free-form payload, intersection card exposure, scope dedupe, add/remove delta only after confirmed operation, checkout entry/address/payment-info boundaries. Consent unknown/deny suppresses without buffering; grant RAM-only; withdraw/cross-tab/expiry/storagefailure clear/deny. DNT/GPC respected. Cap200buffer/60eventsminute/500day per process (mock only). No Google script/cookies/dataLayer/network transport. Policy public mode only/no-store, dashboard retains ADMIN guard/internalDB. Flags inherited false; mock only development/test, staging/production blocked.

TESTS ACTUAL: backend36suites/352testsPASS03/11; after header/test refinements13policy/HTTP/RBACPASS04/11; web35contract/privacy/consent/budget testsPASS04/11. APIbuild/scopedESLintPASS; frontendtsc/ESLintchangedfilesPASS including ZenCheckout. ContactHTTP18assertionsPASS under extended fixture. IABVI/ENcart/PDP and consent flowsPASS; Zen USD display still VNDpayload; cross-tab withdraw clears bothbuffers; fakepurchase blocked; flagoff hidescontrols/events0 while cartworks; mockstaging policy200unavailable/no-store observed. Zencheckout syntheticrecipient→paymentstepPASS, begin/addresspayloadnoPII, no order confirmation. Responsive375x844/1440x1000 nooverflow/screenshots captured. Next dev scratchcompiled openedroutes; webprod build SKIP to avoid .envreal/outboundprerender; SQLunchanged no repeat. React refs lint findings fixed by callback attach/destructured handlers; APItest typing/import findings fixed, final scopedlint0.

COST/EXTERNAL:0provider calls/billing/DBwrites/DNS/mail/transactions; only public Google documentation reviewed. Demo copies local font and address/product fixtures into temporaryapp; no main AppModule/cron/.envreal. Official contract03/11, QA04/11. No new dependency. No gitcommit/push.

LIMITS/BLOCKERS: purchase/refund unimplemented/rejected, no transaction_id/shipping/tax/coupon mapping or DebugView yet. Live measurementID/property/privacy/account terms unavailable; need basic consent/CSP/URL policy and staging acceptance. Financialsourcehooks/outbox hosted installation still unverified. Prepurchase itemsubtotal is not net order revenue (no voucher allocation). No claim fullPhase1/2 or11integrationsready. ROLLBACKflagfalse+restart+reload; APIstatuserror disablesanalyticswithoutblockingcommerce; remove hooks/provider for code rollback, no rows/schema to undo. NEXT P2-01b trustworthy paid receipt/sourceevent + durable dedupe and consent delivery; then GSC/PSI after GA4gate.


### Batch P2-01b — server-side mock purchase with durable dedupe

DATE:04/11/2026. REUSED existing private integration_outbox/usage + SupabaseService/AuthGuard/RolesGuard, existing GA4 policy and frontend consent. One analytics module batch with1additive migration: integration-purchase-capture.sql adds1RPC+partial unique index, no new table/order write/trigger/provider. Pause preserves rows. Design10-purchase-capture.md written before implementation, acceptance/manifest/rollout appended after actual tests.

FUNCTION: authenticated owner + explicit consent only, no admin ownership bypass or guest UUID authorization. Backend reads locked persisted paid/sepay/transaction_code and commercial state, validates total/items/shipping/voucher. Integer-cents allocation keeps sum itemprice*qty exact net excluding shipping/tax; identifiers and fields allowlisted, raw order/payment/customer details absent. Order hash dedupe + hashed-bankcode unique index, reserve durable quota once in same SQL transaction. ACCEPTED=mock captured, never Google sent. No callback/trigger added to SePay; collection is after a consented return request, not an atomic bank-confirmation event. Browser never emits purchase to its RAM event tracker; invisible component calls existing session on result/order-detail routes, suppresses guest/off/deny and cancels ignored results on revoke/unmount. APIerrors cannot block commerce.

FLAGS: FEATURE_GA4_ENABLED and new FEATURE_GA4_PURCHASE_ENABLED defaultfalse, plus existing mock/development-test policy. Purchase subflag validated at startup without echoing input; public mode+purchaseEnabled only. Old backend missing boolean fails closed in new FE; subflagfalse causes no FE capture requests or collector DB writes. Live/staging remains blocked, no .envreal edits. Consent copy now describes possible test-server purchase record rather than falsely promising RAM-only. Retention/live privacy policy still pending.

FILES: migrations integration-purchase-capture.sql/.pause.sql; analytics purchase-capture.service.ts/.spec.ts, controller/module, collection-policy service/spec; integrations database RPC types; .env.example/package.json; web lib/ga4/purchase.ts + tracker.ts; AnalyticsProvider/PurchaseCapture/AnalyticsConsent; checkout/success, order-confirmation/[id], account/orders/[id]; QA purchase-database fixture, verify-purchase-capture.cjs, verify-purchase-http.cjs, updated demo-contact-protection.cjs +web test/lab fixture; docs01/03/07/09/10/progress, verify-installed-purchase.sql and p2-01b-evidence.json.

TESTS ACTUAL: full backend37suites/382testsPASS; scoped analytics43PASS; web43logic/privacy/capture testsPASS; exact PostgreSQL SQL73checks+40roundingcasesPASS (roles/owner/eligibility/malformed/duplicate/quota rollback/first-install repeat/persistence reopen/pause+metadata). HTTPpurchase26checksPASS, six simultaneous captures→one recorded/fiveduplicate/onequota; contact18HTTPPASS. APIbuild/scopedESLintPASS; webtsc/scopedlintPASS, final edits/formattednewfiles checked. IAB pending→noteligible0, simulatedpaid→recorded1, repeated+reload→duplicate1, withdrawdisablesbutton. VI/EN lab cùng receipt,375px không tràn ngang; screenshot /private/tmp/ga4-purchase-dedupe.png. Synthetic Postgres engine serializes queries; not hosted multi-instance load certification or real bank/auth end-to-end. No SQL production/hosted execution.

IMPACT/COST:0externalprovidercalls/Supabasewrites/billing/DNS/realtransactions, no orders/SePay/GHN/SMTP service edits. Demo now writes synthetic PostgreSQL at machine only; no AppModule/cron/realenv. Existing revenue dashboard still DB-only. No commit/push. API row lock has2s timeout; fail closed on missing migration/invalid source, no financial retry/side effect. Existing lack of a unique financial payment ledger is not fixed or certified by analytics index.

BLOCKERS: new migration hostedNOT_EXECUTED, delivery foundation installationunverified; ownerreported earlier permission apply unchanged. Guest ownership capability, COD/manual paid source, refunds, live property/SDK/attribution/DebugView/retention approval remain pending. Unknown source snapshots rejected, no fallback invented prices. ROLLBACK purchaseflagfalse+restart+reload or revoke captureSQL; preserve event/index/usage. NEXT P2-02SearchConsole readonly/mock job/freshness, while hosted/guest/liveGA4 gates remain open; do not mark fullPhase2/release complete.

### Batch P2-02a — Search Console admin mock report/manual sync

DATE04/11/2026. Design11 written before implementation; existing schema17tables reviewed from04, no SEO equivalent, user_events not repurposed. Reused AnalyticsModule, registryflag/executor budget/retry/circuit, AuthGuard/RolesGuard, dashboard/Button/Table/admin styles. No new module/table/migration/dependency. Exact manifest11-search-console-mock.md; files APIsearch-console adapter/service/controller+2specs/module, websearch-console schema/fetch+SearchConsolePanel+dashboard2lines, bothpackage test:seo scripts, demo/labfixtures, docs01/03/07/11/progress+evidenceJSON.

FUNCTION: GETsummary/POSTsync at /admin/seo/search-console, ADMINonly/no-store/strictsource=mock intent. Mock only development/test+explicitflag; defaultoff/kill honored, staging/production blocked, no live transport or cron. 14dayPacificrollingwindow, conservative3daylag/finalweb dimensions date/query/page/device/country, max2pages×100rows/day, duplicate/malformed/externalURL rejection. Detached staging map published atomically; failures preserve previous successful snapshot/time, safe error. Process executor30attemptsminute100day, one read retry, one running sync. Mock rows bound14days×200; process restart clears metrics/budget, not durable incremental upsert. UI synthetic/source/toprows/missing/stale/lastsuccess/disabledjob visible, weightedCTR/position, query changes only when comparable, lowCTRproduct list, themeURLmappingunconfirmed. Financialdashboard stays internalDB, not merged with SEO.

TESTSACTUAL: API34GSCcasesPASS and full39suites416testsPASS, JSON /tmp/tramhuong-gsc-final-tests.json; web7schema/fetchPASS; APIbuild/scopedlint and webtsc/scopedlintPASS. HTTP initially sandboxEPERM, loopback run with permitted executionPASS; lint findings corrected before full regression. Browser VI/EN375no page overflow (tablescrollcontained), default814nooverflow. Never-synced→14days/2missing/4queries/1opportunity, repeatnoaccumulation, quota429preserves rows/time, nextminute retryPASS. Sharedcontact18HTTP and purchase26HTTP regressionPASS afterfixtureADMINaddition. SQLunchanged notrerun; webproductionbuildSKIP existingenv/prerender, isolatedNext testedroutescompiled. Screenshot/private/tmp/search-console-mock.png, defaultviewport restored/VI labopen.

IMPACT/COST:0providercalls/hostedDBwrites/billing/DNS/realtransactions, no checkout/orders/SePay/GHN/voucher/mail/AnalyticsService change. Officialquery/limits/OAuth docs rechecked04/11; quota ceilings distinct from mock caps. No envreal read/change, no commit/push. Rollbackexistingflagfalse+restart/reload or remove panel/controller/factory; no schema cleanup. BLOCKERS verifiedproperty/OAuthrights notconfirmed, encryptedtokenrotation/durableincremental/distributedlockquota/scheduler/liveacceptance and privacyretention/themeURLmapping pending. P2-02 and Phase2 notcomplete. Earlier hostedpurchase/guest/liveGA4 gates still open. NEXT independentP2-03PageSpeed whitelisted mock diagnostics; no live request or job activation without rights/authorization.


### Batch P2-03a — PageSpeed admin mock diagnostics/cache/history

- [x] P2-03a design/official contract/schema reuse review before code, 04/11/2026.
- [x] ADMIN-only strict mock endpoints, default-OFF/rollback, existing module/executor reused.
- [x] Six synthetic targets/mobile+desktop,24hcache,bounded RAM history/regression, lab/field distinction.
- [x] Tests/build/lint/tsc/browser evidence and progress updated.
- [ ] Live: approved URLs/key/quota, actual field contract, durable history/distributed budget, scheduler/staging acceptance.

FILES: APIpagespeed adapter/service/controller+2specs, existinganalytics.module.ts,.env.example4thresholddefaults/package testscript; webpagespeed schema/fetch/PagespeedPanel/dashboard2lines/testscript/package; existingdemo/labfixtures; docs01/03/07/12/progress+p2-03a-evidence.json. Fullmanifest12-pagespeed-mock.md. No newmodule/table/migration/dependency.

FUNCTION: GET/admin/seo/pagespeed/summary and POST/audits ADMINonly/no-store/strictsource+targetID+strategy; arbitraryURL/force/key rejected. Mockdevelopment-testonly, flagfalse default/kill wins/staging-productionblocked/jobdisabled. Fixed.invalidorigin VI/ENhome/PLP/syntheticPDP; cart/checkout/private/transactionURLs excluded. Perpair24hcache/30samples(max360total), one runningaudit/process, existing8stimeout/1readretry/circuit/30attemptsminute100day. Validate URL/strategy/time/version/unit/finite scores/metrics, reject runtime/CAPTCHA/redirect, preservepriorhistory onfailure. Lab4scores/LCP/CLS/TBT; fieldallnull/unavailable, no fakeINP/CrUX/API12/CWVpass. Samepair/version<=7daybaseline warning env10pointdrop/500msLCP/.05CLS/200msTBT, noemail. RAM is not durable history.

TESTSACTUAL: API54PageSpeed cases and full41suites470testsPASS (/tmp/tramhuong-pagespeed-final-tests.json), APIbuild/scopedlintPASS; web10schema/fetchPASS,tsc/scopedlintPASS. Initial testdata parity/error-sentinel assumptions corrected. IABVI/EN375width375nooverflow incllongPDPselector; home mobilecache1sample, QAadvanceDay->2samples/4regressions, desktopindependent1sample/nobaseline, historytimes/versionvisible. Contact18HTTP/purchase26HTTPPASS afterfixturechanges. SQLunchanged notrerun; webproductionbuildSKIP inheritedenv/prerender, disposableNexttestedroutescompiled. QAclock05->06/11synthetic only, noOS/financialsourceclockchange. Screenshot/private/tmp/pagespeed-mock.png, viewportrestored/VI labopen.

IMPACT/COST:0providercalls/hostedDBwrites/billing/DNS/realtransactions, no orders/SePay/GHN/voucher/mail/AnalyticsService edit, no commit/push/realenvchange. OfficialPSIguide/reference/Lighthousetypes reviewed04/11, no universalquota/costpromise/projectrightsconfirmed. RollbackFEATURE_PAGESPEED_AUDIT_ENABLED=false+restart/reload, noSQLcleanup. BLOCKERSPhase2live/hostedpurchase/guestGA4/GSCdurability/PSIfield+approvedURL/key/quota/durablehistory/scheduler remainopen. NEXTP3-01read-onlyGHNreusecheckpoint (owner saysalreadyintegrated/no rebuild), thenP4-01SMTPaudit/providerabstraction/Resendmock preservingSMTPdefault. FullPhase2/3 notclosed.


### Batch P2-LIVE-01 — manual real Google diagnostics, not ingestion

STEERING: owner asked to implement actual APIs, then confirmed localhost only and needs plain-language setup guidance. Scope changed from next GHN/Resend checkpoint to real Google connectivity preparation. No provider access credentials/approved public origin supplied. Configuration presence inspected without printing values; no envreal change.

- [x] Design13 written before code, official PSI/GSC/OAuth/GA4debug contracts reviewed.
- [x] Actual fixed-endpoint HTTP implementations, ADMIN status/diagnose routes in existing AnalyticsModule, secret-safe errors/bounds.
- [x] AES256GCM encrypted GSC refresh token helpers/AAD/keyID binding, no plaintext DB/token browser exposure.
- [x] Tests/build/lint and owner localhost guidance complete.
- [ ] Actual Google acceptance NOT_RUN; public URL/verified property/credentials/rights absent.
- [ ] Full GA4 collection/purchase/attribution, GSC incremental ingest, PSI durable history and multi-instance quotas remain pending.

FUNCTION: GET/admin/integrations/google/status only readiness/missing names, ready does not mean verified; POST/diagnose strict provider/strategy only. DefaultGOOGLE_DIAGNOSTICS_ENABLED=false +individualflags/kill enforced; only staging integrationenv+development/test, production runtimeblocked. One runningmanualdiagnostic,20HTTPattempts/day/provider5/minute/process, zero retries, bounded30s/64KB orPSI5MB, redirects error, rawprovidererrorssecretredacted. PSI actualGET key+4categories approvedOrigin/vi; reuses existing numericnormalizer. GSC actualOAuthrefresh+date-only readonly SearchAnalyticsquery forPacific-3, metricsnull ifmissing, no rawqueries saved. GA4 actual/debug/mp/collect only withnonfinancialsyntheticevent; explicitcredentialsVerified=false/reportsIngested=false, no /mp/collect and no purchase send. No automaticjobs/scripts/providerSDK inbrowser.

FILES: google-diagnostics service/controller+2specs; analytics.module.ts; pagespeed.service.ts onlynormalizerexport/rename; API.env.example blankkeys/defaultoff and package test:google-diagnostics; docs13/progress/p2-live-01-evidence.json. No newmodule/table/dependency/frontend/commerce change. Fullmanifest/instructions13-google-real-diagnostics.md.

TESTSACTUAL04/11/2026: new37cases(27service10HTTP)PASS; full43suites507testsPASS, result/tmp/tramhuong-google-real-tests.json. APIbuild/scopedESLintPASS after testtyping/lint fixes. HTTPusesrealAuthGuard/RolesGuard with syntheticidentity; GoogleHTTPtransportfake only. Encryptiontamper/key/AAD, flags/production/kill/defaultoff, forbiddenorigins, timeout/bodybounds/quota/overlap/redaction/fixedpayloads tested. No newbrowser/screenshots/frontend/SQL testing claim; unchangedparts not rerun. Existingcheckout/SePay/GHN/voucher/mail regressionPASS.

IMPACT/COST:0actualGooglecalls/hostedDBwrites/billing/DNS/realtransactions/commits/push. Old lab screens stillmock and source labels unchanged; actualdiagnosticreturnsgoogle onlyafterHTTPsuccess. Codeprepared doesnotmeanaccountconfigured/connectionverified/liveingestioncomplete. Tokensprovisioning/rotationhelpers available, noOAuthconsentcallback/rotationautomation yet. BLOCKERSlocalhost only, publicorigin/verifiedproperty/GA4stream/secrets/explicitallowedprovider calls unconfigured; distributedquotas/durablepipeline gatesopen. ROLLBACKGOOGLE_DIAGNOSTICS_ENABLED=false/kill+restart; noSQLcleanup. NEXT owner-friendly account/publicstaging setup, then approved manualprovidercheck; no tunnel/publicdeployment/billing or livefinancialevent without approval.


### Batch P2-LIVE-01b — owner-authorized real GA4 debug validation

04/11/2026. Owner created separate property562307226/stream16272049994, measurementG-XJNSBPN8HN; defaultUri example.com is temporary metadata for local test, not an approved PSI target. API rejected emptydefaultUri despite docs; do not repeat empty-URI setup advice. Owner configured backend.env and explicitly requested GA4test. Scriptcheck-ga4-debug.cjs reads config locally (no secret output), only twoGA4values forwarded to isolated service, noAppModule/cron/SMTP/DB, runtimeoptin --allow-google-debug and expectedmeasurementID required. No persistentflag/env changes.

ACTUAL:3Google/debug/mp/collectPOSTs. FirstHTTP200/1validationissue; second narrowed to VALUE_INVALID/client_id. Fixed syntheticclient_id from diagnostic.hex to two positive decimal numbers. Third04/11/202623:24:33Asia/Ho_Chi_Minh (16:24:33UTC) HTTP200,validationMessages[],payloadValidtrue. No /mp/collect,financialpayload,purchase,reporting ingestion. DebugdoesnotvalidateAPIsecret: credentialsVerifiedfalse remains explicit; cannotclaimRealtime/DebugViewingestionverified. Secret kept local, not logged/shared/committed.

FILES: newapps/api/scripts/check-ga4-debug.cjs (explicitoptin,expectedID,duplicateconfigcheck,killhonored,singlefixeddebugrequest); analytics/google-diagnostics.service.ts clientIDfix+safecode/fielddiagnostics only/nodescriptions; service.spec.ts numericID+redactioncase; docsprogress/p2-live-01b-evidence.json. FullAPI43suites508testsPASS, result/tmp/tramhuong-ga4-debug-final-tests.json; no-optinCLI safelyrefusedwithoutnetwork. APIbuild/scopedESLintPASS after regex lint correction. Nofrontend/schema/checkout/SePay/GHN/mailchange thisbatch; noSQL/FE rerun. Rollbackdiagnosticflagsfalse orremoveCLI, noDBcleanup. Next consent-aware browser realstreamtest and explicit permission before anyreportingevent; GSC/PSI remain blocked bypublicURL/property/credentials.


### Batch P2-LIVE-02 — consented ADMIN localhost reporting event

- [x] Design14beforecode; owner authorized continuing toDebugViewtest.
- [x] DefaultOFF/manual customlocal_test_action only; no automatic ecommerce/purchase send.
- [x] Existingconsent/AuthGuard/RolesGuard/policy/module reused; strictbody/origin/teststream/dev-only/kill gates.
- [x] Offline tests +realbrowseroneGoogleHTTP204 accepted.
- [x] Owner screenshot04/11/2026 23:46:32 verifies1 local_test_action in DebugView at23:38:59, property562307226. Full live funnel remains open.

FILES: APIlocal-debug-event service/controller+2specs, analytics.module, collection-policyoptionalmetadata, envexample; FEga4/local-debug client +LocalGa4TestPanel, AnalyticsProvider/Consent, dashboard/lab, existingtest-analytics script; existingdemoCLI adds fixture/live flags/singleGoogleattemptcap; docs14/07/progress+evidence. No schema/module/dependency duplication. Mockshopping labels retained and clarified whenlocaldebugpanelactive. Fixture transport explicitlylabelled, never accepted as realGoogleevidence.

FUNCTION: manualPOST/analytics/local-debug-event ADMIN/no-store, strictactionmanual_test/consentgranted/UUIDeventID/ephemeralnumericclient/session only. ExactloopbackOrigin/defaultOFFFEATURE_GA4_LOCAL_BROWSER_TEST_ENABLED+existingGA4flag/kill+NODEdevelopmenttest+registrymock+dedicatedteststream. Sends actual/mp/collect debug_mode=true/customlocal_test_action/no rawPII/URL/title/money/product/order/purchase. Server20day5minute/process/oneinflight/no retries/dedupesameeventID, timeoutunknown; not durable worker. BrowserisCollecting gates consent/storageexpiry/DNT/GPC, aborts onrevoke, explicitoneclick disabled afterwards. No GoogleJS/cookies/gtag added. General funnel remains mock. Consentcopyupdated; no newevents emittedautomatically frompersistedpreference.

TESTSACTUAL04/11: fullAPI45suites534testsPASS incl26new(15service11HTTP); web46logicPASS incl3new. APIbuild/scopedlint/webtsc/scopedlintPASS. FixtureIABdenylocksbutton/grantunlocks/fake204onecall; thenisolatedactualQAoptin: onebrowserclick->sourcegoogleHTTP204requests1, buttondisabled, safeUIaccepted/ingestionVerifiedfalse. Screenshot/private/tmp/ga4-local-reporting-test.png. OwnerGoogleDebugViewNOT_OBSERVEDbyagent. Sharedcontact18HTTP/purchase26HTTPPASS withnoadditionalGooglecalls. SQLunchanged, noFEproductionbuild/externalprerender. Realreportingrequest1 thisbatch vs prior3validationrequests; never claimreportingingested justfrom2xx.

IMPACT/COST: exactly1Google/mp/collect reportingtest event, consented/custom/nonfinancial, ownerauthorized; no billedservice/DNS/hostedDBwrites/realtransactions/commit/push/envmodification. Demoonlyreads2GA4values, noAppModule/cron/othersecrets. Mainfeaturedefaultoff; QAprocessactivewithONEGoogleattemptcap/run. ROLLBACKflagfalse/kill+restart orstopQA; cannotrecallalreadyacceptedGoogleevent. Remaining BLOCKERS: actualconsent-awarefunnel/durablequota/privacy/retention/financialsource/guestaccount and GSC/PSIexternalgates. NEXT design a separate default-OFF, consent-aware real pre-purchase event batch, retaining existing mock paths and financial safeguards.

OWNER ACCEPTANCE04/11/2026 23:46:32: user-provided screenshot of authenticated Google DebugView shows Web_TramHuong - Test/property562307226, local_test_action at23:38:59, total1 in last30minutes. Single manual test event ingestion VERIFIED; this supersedes the earlier pending observation above. No new Google request, code/env/DB change or transaction. Updated14-ga4-local-browser-test.md and p2-live-02-evidence.json. Evidence JSON parsing/assertions checked; code tests not repeated for documentation-only acceptance. Automatic ecommerce/purchase and standard reports remain unverified; feature defaults remain OFF.


### Batch P2-LIVE-03 — consented ADMIN localhost pre-purchase funnel

- [x] Design15beforecode, existing schema/hooks/module/consent/transport reviewed; no duplicate module/table/migration.
- [x] Eight existing event hooks connected to default-OFF ADMIN localhost test session; dedicated stream/dev-only/Origin/kill gates retained.
- [x] Strict backend privacy/value/item/enum validation, exact-one select_item, shared bounded transport/dedupe/quota/no retries.
- [x] RAM-only explicit start15minutes/20attempts, new-events-only/no history replay, queue10/TTL30s, consent/auth/expiry/stop cleanup.
- [x] API/web/build/lint/HTTP/browser fixtures accepted05/11/2026; progress/evidence/guide updated.
- [x] Follow-up P2-LIVE-03b: owner confirmed all8event names in DebugView05/11/2026. Automatic anonymous/production collection and full Phase2 remain open.

FILES: new APIlocal-funnel.contract/service.spec and weblocal-funnel/LocalFunnelAuth; existing local-debug-event service/controller/HTTPspec, collectionpolicy, envexample; tracker/contract/AnalyticsProvider/Consent/LocalGa4TestPanel/layout; test-analytics/demo/labfixture; docs15/07/progress+p2-live-03-evidence.json. Full relative manifest15. Existing commerce hooks reused unchanged in this batch. AnalyticsService remains DB-only.

TESTSACTUAL: full46API suites576PASS, plus3newbudget/policycases targeted34PASS afterwards (579distinct overall); web55PASS. APIbuild/scopedESLint/webtsc/scopedESLintPASS; demo/testscript syntax +gitdiffcheckPASS. Contact18HTTP and purchase26HTTPPASS, sixconcurrentpurchasecaptures→oneoutboxrow/onequota. Initial sandboxlistenEPERM resolved through permitted local execution. Browser caught nativefetchreceiver issue; unboundcall fix and regression then repeat browserPASS. No new production webbuild/inheritedenvprerender; disposableNext compiled actual routes. SQLunchanged notrerun.

BROWSER: finalfixtureprocess22fakeHTTP204 requests (12Traditional,10Zen), all8names, zeroGoogle; an earlier diagnostic in priorprocess1fakeHTTP204. Same-localePDP/cart/checkoutnavigation keptsession; localechange/reload stopped. Traditionalrecipient→paymentstep withsyntheticaddress, noorderplacement; bothPDP/select/add/checkoutentry; labshipping/paymentenums. Purchasebuttonrejected. Consentwithdraw immediatelystopped/cleared/disabledstart whilecartstillworked; grantdidnotautostart. Zen375px nooverflow, viewportrestored, finalsessionstopped. Screenshot/private/tmp/ga4-local-funnel-test.png.

IMPACT/COST:0newGooglecalls/hostedDBwrites/billing/DNS/realtransactions/commit/push, no real.envchange. DefaultsOFF, runtimecannotproduction/staging, syntheticQAauth isolated. Perprocess30/min100/day forfunnel sharesledger withmanualconservative5/min20/day. No durablequeue/quota/sessionattribution certification. Financialpurchase stays separate mock pipeline. ROLLBACKFEATURE_GA4_LOCAL_FUNNEL_ENABLED=false+restart/reload orstoplab/session, preserveoldmock, noDBcleanup; cannotrecallalreadyacceptedGoogleevent. NEXT boundedrealGA4eight-event DebugView acceptance using preparedexplicitCLIoptin afterreview; then close remainingdurableprivacy/attributiongates and resumeMasterPlan. GSC/PSIpublicURL/OAuth blockers unchanged. FullPhase2/release notmarkedcomplete.


### Batch P2-LIVE-03b — real GA4 Test funnel transport acceptance

- [x] Owner explicitly authorized real bounded session; dedicatedproperty562307226/streamG-XJNSBPN8HN only.
- [x] Consent + ADMIN explicit start, nine actual Google requests cover all eight pre-purchase names;9/9HTTP204, no retry/unknown/drop.
- [x] Session and owned live QA process stopped,4400/4401 listeners absent; persistent flags remain OFF.
- [x] Safe QA log name/timestamp + evidence/docs updated and checked.
- [x] Owner text confirms all8event names visible in DebugView05/11/2026 (OWNER_REPORTED_VERIFIED); no screenshot/count/parameter confirmation. Standard reports/full Phase2 remain open.

ACTUAL05/11/2026 00:11:52–00:13:14Asia/Ho_Chi_Minh: add_to_cart1, add_shipping_info1, add_payment_info1, select_item1, view_item1, view_item_list2 (distinct returns), begin_checkout1, remove_from_cart1. New-events-only: initial mocklistview not resent. Browser9attempted/9HTTPaccepted/0unknown/0dropped, screenshot/private/tmp/ga4-live-funnel-accepted.png. Product/cart/checkoutentry used disposablefixtures; lab shipping/payment enums exercised without address/order submit. Fakepurchase runtime-rejected, Googlepurchase/refund0. No realorders/payments, Supabasewrites, SMTP/GHN calls, billing, DNS, envreal edit, commit/push.

FILES: apps/api/scripts/demo-contact-protection.cjs onlysafeallowlisted eventName/responseat log metadata; docs15/progress+p2-live-03b-evidence.json. TESTS: node--checkPASS, realUItransport9HTTP204PASS, evidenceJSON/name/countassertionsPASS, stop/listenercheckPASS, gitdiffcheckPASS. No collection/businesscodechange; prior579API/55web baseline retained, not rerun this logging/evidence batch. ROLLBACK executed by stopping session/process; noDBcleanup. NEXT owner DebugView screenshot/names confirmation for8events; actualvisitorattribution/distributedquota/privacyretention/financialpurchase and GSC/PSIexternalgates still open.


OWNER ACCEPTANCE P2-LIVE-03b —05/11/2026: owner explicitly listed all8expected names as present in DebugView: view_item_list/select_item/view_item/add_to_cart/remove_from_cart/begin_checkout/add_shipping_info/add_payment_info. This closes event-name ingestion acceptance based on OWNER_TEXT_CONFIRMATION, not agent Google UI inspection. No screenshot supplied; received parameter values and exact counts still unverified. Updated15-ga4-local-funnel.md and p2-live-03b-evidence.json, JSON/name-set/docs consistency and gitdiffcheckPASS. Documentation-only: no code tests rerun, additionalGooglecalls0, env/DB/billing/DNS/realtransactions unchanged, no commit/push. Session/process remain stopped and flags defaultOFF. NEXT check ingested VND/value/items and session fields, then address durable quota/attribution/privacy gates; purchase/revenue and fullPhase2 remain separate/open.


LOCAL LAB REOPENED05/11/2026: owner reported localhost4400 stopped after the completed real test. Restarted existing demo with --analytics --ga4-funnel-fixture (mock transport only, no real credentials read). GET /vi/integration-lab/analytics HTTP200 verified; QA counters requests0/googleRequests0. Mock lab left running on4400/4401 for owner review. Real GA4 process stays stopped; prior owner-confirmed DebugView evidence unchanged. No business code/env/database/schema/billing changes, no commit/push.


PARAMETER EVIDENCE05/11/2026: owner screenshot captured00:22:56 shows DebugView add_to_cart00:11:52, currencyVND/value100000, engagement_time_msec1/sessionID visible. Currency/value match the real-run one-unit100000VND addition; existing cart quantity is not the add_to_cart delta. Partial acceptance only: Google items/unitprice/quantity not visible, single two-unit200000event NOT_RUN. Updated15/p2-live-03b-evidence.json and thisprogress; JSON/valueassertions+gitdiffcheckPASS, no code tests needed for docs-only change. NewGooglecalls0, no env/DB/billing/transaction/commit/push.


OWNER LIVE SESSION REOPENED05/11/2026: owner asked how to open the real GA4 session for the two-unit test. Stopped owned mock lab, restarted --analytics --ga4-funnel-live-test on4400/4401. GET labHTTP200 and publicpolicy dedicatedstreamG-XJNSBPN8HN/funnelEnabledtrue/no fixture marker verified. No outbound event logged at handoff; explicit consent/start remains required. Process cap20Googleattempts, no automatic restart, real.env unchanged/defaultflagsOFF. Live lab left running for owner; guide is lab→explicit start→same-tab product link→quantity2/add once. Two-unit Google parameter acceptance remains pending owner action/evidence; no test result invented. Runtime/docs-only, no businesscode/DB/billing/DNS/transaction/commit/push change.


### P2-LIVE-03c — owner DebugView visibility troubleshooting05/11/2026

- [x] Read existing live sender logs and lab4/4accepted counters; no new event generated by agent.
- [x] Independently inspected owner authenticated Google DebugView via nativeBrave. Old nine-event device was selected. Threeweb entries observed; selecting owner sessions revealed first4events27:42–28:29 and next4events28:58–30:26 (add_to_cart3/remove_from_cart1). Screenshot/private/tmp/ga4-debugview-current-device.png.
- [x] Root cause is DebugView device selection across per-start ephemeral client IDs; no collection failure established and no code/config fix applied. Added runbook15 and p2-live-03c-evidence.json; JSON/count/assertions+gitdiffcheckPASS.
- [ ] Two-unit VND200000/item-level parameters still unverified; do not infer them from name/count acceptance.

Live process left running for owner. Continued owner actions logged17actualHTTP204 total by00:39:44, cap20 unchanged; later owner actions transport-observed only. Agent did not restart/resend or spend extra provider requests. Businesscode/env/schema/DB/billing/DNS/financial/commit/push unchanged. No code regression rerun for docs/UI-selection-only work. Native Google UI was read/selected, no account settings or permissions changed. NEXT keep one session/tab, select matchingweb device in DebugView, inspect existing/new two-unit event once without repeated one-unit additions.


### P2-LIVE-03d — explain automatic session shutdown and exhausted test run

- [x] Confirmed real QA process reached20/20HTTP204 at05/11 00:46:32.520local; later calls hit fixedtransportcap, previously collapsed into unknown/silentstop.
- [x] Design16beforecode. Reused service/ledger/consent/session/panel, no duplicate module/table/migration. Trustedpre-transportcap now blocked/test_limit with duplicate reason; provider/networkerrors remainunknown.
- [x] VI/EN stop causes +RAM sessionID and blockedcounter; knownservercap disablesrearm without reset. Auth/consent/expiry/policy/frontendlimit/quota/busy/rejected/network/unknown/manual distinguished.
- [x] Full46API suites581PASS, web59PASS, build/lint/tscPASS, contact18HTTP/purchase26HTTPPASS; cappedfake20acceptances+blockednew/duplicate, browsercleartext/disabledbutton/sessionIDPASS.
- [ ] Two-unitGoogleVND200000/item-level acceptance stillpending; no new live testbudget opened by thisfix.

FILES: APIlocal-debug-event.service/local-funnel.service.spec, weblogiclocal-funnel/LocalGa4TestPanel/test-analytics, demoCLI, newfixture-onlyverify-ga4-test-limit.cjs; docs16/07/progress+p2-live-03d-evidence.json. Manifest16. Screenshot/private/tmp/ga4-session-limit-message.png. Initial fixturetestsdeclared a manualassertioncount inoutput; removed the unsourcedcount, retained actual accepted/blocked/duplicate outcomes. Node syntax/evidenceassertions/gitdiffcheckPASS; noSQL/webproductionprerender rerun.

IMPACT: oldexhaustedliveprocessstopped, cappedfakefixturelefton4400/4401. Browser1attempt/0accepted/0unknown/1blocked; fakeGooglecalls0, actualnewGooglecallsbyagent0, hostedDBwrites/billing/DNS/realtransactions0, real.env/defaultOFF flagsunchanged, no commit/push. Checkout/orders/SePay/GHN/vouchers/SMTP/revenue code unchangedthisbatch. ROLLBACKlocalfunnelflagfalse+restart/reload orstoplab, noDBcleanup. NEXT operator-controlled boundedlive2-unit acceptance when requested, matchdisplayedga_session_id; retainallprivacy/durablequota/productiongates.
