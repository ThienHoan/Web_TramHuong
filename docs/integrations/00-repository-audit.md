# Phase 0 — Repository audit

Ngày kiểm tra: 03/11/2026. Đặc tả: `../TRAMHUONG_MASTER_API_IMPLEMENTATION_PLAN.md` (đã đọc đủ mục 0–20). Đường dẫn `docs/MASTER_IMPLEMENTATION_PLAN.md` đang bị xóa trong working tree; bản HEAD cũ là đặc tả GHN, không phải multi-API. Không khôi phục hoặc sửa thay đổi này. Không có AGENTS.md áp dụng tại root/apps/docs; các AGENTS.md trong .agent/skills chỉ nằm trong thư mục skill của người dùng, không áp dụng cho source đang audit.

## Cập nhật sau owner export

Phase0 audit/design gate đã hoàn tất dựa trên owner-supplied schema_report, chi tiết [04-schema-review.md](04-schema-review.md). Metadata thực xác nhận17 public tables, shipping aggregates/RPC/grants/RLS và chưa có generic integration event/usage stores. Môi trường staging/production chưa xác nhận; không có live execution. Các đoạn dưới là baseline trước export; kết luận DB mới trong04 được ưu tiên.

## Phạm vi và giới hạn bằng chứng

Inventory toàn bộ source/config/schema được lưu trong `repository-inventory.md`. Đã truy vết các luồng chính qua controller/service/DTO, các route và component hai theme, SQL/RLS/RPC, scheduler, tests và CI. Inventory không đồng nghĩa mỗi dòng CSS hay mỗi nhánh UI đã được kiểm thử. Không kết nối database hosted, không dùng credential để probe nhà cung cấp. SQL snapshots và TypeScript types là bằng chứng repository, **không phải schema database đang triển khai**. Phase 0 hoàn tất phần repository/design; gate xác nhận DB/account còn BLOCKED, không được đánh dấu production ready.

## Kiến trúc thực tế

- Hai package độc lập `apps/api` và `apps/web`, mỗi package có lock/workspace riêng; không có package.json hoặc pnpm-workspace.yaml ở root.
- Web: Next **16.1.0**, React 19, Tailwind 4, next-intl 4, App Router. Khác giả định Next 14 trong kế hoạch: giữ phiên bản hiện có.
- API: Nest 11, ConfigModule, ScheduleModule, ThrottlerGuard toàn cục (100/phút), cache memory, Pino/correlation ID, Helmet, ValidationPipe. Không cần thêm Redis/BullMQ.
- Supabase Auth/session + PostgreSQL qua service role ở Nest; browser dùng anon key và RLS. Không xây hệ JWT/identity thứ hai.
- `/api/*` Next rewrite tới Nest; base-http SSR đọc NEXT_PUBLIC_API_URL, không đọc API_URL. Nếu chỉ chạy web và API port4000 chưa chạy, SSR fetch bị ECONNREFUSED.

## Module và quyết định tái sử dụng

