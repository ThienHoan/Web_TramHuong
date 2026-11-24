# Trạng thái triển khai — 10/11/2026

Đã triển khai tại working tree, chưa triển khai lên máy chủ và chưa áp migration vào database thật. Giữ nguyên các cảnh và hành trình đã được chủ shop chọn; giữ các sửa mobile có sẵn khi bắt đầu.

## Quyết định bổ sung của chủ shop

- Chủ shop xác nhận: **miễn phí giao hàng khi đơn đạt 300.000₫**. Code hiện đã dùng đúng ngưỡng này. Chưa suy rộng thành phê duyệt toàn bộ chính sách giao hàng; phí đơn dưới ngưỡng và cách áp dụng sau voucher chưa được chủ shop xác nhận riêng.
- Link Maps được cung cấp: https://maps.app.goo.gl/WVEoAEAMsdzJPwrk8. Chưa trích xuất được địa chỉ chi tiết từ liên kết nên chưa tự đổi tên phường/xã trên website.
- Để bật Google: có thể xác minh và sử dụng Search Console/Business Profile trực tiếp trên Google; GA4 của website và đồng bộ dashboard hiện vẫn có giới hạn thử nghiệm/production trong source, không chỉ đổi các feature flag sang true.

## SEO kỹ thuật

| Mã | Kết quả |
| --- | --- |
| SEO-01 | Đưa trang chủ và skeleton vào `(home)`. Route sai trả 404 thật; catch-all noindex; nhánh chặn admin rewrite với status 404. |
| SEO-02 | Theo lựa chọn của chủ shop: mặc định vi, tắt tự nhận ngôn ngữ trình duyệt, thống nhất mặc định service và thêm x-default. Nút đổi ngôn ngữ vẫn dùng route `/en`. |
| SEO-03 | Sitemap chỉ chứa danh mục có sản phẩm active; danh mục rỗng noindex/follow. Mỗi bài viết chỉ gửi URL vi, bản en canonical về vi. Không xóa dữ liệu bài thử thay chủ shop. |
| SEO-04 | Tiêu đề/mô tả riêng cho trang chủ, liên hệ, hợp tác; noindex cho tra cứu/xác nhận/theo dõi đơn; bổ sung mô tả danh mục ngắn. Tiêu đề trang chủ theo đề xuất đã được chủ shop chọn. |
| SEO-05 | BlogPosting, BreadcrumbList, canonical, article OG và ngày từ dữ liệu thật. Tác giả dùng dữ liệu bài, không tự đặt tên/ngày; bỏ tiểu sử “20 năm” viết cứng. Cần chạy Rich Results Test với URL sau khi triển khai. |
| SEO-06 | Giữ nguyên theo điều kiện của plan: chỉ tối ưu cache toàn cây khi đo thấy cần. Chưa có số đo mới cho thấy phải làm thay đổi rộng này. |
| SEO-07 | Chờ duyệt chính sách; không tự khai phí, thời hạn đổi trả hay aggregateRating giả vào schema. |
| SEO-08 | Bỏ Geist/Geist Mono/Manrope ở layout locale. Mỗi locale chỉ áp dụng hai họ: vi Be Vietnam Pro + Playfair; en Montserrat + Cormorant. Shared sans/mono có fallback. |
| SEO-09 | Giữ lựa chọn robots hiện có, chờ quyết định riêng về bot AI. |

## Checkout

