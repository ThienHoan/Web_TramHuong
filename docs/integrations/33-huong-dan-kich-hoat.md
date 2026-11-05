# Hướng dẫn kích hoạt — các phần đã nghiệm thu

Cập nhật 05/11/2026. Hướng dẫn này chỉ gồm những gì **đã được kiểm thử thật** trên máy
và DB thử nghiệm của bạn, cộng danh sách việc còn thiếu cho phần chưa sẵn sàng. Bằng
chứng chi tiết: [implementation-progress.md](./implementation-progress.md).

> **Quy tắc an toàn:** không dán key/mật khẩu vào chat; chỉ điền vào `apps/api/.env`
> (file này không được đưa lên Git). Sửa `.env` xong phải **khởi động lại backend**.
> Mọi tích hợp mới mặc định **tắt**.

## 0. Trạng thái tổng quan

| Phần | Trạng thái | Đã kiểm tra thật | Dùng cho khách thật? |
| --- | --- | --- | --- |
| DB thử nghiệm (gói lõi) | Đã cài | Checker PASS, đọc 7/7, ghi thử 4/4 | — |
| Bảng số liệu vận hành (dashboard) | Sẵn sàng (nội bộ admin) | Đọc DB thật: Gemini 1/200 lượt | Chỉ admin xem |
| Cloudflare Turnstile (form liên hệ) | Khóa thử | 2 request Cloudflare PASS | **Chưa** — cần khóa thật + domain + mở production |
| Gemini (tư vấn sản phẩm trong chat) | Gói Free, `catalog_only` | 1 lời gọi PASS | **Chưa** — cần gói trả phí + mở production |
| Search Console, PageSpeed | Dữ liệu **mẫu** lưu DB | Ghi thử 48 dòng + 1 bản đo | Không — chưa phải dữ liệu Google |
| GA4 | Stream **Test** | 8 sự kiện có trong DebugView | **Chưa** — cần property/consent production |
| PageSpeed thật, Search Console thật, Merchant, Resend, Google Sign-In | Chưa kích hoạt | — | Cần domain HTTPS công khai/DNS (mục 8) |

**Quan trọng:** các lời gọi thật mới chỉ chạy khi `NODE_ENV` là `development` hoặc
`test`. Khi chạy production (`NODE_ENV=production`), mọi tích hợp mới đều bị chặn cho
đến khi có đợt mở production riêng.

## 1. Ba chế độ chạy

| `INTEGRATIONS_ENV` | Ý nghĩa | Khi nào dùng |
| --- | --- | --- |
| `mock` (mặc định) | Tích hợp mới chạy **mô phỏng**, không gọi ra ngoài | Thử giao diện, đồng bộ mẫu, hàng đợi mô phỏng |
| `staging` | **Thử gọi thật** trên máy bạn (Turnstile, Gemini). Các tính năng mô phỏng tạm ngưng; dashboard số liệu vẫn đọc DB thử nghiệm | Khi muốn thử dịch vụ thật |
| `production` | Mọi tích hợp mới bị chặn | Chưa dùng |

Lưu ý khi chuyển sang `staging`: nếu `FEATURE_TURNSTILE_ENABLED=true` mà chưa điền
khóa Turnstile, form liên hệ sẽ báo "Chưa tải được xác minh" và **không gửi được**
(cố ý chặn để không mở form khi thiếu bảo vệ). Điền khóa thử (mục 4a) hoặc tắt cờ.

Hai dòng nền nên luôn có trong `apps/api/.env` khi chạy local:

```dotenv
NODE_ENV=development
INTEGRATIONS_ENV=mock
```

## 2. Kiểm tra trước khi bật bất cứ thứ gì

```bash
pnpm --dir apps/api run check:live
```

In **tên** biến và trạng thái có/thiếu/sai định dạng — không bao giờ in giá trị.

Kiểm tra DB thử nghiệm: mở SQL Editor của project **thử nghiệm**, chạy
[`verify-installed-all.sql`](./verify-installed-all.sql). Các nhóm 1, 2, 3, 6, 8, 9,
10, 11 phải PASS; nhóm 4, 5, 7 được phép CHUA_CAI (chưa cần). Sau đó:

```bash
pnpm --dir apps/api run smoke:hosted-readonly
```

Kết quả mong đợi: `"result":"PASS"`, 7 kiểm tra, 0 lần ghi.

## 3. Bảng số liệu vận hành trên dashboard admin

Thêm vào `apps/api/.env` rồi restart backend:

```dotenv
FEATURE_INTEGRATION_OPS_METRICS_ENABLED=true
# Tùy chọn — chỉ khi muốn thấy số liệu Search Console/PageSpeed lưu DB:
FEATURE_SEARCH_CONSOLE_PERSISTENCE_ENABLED=true
FEATURE_PAGESPEED_PERSISTENCE_ENABLED=true
```

