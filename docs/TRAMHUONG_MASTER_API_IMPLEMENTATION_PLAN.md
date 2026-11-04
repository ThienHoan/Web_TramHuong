# MASTER IMPLEMENTATION PLAN — WEB_TRAMHUONG MULTI-API UPGRADE

**Phiên bản:** 1.0 · **Ngày lập:** 01/11/2026 · **Đối tượng thực thi:** OpenAI Codex  
**Phạm vi cố định:** CHỈ 11 tích hợp đã chọn: GHN, Resend, Gemini, Supabase pgvector, Cloudinary, Google Sign-In, GA4, Search Console API, Merchant API, PageSpeed Insights API, Cloudflare Turnstile.  
**Kiến trúc mục tiêu:** Next.js 14 App Router + TypeScript + Tailwind (Zen & Traditional); NestJS; Supabase PostgreSQL; hệ thống thanh toán SePay, đơn hàng, voucher, SMTP hiện hữu.

> **Lệnh tối cao:** Audit trước; tái sử dụng trước; không phá vỡ nghiệp vụ; staging/mock trước; không kích hoạt billing, gửi email thật hàng loạt, tạo vận đơn thật, thay đổi DNS, chạy migration production hoặc deploy production khi chưa được chủ dự án phê duyệt. Cấu hình mới mặc định **OFF**.

## 0. Bản đồ ưu tiên và ngân sách

| Tích hợp | Ưu tiên | Khả năng/giới hạn chi phí (kiểm tra trước khi triển khai) | Giá trị cho Web_TramHuong | Điều kiện kích hoạt |
|---|---|---|---|---|
| GHN | P0 | API không có phí tích hợp riêng; vận đơn thật phát sinh phí vận chuyển/phụ phí | Báo giá, ETA, vận đơn, nhãn, webhook, COD, hoàn/giao lại | Token & ShopId staging; sản xuất chỉ sau duyệt |
| Resend | P0 | Free 3.000 email/tháng, tối đa 100/ngày; Pro từ 20 USD/tháng (tại thời điểm lập) | Email xác nhận đơn, SePay, GHN, hậu mãi | Chỉ dùng nếu SMTP hiện hữu không đủ; domain được xác minh |
| GA4 | P0 | Bản chuẩn miễn phí; GA360 trả phí | Funnel mua hàng, chuyển đổi và phân tích sản phẩm | Measurement ID, consent phù hợp |
| Search Console API | P0 | API miễn phí theo quota; cần xác minh website | KPI SEO, truy vấn, CTR, hiệu quả trang | Property xác minh + OAuth phù hợp |
| Turnstile | P0 | Free, tối đa 20 widgets; lượt xác minh không giới hạn theo gói Free | Bảo vệ spam/bot tại các form | Site/secret key; xác thực server-side |
| Gemini | P1 | Free tier chỉ một số model/quota; trả phí theo model, token, tool | Tư vấn trầm hương dựa trên catalog thật | Key sẵn có + kiểm tra model và chính sách dữ liệu |
| pgvector | P1 | Extension không có phí riêng; dùng tài nguyên Supabase; embedding có thể tính phí | Semantic product search & gợi ý sản phẩm | FTS baseline trước; đo độ hữu ích rồi bật vector |
| PageSpeed | P1 | API miễn phí trong quota; không gọi theo từng pageview | Báo cáo chất lượng hiệu suất/SEO/a11y | Scheduler; URL whitelist; API key nếu cần |
| Cloudinary | P2 | Free 25 credits/tháng; paid có phí | Ảnh/video và CDN tối ưu | So sánh với Next/Image/storage hiện tại; migration không phá link |
| Google Sign-In | P2 | Đăng nhập Google cơ bản thường miễn phí | Đăng nhập nhanh, liên kết tài khoản | Google Client ID; xác thực ID token ở server |
| Merchant API | P2 | API không có phí riêng cho tích hợp cơ bản; Ads và dịch vụ bổ sung có phí | Đồng bộ feed catalog/giá/tồn kho | Merchant Center, domain/policy/product eligible, OAuth |

**Cơ chế chống vượt phí:** Định nghĩa `external_integrations` registry (config hoặc DB tuỳ codebase) với `enabled`, `environment`, `quota_soft_limit`, `quota_hard_limit`, `estimated_monthly_spend`, `owner_approval_id`, `last_checked_at`, `fallback_mode`. Không tự động nâng gói hoặc chuyển sang paid. Thiết lập cảnh báo 60/80/95% quota, hard stop cho tính năng không thiết yếu; tránh hard stop giao dịch quan trọng nếu đã có fallback an toàn.

## 1. Các nguyên tắc bất biến (NON-NEGOTIABLE)

