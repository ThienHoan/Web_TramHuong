# Hướng dẫn kích hoạt và trạng thái từng phase

> **Bản mới nhất cho các phần đã nghiệm thu thật (05/11/2026):**
> [33-huong-dan-kich-hoat.md](./33-huong-dan-kich-hoat.md). Trang này giữ lại làm lịch sử.

Cập nhật 05/11/2026. Đây là hướng dẫn cho **source hiện tại**, chưa phải xác nhận
tất cả phase đã hoàn thành hoặc tất cả API đã kết nối thật. Không bật đồng loạt
các flag. Chưa chỉnh `.env` thật hoặc cài SQL lên Supabase trong batch này.

## 1. Những gì hiện chạy được

| Phase | Kết quả đã có | Phần cần hoàn thành trước live |
| --- | --- | --- |
| 0 | Audit, thiết kế, đối chiếu metadata DB | Quyền/quota tài khoản bên ngoài chưa được chứng nhận đầy đủ |
| 1 | Flags, executor, mock outbox/quota, Turnstile contact mock | Hosted foundation; live Siteverify, widget/hostname; quota live và source hooks |
| 2 | GA4 mock, purchase SQL, GSC/PSI mock; owner đã xác nhận 8 tên sự kiện trên GA4 Test stream | Tham số item/attribution/guest purchase; GSC/PSI lưu DB mới ở mức mock local (chưa cài hosted); token rotation/scheduler/live adapters |
| 3 | Tái sử dụng GHN/shipping/COD hiện hữu | Nghiệm thu quote/create/callback/label/COD trên staging, hosted setup |
| 4 | SMTP boundary; source capture + hàng đợi + delivery Resend mô phỏng | Ghi event cùng giao dịch gốc, xử lý bỏ sót; Resend thật, domain/quyền gửi, bounce/delivery webhook |
| 5 | Chat JSON/SSE dựa catalog; FTS/index và benchmark local | Cài FTS/test catalog thật; Gemini live transport/token budget/data policy |
| 6 | Supabase PKCE/session cũ được tái sử dụng, callback an toàn và giữ locale | Hosted OAuth; va chạm email và yêu cầu xác thực lại chủ tài khoản trước liên kết |
| 7 | Đã đo 12 ảnh local; giữ StorageService/sharp/Next Image | Cloudinary hoãn có điều kiện tới khi CDN/CWV trial chứng minh có lợi |
| 8 | Products/v1 preview và mock delta queue bền vững, generation A→B→A | Live transport, source hooks, per-SKU outbound fencing, reconciliation/deletion/scheduler và tài khoản Google |
| 9 | Panel ADMIN đúng 11 dịch vụ, VI/EN; health chỉ đọc cấu hình | Số liệu runtime/quota/failure/cost thật, operational actions và acceptance tích hợp |

`ACCEPTED` trong mock không có nghĩa email đã đến hộp thư hoặc Google đã niêm yết
sản phẩm. Phần code chưa làm được ghi riêng; bổ sung API key không tự hoàn tất nó.

## 2. Xem và kiểm thử ngay, không cần API key

Từ thư mục project:

```bash
pnpm --dir apps/api run demo:analytics
```

