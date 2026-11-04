# P2-01a — GA4 consent và funnel mock

Cập nhật P2-01b: xem [10-purchase-capture.md](./10-purchase-capture.md). Demo hiện có PostgreSQL giả và capture server cho authenticated owner với subflag riêng defaultOFF; mô tả35tests/RAM-only bên dưới là snapshot P2-01a.

Ngày nghiệm thu local: 04/11/2026. Batch này hoàn thành collector mock cho các hành vi mua sắm trước purchase, dùng chung Zen/Traditional. Chưa phải GA4 live hoặc gate Phase2 hoàn tất.

## Phạm vi và dependency

Audit lại xác nhận chưa có gtag, GTM hoặc dataLayer; AnalyticsModule hiện hữu chỉ cung cấp dashboard doanh thu nội bộ từ DB. Tái sử dụng module đó cho public collection-policy, IntegrationsConfig cho flags, CartProvider cho thay đổi giỏ và các trang/component sản phẩm/checkout sẵn có. Không tạo bảng, module analytics thứ hai, hệ session hay revenue dashboard thay thế.

P1 registry/executor/repository/contact mock có local acceptance trước batch này. Các việc cần tài khoản/hosted validation của Phase1 vẫn mở; financial source events chưa được nối vào outbox. Collector mock này độc lập với DB/outbox và không được dùng để bỏ qua gate đó khi bật purchase/live. Turnstile ngoài contact vẫn cần các batch theo route: signup đi thẳng Supabase Auth cần cấu hình CAPTCHA của Supabase; không có route nhận voucher độc lập để dựng thêm; review đang có auth/verified-purchase nhưng chưa nối Turnstile; checkout chưa có quyết định risk để bật. Không đánh dấu toàn bộ Phase1 live hoàn thành.

## Chạy thử

Từ repository root:

```bash
pnpm --dir apps/api run demo:analytics
```