Xem: đăng nhập tài khoản **ADMIN** → `/vi/admin/dashboard` → khung **"Kết nối dịch vụ"**
→ **Làm mới**.

Thành công khi:
- Chân khung ghi "Số liệu đếm từ DB thử nghiệm ở chế độ mô phỏng…".
- Gemini có dòng **"Lời gọi thật hôm nay (UTC)"** (ví dụ `1/200 lượt · 749/300000 token`).
- Các dịch vụ có hàng đợi hiện lần thành công, hạn mức hôm nay, tỷ lệ không thành công.

Nếu thấy "Không đọc được số liệu vận hành" → chạy lại checker mục 2.
Tắt: đặt cờ `false` + restart (khung quay về chỉ hiện cấu hình).

## 4. Cloudflare Turnstile — chống spam form liên hệ

### 4a. Thử trên máy bằng khóa thử (không cần tài khoản)

```dotenv
NODE_ENV=development
INTEGRATIONS_ENV=staging
FEATURE_TURNSTILE_ENABLED=true
TURNSTILE_SITE_KEY=1x00000000000000000000AA
TURNSTILE_SECRET_KEY=1x0000000000000000000000000000000AA
```

Restart backend → mở `/vi/contact`. Khung **"Xác minh trước khi gửi"** hiện dòng
"Đang dùng khóa thử của Cloudflare — luôn qua, chưa phải chống bot thật." Trình duyệt
sẽ tải widget từ `challenges.cloudflare.com`. Hoàn tất xác minh → nút **Gửi lời nhắn**
mở → gửi.

Thành công khi: lời nhắn được lưu; log backend có `turnstile_verify` với
`outcome: "accepted"`. Gửi xong widget tự làm mới (token chỉ dùng một lần).

Kiểm tra nhanh không cần trình duyệt (gửi **2 request** tới Cloudflare bằng khóa thử,
không đọc `.env`):

```bash
pnpm --dir apps/api run check:turnstile-live -- --allow-cloudflare-test-call
```

### 4b. Khóa thật (khi có domain công khai)

1. Đăng nhập Cloudflare → **Turnstile** → **Add widget**.
2. Nhập hostname của website (ví dụ `tramhuong.vn`, `www.tramhuong.vn`), chọn chế độ
   Managed → lưu → nhận **Site Key** và **Secret Key**.
3. Điền vào `apps/api/.env`:

```dotenv
TURNSTILE_SITE_KEY=<Site Key>
TURNSTILE_SECRET_KEY=<Secret Key>
TURNSTILE_ALLOWED_HOSTNAMES=tramhuong.vn,www.tramhuong.vn
```

Với khóa thật, backend bắt buộc kiểm tra thêm: hostname nằm trong danh sách,
action là `contact`, token còn hạn. **Chưa xong:** mở cho production, một dòng nhắc
Cloudflare trong chính sách quyền riêng tư, nghiệm thu trên domain.

Tắt: `FEATURE_TURNSTILE_ENABLED=false` + restart (form gửi được mà không cần xác minh,
như trước khi có Turnstile).

## 5. Gemini — tư vấn sản phẩm trong chat

Key: Google AI Studio → **API keys** (key hiện có trong `.env` đã hợp lệ).
SQL hạn mức `integration-live-usage.sql` **đã cài** trên DB thử nghiệm.

```dotenv
NODE_ENV=development
INTEGRATIONS_ENV=staging
FEATURE_GEMINI_ADVISOR_ENABLED=true
GEMINI_API_KEY=<key>
GEMINI_BILLING_TIER=free
GEMINI_MODEL=gemini-3.5-flash-lite
GEMINI_PAYLOAD_POLICY=catalog_only
GEMINI_DAILY_REQUEST_LIMIT=200
GEMINI_DAILY_TOKEN_LIMIT=300000
```

Cách hoạt động: server tìm sản phẩm khớp câu hỏi trong catalog, chỉ gửi cho Gemini
**những từ có trong tên sản phẩm** + ngân sách + danh sách tối đa 20 sản phẩm (mã, tên,
giá). Câu hỏi gốc của khách **không** rời server; `store:false` (Google không lưu
request). Gemini chỉ được trả mã sản phẩm; giá/tồn kho luôn đọc lại từ DB.

Kiểm tra (1 lời gọi thật, catalog giả):

```bash
pnpm --dir apps/api run check:gemini-live -- --allow-gemini-calls
```

Thành công khi: `"result":"PASS"`, `source: "gemini"`. Trong chat của website, câu trả
lời vẫn như cũ (danh sách sản phẩm) nhưng do Gemini chọn; phản hồi API có
`"liveModelAvailable": true`. Dashboard hiện số lượt/token đã dùng.

Hết hạn mức ngày, lỗi mạng hoặc Gemini trả sai → chat **tự dùng kết quả catalog**,
khách vẫn mua bình thường.

