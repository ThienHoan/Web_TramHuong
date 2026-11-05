# Trạng thái kết nối và bước nghiệm thu — 05/11/2026

**Kết luận:** các batch độc lập P3-01, P4-01/02, P5-01/02, P6-01a,
P7-01, P8-01/02 và P9-01a/b đã có source và kiểm thử local. **Chưa hoàn tất tất cả
kết nối live hoặc đủ điều kiện production.** Thiếu quyền bên ngoài không được
thay bằng dữ liệu giả hay bật provider khi chỉ có flag/key.

Cập nhật mới nhất: notification source/worker mock bền vững, benchmark12ảnh,
Merchant delta queue/generation chống A→B→A. FullAPI58suites/816testsPASS;
notification SQL37+workflow19, Merchant SQL/TS24checksPASS.
[Hướng dẫn kích hoạt hiện tại](./23-activation-guide.md) ghi chính xác flags,
thứ tự SQL, routes `/api`, rollback và code/account gates còn mở.


Cập nhật tiếp05/11: [19-catalog-fts.md](./19-catalog-fts.md) bổ sung góiFTS/index,
repository/fallback và nối cả chatJSON/SSE hiện có vào advisor. FullAPI757PASS,
SQL58checksPASS, browserVI/ENPASS. FTS chưa cài hosted; Gemini vẫn chưa có live
transport. Những ghi chú legacyChat bên dưới thuộc snapshot trước batch này:
đường gọi SDK cũ hiện đã được gỡ, chat mặc định tra cứu catalog.

| Tích hợp | Kết quả hiện tại | Điều kiện chưa hoàn tất |
| --- | --- | --- |
| GHN | Tái sử dụng toàn bộ module shipping/COD/tracking; regression pass. Lịch sử operator đã xác nhận staging province read | Hosted setup và quote/create/callback/nhãn/COD staging acceptance |
| Resend | SMTP default; opt-in mock captures source/queues/drains durable notifications, ADMIN private history | Hosted SQL, atomic original-transaction events/reconciliation, domain/quyền gửi và live transport/bounce/delivery |
| Gemini | Advisor và chatJSON/SSE trả SKU/giá/tồn kho từ catalog; mock chỉ chọn ID, đọc lại nguồn. Legacy SDK call path đã gỡ | Live transport/quota token/data policy và nghiệm thu mô hình; catalog fallback không phải generative Q&A |
| Supabase pgvector | Deferred có điều kiện; đã chuẩn bị FTSSQL/index/12syntheticqueries; fallback100sản phẩm khiFTSchưa bật | HostedFTSinstall+benchmark trên catalog thật; chỉ làm vector nếu có lợi và ngân sách embedding được xác nhận |
| Cloudinary | Deferred có điều kiện; local12ảnh đã đo, giữ StorageService/sharp/Next Image | CDN/CWV trial chứng minh lợi ích; chưa có Cloudinary adapter/live calls |
| Google Sign-In | Tái sử dụng Supabase PKCE/session. Callback giữ locale, kiểm tra redirect và exchange/cookie failures | Hosted OAuth, tài khoản trùng email, chính sách auto-link không đáp ứng mặc nhiên yêu cầu owner reauthentication; flag mới chưa chặn luồng Google cũ |
| GA4 | Owner đã xác nhận8tên pre-purchase trên Test stream ở batch trước | Item parameters, attribution, distributed quota, purchase/guest/financial source/privacy retention |
| Search Console | Admin mock report/manual sync hiện có | Verified property/OAuth readonly, encrypted token rotation, durable sync/scheduler và live acceptance |
| Merchant API | Bỏ cron Content API v2.1 tự chạy; ADMIN products/v1 mock preview và durable bounded delta queue/generation | Account/API data source/OAuth/eligibility, live transport, source hooks/outbound fencing/deletion/full reconciliation và trạng thái Google |
| PageSpeed Insights | Whitelist mock audit/cache/history hiện có | Public URL/project quota, durable history/scheduler và live field/lab acceptance |
| Turnstile | Server/form contact mock đã có, có kiểm thử | Hostname/widget/keys và siteverify live acceptance |

## Có thể xem gì