- [ ] Đọc `package.json`, `pnpm-workspace.yaml`, cấu trúc monorepo, env templates, Nest modules, Next routes, shared UI libraries, DB migrations, RLS, CI/CD, jobs và feature flags hiện có.
- [ ] Xem luồng **cart → voucher → checkout → SePay → order → shipping → refund/return** và ghi lại quyền sở hữu từng trạng thái. **Không coi GHN delivered là SePay paid**; không phát hành COD hai lần.
- [ ] Kiểm tra các bản thiết kế/code về GHN trước đó; ưu tiên hoàn thiện, không sinh `shipping_v2`, `orders_new` hoặc module trùng.
- [ ] Không sửa `.env` production, không in secret; không thêm secret vào client bundle hoặc SQL migration.
- [ ] DB migrations theo kiểu **expand → backfill → verify → switch → contract**; chỉ làm schema additive cho đến khi có quyết định thủ công; backup/rollback cho từng migration.
- [ ] Bảo toàn Zen/Traditional: shared domain logic; UI adapters/styles theo theme; i18n VI/EN; responsive; accessibility.
- [ ] Không tự tạo tài khoản nhà cung cấp, xác minh domain, bật billing, nâng gói, chạy production API, gửi email thật hoặc mua Ads.
- [ ] Mỗi phase cần checklist, diff, kiểm thử thật, rủi ro, cách rollback và ghi tiến độ. **Không báo pass nếu chưa chạy**.
- [ ] Với API không được cấp quyền, xây mock adapter, hợp đồng DTO và ghi blocker; không bịa API schema/công bố khả năng không có.
- [ ] Tôn trọng PII, cookie consent, opt-out, retention, RBAC/RLS; không gửi số điện thoại, địa chỉ, email, lịch sử thanh toán cho Gemini/GA4/Search Console.

## 2. PHASE 0 — AUDIT, INVENTORY, BASELINE & DESIGN (P0; không đổi hành vi production)

### Công việc
- [ ] Liệt kê module tồn tại: products/category, carts, vouchers, orders, addresses, payments/SePay, auth, SMTP/email, AI/chatbot, image uploads, SEO, analytics, admin.
- [ ] Xác định toàn bộ env keys liên quan; chỉ báo tên key, KHÔNG báo giá trị.
- [ ] Vẽ state machine order/payment/shipping; event producers/consumers; kiểm tra chống webhook trùng SePay và COD.
- [ ] Đối chiếu đủ 11 tài liệu chính thức, endpoint, scopes/quota/chi phí, quyền truy cập, điều kiện pháp lý; đánh dấu `VERIFIED`, `NEEDS_ACCOUNT`, `UNAVAILABLE`.
- [ ] Chạy baseline: install/build/lint/typecheck/unit tests (nếu môi trường đủ); lưu log tóm tắt và lỗi tồn tại trước thay đổi.
- [ ] Đề xuất module và ERD **sau** khi đã kiểm tra DB thật; lập API contract cho 11 adapter; xác nhận routes/authorization.
- [ ] Lập dependency graph, thứ tự migration, flags và rollback; tạo bản ghi các dịch vụ trùng/đã đủ tốt để **SKIP/OPTIMIZE**.

### Sản phẩm bàn giao
- `docs/integrations/00-repository-audit.md`
- `docs/integrations/01-capability-matrix.md`
- `docs/integrations/02-architecture-and-dataflow.md`
- `docs/integrations/03-cost-and-access-register.md`
- `docs/integrations/implementation-progress.md`

**Gate:** Chưa được sửa code nghiệp vụ nếu chưa có sơ đồ trạng thái/order-payments và danh sách migrations đề xuất. Nếu không có codebase, ghi `BLOCKED_REPOSITORY_ACCESS` thay vì đoán.

## 3. PHASE 1 — FOUNDATION, SECURITY & OBSERVABILITY (P0)

### 3.1 Shared Integration Infrastructure
- [ ] Tạo module/hạ tầng dùng chung theo cấu trúc repo: `IntegrationsConfig`, `ProviderClient`, `CircuitBreaker/Timeout`, `RateLimiter`, `QuotaMonitor`, `Outbox/Inbox`, `AuditLogger`, `FeatureFlags` (chỉ phần còn thiếu).
- [ ] Env schema validate ở startup; phân tách staging/prod; `false` mặc định cho outbound operations; per-provider kill switch.
- [ ] Không retry mù POST đột biến: idempotency key, kiểm tra trạng thái provider trước khi gửi lại; HTTP timeout + exponential backoff có giới hạn.
- [ ] Log correlation ID; redact tokens, PII và payload nhạy cảm; đo lỗi, latency, quota, số lần retry; cảnh báo.
- [ ] Job scheduling với lock chống chạy song song; ưu tiên scheduler/queue đang có; không thêm Redis/BullMQ nếu không có lý do.
- [ ] Secrets chỉ NestJS/server environment; mã hóa token OAuth refresh khi lưu; RBAC cho màn hình admin.

### 3.2 Cloudflare Turnstile (P0)
- [ ] Audit chống spam/captcha và NestJS throttling hiện có.
- [ ] Bật Turnstile theo flags cho đăng ký, liên hệ, nhận voucher, đánh giá; checkout chỉ bật nếu risk high và UX cho phép.
- [ ] FE site key (public) và BE secret key (private); gọi `siteverify` server-to-server; không chỉ kiểm tra token ở frontend.
- [ ] Enforce token expiration/single-use, action/hostname verification theo khả năng hỗ trợ; kết hợp IP/user rate limit và chống abuse.
- [ ] Fail policy theo route: không phá đăng nhập/checkout vì Turnstile lỗi toàn hệ thống; form công khai có thể tạm khóa với thông báo rõ.
- [ ] Mock tests: token hợp lệ/hết hạn/trùng/thiếu/sai hostname; regression UX Zen/Traditional.

