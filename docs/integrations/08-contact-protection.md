# P1-03 — Xác minh form liên hệ (mock)

Batch ngày 03/11/2026 bổ sung xác minh tại form liên hệ hiện có, tái sử dụng ContactsModule/ContactsService, ValidationPipe, Throttler và Button/palette Traditional. Không tạo bảng contact hoặc module liên hệ thứ hai. Trạng thái **hoàn thành mock acceptance**, chưa kích hoạt chống bot Cloudflare thật.

## Chạy thử ngay

Từ thư mục dự án:

```bash
pnpm --dir apps/api run demo:contact-protection
```

Mở [form demo tiếng Việt](http://localhost:4400/vi/contact) hoặc [widget tiếng Anh](http://localhost:4400/en/contact). Điền dữ liệu giả → bấm **Xác minh thử nghiệm** → **Gửi lời nhắn**. Thành công hiển thị toast và xóa form; gửi lần nữa phải xác minh lại. Ctrl+C dừng fixture.

Demo chạy Nest contact controller/service xác minh thật của batch này nhưng thay ContactsService bằng bộ lưu RAM. Next chạy từ bản sao tạm với env giả, font local Arial và các thư mục node_modules/public được symlink; không đọc `.env` dự án, không nạp AppModule/cron, không kết nối Supabase/SMTP/Cloudflare. Ảnh trang có thể vẫn tải từ URL public vốn có. Vì dùng font thay thế, ảnh QA không chứng nhận font thương hiệu. Cổng 4400/4401 chỉ bind loopback; nếu đang bận hãy dừng đúng tiến trình demo cũ trước, không dừng server khác.

Terminal thứ hai, khi demo còn chạy:

```bash
pnpm --dir apps/api run test:contact-http
pnpm --dir apps/api run test:integrations
```

HTTP script chỉ gọi địa chỉ loopback cố định và đòi đúng fixture metadata/control. Nó kiểm tra 18 assertions: status, challenge, 403 khi thiếu/replay/sai hostname/origin, 400 token quá dài/email sai, 503 lỗi lưu/xác minh, flag off cho submit theo luồng cũ, đúng hai lượt lưu giả. Kết thúc trả mock mode. Fixture không cài global ThrottlerGuard, vì vậy bài HTTP này không chứng minh rate limiting thực; decorator cũ vẫn giữ trên controller.

## Luồng và file chính

| Phần | File trong repository | Hành vi |
| --- | --- | --- |
| Chính sách server | `apps/api/src/integrations/contact-protection.service.ts` | Off bỏ qua; mock chỉ development/test + Origin loopback; staging/production bật flag trả unavailable |
| Adapter | `apps/api/src/integrations/turnstile.adapter.ts` | Mock token ngẫu nhiên, chỉ lưu hash trong RAM, một lần dùng, 5 phút, tối đa 1.000 token chờ; adapter Siteverify chưa được đăng ký |
| API hiện có | `apps/api/src/contacts/contacts.controller.ts`, `.module.ts` | GET protection, POST challenge, verify trước create; chỉ truyền bốn trường contact cũ vào persistence |
| Nối module/types | `apps/api/src/integrations/integrations.module.ts`, `apps/api/src/app.module.ts` | Export service, redact token khỏi request log |
| Form | `apps/web/src/app/[locale]/contact/page.tsx`, `src/hooks/useContactProtection.ts`, `src/components/contact/ContactProtection.tsx`, `src/services/contact-service.ts` | Server-driven status, loading/retry/expiry; token trong bộ nhớ; lỗi lưu giữ nội dung; mới bổ sung widget VI/EN, trang gốc vẫn còn nội dung tiếng Việt |
| QA | `apps/api/scripts/demo-contact-protection.cjs`, `verify-contact-http.cjs`, `apps/api/package.json` | Demo riêng và lệnh kiểm thử tái lập |

Token không vào contact DTO lưu DB, localStorage, URL hoặc log. Mock không xác định người dùng thật và không bảo vệ chống bot. Challenge endpoint mới chỉ hoạt động ở máy local với cấu hình mock; production không phát mock token. Admin contact guards và throttle submit 5/15 phút giữ nguyên; challenge có decorator 10/15 phút. Không đổi checkout/SePay/orders/GHN/voucher/SMTP/auth.

## Cấu hình và rollback

Không chỉnh `.env` thật. `FEATURE_TURNSTILE_ENABLED` mặc định false; `INTEGRATIONS_ENV=mock`. Chỉ khi chủ động bật flag trong development/test mới xuất hiện mock. Không cần key hoặc migration cho batch contact. Khi tắt flag và restart backend, status=disabled, widget ẩn, submit dùng luồng cũ. Global kill switch cũng vô hiệu hóa đường tích hợp mới.

Triển khai backend có route status trước frontend; frontend mới coi status lỗi/404/timeout là unavailable và khóa gửi cho tới thử lại, tránh âm thầm vượt qua xác minh. Rollback code toàn phần phải trả frontend cùng backend về phiên bản tương thích. Không xóa bảng/rows. Đây là rủi ro triển khai cần kiểm tra cùng smoke test contact khi rollout, không ảnh hưởng thanh toán.

## Tài liệu chính thức, chi phí và blocker

Đối chiếu ngày 03/11/2026: Cloudflare yêu cầu [Siteverify ở server, token một lần dùng trong 300 giây](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/). Mock mô phỏng những hợp đồng này, thêm hostname/action và timestamp validation. Adapter Siteverify có endpoint cố định, không redirect/retry, transport bắt buộc truyền vào, timeout cả body, giới hạn body16KB, lỗi được làm sạch; mọi test dùng transport giả. Adapter này **không được ứng dụng khởi tạo**, chưa có widget SDK Cloudflare hoặc lệnh gọi Siteverify thật.

[Cloudflare cung cấp dummy keys cho test](https://developers.cloudflare.com/turnstile/troubleshooting/testing/), nhưng batch này dùng local mock để không gọi API bên ngoài. [Turnstile có lựa chọn miễn phí](https://www.cloudflare.com/products/turnstile/); chưa kiểm chứng quyền/quota widget của tài khoản chủ dự án, không bật gói hay billing. Chi phí provider phát sinh trong batch: 0.

Blocker trước live: quyền tài khoản Cloudflare, sitekey/secret và hostname được duyệt; wiring transport/widget CSP, chính sách quota live, staging acceptance với test keys được cho phép. Không yêu cầu gửi secret trong chat. Các flags chưa thay thế quyền của legacy Gemini/Merchant/Google paths.

## Kiểm thử đã chạy

- Backend toàn bộ 35 suites / 339 tests PASS; gồm 9 repository + 7 consumer + 9 adapter + 20 contact policy/controller tests mới.
- Alias integrations: 15 suites / 137 tests PASS + 42 permission SQL + 57 delivery SQL trong PostgreSQL memory.
- API build và ESLint integrations/contact files PASS; frontend TypeScript và ESLint các file thay đổi PASS.
- HTTP demo 18 assertions PASS, bộ lưu RAM tăng đúng2; không gọi provider/ghi DB.
- Trình duyệt: 390×844 và 1440×1000 không tràn ngang; ready→verified→success/reset; lỗi lưu giữ nội dung; xác minh unavailable khóa gửi; hết hạn khóa gửi; flag off ẩn widget và cho gửi; widget VI/EN. Font được thay trong demo. Không phải test checkout end-to-end với DB, chống bot thật hoặc load đa instance.

Tiếp theo: đóng các acceptance Phase1 còn lại trong progress (hosted outbox metadata/source hooks/live quyền), rồi Phase2 GA4/GSC/PSI theo Master Plan, tiếp tục default OFF/mock nếu thiếu quyền. Không coi mock acceptance này là đã triển khai đủ 11 APIs.