Dashboard `/{locale}/admin/dashboard` có panel **Kết nối dịch vụ** cho ADMIN.
Backend cần chạy phiên bản source mới; panel gọi
`GET /integrations/admin/health` bằng access token hiện tại. STAFF/CUSTOMER/guest
không được backend cấp dữ liệu. GET chỉ đọc cấu hình và evidence đã ghi trong
source, không probe provider, không ghi DB hay bật tính năng.

Chế độ **Đang tắt / Mô phỏng / Bị chặn / Cấu hình GHN riêng** là trạng thái
cấu hình. Chúng khác chứng nhận live. Thời điểm hiển thị là lúc đọc cấu hình,
không phải last successful provider request. Last success/quota/fail rate/cost
đều để `null` vì chưa có phép đo đáng tin; doanh thu vẫn lấy DB nội bộ.
Panel giữ giao diện flat xanh của dashboard và dùng Button/Skeleton/StatusBadge
sẵn có, không tạo design system mới. Chỉ kích thước chữ/nút của panel được điều
chỉnh khi CSS dashboard ép nhỏ.

Lab xem riêng không cần secrets:

```bash
pnpm --dir apps/api run demo:analytics
```

Mở `http://localhost:4400/vi/integration-lab/analytics` hoặc bản `/en/`.
Lab dùng auth/DB fixture; các mode hiển thị là cấu hình synthetic của lab,
không phải env của backend thật. Tuyệt đối không suy tất cả provider trên hệ
thống đang tắt chỉ từ ảnh lab. Không dùng các nút giả lập thanh toán trong lab
làm bằng chứng SePay thật.

## API mới/được điều chỉnh

| Route | Quyền và hành vi |
| --- | --- |
| `GET /integrations/admin/health` | ADMIN, no-store, đúng11providers, không có secrets/runtime probe |
| `GET /merchant/sync-status` | ADMIN, no-store; liveAvailable/schedulerEnabled false |
| `POST /merchant/sync` | ADMIN, body đúng `{ "source": "mock" }`, local dev/test + flag merchant + registry mock; preview không đồng bộ Google |
| `POST /ai/product-advisor` | Public catalog, throttle10/min trong AppModule; body query2–120ký tự, locale vi/en, minPrice/maxPrice/categoryId tùy chọn; không nhận history/email/source |

Ví dụ advisor body: `{ "query": "vong tay", "locale": "vi", "maxPrice": 500000 }`.
`source=catalog` khi flag Gemini tắt/blocked/không phải local mock; `source=mock`
khi mock selection hoạt động. `searchEngine=bounded_keyword`, `candidateLimit=100`
và `catalogScope=first_100_active_in_stock` là giới hạn công khai. Đọc tối đa100
catalog rows mỗi snapshot qua ProductsService.findAll; category filter trước
phân trang, giá sau shared discount calculator. Bỏ variants chưa có mapping đáng
tin; không bịa source. Không có model network call, embeddings hay DB migration.
Kết quả không phải một cuộc tư vấn Gemini live hay full-catalog FTS relevance.

Merchant cần FRONTEND_URL là HTTPS origin công khai hợp lệ để tạo candidate URL.
Thiếu origin/ảnh/title/description/stock/giá hợp lệ hoặc variants chưa hỗ trợ thì
trả `ineligible_source` cùng reason code cố định; không tự sửa DB, brand/GTIN,
condition, phí vận chuyển hay chứng nhận. Preview page1 không nhận định toàn bộ
catalog đủ điều kiện Google, không xử lý deletion hoặc cleanup.

OAuth dùng NEXT_PUBLIC_SITE_URL hiện có làm canonical production origin nếu được
cấu hình; yêu cầu HTTPS origin không path/query/credentials. Không tin forwarded
headers để chọn đích. Nếu Next ở sau reverse proxy dùng origin HTTP nội bộ,
cần cấu hình canonical HTTPS hợp lệ trước hosted acceptance. Development giữ
origin request. Chỉ Google button được bổ sung locale; provider khác không đổi.
Không thêm scopes, identities/session table hoặc tự động merge theo email trong
application. Hosted Supabase vẫn có thể auto-link theo chính sách của nhà cung
cấp — đây là blocker cần review, không phải việc callback local đã chứng nhận.

