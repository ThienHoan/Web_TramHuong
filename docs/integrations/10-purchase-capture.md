# P2-01b — Server purchase capture, mock only

Design 04/11/2026, before implementation.

## Ownership and contract

One collection path: backend records a mock purchase into existing integration_outbox. Frontend never calls gtag purchase and track('purchase') stays forbidden. Authenticated owner POST /analytics/purchases/:orderId with body {consent:'granted'} only; AuthGuard provides actor ID, SQL independently enforces ownership. No admin bypass to collect another customer's purchases. Guest collection deferred until a scoped receipt capability exists; public status UUID and success URL do not prove ownership. Checkout/SePay/GHN/SMTP states remain owned by their existing services.

Server policy must be mock + development/test before capture. SQL RPC integration_record_purchase_mock reads and locks persisted orders, requires paid + sepay + nonempty transaction_code + allowed commercial state, validates snapshot prices/quantities/total/shipping/voucher discount. A consented request after payment commit can capture; no post-webhook best-effort callback, trigger or financial state mutation. A visitor who never returns or denies consent produces no analytics. Capture is not an atomic notification/source event at bank confirmation time; those Phase1/4 producers remain separate work.

Within one DB transaction: derive allowlisted GA4 parameters from order snapshot; insert ACCEPTED mock event with stable opaque SHA256 transaction_id; reserve one durable mock request quota. Dedupe by order via existing unique key; additive partial index on hashed SePay provider_message_id prevents the same payment code being counted under two orders. Repeat/refresh/webhook retries cannot insert a second row or consume quota twice. Existing payload conflict, ambiguous source data, quota exhaustion or missing SQL fail closed for analytics and never fail checkout.

Net purchase value excludes shipping/tax and allocates persisted voucher discount across item units using integer cents. Split a source item into at most two price/quantity groups to preserve exact rounded sum; max100source lines→200GA4items. Tax=0 because no tax workflow is present; coupon omitted until public/personal voucher classification. No PII, raw order ID, bank code, recipients or shipping address in the event.

## Additive schema and rollback

Depends on existing delivery foundation, no new table. Planned migration integration-purchase-capture.sql adds one RPC + one partial unique index to integration_outbox. Invoker rights; search_path fixed; only service_role may EXECUTE. No new orders grant/trigger/column, no modifications of existing payment RPCs. New pause SQL revokes capture execution and preserves rows/index; feature flag off and backend restart stops requests. SQL prepared/tested locally only, never automatically applied to Supabase or production.

## Acceptance plan

Exact SQL in PGlite: owner/roles, paid/pending/refunded/cancelled/COD, malformed money/items, proportional rounding, duplicate order/payment, quota rollback, repeated/concurrent calls, persistence across database reopen, pause preserving rows, no writes to orders. API policy/auth/RBAC/strict DTO/safe error tests. FE consent gating/no guest/no client purchase, duplicate response handling and ignored result after revoke/unmount. Demo uses synthetic orders and in-memory PostgreSQL only; no bank/email/provider request.

Status: IMPLEMENTED_MOCK_OWNER_ONLY, local acceptance04/11/2026. Hosted installation NOT_EXECUTED. Guest collection, COD/manual payments/refund events and Google live remain excluded.

## Cách thử và phạm vi đã hoàn thành

Từ repository root:

```bash
pnpm --dir apps/api run demo:analytics
```

Mở http://localhost:4400/vi/integration-lab/analytics. Ở phần Purchase từ server giả lập:

1. Chọn Đồng ý ở phần quyền riêng tư.
2. Tạo đơn mẫu chưa trả tiền → Ghi purchase: not_eligible, số purchase0.
3. Giả lập SePay đã xác nhận → Ghi purchase: recorded, số purchase1.
4. Ghi lại hoặc reload rồi ghi: duplicate, số purchase vẫn1.
5. Rút consent: nút capture bị khóa. Record đã ghi tại server được giữ để dedupe; rút consent dừng ghi mới, không xóa history trong outbox.