| Mã | Kết quả |
| --- | --- |
| CK-01 | Một bộ chọn địa chỉ dùng chung cho vi/en/profile, không gọi API địa chỉ bên ngoài. Snapshot v2: 34 tỉnh/thành, 3.321 phường/xã; tải theo tỉnh, tổng khoảng 138 KB. Có báo lỗi, thử lại, nhập tay. Bỏ yêu cầu quận/huyện cho đơn mới; địa chỉ cũ vẫn giữ/hiện quận huyện đến khi khách chỉnh. Chưa xác nhận phường/xã mới của cửa hàng. |
| CK-02 | Email tùy chọn, validate client + DTO; email rỗng được chuẩn hóa/bỏ khỏi payload. Chỉnh lời hướng dẫn tra cứu và nhấn mạnh mã đơn ở trang thành công. Chưa gửi đơn/email thật. |
| CK-03 | Quy tắc duy nhất ở `apps/api/src/shipping/flat-rate-policy.ts`, công khai qua `/shipping/status`. Tính theo subtotal trước voucher ở cả hai phía; không chép lại số tiền ở web. Giỏ, checkout và trang sản phẩm đọc cùng chính sách. Nếu chưa tải được chính sách, không cho đặt đơn với phí đoán. |
| CK-04 | Web audit production: 0 advisory. API: còn 3 high của sharp và 5 moderate. Đã vá high của ws/minimatch; giữ sharp 0.34.5 vì CPU VPS không đáp ứng yêu cầu binary 0.35.x ghi trong Dockerfile/plan. Không mở upload ảnh cho khách. |
| CK-05 | Sửa một phần cảnh báo React: chọn địa chỉ, Date.now khi render, đăng nhập, watch form blog và carousel; chưa refactor toàn bộ cảnh báo setState trong những màn quản trị cũ. Kết quả lint ở phần kiểm thử. |

`ShippingInfoDto` nhận địa chỉ hai cấp mà không cần migration cấu trúc đơn. Các trường district trong kiểu cũ và API hồ sơ vốn đã optional nên được giữ để tương thích. Sửa thêm city của đơn nhận tại cửa hàng từ Hồ Chí Minh về Huế.

### Ngoại lệ sharp