**Gate:** Unauthorized actions không đi qua; feature flag off trả lại hành vi cũ.

## 4. PHASE 2 — DATA & MEASUREMENT FOUNDATION (P0/P1)

### 4.1 Google Analytics 4 (P0)
- [ ] Audit gtag/GTM sẵn có: chỉ sử dụng một chiến lược để không bắn event đôi; cài consent mode phù hợp chính sách.
- [ ] Shared `AnalyticsTracker` ở FE; map sự kiện `view_item_list`, `select_item`, `view_item`, `add_to_cart`, `remove_from_cart`, `begin_checkout`, `add_shipping_info`, `add_payment_info`, `purchase` (và `refund` nếu có workflow thực).
- [ ] Chuẩn hóa `item_id`/SKU, `currency=VND`, `value`, `shipping`, `coupon`, `items` đúng tài liệu GA4; cấm PII.
- [ ] Purchase phát ra **chỉ sau** nguồn trạng thái thanh toán đáng tin; chọn một đường FE/BE nhất quán, giữ `transaction_id` duy nhất; không phát lại khi refresh hoặc SePay webhook duplicate.
- [ ] DebugView/Tag Assistant tests staging, so sánh doanh thu theo ngày và dữ liệu đơn nội bộ; ghi nhận sai số do consent/ad blockers.

**Lưu ý:** GA4 là công cụ phân tích, không phải ledger tài chính; admin revenue hiển thị từ DB làm nguồn sự thật.

### 4.2 Google Search Console API (P0)
- [ ] Xác minh property site trong Search Console bằng thao tác được chủ dự án cho phép; scopes tối thiểu `webmasters.readonly`.
- [ ] Tạo server-only OAuth/token storage có mã hóa và rotation; token không nằm trong browser; admin có quyền mới được đồng bộ.
- [ ] Job đồng bộ Search Analytics theo ngày (clicks, impressions, CTR, position theo date/query/page/device/country); incremental upsert.
- [ ] Dashboard SEO: query tăng/giảm, landing page CTR thấp, sản phẩm có impression cao nhưng click thấp, phân tích Zen/Traditional khi URL khác nhau.
- [ ] Không coi dữ liệu API là toàn bộ query: API có giới hạn top rows, độ trễ và thiếu ngày; UI hiển thị `last_synced_at` và thông báo giới hạn.
- [ ] Nếu chưa được cấp property/OAuth, triển khai UI mock + job disabled, ghi blocker.

### 4.3 PageSpeed Insights API (P1)
- [ ] Chọn URL whitelist: homepage Zen/Traditional, PLP, PDP representative, cart, checkout **chỉ URL công khai có thể đo hợp lệ**; không gửi nội dung auth/PII.
- [ ] Lịch kiểm tra 1 lần/ngày hoặc 2–3 lần/tuần tùy quota; mobile + desktop; cache/report lịch sử Lighthouse metrics và CWV nếu có.
- [ ] Dashboard trends LCP/INP/CLS khi dữ liệu field khả dụng, Lighthouse performance/SEO/accessibility/best practices; phân biệt field vs lab và missing data.
- [ ] Cảnh báo regression theo ngưỡng cấu hình; không gọi API khi từng khách pageview.

**Gate Phase 2:** Sự kiện purchase không trùng; dữ liệu SEO/hiệu suất có nguồn, timestamp và retry; không vượt quota.

## 5. PHASE 3 — GHN SMART LOGISTICS (P0; tham chiếu Master Plan GHN hiện có)

### 5.1 Tái sử dụng trước
- [ ] Tìm và đọc Master Plan GHN hiện có; audit API/backend/schema/shipping webhook/checkout và đánh dấu `EXISTS`, `NEEDS_FIX`, `MISSING`.
- [ ] GHN staging token/shopId, địa chỉ hành chính mới 2 cấp + mapping legacy theo từng endpoint, shipping services, calculate fee, leadtime, preview.
- [ ] Checkout cả hai giao diện hiển thị đúng shipping fee/ETA; server re-quote trước order placement; server tính trọng lượng/khai giá từ product data.
- [ ] Tạo đơn qua idempotent client_order_code, lookup lại khi request timeout; chỉ sau order eligible để fulfillment, không tự tạo khi chỉ `begin_checkout`.
- [ ] In nhãn, pick shift (ID theo ngày), cập nhật/hủy/hoàn/yêu cầu giao lại **theo GHN state & permission**, không giả định mọi đơn đều thực hiện được.
- [ ] Webhook GHN chống replay/duplicate, inbox processing, status transition validation, reconciliation polling có kiểm soát; GHN báo COD không đồng nghĩa đã nhận tiền ngân hàng.
- [ ] Customer tracking Zen/Traditional chỉ dữ liệu được phép, realtime qua Supabase có RLS; thông báo trạng thái sẽ dùng Notification Outbox ở Phase 4.
- [ ] Quản lý COD ledger, reconciliation, admin exceptions, phí chênh lệch, ticket hỗ trợ theo quyền GHN.
- [ ] Không hiển thị GPS shipper real-time khi GHN không cấp dữ liệu; không làm Google Maps vì không nằm trong 11 mục đã chọn.
- [ ] Smoke tests trên staging với data giả, mock webhook out-of-order/duplicate, chống leaking PII, tuyệt đối không dùng production.