Mở [Traditional lab](http://localhost:4400/vi/integration-lab/analytics) hoặc [Zen lab](http://localhost:4400/en/integration-lab/analytics). Chờ dòng Mode: mock, chọn Đồng ý/Từ chối ở cuối trang rồi thử thêm/tăng/xóa giỏ. Mở lại Quyền riêng tư phân tích để rút đồng ý. Nút thử purchase giả phải không sinh purchase.

Lab chỉ được copy vào bản Next tạm của demo; không thêm route integration-lab vào website thật. Demo không đọc .env thật, không nạp AppModule/cron hoặc clients provider, không kết nối Supabase/SMTP. Contact lưu RAM; sản phẩm/địa chỉ dùng dữ liệu giả, font dùng Arial local. Trong bản sao tạm, các URL provinces.open-api.vn hiện hữu được đổi sang fixture loopback; mã website thật giữ nguyên. Cổng4400/4401 chỉ bind loopback. Ctrl+C dừng demo. Không chạy hai demo contact/analytics cùng lúc trên cùng cổng.

Kiểm thử tự động riêng:

```bash
pnpm --dir apps/web run test:analytics
pnpm --dir apps/api run test:analytics
```

Web script transpile hai file logic thuần vào thư mục tạm rồi chạy node:test; không cần server/key. API script dùng Nest fixture và Supertest, có mở cổng localhost tạm nhưng không cần server khác hoặc credentials. Trong sandbox có thể cần quyền listen; trên máy local chạy bình thường.

## Hành vi và dữ liệu

| Sự kiện | Nguồn |
| --- | --- |
| view_item_list | Card sản phẩm nhìn thấy ít nhất50%; một event cho mỗi card/exposure, không phải mọi card vừa render |
| select_item | Người dùng chọn link sản phẩm trên card |
| view_item | PDP; variant nếu hiện có, không lấy tên khách/slug/query |
| add_to_cart | Sau add thành công hoặc delta tăng số lượng; không ghi lúc hydrate/merge/fetch giỏ |
| remove_from_cart | Xóa thành công hoặc delta giảm; rollback request lỗi không ghi |
| begin_checkout | Một lần cho mỗi scope checkout mount có items hợp lệ; sửa số lượng không phát lại |
| add_shipping_info | Sau form thông tin người nhận validate thành công, trước chuyển bước |
| add_payment_info | Sau kiểm tra readiness/quote ở handler xác nhận phương thức, trước yêu cầu tạo order; không đồng nghĩa paid |

Tất cả dùng currency=VND, value bằng tổng price×quantity của items; item_id là product ID ổn định giữa hai theme, item_variant chỉ ID. Giá từ hook giảm giá hiện hữu/cart; không đổi tính giá giao dịch. Payload không lấy item_name, email, phone, user ID, URL/referrer/query, địa chỉ, bank transaction code, shipping_info hoặc nguyên object order/cart. Giới hạn200items; kiểm tra số hữu hạn, giá không âm, số lượng nguyên và ID hợp lệ. Chỉ các enum list/payment/shipping được phép. Coupon cá nhân chưa phân loại public/private và giảm giá voucher ở cấp order chưa ánh xạ: không gửi coupon hoặc giả vờ đây là net order revenue. Shipping/tax/value/transaction_id của purchase thuộc batch sau.

Mock không gọi fetch/beacon/gtag, không tải Google script, không tạo dataLayer hoặc _ga cookies. Chưa chọn GTM song song với gtag. Khi được cấp quyền live, dự kiến một đường Google tag với basic consent, không bật advanced cookieless pings/Ads tự động; implementation live chưa có trong batch.

Consent mặc định unknown, không buffer trước đồng ý hoặc backfill thao tác cũ. Chỉ lưu choice/version/expiry180ngày vào localStorage; events chỉ RAM, tối đa200 dòng. Khi rút consent, storage bị xóa/đổi ở tab khác hoặc hết hạn, xóa buffer và chặn ghi tiếp. DNT/GPC chặn grant; lỗi storage giữ denied. Reload giữ lựa chọn còn hạn nhưng xóa events. View effect có dedupe theo scope; deliberate click là hành vi riêng. Budget mock60events/phút,500/ngày/process; không phải ledger quota live đa instance.

## Flags và rollback

GET /analytics/collection-policy trả đúng một mode, Cache-Control:no-store; không trả registry/credentials. Guest không cần DB lookup; dashboard /analytics/dashboard vẫn ADMIN-only, doanh thu tiếp tục từ DB.

FEATURE_GA4_ENABLED mặc định false. INTEGRATIONS_ENV=mock và NODE_ENV development/test mới trả mock; bật flag trên staging/production trả unavailable. Kill switch trả disabled. Không cần NEXT_PUBLIC flag hoặc measurement ID trong release này. Không sửa .env thật.

Flagfalse + restart backend + reload trang làm collector tắt, controls consent ẩn và giỏ/checkout tiếp tục hoạt động. Status lỗi/404/timeout cũng chỉ tắt analytics, không khóa bán hàng. Full code rollback gỡ Provider/Consent và hook calls tương ứng, route policy có thể giữ hoặc gỡ sau frontend; không có dữ liệu DB cần rollback. Không thay orders/payment/GHN/SMTP/auth services.

## File thay đổi của batch

- API: src/analytics/collection-policy.service.ts + .spec.ts; analytics.controller.ts; analytics.module.ts; package.json.
- FE core: src/lib/ga4/contract.ts + tracker.ts; src/components/analytics/AnalyticsProvider.tsx, AnalyticsConsent.tsx, useProductCardAnalytics.ts; src/app/[locale]/layout.tsx.
- FE hooks: CartProvider.tsx; TraditionalProductCard/Detail, ZenProductCard/Detail; TraditionalCheckout.tsx, ZenCheckout.tsx; checkout/payment_select/page.tsx.
- QA: API scripts/demo-contact-protection.cjs thêm tùy chọn --analytics, địa chỉ/sản phẩm giả; web scripts/test-analytics.cjs + fixtures/analytics-lab.tsx; web package.json.
- Docs:09 này,01capability matrix,03cost register,07testing guide, implementation-progress.md, p2-01a-evidence.json.

## Kết quả thực chạy

- Backend full regression36suites/352tests PASS ngày03/11; sau cache-header bổ sung, scoped13policy/HTTPauthorization tests PASS ngày04/11. Bao gồm guest401/customer403/admin200 và public mode không DB/no-store.
- Web35logic tests PASS ngày04/11:8event schemas, PII allowlist, invalid input, consent revoke/cross-tab/expiry/storage failure, dedupe, bounded buffer/rate limits, purchase/refund rejection.
- API build + ESLint các file analytics thay đổi PASS; web TypeScript và ESLint tất cả file FE batch thay đổi PASS.
- Contact fixture18HTTP assertions PASS sau mở rộng demo, không thay tác dụng verify/create của contact.
- IAB: Traditional và Zen card/cart events cùng product ID/VND; không consent/denied vẫn đổi giỏ nhưng events0; grant có delta đúng; revoke và từ chối ở tab khác xóa cả2buffers; fake purchase không sinh event; flagoff ẩn consent, giỏ vẫn đổi.
- Zen checkout đi qua form người nhận với địa chỉ giả tới chọn phương thức thanh toán; begin_checkout/add_shipping_info không chứa PII. Dừng trước tạo order, không claim full purchase/payment end-to-end.
- Mobile375×844 và desktop1440×1000 không tràn ngang; screenshots /private/tmp/ga4-consent-mobile.png, /private/tmp/ga4-mock-desktop.png. Demo font thay thế, không chứng nhận typography thương hiệu.
- Không chạy web production build bằng .env thật (fonts/prerender có outbound); Next dev fixture biên dịch các route đã mở. Không migration/SQL mới nên không chạy lại SQL42/57của batch trước.

## Nguồn, chi phí và blocker

Đối chiếu [GA4 ecommerce](https://developers.google.com/analytics/devguides/collection/ga4/ecommerce), [event reference](https://developers.google.com/analytics/devguides/collection/ga4/reference/events), [consent mode](https://developers.google.com/tag-platform/security/guides/consent) và [PII policy](https://support.google.com/analytics/answer/6366371) ngày03/11/2026. Các quy tắc VND/items/consent lấy từ tài liệu chính thức; giới hạn mock/scope allowlist là quyết định của dự án. GA4 Standard có lựa chọn miễn phí,360 là gói riêng theo [trang Analytics chính thức](https://marketingplatform.google.com/about/analytics/), kiểm tra lại account terms khi kích hoạt.

Chi phí phát sinh0: không tạo property, không billing/BigQuery/Ads/GA Data API, không production request, email hoặc giao dịch. Chưa được cấp measurement ID/property quyền phù hợp, privacy policy/account retention và quyền staging DebugView/Tag Assistant. Cần live wiring/basic consent/CSP/URL sanitization trước production; flag alone không cấp quyền.

Purchase/refund hiện bị từ chối cả type và runtime. Success URL hoặc payment_status từ client không được tính doanh thu. NEXT P2-01b: thiết kế và kiểm thử paid receipt từ nguồn server đáng tin, ID giao dịch ổn định không PII, durable dedupe khi refresh/webhook trùng và consent delivery boundary; dùng source events/outbox có CAS, không nối best-effort callback vào SePay. Sau gate này mới hoàn tất GA4 rồi chuyển GSC/PSI; chưa đánh dấu đầy đủ Phase2 hoặc 11APIs hoàn thành.