Không đổi Alpine sang Debian rồi mặc định cho rằng đã xử lý: binary Linux x64 cũng có yêu cầu CPU; xem [hướng dẫn sharp](https://sharp.pixelplumbing.com/install/). Cần thử bản vá trên đúng CPU đích, chọn host phù hợp hoặc build libvips/sharp có vá cho CPU đó. Chưa nghiệm thu Docker với sharp mới, chưa coi CK-04 hoàn tất hoàn toàn.

## Mobile

| Mã | Kết quả |
| --- | --- |
| MB-01 | Giữ và kiểm tra các sửa đang có; bổ sung giới hạn khung chat để không bị header hoặc thanh mua che. Kiểm tra production 375/390px và chat 375×667. Dữ liệu kiểm thử dùng ảnh local; vẫn cần xem crop của từng ảnh sản phẩm thật. |
| MB-02 | Menu tải danh mục khi mở, chỉ hiện danh mục active có sản phẩm; gọi điện 44px và các kênh chủ shop cung cấp. Lỗi danh mục không chặn menu. |
| MB-03 | Quy tắc mobile 16px cho input/select/textarea, gồm các form hiện có. Kiểm tra font computed và overflow trên các trang khách dùng. |
| MB-04 | Ảnh tĩnh + nút “Xem 3D” trên màn hẹp; không tải chunk Three trước khi bấm. Desktop giữ IntersectionObserver; reduced-motion giữ ảnh tĩnh. Chưa đo FPS trên Android tầm trung thật. |
| MB-05 | Chờ kiểm tra trên thiết bị thật trước khi chỉnh nhịp GSAP, đúng điều kiện của plan; không tự đổi hiệu ứng đã chọn chỉ từ mô phỏng. |
| MB-06 | Chat gợi ý theo danh mục có hàng; giữ hành trình vòng/3D theo quyết định đã có. Chủ shop vẫn cần quyết định thêm vòng/set quà hay thay nội dung tương ứng. |
| MB-07 | Đã hiện ngưỡng miễn phí giao. Bảng thông số đã có sẵn và dùng dữ liệu thật; chờ chủ shop bổ sung thông số/đánh giá. |
| MB-08 | Ẩn newsletter tiếng Anh chưa hoạt động. Nội dung lịch sử nghề/cửa hàng vẫn cần chủ shop xác nhận; không tự tạo lịch sử thương hiệu. |

## Tính năng mới

| Mã | Kết quả |
| --- | --- |
| FT-01 | Đã gắn Zalo `https://zalo.me/0356176878` và Facebook `https://www.facebook.com/hoann.thiens/` theo thông tin chủ shop gửi. Có trong menu và khung chat; không thêm nút nổi. Có cấu hình Messenger tùy chọn, chỉ nhận URL HTTPS đúng host. Chưa thử mở ứng dụng Zalo trên điện thoại thật. |
| FT-02 | Bổ sung event xem danh sách vào phễu có sẵn; giữ consent và cơ chế bảo vệ hiện tại. Chờ GA4 Measurement ID/tài khoản và kích hoạt theo tài liệu tích hợp; không tự bật các cờ đang tắt. |
| FT-03 | Thanh tiến độ miễn phí giao trong giỏ và tóm tắt checkout, tự đổi theo API, ẩn khi GHN checkout bật. |
| FT-04 | Chờ duyệt chính sách lưu email tiếp thị trước khi mở form xin mã giảm giá; không thu email quảng cáo hoặc gửi mã khi chưa có điều kiện đó. |
| FT-05 | Chờ chính sách và tài khoản Google để bật Merchant Center; không tự đổi cờ hoặc gửi feed. |
| FT-06 | Đã có migration hàng đợi, worker và email nhắc sau 3 ngày từ khi đơn tài khoản chuyển COMPLETED; mặc định tắt. Link mở form đánh giá, bỏ sản phẩm đã đánh giá/ngừng bán; không tự retry SMTP không rõ kết quả. Hướng dẫn tại `06-nhac-danh-gia.md`. Ảnh đánh giá vẫn chờ sharp đã vá trên nền tảng phù hợp. |
| FT-07 | Mô hình hiện tại đủ biểu diễn một set bán như sản phẩm/SKU với biến thể và featured_section; không thêm bảng combo khi chưa có quy tắc tách tồn kho/sản phẩm/giá/hộp từ shop. Chờ dữ liệu thật và quyết định gói quà/lời nhắn. |
| FT-08 | Nút mua lại trong đơn tài khoản và email SMTP. Khách vãng lai mở link danh sách sản phẩm, không cần quyền đọc đơn. Link chỉ chứa ID sản phẩm, số lượng, biến thể; không chứa email, điện thoại, mã đơn hay giá cũ. Khi bấm: đối chiếu catalog, biến thể, giá, tồn kho và số đã có trong giỏ; báo món bỏ qua/giảm số lượng. Snapshot email mock outbox cũ không có ID sản phẩm nên chưa thêm CTA vào snapshot đó. |

## Chỉ chủ shop/tài khoản vận hành làm được

- Chốt bốn nhóm chính sách còn placeholder trong `apps/web/src/lib/legal.ts`: lưu trữ dữ liệu; nhận đơn/thuế/hủy; giao hàng; đổi trả/hoàn tiền. Đổi version đồng bộ với API sau khi hoàn thiện bản được duyệt.
- Xác nhận phường/xã mới của 153 Lý Thái Tổ; thông tin pháp lý và email cửa hàng.
- Xóa bài `zxczxc`, sửa giá 50.004₫ và tồn kho thử; thêm sản phẩm/ảnh đủ lớn/thông số thật. Không tự sửa dữ liệu đang bán.
- Cấp GA4 Measurement ID và quyền Search Console; sau khi triển khai SEO-01–03 mới gửi sitemap/yêu cầu index. Cơ chế tích hợp hiện còn các giới hạn môi trường trong tài liệu kích hoạt; không chỉ đổi một cờ rồi coi là đã hoạt động production.
- Tạo/xác minh Google Business Profile, ảnh cửa hàng, nội dung blog, liên kết và đánh giá khách thật theo tài liệu 05.
- Thử COD/SePay trên môi trường thử được phép: thư, QR, webhook, hủy/hoàn kho; chạy RLS audit bằng tài khoản có quyền. Chưa chạy API thật vì cron của nó có thể tác động database.
- Áp migration nhắc đánh giá lên database thử, kiểm SMTP, rồi chủ động bật khi muốn dùng. Hiện chưa áp vào database nào ngoài các test PGlite.

## Kiểm thử

Kết quả đã chạy:

- API build: qua. Jest: **76 bộ / 1.168 test qua**.
- Checkout: **14 kiểm tra SQL/giao dịch qua**, ngoài các test Jest.
- Nhắc đánh giá: **5 kiểm tra SQL PGlite qua**, gồm quyền truy cập, nhận việc độc quyền, hủy đơn, đã đánh giá và kết quả SMTP không rõ ràng.
- Web: **TypeScript qua; 104 test qua**. ESLint **0 lỗi, 15 cảnh báo** (plan ghi 24 cảnh báo ban đầu).
- Production build Turbopack đã qua ở lượt trước trang `/reorder` cuối cùng và thay đổi đồng bộ footer. Trên bản đó: **12 trường hợp 404** (6 URL × 2 User-Agent) đúng status/noindex; trang thật 200; mặc định `/vi`; metadata/sitemap đúng.
- Browser Chromium: **18 tổ hợp trang × khổ 375/390px** không tràn ngang, không có control hiển thị dưới 16px. Chọn địa chỉ và nhập tay khi JSON lỗi đều sang bước 2; email hợp lệ được giữ, bỏ email vẫn tiếp tục được. Three.js chưa tải trước khi bấm, có tải sau khi bấm. Chat 375×667 nằm dưới header, kể cả khi thanh mua hiện; link review mở form.
- Probe UI đã chạy và xem ảnh. Còn các nhận xét kiểu chữ/trang trí của layout cũ và một số đo của control đang đóng; không coi toàn bộ probe là đã sạch. Đã rút placeholder tìm kiếm và tăng vùng chạm breadcrumb sau lượt probe.
- Audit production web: **0 advisory**. API: **3 high (sharp), 5 moderate**, đã ghi ngoại lệ phía trên.

**Giới hạn nghiệm thu bản cuối:** sau khi thêm trang mua lại khách vãng lai, đồng bộ link/footer/schema và chỉnh bộ lọc, chưa hoàn tất build production/browser lại. Build Turbopack trong sandbox lỗi `binding to a port — Operation not permitted`; thử Webpack bị chặn tải Google Fonts. Các yêu cầu chạy build ngoài sandbox chưa trả kết quả nên đã dừng chờ, không ghi nhận là kiểm tra qua. Source cuối vẫn qua TypeScript và 104 test. Chưa chạy lại bài browser riêng cho `/reorder` trên production build cuối.

Để chốt nghiệm thu tại môi trường có quyền chạy build: dùng API thử, chạy `cd apps/web && npm run build`, chạy production server và thử `/vi/reorder?items=...` từ email thử, thêm giỏ theo giá/tồn kho hiện tại; kiểm lại bộ lọc và footer. Không cần dùng database thật. Không deploy artefact build dùng API giả.

Mọi test browser đã chạy đều dùng API giả chỉ đọc; không gửi đơn thật, không gửi thư thật hoặc dữ liệu lên Google. Chưa commit/đẩy nhánh/triển khai; `.agent/` có sẵn không bị thay đổi.

## Nghiệm thu bổ sung — 25/11/2026

Đã chốt phần "giới hạn nghiệm thu bản cuối" ở trên.

**Cách chạy.** `next build` (Turbopack) rồi `next start` ở máy. API là một proxy tạm chỉ đọc: chuyển các request GET tới API công khai của site thật, từ chối mọi lệnh ghi (POST/PUT/DELETE trả 403), và thêm trường `flatRate` vào `/shipping/status` vì API thật chưa được triển khai bản mới. Không tạo đơn, giỏ, liên hệ hay thư nào.

**Lỗi build lần đầu không do code.** Bộ nhớ đệm `apps/web/.next/cache/turbopack` có file trùng tên kiểu `00000037 2.sst` (bản sao do macOS tạo), làm Turbopack báo `Failed to open database … invalid digit found in string`. Xóa thư mục đó là build được. Nếu gặp lại trên máy này thì xóa `.next/cache/turbopack`.

**Kết quả.**

- API: Jest 76 bộ / 1.168 test qua; `tsc -p tsconfig.build.json` qua. (`tsc` với `tsconfig.json` báo lỗi kiểu trong `src/mail/shipment-notification.spec.ts`, file này không bị sửa trong đợt nâng cấp.)
- Web: TypeScript qua; `test:upgrade` 5, `test:checkout` 5, `test:auth-provider` 5, `test:analytics` 60, `test:chat` 4 đều qua; ESLint 0 lỗi, 15 cảnh báo; build production qua.
- Mã trạng thái: 7 URL sai × 2 User-Agent (thường và Googlebot) đều 404 kèm `noindex`; 11 trang thật 200; `/` chuyển về `/vi` kể cả với trình duyệt tiếng Anh.
- Metadata: tiêu đề và mô tả trang chủ, liên hệ, hợp tác, danh mục đúng; `x-default` trỏ bản `/vi`; danh mục rỗng `noindex, follow`; bài blog bản `/en` canonical về `/vi` và có `BlogPosting`; tra cứu đơn `noindex, nofollow`.
- Điện thoại 375px: trang danh sách thấy sản phẩm ngay màn hình đầu; trang sản phẩm hiện "Miễn phí giao từ 300.000 ₫"; giỏ hàng hiện "Thêm 180.000 ₫ nữa để được miễn phí giao"; form thanh toán có ô email, 34 tỉnh/thành, 40 phường/xã của Huế tải từ file tĩnh; bước 2 tính phí 30.000₫, tổng 150.000₫, địa chỉ hai cấp; không tràn ngang; mọi ô nhập 16px. Bản tiếng Anh `/en/checkout` dùng cùng bộ chọn địa chỉ.

**Sửa thêm trong lượt này.**

| Vấn đề | Sửa |
| --- | --- |
| Nút "Quay lại giỏ hàng" ở thanh toán trỏ tới `/cart`, trang này chưa từng tồn tại (site thật trước đây trả 200 kèm màn 404, nay là 404 thật) | Đổi thành "Tiếp tục mua sắm" về danh sách sản phẩm; sản phẩm vẫn sửa được ngay trong tóm tắt đơn (`CheckoutUI.tsx`) |
| Bản tiếng Anh có hai link "Our Story" / "Read Our Full Story" tới `/about`, trang này không tồn tại | Menu dẫn tới `/#story` như chân trang; nút ở trang chủ dẫn tới `/blog` với chữ "Read the journal" (`ZenHeader.tsx`, `ZenHome.tsx`) |
| Nút "Lọc & sắp xếp" ở danh sách tiếng Việt hiện số 1 dù khách chưa lọc, vì `sort=newest` là mặc định của trang này | Chỉ đếm cách sắp xếp khác mặc định (`ShopCatalogFilters.tsx`) |
| "Xóa bộ lọc" ở danh sách tiếng Việt đưa khách sang trang ba chương thay vì danh sách | Đặt lại về `sort=newest` cho tiếng Việt |
| Zalo, Facebook trong menu điện thoại là chữ trơn, khác kiểu các mục khác | Gom gọi điện, Zalo, Facebook thành một hàng nút, gọi điện là nút chính (`TraditionalHeader.tsx`) |
| Bước 2 thanh toán không cho khách xem lại email đã nhập | Hiện email dưới số điện thoại khi có (`checkout/payment_select/page.tsx`) |

**Lưu ý khi triển khai.** Web mới đọc phí giao từ `flatRate` trong `/shipping/status` của API mới, và không cho đặt đơn khi không đọc được. Vì vậy web và API phải lên cùng một lần. `deploy.yml` đang build và `up -d` cả hai cùng lúc nên đúng sẵn; chỉ cần đừng triển khai riêng web.

**Chưa kiểm được ở lượt này.** Turnstile báo "Xác minh chưa thành công" trên bản chạy ở máy, do khóa thật của site không nhận `localhost`; cần thử trên tên miền thật. Bấm đặt đơn, trang QR SePay, email xác nhận, `/reorder` với link từ email thật, Zalo trên điện thoại thật vẫn chưa thử.