### 5.2 Suggested internal endpoints — chỉ thêm nếu chưa có
- `POST /shipping/quotes`
- `POST /shipping/preview`
- `POST /admin/shipments`
- `GET /orders/:id/tracking`
- `POST /webhooks/ghn`
- `POST /admin/shipments/:id/actions` (validate RBAC và allowed action)
- `GET /admin/logistics/summary`

**Gate:** GHN staging các luồng chính hoạt động hoặc được mark blocked có mock tests; không làm thay đổi SePay paid/cancel states; rollback bằng flag và worker pause.

## 6. PHASE 4 — RESEND & NOTIFICATION DELIVERY (P0; sau outbox/transaction events)

- [ ] Audit SMTP module, templates, queue, rate limits, logs, deliverability. Nếu SMTP tốt, tạo `EmailProvider` adapter và **giữ SMTP mặc định**; Resend chỉ là lựa chọn bật bằng flag.
- [ ] Chỉ dùng một provider cho một message; `message_dedupe_key=eventType+orderId+recipient+templateVersion` unique.
- [ ] Tạo transactional templates VI/EN đồng bộ brand Zen/Traditional: order confirmed, payment confirmed SePay, GHN shipment created, picked/delivering/delivered, delivery exception, support reply, post-purchase follow-up (theo consent).
- [ ] Đọc mail recipients từ dữ liệu đã xác minh; không gửi hóa đơn thuế hợp lệ nếu hệ thống không có nghiệp vụ xuất hóa đơn pháp lý; dùng 'thông tin đơn hàng' khi phù hợp.
- [ ] Domain verification + SPF/DKIM/DMARC review: yêu cầu chủ dự án phê duyệt DNS, không tự đổi.
- [ ] Resend free 3.000/tháng, 100/ngày theo trang giá; quota monitor, batch/digest khi thích hợp; ưu tiên transactional; khi quota chạm, dùng SMTP cũ **nếu đã kiểm thử failover** và không duplicate.
- [ ] Outbox + retry bounded + bounce/failure logging; phân biệt `queued`, `sent`, `delivered` nếu provider support; không ghi 'đã gửi' ngay khi queue.
- [ ] Integration tests mock provider + test sandbox/verified recipient theo quyền; không gửi hàng loạt thật.

**Gate:** Một event → tối đa một email transactional mỗi recipient/template version; tắt Resend trả về SMTP cũ mà không mất dữ liệu.

## 7. PHASE 5 — GEMINI ADVISOR + FULL TEXT SEARCH → PGVECTOR (P1)

### 7.1 Gemini Advisor
- [ ] Audit chatbot/Gemini API hiện có, GEMINI_API_KEY và model thực dùng; không cài SDK khác nếu không cần.
- [ ] Định nghĩa AI use cases: hỏi về sản phẩm, gợi ý theo ngân sách, sở thích mùi, hướng dẫn bảo quản, chính sách giao hàng/đổi trả đã được duyệt; câu hỏi vượt phạm vi chuyển CSKH.
- [ ] Chỉ dùng catalog thực từ DB (sku/slug/price/stock/material/verified descriptions) + curated FAQs; retrieval server-side, filter product published & available.
- [ ] Gemini không tự tạo giá, tồn kho, nguồn gốc, chứng nhận, tác dụng y tế hoặc lời hứa phong thủy thiếu cơ sở; answer kèm link sản phẩm thực.
- [ ] Chặn prompt injection từ user/product descriptions, rate limit per user/IP, max context/output tokens, timeout, caching FAQ, tool calling schema, content safety và fallback FAQ.
- [ ] Không đưa PII, order IDs, token, địa chỉ hay thông tin thanh toán vào prompt; kiểm tra điều khoản free tier trước khi gửi dữ liệu doanh nghiệp, đặc biệt nếu dữ liệu có thể dùng cải thiện sản phẩm.
- [ ] Chọn model có **free tier thực sự đang khả dụng** cho key hiện tại; không tự động switch model paid; giới hạn calls/ngày và token/ngày; khi hết quota tắt AI trả search/filter thường.
- [ ] Đánh giá offline ít nhất 30 câu tình huống (không có hàng, giá sai, yêu cầu tư vấn, adversarial); đo groundedness, latencies, hallucinations.

### 7.2 FTS trước, vector sau
- [ ] Baseline PostgreSQL FTS/synonyms/unaccent phù hợp tiếng Việt, kiểm tra hỗ trợ tokenizer/diacritics và search hiện có; đảm bảo filtering trên price, category, availability.
- [ ] Lập benchmark truy vấn tiếng Việt/Anh thực tế; nếu FTS chưa đáp ứng mới bật pgvector.
- [ ] `pgvector` schema additive; `product_embeddings` separate table keyed productId + model + embedding_version + content_hash + updated_at; chọn dimension phù hợp embedding model đã kiểm tra.
- [ ] Generate embeddings qua bounded background jobs chỉ khi sản phẩm publish/update; không gọi embedding mọi request; incremental backfill, batch, throttling; optional ANN index khi số lượng đủ lớn.
- [ ] Hybrid ranking FTS + vector + filters, fallback FTS nếu vector lỗi; đảm bảo cả Zen/Traditional không hiển thị sản phẩm ẩn/hết hàng sai.
- [ ] Test search relevance tập truy vấn người Việt; đo recall/relevance và độ trễ; pgvector extension không miễn chi phí model embedding.