## Kiểm thử snapshot trước các batch19–22 (lịch sử)

| Kiểm thử | Kết quả thực tế05/11/2026 |
| --- | --- |
| Full API Jest | **52suites / 692tests PASS**, machine log `/private/tmp/tramhuong-remaining-phases-jest.json` |
| `pnpm --dir apps/api run test:connections` | **7suites / 113tests PASS**: mail, Merchant, advisor, health; auth/DB/provider mocked |
| `pnpm --dir apps/web run test:connections` | **7health schema/fetch +19OAuth helper/handler tests PASS**, không network |
| `pnpm --dir apps/web run test:analytics` | **59tests PASS**, không Google calls |
| API build + scoped API ESLint | PASS; toàn repo lint debt cũ không được gọi là sạch |
| Web TypeScript + scoped ESLint | PASS; không production build/prerender với env thật |
| Browser functional fixture | PASS:11providers, desktop1440/mobile375, VI/EN, refresh đúng1read, error/retry, loading11rows;0JSerrors/0externalRequests/0DBwrites |
| UI skill probe | Đã chạy375/1440và dynamic1440, không horizontal overflow/JSerror/contrast failure trong panel; ảnh đã xem |

Browser report/screenshots: `apps/web/.next/connections-qa/` (ignored), gồm
desktop/mobile/error/loading/english-mobile PNG và report.json. Reproduce sau
khi bật mock lab, dùng một Playwright runtime cài ngoài repository:

```bash
PLAYWRIGHT_MODULE=/private/tmp/tramhuong-ui-probe/node_modules/playwright \
  node apps/web/scripts/verify-integration-health-ui.cjs
```

Probe gốc ở `/private/tmp/tramhuong-connections-probe-final/`. Own issues đã sửa:
badge12px, button44px mobile/40px desktop, text-pretty. Remaining probe `P1`
(product-card hover scale) và fixed scroll button trên lab thuộc component cũ
ngoài panel. Focus rings/border/scrollbar giữ convention dashboard hiện có;
không sửa toàn app vì probe style preferences. Do đó không tuyên bố toàn lab đã
pass mọi rule của skill. Không browser-login Google thật trong lượt này.

Không chạy lại SQL fixtures vì không sửa migration/RPC. Hosted installation,
RLS metadata, email delivery, order/SePay/GHN thật và live provider permissions
không được chứng nhận bởi local mocks.

## Rủi ro, rollback và việc tiếp theo

- SMTP adapter phân biệt accepted/rejected/unknown, giữ lỗi nonblocking và
  privacy-safe. SMTP không có durable idempotency; không tự fallback/resend sau
  unknown. Resend mock ledger100keys/process không thay thế outbox bền vững.
- Chat đã dùng advisor và không còn đường gọi model cũ. Google OAuth và storage
  hiện hữu vẫn có cấu hình riêng; kill switch mới không hứa tắt hai đường đó.
- Không sửa real env, hosted schema, billing/DNS, không gửi mail/vận đơn/tài khoản
  thật, không commit/push. Playwright2packages chỉ được cài trong thư mục tạm.
- Tắt FEATURE_MERCHANT_SYNC_ENABLED/FEATURE_GEMINI_ADVISOR_ENABLED/FEATURE_RESEND_ENABLED
  để chặn mock tương ứng. Advisor vẫn có catalog fallback; SMTP vẫn là default.
  Gỡ panel/dashboard import nếu cần UI rollback. Giữ Merchant cron cũ tắt.
  OAuth kiểm tra canonical config trước khi rollback; không khôi phục forwarded
  header trust như một cách chữa reverse-proxy config. Không có data cleanup.

Next: xác minh metadata hosted foundation/features, hoàn thiện original-transaction
source hooks/reconciliation; kiểm tra FTS trên catalog thật; review hosted OAuth
identity policy; authorized CDN/CWV trial trước Cloudinary. Sau đó triển khai live
adapters/quota/token storage và nghiệm thu từng provider trên staging có quyền.
Các phần code còn thiếu vẫn là việc cần triển khai, không được gộp hết thành
"chỉ thiếu API key". Production release cần owner review riêng.
