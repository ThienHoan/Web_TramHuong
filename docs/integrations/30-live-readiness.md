# Chuẩn bị nối API thật — hồ sơ sẵn sàng (bước 3)

> Hướng dẫn kích hoạt cho các phần đã nghiệm thu: [33-huong-dan-kich-hoat.md](./33-huong-dan-kich-hoat.md).

Cập nhật 05/11/2026. Đây là **danh sách việc cần làm trước khi gọi API thật**, chưa
phải hướng dẫn kích hoạt cuối cùng. Hướng dẫn cuối sẽ viết sau khi từng dịch vụ đã
nghiệm thu thật. Mọi lần gọi dịch vụ thật đều cần bạn đồng ý riêng.

> Không dán key, mật khẩu hay token vào chat. Điền vào `apps/api/.env` (backend) hoặc
> `apps/web/.env` (frontend), rồi chạy lệnh kiểm tra ở mục 1 — lệnh này chỉ in **tên**
> biến và trạng thái có/thiếu/sai định dạng, không bao giờ in giá trị.

## 1. Kiểm tra cấu hình hiện tại (không lộ giá trị)

```bash
pnpm --dir apps/api run check:live
```

Kết quả trên máy của bạn lúc 05/11/2026 16:33 (chỉ tên):

| Hạng mục | Trạng thái |
| --- | --- |
| `NODE_ENV`, `INTEGRATIONS_ENV` trong `apps/api/.env` | **Thiếu**. `start:dev` không tự đặt `NODE_ENV`, nên các tính năng mock sẽ báo "bị chặn" khi chạy backend local. Thêm `NODE_ENV=development` và `INTEGRATIONS_ENV=mock` |
| Cờ tính năng mới | Không cờ nào bật (đúng mặc định) |
| Supabase, SMTP, GHN | Đủ tên biến |
| GA4 | Có `GA4_MEASUREMENT_ID` (đúng định dạng) và `GA4_API_SECRET` |
| `GEMINI_API_KEY` | Có, nhưng **code hiện tại không dùng** (lời gọi SDK cũ đã gỡ) |
| PageSpeed, Search Console | Thiếu toàn bộ biến |
| `FRONTEND_URL` (api), `NEXT_PUBLIC_SITE_URL` (web) | Thiếu — cần domain HTTPS công khai |
| Turnstile, Resend, Merchant | Chưa có biến; code live chưa nối/chưa viết |

## 2. Cài SQL lên DB thử nghiệm (bạn chạy, mình đọc kết quả)

Mình không có quyền chạy SQL trên Supabase. Bạn mở **SQL Editor của project thử
nghiệm** (không phải production).

**Cách nhanh (khuyên dùng):** mở file
[`apps/api/migrations/test-db-core-bundle.sql`](../../apps/api/migrations/test-db-core-bundle.sql),
dán toàn bộ nội dung vào SQL Editor và chạy **một lần**. File này gộp các gói 1, 2, 3,
6, 8, 9, 10 bên dưới theo đúng thứ tự, mỗi gói là một giao dịch riêng. Nó tự **từ chối
chạy** (không tạo gì) nếu: không phải database Supabase, không có bảng `orders`, hoặc
đã cài một phần trước đó. Các gói 4, 5 (trigger trên bảng đơn/giao hàng) và 7 (index
catalog) **không** nằm trong gói nhanh — cài riêng khi cần.

Kết quả checker 05/11 bạn gửi: 9 kiểm tra phân quyền PASS (gói 0 đã có hiệu lực), mọi
gói tích hợp CHUA_CAI, không FAIL — đúng điều kiện để chạy gói nhanh.

**Cách từng file:** chạy lần lượt các file dưới đây — mỗi file một lần, chỉ những
phần bạn định dùng. Nếu file báo lỗi "already exists", dừng lại và gửi mình
thông báo lỗi (không chạy lại mù).