**Gate:** Kết quả AI có SKU nguồn/giá/tồn kho từ DB; vector failure không làm mất search cơ bản; chi phí AI được giới hạn cấu hình.

## 8. PHASE 6 — GOOGLE SIGN-IN / ACCOUNT LINKING (P2)

- [ ] Audit auth/session/JWT/RBAC hiện có; xác định auth do backend tự quản hay Supabase Auth, tránh xây 2 hệ session.
- [ ] Tích hợp Google Identity Services hoặc flow auth hiện có; xử lý OAuth state/nonce/PKCE nếu sử dụng authorization code flow.
- [ ] NestJS kiểm tra `ID token` signature, issuer, audience, expiration; chỉ tin `sub` là Google identity ổn định, không dùng email làm khóa chính.
- [ ] Nếu email đã có user/password: yêu cầu xác thực chủ tài khoản hiện tại trước khi liên kết; không liên kết tự động chỉ vì email trùng.
- [ ] Tài khoản Google mới mặc định role khách hàng; không auto admin/staff; giữ account merge/disable/user deletion an toàn.
- [ ] Đăng nhập cả Zen/Traditional và redirect locale/style chính xác; kiểm tra guest checkout, logout, cookie, csrf, replay, duplicate account.

**Gate:** Không phát sinh account takeover/duplicate; tắt flag vẫn đăng nhập bằng phương thức cũ.

## 9. PHASE 7 — CLOUDINARY MEDIA OPTIMIZATION (P2)

- [ ] Audit nơi lưu ảnh/video (Supabase Storage/local/host/CDN), Next Image, kích thước, cache, traffic và chi phí thực tại.
- [ ] POC trên 10–20 ảnh đại diện, đo Core Web Vitals/bytes/LCP: tối ưu AVIF/WebP, srcset responsive, zoom ảnh chi tiết, thumbnail và video poster; **chỉ chọn Cloudinary nếu thực sự tốt hơn phương án hiện tại**.
- [ ] `MediaProvider` adapter + flags, asset mapping table optional; folder naming, public_id, moderation/validation, max size, signed uploads cho admin, không cho client dùng secret.
- [ ] Giữ URL ảnh cũ hoạt động; migration incremental + manifest + xác minh checksum/visual; không xóa ảnh nguồn.
- [ ] Monitor 25 monthly credits free: transforms/storage/bandwidth; cảnh báo 60/80/95%; cache transformed variants; tránh biến đổi URL tùy tiện phát sinh credits.
- [ ] Rollback: trả ảnh qua storage cũ và vô hiệu Cloudinary transform mới.

**Gate:** Core Web Vitals/transfer size không xấu hơn baseline; ảnh sản phẩm không mất khi rollback; quota theo dõi được.

## 10. PHASE 8 — GOOGLE MERCHANT API (P2)

- [ ] Audit catalog: product ID/SKU, image, brand (chỉ khi có), GTIN nếu thực có, availability, price VND, landing URL chuẩn SEO, category, shipping, refund/return policy, chứng nhận chỉ khi có bằng chứng.
- [ ] Xác minh Merchant Center, quyền và product eligibility; không tự tạo Ads campaign hoặc bật ngân sách quảng cáo.
- [ ] Merchant API OAuth/scopes tối thiểu, refresh token được mã hóa, quyền admin; xác minh phiên bản endpoint hiện hành.
- [ ] Catalog mapper từ Supabase: feed/product inputs, localized URLs (Zen/Traditional) theo chính sách Merchant, inventory/prices; xử lý variant và canonical để tránh duplication.
- [ ] Incremental sync on publish/update/stock/price, periodic reconciliation, error dashboard (rejected/approved/pending) và retry; job idempotent.
- [ ] Khi lỗi, không tự thay đổi giá hay tồn kho trong database để khớp Google; DB nội bộ là source of truth.

**Gate:** 10–20 sản phẩm thử được đồng bộ khi tài khoản có quyền; tắt flag không ảnh hưởng website; thiếu Merchant account → mock + checklist onboarding, ghi BLOCKED.

## 11. PHASE 9 — INTEGRATED ADMIN & OPERATIONS DASHBOARD

- [ ] Tạo/điều chỉnh trang quản trị tích hợp: **Integrations Health** (enabled, environment, last success, quota, fail rate, cost alerts); **Logistics** (GHN, exception, COD); **Marketing Analytics** (GA4 metadata/SEO GSC) và **Performance** (PageSpeed).
- [ ] Với GA4, nếu chỉ thu thập events mà chưa bật GA Data API thì hiển thị link đến GA4 Dashboard thay vì giả vờ có report API; không thêm GA4 Data API ngoài quyền đã kiểm tra.
- [ ] Với Google Analytics, số liệu doanh thu nội bộ lấy từ DB, không dùng GA4 làm dữ liệu đối soát.
- [ ] Với Search Console, chỉ hiện top rows theo giới hạn API và ngày được cập nhật; coi CTR/position là số liệu tham khảo.
- [ ] Dashboard phải phân quyền admin/staff; query phân trang, có log audit và không hiển thị raw PII trong sự kiện.
- [ ] End-to-end các luồng xuyên module: SePay→order→GHN→Resend→GA4; product update→search index/AI→Merchant; form abuse→Turnstile; website performance→PageSpeed.