Đây là synthetic source/payment state, auth và PostgreSQL PGlite riêng trong RAM; không gọi webhook SePay thật hoặc Supabase. Restart demo tạo database giả mới. Test persistence riêng dùng thư mục PostgreSQL tạm và mở lại DB thành công, không phải chứng minh hosted multi-instance load. Lab route/control/fake bearer chỉ được copy vào scratch app, không tồn tại trong website thật. Font là local fixture. Metadata legacy databaseWrites=0 của contact demo nghĩa là external DB writes; purchase fixture có ghi dữ liệu giả tại máy và công bố externalDatabaseWrites=0 riêng.

Các trang success/order-confirmation/account order detail có component vô hình PurchaseCapture dùng session hiện tại, không sửa UI/money state. Không có session thì không request purchase. Frontend chỉ POST consent/reference, không nhận amount/payment status/cart object từ trang làm bằng chứng. Receipt response chỉ gồm source/status/opaque transactionId; raw purchase event nằm private outbox, không phát lại sang tracker FE hoặc Google.

## Cài vào Supabase thử nghiệm

Không cần chạy SQL để xem demo. Nếu dùng ứng dụng với DB thử nghiệm thật:

1. Chạy verify-installed-foundation.sql trước. Permission migration đã OWNER_REPORTED_SUCCESS trước đây; không yêu cầu cài lại file đó. Delivery foundation phải tồn tại; nếu chưa, dùng gói first-install integration-delivery-foundation.sql đã có, không chạy lại nếu đã cài.
2. Review rồi chạy duy nhất file mới apps/api/migrations/integration-purchase-capture.sql trên đúng test project. File first-install, không tự overwrite/rerun. Chỉ thêm1RPC và1index; không sửa dòng order hoặc tạo bảng mới.
3. Chạy verify-installed-purchase.sql:3PASS khi đang enable quyền; nếu pause, EXEC check FAIL là tác dụng dự kiến, invoker/index vẫn PASS. Đây chỉ là metadata, không tạo event hoặc đọc orders.
4. Chỉ khi test schema sẵn sàng mới opt-in cả FEATURE_GA4_ENABLED=true và FEATURE_GA4_PURCHASE_ENABLED=true, INTEGRATIONS_ENV=mock, NODE_ENV=development/test; restart API và reload web. Không sửa .env thật trong batch này.

Cả hai flags mặc định false. Subflag mới được validate lúc startup (không echo invalid value); policy trả mode + purchaseEnabled boolean, không secret. Frontend cũ bỏ qua boolean, frontend mới gặp backend cũ thiếu boolean sẽ tắt purchase. Subflag off không phát request capture từ FE; server cũng chặn trước RPC. General GA4 kill switch tắt cả hai. Staging/production mode không được thực thi kể cả có flags/credentials.

Rollback: subflagfalse + restart + reload, hoặc chạy integration-purchase-capture.pause.sql để revoke capture EXECUTE; không drop index/rows. Foundation pause cũng ngăn quota reservation nên transaction capture rollback toàn bộ. Callback frontend lỗi/timeout503 không ảnh hưởng đặt hàng/thanh toán. Một request đã consent và commit có thể hoàn tất trước revoke/cancel; client bỏ receipt đến sau revoke/unmount, không thể thu hồi dữ liệu đã commit bằng AbortSignal. Retention/delete policy cho pseudonymous receipts phải được chốt trước live.

## Kiểm thử thực tế