| # | File (`apps/api/migrations/`) | Cần trước | Dùng cho |
| --- | --- | --- | --- |
| 0 | `integration-permissions.sql` | — | Bạn đã báo chạy 03/11; **không chạy lại** |
| 1 | `integration-delivery-foundation.sql` | 0 | Nền outbox + hạn mức (bắt buộc cho mọi mục dưới) |
| 2 | `integration-purchase-capture.sql` | 1 | GA4 purchase mock |
| 3 | `integration-notifications.sql` | 1 | Hàng đợi thông báo |
| 4 | `integration-notification-source.sql` | 3 | Ghi thông báo cùng đơn hàng (trigger **tắt** sẵn; bật bằng `.enable.sql` riêng) |
| 5 | `integration-shipment-notifications.sql` | 3 + bảng shipping | Thông báo giao hàng (trigger tắt sẵn) |
| 6 | `integration-merchant-queue.sql` → `integration-merchant-fence.sql` | 1 | Hàng đợi Merchant + rào chắn gửi |
| 7 | `catalog-full-text-search.sql` | bảng sản phẩm | Tìm kiếm FTS cho chat |
| 8 | `search-console-durable-mock.sql` | 1 | Lưu Search Console |
| 9 | `pagespeed-durable-mock.sql` | 1 | Lưu lịch sử PageSpeed |
| 10 | `integration-ops-metrics.sql` | 1 | Số liệu trên dashboard |

Sau đó chạy **một** truy vấn kiểm tra gộp:
[`docs/integrations/verify-installed-all.sql`](./verify-installed-all.sql). Kết quả chỉ
gồm tên kiểm tra và PASS / CHUA_CAI / FAIL (không có dữ liệu khách hàng, không có
secret) — bạn có thể dán nguyên bảng kết quả vào chat để mình đối chiếu.
CHUA_CAI là chưa cài (bình thường nếu chưa dùng phần đó). FAIL cần xem lại.

Sau khi cài, kiểm tra chỉ đọc (7 request, không ghi, không in URL/khóa):

```bash
pnpm --dir apps/api run smoke:hosted-readonly
```

Kết quả 05/11/2026 sau khi bạn cài gói lõi: checker 7 nhóm PASS, kiểm tra chỉ đọc
7/7 PASS (backend đọc được 4 kho, khóa trình duyệt bị chặn `42501`).

Ghi thử có giới hạn (chỉ khi bạn đồng ý; dữ liệu mẫu trên property giả, không gọi Google):

```bash
pnpm --dir apps/api run smoke:hosted-write
```

Kết quả 05/11/2026: 4/4 PASS, 22 request — Search Console mẫu 14 ngày/48 dòng,
PageSpeed mẫu 1 bản đo, dashboard đọc được 14/100 và 1/100 lượt. Dữ liệu mẫu nằm
lại trong DB thử nghiệm; script pause không xóa dữ liệu.

Muốn tạm dừng phần nào: chạy file `.pause.sql` tương ứng — chỉ thu hồi quyền gọi
hàm, không xóa dữ liệu.

## 3. Từng dịch vụ: code hiện có, bạn cần chuẩn bị gì, lần nghiệm thu đầu tiên

Chi phí/quota chính thức: [03-cost-and-access-register.md](./03-cost-and-access-register.md).