Trước khi cho khách thật dùng:
- Chuyển sang **gói trả phí** (bật billing cho project trong Google AI Studio — xem
  trang *Billing info* trong tài liệu Gemini API) rồi đặt `GEMINI_BILLING_TIER=paid`.
  Gói Free cho phép Google dùng dữ liệu để cải thiện sản phẩm.
- Mở cho production (chưa có trong code).

Chi phí tham khảo (gói trả phí, `gemini-3.5-flash-lite`): 0,30 USD/1 triệu token vào,
2,50 USD/1 triệu token ra; một lượt tư vấn ≈ 300–800 token ≈ dưới 0,001 USD.

Tắt: `FEATURE_GEMINI_ADVISOR_ENABLED=false` + restart (chat dùng catalog như trước).

## 6. Search Console và PageSpeed — dữ liệu mẫu lưu DB

Chỉ để xem giao diện và luồng lưu trữ, **không phải dữ liệu Google**:

```dotenv
INTEGRATIONS_ENV=mock
FEATURE_SEARCH_CONSOLE_SYNC_ENABLED=true
FEATURE_SEARCH_CONSOLE_PERSISTENCE_ENABLED=true
FEATURE_PAGESPEED_AUDIT_ENABLED=true
FEATURE_PAGESPEED_PERSISTENCE_ENABLED=true
```

Dashboard admin → khung Search Console bấm **Đồng bộ mẫu**, khung PageSpeed bấm **Đo
mẫu**. Thành công khi khung ghi "Dữ liệu mẫu được lưu trong DB thử nghiệm" và số liệu
còn nguyên sau khi restart backend.

## 7. GA4

Đã gửi thật vào stream **Test** (`G-XJNSBPN8HN`), 8 sự kiện có trong DebugView. Thu thập
tự động trên website cho khách thật **chưa bật**. Cần quyết định: property/stream
production, banner đồng ý cookie, chính sách cookie. Xem [15](./15-ga4-local-funnel.md).

## 8. Chưa kích hoạt được — cần chuẩn bị gì

| Dịch vụ | Bạn cần chuẩn bị | Code |
| --- | --- | --- |
| PageSpeed thật | Domain HTTPS công khai; Google Cloud → bật **PageSpeed Insights API** → tạo API key | Đường chẩn đoán thật đã có |
| Search Console thật | Domain đã xác minh trong Search Console; Google Cloud OAuth client; refresh token quyền `webmasters.readonly`; khóa mã hóa (`openssl rand -base64 32`) | Chẩn đoán thật đã có; cần script cấp token |
| Merchant API | Merchant Center, API data source, OAuth, domain đã xác minh | Chưa có transport thật |
| Resend (email) | Tài khoản Resend, xác minh domain gửi (thêm bản ghi DNS), API key | Chưa có transport thật |
| Google Sign-In | Supabase → Authentication → Google provider (client ID/secret), danh sách redirect URL; quyết định xử lý trùng email | Dùng Supabase hiện có |
| GHN | Theo [hướng dẫn GHN](../shipping/huong-dan-cai-dat.md), bắt đầu staging | Module hiện có |
| Cloudinary, pgvector | Hoãn — chỉ làm khi đo đạc chứng minh có lợi | — |

## 9. Tắt nhanh và khôi phục

- **Tắt tất cả tích hợp mới:** `INTEGRATIONS_KILL_SWITCH=true` + restart. Chat dùng
  catalog, form liên hệ không cần xác minh, GHN/đăng nhập/kho ảnh hiện có không bị
  ảnh hưởng.
- **Tắt từng phần:** đặt cờ tương ứng `false` + restart.
- **Tạm dừng phía DB:** chạy file `.pause.sql` tương ứng trong
  `apps/api/migrations/` — chỉ thu hồi quyền gọi hàm, **không xóa dữ liệu**.
- Không xóa dòng dữ liệu để "làm lại"; hỏi lại trước khi can thiệp DB.

## 10. Bảng lệnh

| Lệnh (`pnpm --dir apps/api run …`) | Làm gì | Gọi ra ngoài? |
| --- | --- | --- |
| `check:live` | Kiểm tra tên biến/định dạng `.env` | Không |
| `smoke:hosted-readonly` | Đọc thử DB thử nghiệm, kiểm tra quyền | DB thử nghiệm (7 request đọc) |
| `smoke:hosted-write` | Ghi dữ liệu mẫu GSC/PSI vào DB thử nghiệm | DB thử nghiệm (~22 request) |
| `check:turnstile-live -- --allow-cloudflare-test-call` | 2 lần xác minh bằng khóa thử | Cloudflare (2 request) |
| `check:gemini-live -- --allow-gemini-calls` | 1 lời gọi Gemini, catalog giả | Gemini (1 request) + DB thử nghiệm |
| `test:sql-bundle`, `test:sql-checker`, `test:ops` | Kiểm thử SQL/tích hợp trong bộ nhớ | Không |