Mở [lab tiếng Việt](http://localhost:4400/vi/integration-lab/analytics) hoặc
[tiếng Anh](http://localhost:4400/en/integration-lab/analytics). Nếu lab đang chạy,
dùng phiên đó; không mở hai process cùng cổng. Lab dùng dữ liệu/auth mẫu; không
đại diện cấu hình backend chính. Lab hiện có chat/catalog, analytics/GSC/PSI và
panel kết nối; chưa có UI gửi/drain thông báo hoặc Merchant queue mới.

```bash
pnpm --dir apps/api run test:notifications
pnpm --dir apps/api run test:merchant-queue
pnpm --dir apps/api run test:catalog-search
pnpm --dir apps/web run test:connections
```

Các test HTTP cần mở loopback; database SQL của test là memory-only. Không chạy
AppModule/cron hoặc đọc credential để gọi dịch vụ thật. Backend đầy đủ hiện có
58 suites/816 tests PASS; notification SQL37 + workflow19, Merchant workflow24.

## 3. Chuẩn bị database thử nghiệm trước khi bật tính năng có lưu trữ

Dùng đúng Supabase **test project đã xác nhận**, giữ flags tương ứng OFF.

1. Chạy [checker nền](./verify-installed-foundation.sql) trước. Permission migration
   đã được owner báo chạy thành công; không yêu cầu chạy lại mù.
2. Nếu outbox/usage/RPC còn CHUA_CAI, review rồi cài lần đầu
   `apps/api/migrations/integration-delivery-foundation.sql`. Không chạy lại nếu
   có object trùng tên; kiểm tra nguyên nhân trước.
3. Nếu dùng thông báo mock, review/cài `integration-notifications.sql` sau nền.
   Nếu dùng Merchant queue mock, review/cài `integration-merchant-queue.sql` sau nền,
   rồi `integration-merchant-fence.sql` (bắt buộc từ 05/11: thiếu fence thì drain
   trả 503 trước khi nhận việc). Checker riêng
   [verify-installed-merchant-fence.sql](./verify-installed-merchant-fence.sql) phải 6 dòng PASS.
4. Chạy [checker delivery](./verify-installed-delivery-features.sql). Ba RPC
   thông báo và hai RPC Merchant phải PASS cho phần đã cài. CHUA_CAI là chưa cài;
   FAIL cũng có thể là đã chủ động pause. Checker chỉ đọc metadata.
5. FTS độc lập: làm theo [hướng dẫn FTS](./19-catalog-fts.md), cài
   `catalog-full-text-search.sql` rồi chạy checker riêng. Purchase mock có gói
   SQL riêng trong [hướng dẫn purchase](./10-purchase-capture.md).

Installer chỉ dùng lần đầu trên test DB. Có thể gây lock trong lúc tạo index;
review schema/restore point trước khi áp dụng. Agent chưa cài các gói mới trên
hosted DB; kết quả local không thay thế hosted acceptance.

## 4. Bật thử từng chức năng đã triển khai

Cấu hình backend dev/test, sau đó restart backend. Dùng các giá trị literal
`true`/`false`; giá trị không hợp lệ bị từ chối lúc khởi tạo.

```dotenv
NODE_ENV=development
INTEGRATIONS_ENV=mock
INTEGRATIONS_KILL_SWITCH=false
```

Giữ flag khác OFF và chỉ thêm nhóm cần thử:

| Chức năng | Flag/cấu hình cần thêm | Kết quả dự kiến |
| --- | --- | --- |
| Catalog chat mặc định | Không cần flag Gemini/key | Chat chỉ trả sản phẩm/giá/tồn kho từ catalog, không phải AI hỏi đáp tự do |
| PostgreSQL FTS | `CATALOG_FTS_ENABLED=true`, SQL đã cài | Advisor `searchEngine=postgres_fts`; lỗi RPC trả fallback có lý do |
| Gemini ID-selection mock | `FEATURE_GEMINI_ADVISOR_ENABLED=true` | Chỉ chọn ID mẫu và đọc lại catalog; không gọi Gemini thật |
| Notification queue mock | `FEATURE_RESEND_ENABLED=true` và `FEATURE_NOTIFICATION_OUTBOX_ENABLED=true`, SQL đã cài | Customer mail hooks capture tham chiếu đơn; ADMIN capture/drain thủ công; không gửi email |
| Merchant preview | `FEATURE_MERCHANT_SYNC_ENABLED=true`, `FRONTEND_URL` là HTTPS origin công khai hợp lệ | Preview tối đa 20 sản phẩm, không ghi lên Google |
| Merchant queue mock | Thêm `FEATURE_MERCHANT_OUTBOX_ENABLED=true`, SQL queue + fence đã cài | Queue/reconcile một trang/drain thủ công; `synced=false`; mỗi sản phẩm chỉ một lượt gửi đang chạy, bản bị chặn trả `deferred` và tự xếp lại sau 30 giây |
| Search Console mock | `FEATURE_SEARCH_CONSOLE_SYNC_ENABLED=true` | ADMIN Đồng bộ mẫu; dữ liệu RAM, không OAuth/Google |
| Search Console mock lưu DB | Thêm `FEATURE_SEARCH_CONSOLE_PERSISTENCE_ENABLED=true` sau khi cài `search-console-durable-mock.sql` trên DB thử nghiệm | Dữ liệu mẫu còn sau restart; checker [verify-installed-search-console-store.sql](./verify-installed-search-console-store.sql) 6 dòng PASS. Vẫn là mock |
| PageSpeed mock | `FEATURE_PAGESPEED_AUDIT_ENABLED=true` | ADMIN Đo mẫu, whitelist/cache/history RAM; không phải phép đo tốc độ thật |
| Số liệu vận hành trên dashboard | `FEATURE_INTEGRATION_OPS_METRICS_ENABLED=true` sau khi cài `integration-ops-metrics.sql` | Panel "Kết nối dịch vụ" hiện lần thành công, hạn mức hôm nay, tỷ lệ không thành công 7 ngày, hàng đợi — đếm từ DB thử nghiệm, ghi rõ là mock; checker [verify-installed-ops-metrics.sql](./verify-installed-ops-metrics.sql) |
| PageSpeed mock lưu DB | Thêm `FEATURE_PAGESPEED_PERSISTENCE_ENABLED=true` sau khi cài `pagespeed-durable-mock.sql` trên DB thử nghiệm | Lịch sử mẫu còn sau restart, cache 24h tính theo giờ DB; checker [verify-installed-pagespeed-store.sql](./verify-installed-pagespeed-store.sql) 6 dòng PASS. Vẫn là mock |
| Contact Turnstile mock | `FEATURE_TURNSTILE_ENABLED=true` | Policy mock cho contact; chưa bảo vệ bot bằng Cloudflare thật |
| GA4 mock | `FEATURE_GA4_ENABLED=true` | Collector có consent; không Google network. Purchase cần subflag/SQL riêng |

Notification opt-in **ngăn SMTP cho cả customer hooks và admin alert**. Nếu
capture bị chặn/lỗi, không fallback sang SMTP. Tắt opt-in và restart sẽ khôi phục
luồng SMTP hiện hữu, nên kiểm tra cấu hình mail trước khi tạo thêm sự kiện thử.
Chỉ `payment_success` và `order_status` đang có call sites tự động; confirmation
chưa được gọi tự động lúc tạo đơn, GHN notifications chưa nối worker email.
Khoảng trống giữa transaction nguồn và capture chưa được loại bỏ.

Routes backend có prefix `/api`, dùng session ADMIN/access token hiện hữu:

| Request | Body/giới hạn |
| --- | --- |
| GET `/api/integrations/admin/health` | Chỉ cấu hình/evidence; không probe provider |
| GET `/api/admin/notifications/deliveries?page=1` | 20 dòng/trang; không recipient/HTML/payload |
| POST `/api/admin/notifications/capture` | `{"source":"mock","orderId":"UUID-thật-trong-test-DB","event":"payment_success"}`; event khác: order_confirmation/order_status |
| POST `/api/admin/notifications/drain` | `{"source":"mock"}` |
| POST `/api/merchant/sync` | `{"source":"mock"}`; preview |
| POST `/api/merchant/queue` | `{"source":"mock","productIds":["UUID-sản-phẩm-test"]}`; 1–20 ID khác nhau |
| POST `/api/merchant/reconcile` | `{"source":"mock","page":1}`; tối đa 20 dòng, kiểm tra hasMore |
| POST `/api/merchant/drain` | `{"source":"mock"}` |

Các POST trên bị throttle; không lặp tự động hoặc gửi lại khi kết quả UNKNOWN.
Không có nút kích hoạt hàng loạt trên dashboard và không có cron mới.

## 5. Cấu hình/API thật: phải hoàn thành đúng đường triển khai

| Dịch vụ | Cách chuẩn bị đúng hiện tại |
| --- | --- |
| SMTP hiện hữu | MailModule dùng MAIL_HOST, MAIL_USER, MAIL_PASSWORD, MAIL_FROM; MAIL_ADMIN_ADDRESS tùy chọn. Giữ notification opt-in OFF nếu muốn dùng SMTP. Không có EMAIL_PROVIDER env để đổi sang Resend |
| Resend | Chưa có live HTTP transport/webhook được phát hành. Cần hoàn thành code/source transaction và xác minh domain/quyền gửi, rồi nghiệm thu riêng; flag hiện tại chỉ mock |
| Gemini | SDK call cũ đã gỡ khỏi ChatService. Key cũ không kích hoạt model; cần live adapter, durable token budget và chính sách dữ liệu |
| Supabase pgvector | Chưa có embeddings/vector adapter. Benchmark catalog thật bằng FTS trước; giữ vector flag OFF tới khi chứng minh cần thiết |
| Cloudinary | Chưa có adapter/upload/mapping. Không cần key để dùng optimizer hiện hữu; giữ Cloudinary OFF theo quyết định benchmark có điều kiện |
| Google Sign-In | Dùng Supabase Auth/provider và callback hiện hữu. Review OAuth origins/redirect allowlist cùng NEXT_PUBLIC_SITE_URL production HTTPS; chưa chứng nhận hosted collision/linking policy. FEATURE_GOOGLE_LOGIN_ENABLED không phải công tắc của nút Google cũ |
| GA4 | Đợt Test stream đã có evidence tên sự kiện; API secret chỉ server. Không khởi động lại CLI live để tăng lượt. Theo [runbook GA4](./15-ga4-local-funnel.md) và [giới hạn phiên](./16-ga4-session-diagnostics.md) cho đợt thử được cấp quyền riêng; purchase vẫn mock |
| Search Console | Cần verified property, OAuth readonly, token encryption/rotation và durable sync. [Diagnostics riêng](./13-google-real-diagnostics.md) chỉ là phép kiểm tra được kiểm soát, không bật collector tự động |
| PageSpeed | Cần URL công khai đã duyệt, project quota và durable lịch sử; diagnostics riêng không thay adapter/scheduler. Không dùng số liệu mock làm CWV/LCP thật |
| Merchant API | Cần account/API data source/OAuth/product eligibility, live transport, fencing và reconciliation. Không tái bật cron Content API cũ |
| Turnstile | Cần widget/hostname và siteverify server thật; flag hiện tại không render hoặc xác minh widget Cloudflare live |
| GHN | Tái sử dụng cấu hình/module riêng; làm theo [hướng dẫn GHN](../shipping/huong-dan-cai-dat.md). Bắt đầu staging; không bật checkout/fulfillment/jobs đồng loạt trước acceptance |

Các đường mới trong registry **vẫn bị chặn ở staging/production**, kể cả có
flag/key. GOOGLE_DIAGNOSTICS là luồng kiểm tra riêng có gate riêng, không chứng
minh các adapter chính đã sẵn sàng. GHN/OAuth/storage hiện hữu có cấu hình riêng;
kill switch mới không hứa tắt chúng. Không dán secrets hoặc token vào chat.

## 6. Dừng và khôi phục

- Mock queue Merchant: tắt subflag/restart, giữ mọi generation/outbox/usage.
- Notification: giữ opt-in ON + tắt Resend/kill switch để chặn capture/send mà
  không quay lại SMTP; nếu muốn trở lại SMTP thì tắt opt-in có chủ đích/restart.
- FTS: tắt CATALOG_FTS_ENABLED/restart; catalog keyword fallback tiếp tục dùng.
- SQL pause chỉ revoke RPC, không xóa dữ liệu. Không xóa UNKNOWN hoặc reset key
  để ép chạy lại; điều tra trước.
- Lab: Ctrl+C đúng process của lab. Không cần cleanup database thật.

## 7. Thứ tự công việc còn lại

Hoàn thành source transaction/reconciliation cho notifications và durable
quota/token/history trước live adapters; đồng thời cài/kiểm tra các gói SQL trên
test DB và kiểm tra chính sách OAuth. Sau đó nghiệm thu từng transport trên
staging có quyền, đo runtime/quota/cost thật và hoàn thiện dashboard vận hành.
Chỉ đánh dấu tất cả phase hoàn tất khi các gate code lẫn account/acceptance đều
được đóng hoặc có quyết định deferred được ghi rõ. Hướng dẫn bật live cuối cùng
sẽ phải cập nhật theo phần code và bằng chứng đã thực sự hoàn tất lúc đó.
