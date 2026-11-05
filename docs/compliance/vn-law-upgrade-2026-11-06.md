# Rà soát và nâng cấp theo vn-law-check — 06/11/2026

> 🤖 Báo cáo do AI tạo từ mã nguồn và kiểm tra cục bộ, chỉ để tham khảo, không phải ý kiến pháp lý hoặc chứng nhận tuân thủ. Các chính sách trong ứng dụng là **bản nháp**. Chủ dự án đã chọn cập nhật thông tin kinh doanh sau.

## Phạm vi và nguồn

Website bán trực tiếp trầm hương, có tài khoản, đặt hàng, thanh toán, liên hệ,
đề nghị hợp tác, phân tích và chatbot; mức 2 theo toolkit. Không tìm thấy luồng
marketplace cho người bán bên thứ ba hoặc mobile app trong app source được rà.
Áp dụng checklist 01 (dữ liệu), 02 (TMĐT), 04 (người tiêu dùng), 05 (nội dung
quảng cáo), 06 (giao dịch điện tử), 07 (AI), 10 (soạn chính sách).

Tham chiếu: [mhfed/vn-law-check](https://github.com/mhfed/vn-law-check), commit
`c6391e04702a79c692592e1dbcfc720dfe3bb909`,
[SKILL.md](https://github.com/mhfed/vn-law-check/blob/c6391e04702a79c692592e1dbcfc720dfe3bb909/SKILL.md).
Chỉ clone vào thư mục tạm, kiểm tra rồi chạy `scripts/scan.sh apps` (chỉ đọc);
không chạy install.sh hoặc chép AGENTS/CLAUDE của repo ngoài vào project.
Scanner nhận COMMERCE/AUTH/FORM/AI; kết quả TRACKING_CONSENT=unknown do regex không
nhận được tracker riêng và có nhiều dấu hiệu từ test fixture. Đã đọc tracker và
AnalyticsConsent trực tiếp; không coi kết quả grep là bằng chứng vi phạm.

Nguồn Nhà nước đã đối chiếu **số hiệu/tên/ngày hiệu lực** qua cổng văn bản:

- [Luật 91/2025/QH15 — Bảo vệ dữ liệu cá nhân](https://vanban.chinhphu.vn/?classid=1&docid=214590&pageid=27160&typegroup=), ban hành 26/06/2025, hiệu lực 01/01/2026.
- [Luật 122/2025/QH15 — Thương mại điện tử](https://vanban.chinhphu.vn/?classid=1&docid=216503&pageid=27160&typegroupid=3), ban hành 10/12/2025, hiệu lực 01/07/2026.
- [Luật 19/2023/QH15 — Bảo vệ quyền lợi người tiêu dùng](https://vanban.chinhphu.vn/?classid=1&docid=208363&orggroupid=1&pageid=27160), ban hành 20/06/2023, hiệu lực 01/07/2024.
- [Luật 134/2025/QH15 — Trí tuệ nhân tạo](https://vanban.chinhphu.vn/?classid=1&docid=216334&pageid=27160&typegr=), ban hành 10/12/2025, hiệu lực 01/03/2026.

Các số điều, thời hạn xử lý chi tiết trong NĐ 356/2025 và các nghị định 2026 của
upstream **chưa đối chiếu toàn văn độc lập trong lượt này**. Không đưa thời hạn,
mức phạt hoặc miễn trừ suy đoán vào chính sách. Không khẳng định `store:false`
của Gemini là zero retention hay loại trừ việc nhà cung cấp sử dụng dữ liệu.

## Bảng dữ liệu từ code

| Dữ liệu | Nơi thu/thực hiện | Mục đích | Bên nhận/nơi lưu có bằng chứng |
| --- | --- | --- | --- |
| Email, hồ sơ, phiên đăng nhập; lựa chọn ghi nhớ email | `(auth)/login/page.tsx`, `AuthProvider.tsx`, `lib/supabase.ts` | Đăng nhập, tạo/quản lý tài khoản | Supabase Auth; email trên localStorage khi người dùng chọn ghi nhớ |
| Tên, điện thoại, địa chỉ, email nếu có, sản phẩm/giá/đơn | `TraditionalCheckout.tsx`, `ZenCheckout.tsx`, `payment_select/page.tsx`, `orders.service.ts` | Báo giá, giao hàng, xử lý đơn | Supabase; thông tin cần thiết cho GHN khi bật; email giao dịch qua SMTP khi dùng |
| Tên, email, chủ đề, lời nhắn | `contact/page.tsx`, `contacts.controller.ts`, `contacts.service.ts` | Phản hồi liên hệ | Bảng contacts Supabase; Turnstile chỉ nhận token/secret khi bật |
| Tên, điện thoại, email, khu vực, kinh nghiệm/đề nghị | `partnership/page.tsx` | Phản hồi đề nghị hợp tác | Lưu thành yêu cầu contact; không có luồng đăng ký marketing |
| Nội dung chat | `ChatWidget.tsx`, `chat.service.ts`, `gemini-live.ts` | Tìm/gợi ý sản phẩm | Nội dung đi qua API; chat mới giữ trong RAM trang. `catalog_only` chỉ gửi keywords lấy từ catalog/ngân sách/locale/candidates cho Google; không raw query/history |
| Sự kiện xem/mua sắm và lựa chọn consent | `lib/ga4/tracker.ts`, `AnalyticsConsent.tsx` | Phân tích tùy chọn theo mode | Preference versioned/expiry trong trình duyệt; test transport ra Google chỉ khi bật/đủ điều kiện |
| Token xác minh form | `useContactProtection.ts`, `contact-protection.service.ts` | Xác minh trước khi lưu contact | Cloudflare khi mode cloudflare; không lưu token vào contact |
| Ảnh sản phẩm, dữ liệu ứng dụng | `storage.service.ts`, `supabase.service.ts` | Nội dung, lưu trữ | Supabase; region, hợp đồng xử lý, retention cần chủ dự án xác nhận |

Lựa chọn đồng ý giao dịch không dùng làm đồng ý marketing/analytics. Consent khách
không tự chứng minh danh tính hay tính chính xác của email họ nhập.

## Kết quả và thay đổi

### 🔴 Cần xử lý trước mở bán

1. **Chính sách và thông tin bán hàng chưa được duyệt.** Trước thay đổi không có
   route privacy/terms/returns/shipping/rights. Đã thêm 5 route VI/EN dưới
   `/policies/[policy]`, có nhãn draft/noindex và liên kết tại cả hai footer.
   Các ô chờ chủ dự án vẫn còn; tạo route không đóng nghĩa vụ này. Tham chiếu
   Luật 91/2025/QH15, Luật 122/2025/QH15, Luật 19/2023/QH15; đối chiếu nghĩa vụ
   cụ thể với loại hình kinh doanh trước khi công bố.
2. **Bằng chứng đồng ý phía server chưa rollout.** Đã thêm checkbox không tích sẵn
   ở contact, partnership, signup và cả hai đường đặt hàng. Backend tạo receipt
   purpose/version/server timestamp; invalid/current-version mismatch bị chặn.
   Đơn lưu receipt trong `shipping_info` của lần insert gốc. Contact cần migration
   và cờ `LEGAL_CONSENT_ENFORCED=true`; mặc định false giữ tương thích, chưa bắt
   buộc/ghi receipt contact trên DB hiện có. Tham chiếu Luật 91/2025/QH15 (checklist
   upstream mục B, Điều 9; điều khoản chi tiết cần kiểm tra toàn văn khi duyệt).
3. **Điều kiện thương mại, retention và quy trình thực hiện quyền còn thiếu quyết
   định vận hành.** Trang quyền cung cấp đầu mối và hướng dẫn tối thiểu; chưa là
   hệ thống xác minh/xóa dữ liệu tự động. Không tự đặt 7/14/30 ngày, nghĩa vụ thuế,
   thời điểm hợp đồng hay SLA hoàn tiền. Tham chiếu Luật 91/2025/QH15 và
   Luật 19/2023/QH15.

### 🟢 Đã cải thiện và có kiểm chứng kỹ thuật

- **Nhãn AI rõ từ trước khi gửi câu hỏi:** đổi “Chuyên gia Trầm Hương” thành
  “Trợ lý AI”, thêm giới hạn/gợi ý không gửi PII/OTP và link privacy trong khung.
  Luật 134/2025/QH15, checklist 07 (Điều 11 theo toolkit; cần legal review).
- **Giảm dữ liệu chat lưu trên thiết bị:** không đọc/ghi history raw mới trong
  localStorage; reset hội thoại khi đổi tài khoản. Nút xóa luôn truy cập được,
  xóa history cũ của tài khoản hiện tại/guest khi người dùng chủ động yêu cầu.
  Lịch sử cũ của tài khoản khác chưa được tự xóa hàng loạt. Luật 91/2025/QH15.
- **Không log email ở login/reset-password:** bỏ các console.log chứa email.
  Lỗi lưu contact chỉ có marker `CONTACT_SAVE_FAILED`, không raw provider error.
  Đây là giảm lộ dữ liệu, không phải kiểm toán bảo mật toàn codebase.
- **Không gắn consent giả cho bản tin:** bỏ ba form email chưa có backend/
  unsubscribe và ghi rõ chưa mở đăng ký; không thêm tracking hoặc marketing mới.
  Luật 91/2025/QH15 và Luật 19/2023/QH15.
- **Nội dung quảng cáo không có bằng chứng:** bỏ các khẳng định tĩnh “an toàn
  người già/trẻ nhỏ/phụ nữ mang thai”, “kiểm định CASE”, “không gây đau đầu” và
  các nhãn 100% chung cho mọi sản phẩm. Thay bằng đề nghị xem thông tin từng SKU,
  cách dùng thông thoáng/an toàn cháy. Không sửa hoặc chứng nhận catalog trong DB.
  Tham chiếu Luật 19/2023/QH15 và Luật Quảng cáo được sửa bởi Luật 75/2025/QH15
  theo checklist05; căn cứ chi tiết và hồ sơ sản phẩm cần kiểm tra riêng.
- **Thông tin liên hệ nhất quán:** dùng email đang có ở footer thay email mẫu
  khác ở contact; thay địa chỉ showroom TP.HCM mẫu bằng địa chỉ Huế đang công bố.
  Toàn bộ thông tin này vẫn cần chủ dự án xác nhận trước mở bán.
- **Analytics:** giữ cơ chế lựa chọn hiện có, thêm link privacy; 59 kiểm thử tracker
  hiện có pass (không thu trước consent, rút lại/expiry/storage-error dừng thu).
  Chưa kiểm chứng network analytics production bằng lượt kiểm tra này.

### 🟡 Cần chủ dự án và người làm luật xem lại

- Tên chủ thể bán hàng, loại hình/MST/đăng ký, địa chỉ nhận hàng, email tiếp nhận
  quyền dữ liệu; người dùng đã chọn cập nhật sau. Không tự điền pháp nhân hoặc
  treo logo đã thông báo/đăng ký khi chưa có bằng chứng. Luật 122/2025/QH15.
- Thủ tục thông báo/đăng ký TMĐT và điều kiện chuyển tiếp tương ứng thực tế.
  Luật 122/2025/QH15; chưa kết luận thủ tục nào đã hoàn tất.
- Region Supabase/email/Google và nghĩa vụ dữ liệu ra nước ngoài; thuê VPS VN
  không thay đổi các processor ngoài VN. Luật 91/2025/QH15; checklist01-D.
- Thời hạn lưu, hồ sơ đánh giá tác động/nhân sự phụ trách theo quy mô/miễn trừ
  thực tế. Luật 91/2025/QH15; không tự áp dụng miễn trừ cho chủ dự án.
- Receipt signup hiện là user metadata của Supabase Auth, không phải ledger riêng
  bất biến. Google OAuth/account linking cần nghiệm thu riêng; chưa có cơ chế
  hosted Auth hook bắt buộc consent cho mọi client/provider.
- Receipt cookie hiện ở trình duyệt có version/expiry, chưa có ledger server
  ẩn danh. Chưa triển khai xóa/xuất/giới hạn retention đồng bộ mọi processor.
- Cần đối chiếu toàn văn NĐ 356/2025, Luật 20/2023/QH15 và các nghị định chuyển
  tiếp khi chốt quy trình/quyền/điều kiện giao dịch. Không dùng mức phạt suy đoán.

### ⚪ Không áp dụng trong lượt này

Marketplace cho bên thứ ba, livestream/KOL, mobile SDK/quyền thiết bị. Hạ tầng,
bản quyền ảnh, thuế và kiểm toán bảo mật toàn diện nằm ngoài phạm vi lượt nâng cấp.

## Rollout và rollback

Hiện tại **không chỉnh .env thật, không apply SQL lên Supabase, không commit/push**.
Frontend checkbox hoạt động trên localhost; backend mặc định tương thích client
cũ. Không gọi tất cả form này là đã có bằng chứng consent bền vững khi flag còn OFF.

Trước khi bật bắt buộc consent:

1. Chốt và duyệt nội dung, điền thông tin còn thiếu; thay version draft đồng bộ ở
   `apps/web/src/lib/legal.ts` và `apps/api/src/legal/legal-acceptance.ts`.
2. Trên **TEST DB đã xác nhận**, review/apply
   `apps/api/migrations/contacts-legal-acceptance.sql`. Migration chỉ thêm cột JSONB,
   không backfill bằng chứng cho contact cũ, không nới quyền/RLS.
3. Deploy web/API đồng bộ, rồi đặt `LEGAL_CONSENT_ENFORCED=true` ở API và restart.
   Thử contact/partnership và hai checkout trên dữ liệu thử, xác nhận receipt lưu
   cùng record; request thiếu receipt phải 400 trước gọi Cloudflare/tạo đơn.
4. Kiểm tra OAuth, quyền dữ liệu và nội dung thương mại; duyệt bỏ nhãn draft và
   noindex khi đã sẵn sàng. Không tự coi việc pass tests là phê duyệt pháp lý.

Rollback kỹ thuật: đặt `LEGAL_CONSENT_ENFORCED=false` + restart API trước khi trả
frontend cũ. Giữ cột/receipt DB; không xóa dữ liệu hay giả lập consent cho lịch sử.
Các chính sách là route mới; có thể trả code UI tương ứng khi cần rollback.

## Kiểm chứng

- API: 7 suites / 91 tests pass (11 trường hợp legal mới, hồi quy contact/Turnstile,
  order validation, order persistence/shipping); tất cả provider/DB transport giả.
  Sandbox listen EPERM ban đầu, rerun được phép loopback pass.
- SQL: chạy chính migration hai lần trên PGlite; row cũ giữ nguyên/receipt NULL,
  RLS và grants không đổi, receipt ghi cùng insert. 1 test pass, không hosted write.
- Web: 16 test render route VI/EN, 404, noindex/draft, checkbox unchecked và parity
  version API/web; 59 analytics + 19 OAuth + 4 chat client tests pass.
- API `nest build` pass; web TypeScript pass. API `tsc --noEmit` gồm toàn bộ specs
  vẫn có lỗi type có sẵn trong catalog-advisor/notification specs không thuộc diff
  lượt này; build production loại specs pass. Scoped web ESLint không lỗi/cảnh báo;
  scoped API ESLint không lỗi, còn một cảnh báo kiểu any có sẵn ở SePay webhook.
- Browser: policy VI/EN hiển thị, link locale đúng; contact unchecked → nút gửi
  disabled, checked → mở (khi verification đã sẵn sàng), unchecked → disabled;
  không bấm gửi. Chat mở ra hiển thị AI/privacy trước khi nhập; không gửi prompt.
  Ảnh QA: `/private/tmp/tramhuong-legal-preview.png`. Không chứng nhận mobile/full
  checkout E2E trong lượt này.
- Khi xem form contact, server local đang bật widget Cloudflare test và trình
  duyệt tải SDK/challenge hiện có. Không POST contact/Siteverify hoặc gọi Gemini,
  gửi mail, thanh toán hay tạo vận đơn trong lượt kiểm tra. Không tuyên bố zero
  outbound browser request.

Lệnh kiểm tra tái lập:

```bash
pnpm --dir apps/api exec jest --runInBand --runTestsByPath src/legal/legal-acceptance.spec.ts src/integrations/contact-protection.service.spec.ts src/integrations/contact-protection.live.spec.ts src/orders/order-validation.spec.ts src/orders/orders.service.spec.ts src/orders/shipping-checkout.spec.ts src/orders/payment-persistence.spec.ts
node apps/api/scripts/verify-legal-consent.cjs
node apps/web/scripts/test-legal.cjs
pnpm --dir apps/web run test:analytics
pnpm --dir apps/web run test:google-auth
pnpm --dir apps/web run test:chat
pnpm --dir apps/api run build
pnpm --dir apps/web exec tsc --noEmit --incremental false
```

## Giới hạn và khuyến nghị

Đây là bản rà soát sơ bộ có thay đổi kỹ thuật thực tế, không xác nhận website
đã đáp ứng đầy đủ pháp luật. Bản nháp chưa đủ để nhận đơn thương mại. Nên nhờ người
làm luật xem lại điều kiện giao dịch, quyền dữ liệu, thời hạn và thủ tục theo đúng
chủ thể kinh doanh trước khi công bố. Mức phạt: chưa xác minh, không đưa con số.

## Cập nhật giao diện ngày 06/11/2026

- Đồng bộ năm trang chính sách với nền giấy, màu xanh trầm và font thương hiệu
  hiện có. Thêm mục lục, điều hướng bên trái trên desktop, menu thu gọn trên
  mobile, liên kết đọc tiếp và trạng thái bản nháp rõ ràng.
- Làm lại khung đồng ý dùng chung và nhóm liên kết chính sách ở footer. Đưa ô
  đồng ý đăng ký xuống sau trường nhập và trước nút gửi; giữ mặc định chưa chọn,
  mục đích xử lý dữ liệu và payload phiên bản hiện có.
- Kiểm tra trực quan ở 1280px và 375px, cả VI/EN; không tràn ngang, menu mobile
  và chọn/bỏ chọn hoạt động. Bản EN có khoảng đệm cho header cố định. Không gửi
  form hoặc tạo tài khoản/đơn hàng trong lượt kiểm tra UI.
- 16 test pháp lý, TypeScript và ESLint các component/route thay đổi đều đạt.
  Ảnh: `/private/tmp/tramhuong-legal-ui-desktop.png`,
  `/private/tmp/tramhuong-legal-ui-mobile.png`,
  `/private/tmp/tramhuong-consent-ui-mobile.png`.
- Nội dung pháp lý và các thông tin chờ chủ cửa hàng xác nhận giữ nguyên; thay
  đổi này không phê duyệt bản nháp để mở bán.