| Dịch vụ | Code live hiện có | Bạn cần chuẩn bị | Lần gọi thật đầu tiên (cần bạn đồng ý) |
| --- | --- | --- | --- |
| **Cloudflare Turnstile** | **Đã nối** vào form liên hệ (05/11): chế độ `cloudflare`, widget thật, siteverify qua backend — xem [31](./31-turnstile-live.md); 05/11 đã gọi thật 2 lần bằng khóa thử (được duyệt): PASS | Chạy local: không cần tài khoản — Cloudflare công bố bộ khóa thử (mục Testing trong tài liệu Turnstile). Chạy thật: tài khoản Cloudflare, tạo widget với domain thật | Gửi form liên hệ local với khóa thử → 1 lần siteverify |
| **Gemini — P5-01c** | **Đã nối** (05/11) adapter Interactions API, mặc định `catalog_only` (chỉ từ khóa có trong tên sản phẩm + ngân sách), `store:false`, hạn mức bền vững — xem [32](./32-gemini-live.md); 05/11 đã gọi thật 1 lần (được duyệt): PASS | Đã chọn **Free localhost** ngày 05/11; cần xác nhận project/model free và hạn mức calls/tokens/ngày. Payload chỉ catalog công khai, không raw query/history/PII. Key được báo có ở lần kiểm tra trước, chưa xác minh khả dụng | 1 generateContent với danh sách ID/tên công khai; countTokens nếu cần phải duyệt riêng |
| **PageSpeed** | Đường chẩn đoán thật đã có (1 URL/lần, có giới hạn) | Domain HTTPS công khai (`GOOGLE_APPROVED_PUBLIC_ORIGIN`), API key Google Cloud bật PageSpeed Insights API (`PAGESPEED_API_KEY`) | 1 lần đo trang chủ mobile |
| **Search Console** | Đường chẩn đoán thật (OAuth refresh + 1 truy vấn chỉ đọc) | Property đã xác minh cho domain, OAuth client (Google Cloud), refresh token quyền `webmasters.readonly`, khóa mã hóa 32 byte (`openssl rand -base64 32`). Chưa có luồng xin quyền OAuth tự động; tới bước này mình sẽ viết script cấp và mã hóa token chạy trên máy bạn — xem [13](./13-google-real-diagnostics.md) | 1 truy vấn dữ liệu đã chốt (trễ 3 ngày) |
| **GA4** | Đã gửi thật vào stream **Test** (8 sự kiện có trong DebugView) | Quyết định property/stream production, banner consent, chính sách cookie | Bật collector có consent trên staging, kiểm tra DebugView |
| **Google Sign-In** | Dùng Supabase hiện có, callback đã gia cố | Trong Supabase dashboard: Google provider, client ID/secret, danh sách redirect URL; quyết định xử lý trùng email | Đăng nhập thử 1 tài khoản Google test |
| **Resend** | **Chưa có** transport live / webhook | Tài khoản Resend, xác minh domain gửi (bản ghi DNS do bạn thêm), API key | 1 email đơn hàng test tới hộp thư của bạn |
| **Merchant API** | **Chưa có** transport live (đã có preview, hàng đợi, rào chắn gửi) | Merchant Center, API data source, OAuth/quyền, domain công khai đã xác minh, sản phẩm đủ điều kiện | 1 sản phẩm test → đọc lại trạng thái |
| **GHN** | Module hiện có | Làm theo [hướng dẫn GHN](../shipping/huong-dan-cai-dat.md) trên staging | Báo giá staging, rồi tạo đơn staging |
| Cloudinary, pgvector | Hoãn có điều kiện | — (chỉ làm khi benchmark chứng minh có lợi) | — |

**Điểm nghẽn chung:** PageSpeed, Search Console và Merchant đều cần **domain HTTPS
công khai**; Resend cần **DNS** của domain đó. Chỉ chạy `localhost` thì những dịch vụ
này chưa thể nghiệm thu thật.

## 4. Thứ tự đề xuất

1. Đối chiếu môi trường development/mock trên process thử riêng; không chỉnh hoặc
   restart process của phiên khác. SQL mục 2 chỉ là dependency của các tính năng
   dùng DB tương ứng, **không chặn Turnstile khóa thử**.
2. **P1-03b — Turnstile** với khóa thử: nối adapter/widget vào form liên hệ, kiểm
   thử offline trước, rồi xin duyệt tối đa 1 POST Siteverify trên fixture lưu RAM.
3. **P5-01c — Gemini Free localhost** đã được chọn: adapter catalog-only + giới
   hạn token bền vững; chốt model/hạn mức và quota TEST DB trước lần gọi thật.
4. Khi có domain công khai: PageSpeed → Search Console → Google Sign-In → GA4
   production → Merchant; khi có DNS: Resend.

Hai batch đã đưa vào Phase 1/5 tại
[31-localhost-turnstile-gemini.md](./31-localhost-turnstile-gemini.md), gồm phạm vi
file chung cần nối tuần tự. Chưa triển khai hay gọi thật trong lượt cập nhật phase.

## 5. Quy tắc an toàn khi nối thật

- Mỗi dịch vụ một đợt, cờ mặc định tắt, chạy trên `localhost`/staging trước.
- Mình hỏi bạn trước **mỗi** lần gọi dịch vụ thật; số lần gọi có trần cứng.
- Không gửi dữ liệu khách hàng thật (email, địa chỉ, SĐT) cho dịch vụ bên ngoài
  trong đợt nghiệm thu.
- Mọi thứ tắt được bằng cờ + restart; dữ liệu không bị xóa khi tạm dừng.