## 12. DATA MODEL — SCHEMA ĐỀ XUẤT (không tạo trùng)

Tạo bảng **chỉ khi audit cho thấy chưa có tương đương**:

| Bảng / entity | Chức năng | Khóa quan trọng |
|---|---|---|
| `integration_configs` | Flag/env/quota chỉ metadata, không chứa secret | `provider`, `environment` |
| `integration_usage_daily` | Requests/tokens/credits/send count | `(provider, day, metric)` |
| `integration_failures` | Thống kê lỗi đã redact | `provider, correlation_id` |
| `integration_outbox` | Transactional events và delivery retry | `dedupe_key` unique |
| `integration_inbox` | GHN và provider callbacks dedupe | `(provider, event_key)` unique |
| `shipping_shipments` / bảng hiện có | GHN vận đơn & order mapping | `provider, external_order_code` unique |
| `shipping_events` | Lịch sử status | provider event key + timestamp |
| `cod_ledger` | COD expected/collected/remitted/confirmed | source event key unique |
| `notification_deliveries` | Track email provider/template/recipient | `dedupe_key` unique |
| `seo_search_metrics_daily` | Search Console time series | site, date, dimensions key |
| `performance_audits` | PageSpeed history | url, strategy, analyzed_at |
| `product_embeddings` | Vector index với model/version | product_id, locale, model, version |
| `external_identities` / bảng auth hiện có | Google `sub` ↔ user | `(provider, provider_subject)` unique |
| `media_assets` / bảng media hiện có | Mappings Cloudinary ↔ original | product_id, asset_type, source |
| `merchant_sync_items` | Trạng thái sync Merchant | merchant_account, product_id |

**Migration quy trình:** backup/restore point → create additive table/index → seed/backfill in batches → verify counts & read/write → enable flag 1%/internal → cutover gated → monitoring → only later drop deprecated paths with separate manual approval. RLS least privilege nếu client truy cập trực tiếp; service role không ra browser. Query plan/index review cho bảng lớn. **Không chạy SQL trên DB production trong Codex trừ khi người dùng ra lệnh rõ ràng.**

## 13. ĐỀ XUẤT API NỘI BỘ (điều chỉnh theo route hiện có)

```
GET    /integrations/admin/health              # admin only
GET    /admin/seo/search-console/summary        # admin only
POST   /admin/seo/search-console/sync           # admin only; guarded
GET    /admin/performance/audits                # admin only
POST   /admin/performance/run                   # admin only; quota guard
POST   /shipping/quotes                        # authenticated/guest validation
POST   /shipping/preview                       # checkout validation
GET    /orders/:id/tracking                    # owner/admin only
POST   /webhooks/ghn                           # verified provider
POST   /auth/google                            # signed ID token validation
POST   /catalog/search                         # hybrid keyword/vector with safe filters
POST   /ai/product-advisor                     # rate-limited, no PII
GET    /admin/notifications/deliveries          # admin only
POST   /admin/merchant/sync                     # admin only; flag required
GET    /admin/merchant/sync-status              # admin only
```

**Quan trọng:** Đây là hợp đồng gợi ý, KHÔNG phải yêu cầu tạo route trùng. Codex phải map sang API hiện có và chọn contract cuối cùng trong Phase 0.

## 14. MA TRẬN KIỂM THỬ VÀ ACCEPTANCE

| Chủ đề | Tests tối thiểu | Điều kiện PASS |
|---|---|---|
| Baseline | lint, typecheck, build, current tests | Không tăng lỗi so với baseline; lỗi tồn tại được phân biệt |
| SePay/Order | duplicate/out-of-order payment webhook, reloaded thank-you page | 1 khoản paid, 1 order, 1 purchase analytics event |
| GHN | price/preview/create idempotency/webhook/return/COD mock + staging | Không tạo duplicate; không giao dịch production; status đúng |
| Email | provider fallback, quota, bounce, retry, duplicate event | Một thông báo duy nhất khi hợp lệ; không gửi nhầm người |
| Gemini | grounded answer test set, prompt injection, rate limit | Không bịa giá/stock/nguồn gốc; fallback rõ ràng |
| Search | FTS benchmark, hybrid relevance, hidden/unpublished filters | Không lộ sản phẩm ẩn; latency chấp nhận được |
| GA4 | ecommerce event schema + DebugView | transaction_id/VND/items chuẩn; không PII |
| GSC | scopes, pagination/limits, missing dates | Job không fail âm thầm; dashboard hiển thị freshness |
| PageSpeed | quota, schedule, representative URLs | Không chạy mỗi pageview; ghi rõ missing field data |
| Turnstile | invalid/replay token, abuse, outage | Server validation & sane fallback |
| Google Login | invalid audience, state, account collision, RBAC | Không account takeover, không privilege escalation |
| Cloudinary | URL old/new, transformed image and quota | No broken images; rollback làm việc |
| Merchant | deltas/retry/sync errors/unauthorized | Giá/stock chính xác, không mua Ads |