| Phạm vi | Nguồn hiện có | Quyết định |
| --- | --- | --- |
| Catalog/category/variants/discount | products, categories, common/commerce-pricing; translations VI/EN | REUSE; dùng chung giá hiệu lực cho feed/AI |
| Cart | cart.service; CartProvider; cart_items theo user/product/variant | REUSE, guest cart merge hiện có |
| Voucher | vouchers.service, DTO; checkout gọi validate và server tính lại | OPTIMIZE concurrency sau; không tạo coupon module |
| Orders/SePay | orders.service/controller, order-cleanup; payment-persistence tests | REUSE; không đổi trạng thái hoặc checkout trong audit |
| Shipping/GHN | shipping/*, shipping_records, shipping_tracking; docs/shipping | REUSE theo yêu cầu chủ dự án; không tạo shipping_v2, bảng shipment/COD/inbox trùng |
| Auth/users | Supabase Auth; AuthProvider; login; /auth/callback; AuthGuard/RolesGuard | REUSE; Google OAuth đã có UI, linking cần xác minh |
| SMTP/email | mail.service/module; 4 template Handlebars | REUSE mặc định; Resend adapter tùy chọn sau outbox |
| Gemini/chat | chat.service/controller; @google/generative-ai | OPTIMIZE SDK hiện có; model gemini-2.5-flash-lite; chưa chứng nhận quota key |
| Upload/media | storage.service, sharp, remote-image allowlist; Next/Image | REUSE; Cloudinary chỉ POC khi đo có lợi |
| SEO | metadata, sitemap, robots, Product/Breadcrumb JSON-LD | REUSE; thêm GSC/PSI server-only sau |
| Analytics | analytics.service đọc orders/wishlists/products; lib/analytics validator | Đây là thống kê DB, chưa có GA4/gtag/GTM trong source đã tìm |
| Admin/import | admin module/resources; catalog import SQL; shipping dashboard | REUSE AuthGuard/RolesGuard, pagination, navigation |
| Posts/reviews/contacts/wishlist | module/DTO/service/UI đã có | REUSE; Turnstile bổ sung theo route; contacts đã giới hạn 5/15 phút |

## Database và integrity

Schema nằm rải ở `db/`, `apps/api/supabase/`, `apps/api/database/`, `apps/api/migrations/`, typed Database và snapshot `supabase/db.txt`. Snapshot có `order_items` nhưng runtime lưu `orders.items` JSON; không tạo thêm order_items hoặc coi hai đường là đồng bộ. Voucher và shipping schema không cùng xuất hiện đầy đủ trong snapshot cũ.

- `admin-order-integrity.sql`: trigger validate transition, restore stock khi cancel/expire; RPC transition_order CAS, chỉ service_role.
- `smart-logistics.sql`: shipping_records đa loại, key unique/version CAS, RPC reserve shipment khóa order và kiểm tra eligible/COD; shipping_tracking projection owner RLS + realtime. Inbox, event, cod, notification, exception, ticket đã nằm trong aggregate này.
- SePay dùng x-api-key/Authorization so với SEPAY_API_KEY; reject thiếu/sai key, amount không hợp lệ. verifyPayment kiểm tra order paid, số tiền, state, conditional update status/payment_status và kiểm tra DB error; concurrent winner không gửi email lần hai. Late paid giữ SHIPPED/COMPLETED.
- **Chưa đủ chứng minh uniqueness transaction ID toàn hệ thống**: `db/add_payment_fields.sql` có index transaction_code thường, không unique; webhook chưa kiểm tra transferType/account và id được stringify trước khi kiểm tra schema. Cần batch riêng với mocks và schema staging trước khi đổi luồng tài chính.
- Create order hiện consume voucher → insert order → update stock → clear cart qua các calls riêng. Initial stock check/read-modify-write chưa bảo đảm atomic reservation hay voucher quota khi cạnh tranh; rollback nghiệp vụ chưa đầy đủ nếu insert thất bại. Không viết lại trong audit.
- SQL user profile policies/snapshots cũ có public SELECT và own UPDATE; cần kiểm tra grants/RLS thực cho email/role. Guard Nest không bảo vệ đường truy cập Supabase trực tiếp. Không khẳng định hosted DB đang bị lỗi.
- GHN delivered chỉ cập nhật shipping; COD reported/collected/remitted và bank confirmed phải tách. Không suy payment paid từ carrier delivered.
- Returns/support có sẵn; tự động refund ngân hàng/hoàn tồn sau return chưa là workflow được chứng nhận. Không phát event refund GA4 nếu chưa có refund thật.

## UI và regression contract

VI chọn Traditional, EN chọn Zen tại route home; các route sản phẩm/checkout có adapter theo locale. CartProvider/AuthProvider/WishlistProvider và API services được chia sẻ. ZenCheckout và TraditionalCheckout/GuestCheckoutForm dùng ShippingQuotePanel; payment_select, payment polling, success và account/orders là các điểm regression. Không tạo checkout hoặc session mới. Google/Facebook OAuth buttons đã có; Facebook nằm ngoài 11 tích hợp, giữ nguyên.

## Email, AI, jobs và privacy

- MailService gọi SMTP async sau thanh toán/status; lỗi được nuốt để không làm fail order. Chưa có delivery ledger/retry/outbox; crash sau paid trước send có thể mất email. Templates chưa đủ VI/EN; log failure hiện chứa recipient.
- Gemini constructor tạo SDK khi có key, chưa có default-off policy cho đường cũ; chat/history có thể chứa PII, history item chưa có bound/schema chặt; recommendations do model sinh chưa được xác thực lại catalog. Product AI retrieval lọc active nhưng chưa lọc stock hoặc dùng common discount pricing. Không gọi model trong audit.
- MerchantService dùng `@googleapis/content` v2.1 custombatch, cron midnight tự chạy khi client initialized; không có flag/quota/delta/durable result. Link thiếu locale, giá/feed shipping threshold hardcoded, catches batch failure nhưng vẫn trả success. Cần thay transport trong module cũ, không xây merchant_new.
- Order cleanup 5 phút có write; shipping jobs default off và CAS lease/retry; Merchant cron chưa off. Vì vậy **không khởi động full Nest app với .env thật** để audit.
- Pino redact có auth/cookie/token; SupabaseService đang log prefix key và mail log recipient: backlog sửa hẹp sau gate; tránh chạy bootstrap để in chúng.

## Baseline thực chạy

| Check | Kết quả ngày 03/11/2026 |
| --- | --- |
| Dependencies | node_modules/lock đã có; không install/update dependency để giữ baseline |
| API `pnpm build` | PASS |
| API `pnpm exec jest --runInBand --silent --json --outputFile=/tmp/tramhuong-baseline-tests.json` | PASS 27 suites / 246 tests; mocks, không production; sandbox lần đầu EPERM local listen, rerun được approval |
| API `pnpm exec eslint src test --no-fix --format json --output-file /tmp/tramhuong-api-lint.json` | FAIL có sẵn: 110 errors, 2 warnings; không dùng script lint vì có --fix |
| Web `pnpm exec eslint src --format json --output-file /tmp/tramhuong-web-lint.json` | PASS 208 files, 0 errors/warnings |
| Web `pnpm exec tsc --noEmit` | Ban đầu FAIL stale .next/types trỏ route auth/callback cũ; `pnpm exec next typegen` rồi tsc PASS; chỉ tái tạo artifact ignored |
| API `node scripts/verify-logistics-sql.cjs` | PASS 28 checks, in-memory PostgreSQL, productionWrites=0 |
| Web production build | SKIPPED: next/font tải Google fonts, prerender sitemap/catalog có outbound; chưa có build fixture cách ly đầy đủ; không gọi production để lấy baseline |
| Browser/DebugView/live providers | NOT RUN trong batch audit; không lấy kết quả QA cũ làm pass mới |

Evidence summary nằm trong implementation-progress; JSON local /tmp có thể mất qua session. CI api tests đang comment, lint --fix, node20 khác runtime local; deploy tự chạy khi push main. Không commit/push.

## Blockers

DB-01: cần schema-only export hoặc local/staging DB đã xác nhận, gồm extensions, constraints, triggers, grants, RLS và migration history; không cần dữ liệu khách hàng. ACCESS-01: credential trong .env không chứng minh quyền/account/quota. PROVIDER-01: chưa có Resend/Turnstile/GA4/GSC/PSI/Cloudinary access đã xác nhận; dùng mock. LEGACY-01: hiện hữu AI/Merchant không được coi là an toàn chỉ bởi các flag mới off; phải tích hợp gate vào từng call path ở phase tương ứng. COST-01: chưa có báo cáo usage thực. Chi tiết ở 03-cost-and-access-register.