- Backend full37suites/382tests PASS; analytics scoped43tests PASS, gồm độc lập default-off, safe errors, RBAC/ownership, strict body chống giả paid/amount, UUID, missing consent và policy privacy.
- Frontend43tests PASS; giữ direct track('purchase') bị chặn, chỉ gọi capture khi cả policy flag/consent/session hợp lệ, không tự retry POST; revoke/cancel/subflag off trong lúc chờ bỏ kết quả, không tăng event buffer FE.
- Exact SQL73checks +40rounding cases PASS, PostgreSQL fixture. Dedupe/count/quota1; anon/authenticated EXEC denied; owner mismatch; status paid/pending/refunded/cancelled/COD; legacy snapshot malformed fail closed; same SePay payment under another order conflict; over-quota rolls event insert back; pause/reopen persistence/metadata PASS.
- HTTP fixture26checks PASS;6requests đồng thời →1recorded+5duplicate,1row/1quota; replay source confirmation vẫn duplicate. ContactHTTP18checks vẫn PASS.
- APIbuild/scopedESLint PASS; webtsc/scopedESLint PASS. Dev fixture compiles lab/routes; production web build with realenv not run. No real bank/email/shipment/provider call, no remote SQL apply, no billing/DNS/commit/push.
- Browser đã thấy pending→not_eligible0, paid→recorded1, bấm/reload→duplicate1, rút consent khóa capture. VI/EN lab dùng cùng receipt; EN ở375px không tràn ngang. Screenshot /private/tmp/ga4-purchase-dedupe.png. Customer authenticated full journey với hosted DB chưa chạy; lab dùng auth giả + cùng controller/service/RPC và exact SQL.

Lệnh tái lập:

```bash
pnpm --dir apps/api run test:analytics
pnpm --dir apps/web run test:analytics
# Khi demo còn chạy:
pnpm --dir apps/api run test:purchase-http
```

## File manifest

- DB: apps/api/migrations/integration-purchase-capture.sql và .pause.sql; docs/integrations/verify-installed-purchase.sql.
- Backend: analytics/purchase-capture.service.ts + .spec.ts, analytics.controller.ts, analytics.module.ts, collection-policy.service.ts + .spec.ts; integrations/integration-database.types.ts; .env.example; package.json.
- FE: lib/ga4/purchase.ts, tracker.ts; components/analytics/PurchaseCapture.tsx, AnalyticsProvider.tsx, AnalyticsConsent.tsx; checkout/success, order-confirmation/[id], account/orders/[id] pages.
- QA: API scripts/fixtures/purchase-database.cjs, verify-purchase-capture.cjs, verify-purchase-http.cjs, demo-contact-protection.cjs; web scripts/test-analytics.cjs và fixtures/analytics-lab.tsx.
- Docs:10 này,01capability,03access,07guide,09superseding note, implementation-progress và p2-01b-evidence.json.

## Nguồn, giới hạn và việc tiếp theo

Đối chiếu04/11/2026: [GA4 purchase params](https://developers.google.com/analytics/devguides/collection/ga4/reference/events#purchase) yêu cầu value theo tổng item price×quantity, shipping/tax tách riêng; [transaction ID dedupe](https://support.google.com/analytics/answer/12313109) và [PostgreSQL core SHA256](https://www.postgresql.org/docs/current/functions-binarystring.html). Split line để chia voucher theo cents là quyết định triển khai, không phải yêu cầu riêng của Google. Tax0 chỉ phù hợp source formula hiện tại không có tax workflow. Coupon/raw recipient/bank code không gửi. transactionId/payment hash là pseudonymous identifiers, không gọi là dữ liệu anonymous.

Chưa Google SDK/Measurement Protocol transport, measurement ID/property permissions, client/session attribution, DebugView, privacy retention/live approval. ACCEPTED trong outbox này là mock collector đã ghi bền vững, không phải Google accepted/delivered. Google live cần namespace và adapter riêng sau account acceptance; không drain/replay mock rows vào production. Hosted migration còn pending; guest purchase cần scoped ownership capability, không sử dụng public UUID/status làm authorization. COD chưa có nguồn paid đáng tin tương đương trong batch. Chưa tự phát refund hay sửa ledger tài chính. Source transaction_code hiện hữu chưa có unique financial ledger toàn hệ thống; partial index mới chỉ bảo vệ analytics khỏi double count, không sửa lỗi tài chính cũ.

NEXT: P2-02 Search Console readonly/mock sync + freshness theo Master Plan; các blocker hosted/guest/live GA4 tiếp tục mở, full Phase2/release chưa hoàn thành.