**Smoke journeys:** (1) khách browse→AI→cart→checkout→SePay→GHN→email→tracking; (2) đơn COD→GHN→đối soát; (3) đăng nhập Google→liên kết tài khoản; (4) admin xuất bản sản phẩm→search/vector→Merchant; (5) khách spam form→Turnstile; (6) SEO & performance jobs → dashboard.

## 15. ROLLBACK / INCIDENT RUNBOOK

1. **Mọi outbound integration qua feature flag**; emergency kill switch per provider.
2. Nếu GA4/GSC/PageSpeed lỗi: tắt collector/jobs, website bán hàng vẫn chạy.
3. Nếu Gemini/vector lỗi: fallback keyword search/FAQ hoặc nhân viên; không chặn PDP/checkout.
4. Nếu Resend lỗi: tắt Resend + bật SMTP cũ có idempotency/delivery state; không resend mù các email đã accepted.
5. Nếu GHN lỗi: báo giá tạm không khả dụng, tuân thủ chính sách checkout; **không hiển thị phí bịa**, không thu sai phí; admin có manual fulfillment queue.
6. Nếu Turnstile lỗi: route-sensitive fallback tùy rủi ro, rate limit giữ nguyên; tránh mở spam toàn hệ thống.
7. Nếu Cloudinary lỗi: dùng ảnh gốc còn lưu trữ, không xóa bản gốc.
8. Nếu Google OAuth lỗi: giữ email/password login hiện tại; unlink không xóa tài khoản.
9. Nếu Merchant lỗi: dừng sync; dữ liệu giá/stock nội bộ không thay đổi; lên lịch reconciliation.
10. DB rollback: ưu tiên disable code path, restore/backfill theo migration đã lưu; không drop bảng đang chứa dữ liệu production khi chưa được duyệt.

## 16. BẢO MẬT, CHÍNH SÁCH VÀ DỮ LIỆU

- **SePay:** payment provider webhook verification theo tích hợp hiện tại; idempotency payment transaction ID.
- **GHN:** token server-only, webhook auth theo tài liệu/configured secret, RLS shipment ownership, hạn chế hiển thị thông tin shipper, không giả GPS.
- **Resend:** xác minh domain, DKIM/SPF/DMARC; anti-spam; unsubscribe với marketing; tách transactional từ marketing.
- **Gemini:** không gửi PII, nhạy cảm hoặc dữ liệu riêng; kiểm tra free-tier data handling; chỉ trích xuất fields tối thiểu từ catalog.
- **Google Auth:** verify `aud`, `iss`, `exp`, CSRF/state phù hợp và Google `sub`; email verified không đủ để tự động nối tài khoản.
- **GA4/Search Console:** cookie consent/chính sách privacy; không truyền email, điện thoại, địa chỉ, `user_id` thô không được xử lý chính sách.
- **Turnstile:** private secret BE, verify every risk action server side.
- **Cloudinary:** admin authorization, signed upload preset khi cần, giới hạn file & kích thước, không upload thông tin khách.
- **Merchant:** quyền sync tối thiểu, không tự đăng quảng cáo, tôn trọng chính sách Google và tính chính xác listing.

## 17. QUY TRÌNH CODEX THỰC THI THEO BATCH

**Quy tắc một batch:** <= 1 module chức năng hoặc 1 migration additive + tests liên quan. Trước sửa: `git status`, diff context, docs chính thức. Sau sửa: chạy kiểm thử khả dụng và ghi kết quả. Không commit/push trừ khi user cho phép.

**Mẫu kết quả cuối mỗi batch:**

```
BATCH: P<phase>-<id>
SCOPE: ...
REUSED: ...
ADDED/MODIFIED FILES: ...
MIGRATIONS: ... (NOT EXECUTED IN PROD)
FEATURE FLAGS: ... DEFAULT OFF
TESTS RUN: command → PASS/FAIL/SKIPPED (reason)
EXTERNAL ACCESS: VERIFIED / MOCK / BLOCKED
COST/QUOTA: ...
SECURITY/RISK: ...
ROLLBACK: ...
NEXT BATCH: ...
```

**Tiến độ:** `docs/integrations/implementation-progress.md` luôn gồm checkboxes, task IDs, dependencies, test evidence, blockers và next safe action. Codex phiên mới phải đọc file này + `git status` trước tiếp tục.

### Thứ tự batch khuyến nghị
1. P0-01 Audit và baseline; P0-02 ma trận capabilities/cost + design docs.
2. P1-01 env/flags/secret schemas; P1-02 retry/outbox/inbox; P1-03 Turnstile.
3. P2-01 GA4; P2-02 Search Console sync; P2-03 PageSpeed scheduled diagnostics.
4. P3-01 review GHN existing plan; P3-02 fill GHN missing core; P3-03 shipping webhooks/alerts/COD/tracking.
5. P4-01 SMTP audit/provider abstraction; P4-02 Resend opt-in + templates + outbox.
6. P5-01 catalog retrieval + Gemini advisor; P5-02 FTS baseline; P5-03 pgvector if justified.
7. P6-01 Google Sign-In account linking.
8. P7-01 Cloudinary POC; P7-02 production-ready media adapter only if beneficial.
9. P8-01 Merchant eligibility and catalog audit; P8-02 guarded sync.
10. P9-01 integrated admin health/KPI + E2E + release docs.

