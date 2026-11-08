# Lộ trình mở bán từng bước

Cập nhật 06/11/2026. Nguyên tắc: **mở bán với phần lõi đã kiểm thử**, phần nào cần cấu hình thêm hoặc chưa nghiệm thu thì bật sau, mỗi lần một phần.

Cấu hình cho giai đoạn 1 nằm trong [`deploy/env.production.example`](../../deploy/env.production.example). File này đã được chạy thử: API khởi động được với đúng các giá trị trong đó.

## Giai đoạn 1 — Mở bán (làm ngay)

**Khách dùng được:**

- Xem sản phẩm, blog, giỏ hàng, yêu thích.
- Đăng ký và đăng nhập (email, Google qua Supabase).
- Đặt hàng **COD** hoặc **chuyển khoản SePay**.
- Tra cứu đơn, đánh giá sản phẩm, gửi form liên hệ.
- Phí ship theo cách cũ: 30.000đ, miễn phí cho đơn từ 300.000đ.

**Admin dùng được:** quản lý sản phẩm, danh mục, đơn hàng, voucher, bài viết và liên hệ. Đơn hàng chưa có GHN thì **tự gửi hàng** rồi đổi trạng thái đơn bằng tay.

### Việc phải làm trước khi mở cho khách (theo thứ tự)

1. **Kiểm tra quyền database.**
   - Chạy [`docs/security/prod-rls-audit.sql`](../security/prod-rls-audit.sql) trong Supabase SQL Editor và gửi kết quả.
   - Lý do: các file SQL cũ có policy cho khách tự nâng mình thành ADMIN và đọc email, số điện thoại của khách khác. Phải xác nhận đã chặn trước khi có khách thật.
2. **Dọn dữ liệu thử.** Xóa đơn kiểm thử, voucher và sản phẩm thử trong trang quản trị hoặc trong Supabase.
3. **Điền `env.production` theo mẫu.**
   - Supabase (khóa secret và khóa anon).
   - SePay (`SEPAY_API_KEY`).
   - Email SMTP (Gmail cần "Mật khẩu ứng dụng").
   - Ngân hàng hiển thị trên mã QR.
   - Xong thì cập nhật secret `ENV_FILE` và deploy.
4. **Duyệt nội dung chính sách**: điều khoản, bảo mật, đổi trả, giao hàng.
   - Trang `/policies/...` đang ở bản nháp `2026-11-06.draft` trong `apps/web/src/lib/legal.ts`.
   - Sau khi duyệt: đổi số phiên bản, deploy, rồi đặt `LEGAL_CONSENT_ENFORCED=true`.
5. **Cài đặt các dịch vụ ngoài:**
   - Supabase, mục Auth → URL Configuration: Site URL `https://tramhuongthienphuchue.com`, Redirect `https://tramhuongthienphuchue.com/**`.
   - SePay: webhook `https://tramhuongthienphuchue.com/api/orders/sepay-webhook`, xác thực bằng API Key.
   - Google OAuth (nếu đăng nhập Google): trong Google Cloud Console, thêm tên miền vào "Authorized JavaScript origins". Redirect URI là của Supabase nên giữ nguyên.
6. **Thử như một khách thật** sau khi deploy:
   - [ ] Trang chủ và trang sản phẩm có HTTPS, ảnh hiện đủ.
   - [ ] Đăng ký tài khoản mới, nhận email xác nhận, đăng nhập được.
   - [ ] Đặt 1 đơn COD và nhận email xác nhận; vào admin hủy đơn, kiểm tra kho được trả lại.
   - [ ] Đặt 1 đơn chuyển khoản, chuyển số tiền nhỏ thật; đơn tự chuyển sang "Đã thanh toán".
   - [ ] Form liên hệ gửi được và admin thấy liên hệ mới.
   - [ ] Mở trên điện thoại.

Mở cho khách khi tất cả các mục trên đã ✅.

## Giai đoạn 2 — Giao hàng nhanh GHN (khi đã bán ổn định)

Cần làm:

- Lấy Token và ShopID trên khachhang.ghn.vn, tạo secret webhook bằng lệnh `openssl rand -hex 32`.
- Cài migration vận chuyển `apps/api/migrations/smart-logistics.sql` và kho hàng trong admin.
- Thử báo giá và tạo vận đơn ở môi trường `staging` của GHN trước.

Bật dần theo thứ tự, mỗi lần một bước:

1. `SHIPPING_CHECKOUT_ENABLED`: khách thấy phí ship thật.
2. `SHIPPING_FULFILLMENT_ENABLED`: admin tạo vận đơn.
3. `SHIPPING_JOBS_ENABLED`: tự đồng bộ trạng thái.

Phải kiểm tra lại webhook GHN cùng nhau trước khi bật.

## Giai đoạn 3 — Tiện ích thêm (không ảnh hưởng việc bán)

Các phần này đã có code và kiểm thử, nhưng ở production đang **bị chặn lời gọi thật** cho đến khi làm đợt "cổng production" (giới hạn chi phí, nghiệm thu):

| Tính năng | Cần thêm |
|---|---|
| Google Analytics 4 | Measurement ID và API secret |
| Search Console, PageSpeed | Tài khoản Google Cloud, xác minh tên miền (đã có bản ghi TXT) |
| Cloudflare Turnstile (chống spam form) | Khóa thật của Cloudflare |
| Email qua Resend | Tài khoản Resend, xác minh tên miền (SPF/DKIM) |
| Gemini (tư vấn AI) | Chuyển sang gói **trả phí** trước khi khách dùng (gói Free cho phép Google dùng dữ liệu) |
| Google Merchant | Tài khoản Merchant Center |
| Tìm kiếm toàn văn | Cài `catalog-full-text-search.sql`, rồi đặt `CATALOG_FTS_ENABLED=true` |

## Việc bảo trì nên làm song song

- Sửa dần khoảng 30 cảnh báo lint React (setState trong useEffect), không gấp.
- Cập nhật các thư viện API còn cảnh báo bảo mật mức high (multer, nodemailer…): chạy `pnpm audit`.
- Theo dõi log: `docker compose ... logs api` (lệnh đầy đủ trong `huong-dan-deploy-vps.md`).
- Bật Cloudflare proxy (đám mây cam) **chỉ sau khi** cấu hình Caddy cho Cloudflare. Nếu không, mọi khách sẽ dùng chung IP của Cloudflare và giới hạn request bị tính chung.