## 18. CẤU HÌNH ENV GỢI Ý — CHỈ THÊM KHI THỰC SỰ DÙNG

```
# defaults OFF
FEATURE_GHN_ENABLED=false
FEATURE_RESEND_ENABLED=false
FEATURE_GEMINI_ADVISOR_ENABLED=false
FEATURE_VECTOR_SEARCH_ENABLED=false
FEATURE_CLOUDINARY_ENABLED=false
FEATURE_GOOGLE_LOGIN_ENABLED=false
FEATURE_GA4_ENABLED=false
FEATURE_SEARCH_CONSOLE_SYNC_ENABLED=false
FEATURE_MERCHANT_SYNC_ENABLED=false
FEATURE_PAGESPEED_AUDIT_ENABLED=false
FEATURE_TURNSTILE_ENABLED=false

# server only (do not print values)
GHN_ENV=staging
GHN_TOKEN=
GHN_SHOP_ID=
RESEND_API_KEY=
GEMINI_API_KEY=
CLOUDINARY_API_SECRET=
GOOGLE_OAUTH_CLIENT_SECRET=
GOOGLE_SEARCH_CONSOLE_OAUTH_REFRESH_TOKEN=
GOOGLE_MERCHANT_OAUTH_REFRESH_TOKEN=
TURNSTILE_SECRET_KEY=

# public browser keys as appropriate, not secret
NEXT_PUBLIC_GA4_MEASUREMENT_ID=
NEXT_PUBLIC_GOOGLE_CLIENT_ID=
NEXT_PUBLIC_TURNSTILE_SITE_KEY=
```

Không tạo mới key đã có hoặc trùng provider configs; dùng secrets manager hiện tại nếu có. Không mặc định mọi công cụ đều cần đủ toàn bộ env trên.

## 19. DEFINITION OF DONE (DOD) TỔNG

- [ ] Đủ 11 tích hợp được phân loại Implemented / Reused / Deferred with reason / Blocked by external rights; **không nhất thiết bật tất cả**.
- [ ] Không lỗi hồi quy order, SePay, voucher, auth, SMTP, Zen/Traditional.
- [ ] Bảo mật, privacy, quotas, kill switch, idempotency, RLS đều có test.
- [ ] Không có billing hay request production nào được kích hoạt trái phép.
- [ ] Documentation, test evidence, cost/permissions register, operations runbook đầy đủ.
- [ ] Tất cả tính năng mới là opt-in có thể rollback mà không mất dữ liệu.
- [ ] Admin phân biệt *data verified*, *missing data* và *mock*; không hiển thị dashboard giả như số liệu thật.
- [ ] Release candidate chỉ được đánh dấu READY khi owner review tất cả blockers và cho phép production separately.

## 20. PROMPT DÁN TRỰC TIẾP VÀO CODEX

> Đọc toàn bộ `docs/integrations/MASTER_IMPLEMENTATION_PLAN.md` (nếu file đặt ở đường dẫn khác, dùng đường dẫn người dùng cung cấp). Đây là specification bắt buộc cho Web_TramHuong. Chỉ triển khai 11 API được liệt kê. Bắt đầu PHASE 0: audit codebase, viết capability matrix, rà soát existing code, giá/permission chính thức và xây baseline. Không đoán dữ liệu DB, không tự bật billing/production, không gửi mail thật, không tự tạo vận đơn GHN, không thay DNS, không migration production, không push. Sau audit hãy triển khai theo batch nhỏ từng phase, ưu tiên tái sử dụng, đưa flag default OFF, có test, rollback, cập nhật `docs/integrations/implementation-progress.md`. Bảo vệ Next.js Zen/Traditional, NestJS, Supabase, SePay, vouchers, orders, SMTP. Nếu thiếu credential/permission, dùng mocks và ghi blocker. Báo rõ mỗi batch files changed, actual tests, cost risks, next task. Không hỏi lại những điều đã xác định trong spec; chỉ yêu cầu chủ dự án can thiệp khi thao tác có chi phí, credentials, DNS, migrations/production, hoặc rủi ro không thể tự xử lý an toàn.

---

## Tài liệu chính thức để Codex kiểm tra lại trước mỗi tích hợp

1. GHN — https://developer.ghn.vn/vi/docs/getting-started/overview
2. Resend — https://resend.com/pricing
3. Gemini — https://ai.google.dev/gemini-api/docs/pricing
4. Supabase vector — https://supabase.com/docs/guides/ai/vector-columns
5. Cloudinary — https://cloudinary.com/pricing
6. Google Identity — https://developers.google.com/identity/gsi/web/guides/verify-google-id-token
7. GA4 ecommerce — https://developers.google.com/analytics/devguides/collection/ga4/ecommerce
8. Search Console — https://developers.google.com/webmaster-tools/v1/searchanalytics/query
9. Merchant API — https://developers.google.com/merchant/api
10. PageSpeed Insights — https://developers.google.com/speed/docs/insights/v5/get-started
11. Turnstile — https://developers.cloudflare.com/turnstile/plans/

**Chi phí, quota, scope và điều khoản luôn phải được xác minh lại khi thiết lập tài khoản thực tế; bản plan này không phải thông báo giá cố định.**
