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

## Kiểm trên site thật — 28/11/2026

PR #2 đã gộp vào `main` và đã lên `tramhuongthienphuchue.com`.

- `/vi/khong-ton-tai` trả 404; `/` chuyển về `/vi`; trang chủ có tiêu đề mới; `/api/shipping/status` trả `flatRate`; file địa chỉ `/data/addresses/v2/provinces.json` tải được.
- Sitemap còn 25 URL: không còn danh mục rỗng, bài blog chỉ một URL `/vi`.
- Turnstile chạy chế độ `cloudflare` với khóa thật; trên trang liên hệ ô "Xác minh bạn là con người" hiện bình thường, không còn lỗi như khi chạy ở `localhost`. Chưa bấm xác minh hay gửi form (việc của người dùng thật).

**Sửa thêm:** bong bóng chào của trợ lý chat tự bật sau 8 giây và trên điện thoại che nửa màn hình, kể cả nút "Gửi lời nhắn" và ô xác minh ở trang liên hệ. Giờ bong bóng không tự bật trên điện thoại và trên các trang có form (liên hệ, hợp tác, đăng nhập, tài khoản, tra cứu đơn, mua lại); nút chat vẫn còn. Bong bóng có bản tiếng Anh cho `/en` và nút đóng có nhãn cho trình đọc màn hình (`ChatWidget.tsx`).

**Dữ liệu thử vẫn còn trên site thật (việc của chủ shop):** giá 50.004₫ ở "Trầm Nụ Huế Cao Cấp", tồn kho 99–103, bài blog `zxczxc`, chính sách còn bản nháp (`noindex`).

**Còn ghi nhận:** thanh danh mục ở trang danh sách vẫn hiện "Phụ kiện xông trầm" và "Set quà tặng" dù chưa có sản phẩm (menu điện thoại đã ẩn hai mục này). Bấm vào sẽ ra trang trống có gợi ý đi tiếp. Tự hết khi chủ shop thêm hàng; nếu muốn ẩn sớm thì cần trang danh sách biết số sản phẩm của từng danh mục.

## Báo cáo Search Console — xử lý ngày 28/11/2026

Chủ shop gửi bốn báo cáo "Lập chỉ mục trang". Đối chiếu từng URL với site thật:

| Báo cáo | URL | Nguyên nhân | Xử lý |
| --- | --- | --- | --- |
| Lỗi 404 mềm | `/products/category/qua-tang`, `/en/products/category/qua-tang` | Danh mục "Set quà tặng" chưa có sản phẩm. Google ghé ngày 22 và 24/11, trước khi bản có `noindex` lên site. Trang chủ, thanh danh mục và bộ sưu tập vẫn dẫn link tới nó nên Google cứ quay lại | Không còn link tới danh mục chưa có hàng ở trang chủ, trang danh sách, trang danh mục, menu điện thoại và gợi ý chat (`lib/stocked-categories.ts`). Trang danh mục rỗng vẫn mở được với `noindex, follow`, và tự hiện lại ở mọi nơi khi có hàng |
| Bị loại trừ bởi `noindex` | `/policies/returns`, `/vi/policies/returns` | Chính sách còn bản nháp, `noindex` là cố ý | Tự hết khi chủ shop duyệt chính sách và bỏ đuôi `.draft` |
| | `/vi/products?sort=newest` | Danh sách đầy đủ có tham số sắp xếp, `noindex, follow` là cố ý; Google vẫn đi theo link tới sản phẩm | Giữ nguyên. Không phải lỗi |
| | `/vi/products?search={search_term_string}` (2 lần) | Google thu thập nguyên văn mẫu `SearchAction` trong dữ liệu cấu trúc. Google đã bỏ hộp tìm kiếm trong kết quả từ cuối 2024 | Bỏ `SearchAction` khỏi `components/seo/JsonLd.tsx` |
| Đã thu thập, chưa lập chỉ mục | `/vi/products/category/qua-tang` | Như dòng 404 mềm | Như trên |
| | `/en/about` | Trang không tồn tại; link đã sửa trong PR #2, giờ trả 404 | Tự rơi khỏi báo cáo |
| | `/_next/static/media/….woff2` | File phông chữ. Google không lập chỉ mục phông; mục này vô hại | Không cần làm gì |
| | `/search?q={search_term_string}` | Mẫu tìm kiếm của bản site cũ (lần thu thập 1/4/2026) | Giờ chuyển 308 sang `/vi/search…` rồi 404; tự rơi |
| Trùng lặp, Google chọn trang chính tắc khác | (ảnh chụp không có danh sách URL) | Có khả năng là bản `/en/blog/…` trùng nội dung tiếng Việt (đã canonical về `/vi` trong PR #2) và trang gốc `/` | Đường dẫn thiếu `/vi` giờ chuyển hướng 308 (vĩnh viễn) thay vì 307 (tạm thời) trong `middleware.ts`, để Google gộp `/products/…`, `/policies/…`, `/` vào bản `/vi`. Cần xem danh sách URL của báo cáo này để chắc |

**Đã kiểm ở máy** (build production, API qua proxy chỉ đọc): `/`, `/products`, `/products/category/qua-tang`, `/policies/returns`, `/search?q=x` đều trả 308 sang bản `/vi`; trang không còn chữ `search_term_string`; trang chủ, danh sách, danh mục (vi và en) chỉ còn link tới `nhang-bot` và `nu-tram`; trang `qua-tang` vẫn 200 với `noindex, follow`. Test web và lint không đổi (0 lỗi).

**Cập nhật chọn ngôn ngữ ngày 28/11/2026:** kết quả 308 cho `/` ở trên được thay bằng 307 riêng cho trang gốc. Bot luôn vào `/vi`; khách thường ưu tiên cookie `NEXT_LOCALE`, sau đó có tiếng Việt ở bất kỳ vị trí nào trong `Accept-Language` thì vào `/vi`, còn lại `/en`. Cookie đổi ngôn ngữ có hiệu lực toàn site trong một năm. Chuyển hướng gốc giữ tham số URL, có `private, no-store` và `Vary` theo ngôn ngữ/cookie/user-agent. Link có `/vi` hoặc `/en` vẫn giữ ngôn ngữ trong URL; các đường dẫn thiếu tiền tố khác vẫn 308 sang `/vi` như trước. Đã kiểm ở máy: 18 test middleware với next-intl thật (`test:locale-routing`), TypeScript và lint các file liên quan đều đạt; chưa triển khai bản cập nhật này.

**Sau khi triển khai, trong Search Console:**

1. Mở báo cáo "Lỗi 404 mềm", bấm **Xác thực kết quả khắc phục**. Google sẽ ghé lại hai URL, thấy `noindex` và chuyển chúng sang nhóm "Bị loại trừ bởi `noindex`". Đó là kết quả đúng.
2. Báo cáo "Trùng lặp…": mở phần Ví dụ, xem 3 URL. Nếu là `/en/blog/…` hoặc URL không có `/vi`, bấm Xác thực lại. Nếu là URL khác, gửi danh sách để xử lý tiếp.
3. Nhóm "Bị loại trừ bởi `noindex`" và "Đã thu thập, chưa lập chỉ mục" là thông tin, không phải lỗi; không cần bấm xác thực. Các URL `search_term_string` sẽ tự rơi sau vài tuần.
4. Dùng "Kiểm tra URL" cho `/vi`, `/vi/products` và từng trang sản phẩm, rồi "Yêu cầu lập chỉ mục".

## Ảnh, chữ nghiêng và thang cỡ chữ — 28/11/2026

**Ảnh không được thu nhỏ trên site thật.** PageSpeed (điện thoại) cho trang chủ Hiệu suất 73, LCP 3,9 giây; mục "Cải thiện việc phân phối hình ảnh" ước tiết kiệm 1.761 KiB. Xin cùng một ảnh sản phẩm qua `/_next/image` ở `w=256`, `384`, `640`, `1920` đều nhận đúng file gốc 1600×1067, 187.712 byte. Nguyên nhân: Next 16 kéo theo `sharp ^0.35`, bản Alpine x64 của nó cần CPU hỗ trợ x86-64-v2 và VPS không có (lý do API đã hạ `sharp` ở commit `62372a69`). Khi `sharp` không nạp được, Next lặng lẽ trả ảnh gốc (`next/dist/server/image-optimizer/transform.js`, nhánh "fallback to the original image").

Sửa: ép mọi bản `sharp` của web về `0.34.5` bằng `overrides` ở cả `pnpm-workspace.yaml` (pnpm ở máy) và `package.json` (pnpm 9.15.9 trong Docker); đã thử `pnpm@9.15.9 install --frozen-lockfile` với lockfile mới. `sharp` 0.34.5 có đủ các hàm Next gọi (`block`, `unblock`, `cache`, `concurrency`). Bản này còn các cảnh báo libvips đã ghi ở CK-04; web chỉ xử lý ảnh từ kho Supabase của shop và ảnh trong repo (`remotePatterns`). **Cần đo lại PageSpeed sau khi triển khai.**

**Chữ nghiêng giả.** 9 tiêu đề trang chủ có phần `<em>` nghiêng nhưng `Playfair_Display` chỉ khai dạng đứng, nên trình duyệt xiên chữ đứng. Đã thêm `style: ['normal', 'italic']` cho Playfair (tiếng Việt) và Cormorant (tiếng Anh). Kiểm ở máy: `document.fonts` có các mặt Playfair italic ở trạng thái `loaded`.

**Thang cỡ chữ.** Đo trên site thật trước khi sửa: tiêu đề mục cùng cấp 28–38px (điện thoại) và 36–58px (máy tính); nhãn in hoa 8–11px; đoạn văn 12–15px với giãn dòng tới 2,0; nút chính 12px; giá trên thẻ sản phẩm 20px, to hơn tên sản phẩm. Thêm `apps/web/src/app/typography.css`, nạp sau cùng trong layout, ánh xạ mỗi vai trò chữ vào một thang:

| Vai trò | Điện thoại → máy tính |
| --- | --- |
| Tiêu đề lớn trang chủ | 40 → 72px, giãn dòng 1,1 |
| Tiêu đề trang | 32 → 48px |
| Tên sản phẩm (trang chi tiết) | 28 → 40px |
| Tiêu đề mục | 32 → 52px |
| Tiêu đề phụ | 24 → 34px |
| Tên trên thẻ sản phẩm | 19 → 22px |
| Đoạn dẫn | 16 → 18px |
| Đoạn văn | 15 → 16px, giãn dòng 1,7 |
| Chữ phụ / chú thích | 14px / 13px |
| Nhãn in hoa | 12px, giãn chữ 0,14em |
| Nút bấm | 15px |
| Giá trên thẻ | 17px, chữ số đều cột |

Kèm theo: tiêu đề không cho trình duyệt làm đậm/nghiêng giả (`font-synthesis: none`), ngắt dòng cân (`text-wrap: balance`); phần nghiêng nới giãn chữ và thêm khoảng nhỏ bên phải để nét cuối không bị cắt; trên điện thoại giảm độ khít chữ của tiêu đề để từ tiếng Việt dài không xuống dòng xấu; menu đầu trang 14px; chữ dưới logo 9px; các dòng trên trang thanh toán ở máy tính trước đây 11–12px nay 13–15px. Các họa tiết trang trí (nhãn dọc, chú thích cảnh 3D) giữ ở 10px; con dấu tròn của logo không đổi.

**Đã kiểm ở máy** (build production, khổ 375px và 1440px): trang chủ, danh sách, chi tiết sản phẩm, thanh toán, chân trang dùng đúng thang trên; mọi tiêu đề mục trang chủ cùng cỡ; ngoài họa tiết và con dấu không còn chữ dưới 11px; không tràn ngang; nút "Thêm vào giỏ" không tràn chữ kể cả ở 320px. Test web và lint không đổi (0 lỗi, 15 cảnh báo cũ).

**Chưa áp:** trang blog, liên hệ, đăng nhập, tài khoản viết bằng lớp tiện ích Tailwind nên không theo thang này; các trang bản tiếng Anh (`Zen*`) cũng vậy.

## Thang cỡ chữ cho toàn bộ dự án — 28/11/2026

Mở rộng phần trước từ các trang mua hàng chính ra mọi trang còn lại.

**Phông theo ngôn ngữ.** `globals.css` khai `--font-display`/`--font-serif` trong `@theme inline` bằng tên cứng "Be Vietnam Pro"/"Playfair Display". Kiểu `inline` chép thẳng giá trị vào lớp tiện ích, nên mọi chỗ dùng lớp `font-display`/`font-serif` (gốc trang liên hệ, hợp tác, blog, tài khoản, tra cứu đơn…) luôn khai phông tiếng Việt, kể cả ở bản tiếng Anh. Lớp `font-zen-sans`/`font-zen-display` của các component tiếng Anh thì chưa có trong theme nên không có tác dụng. Đã đổi các token thành `var(--font-ui)`/`var(--font-heading)`; hai biến này đặt trên `<body>` từ phông của ngôn ngữ đang dùng. Kiểm ở máy: trên mọi trang đã đo, không còn chữ nào khai một phông không được tải.

**Lớp vai trò cho trang viết bằng Tailwind.** Thêm `type-h1`, `type-h2`, `type-h3`, `type-h4`, `type-label`, `type-lead`, `type-body`, `type-small` vào `typography.css`. Gán cho 61 tiêu đề trong 22 file đang dùng: blog (vi/en), bài viết, tài khoản (hồ sơ, yêu thích, đơn hàng, chi tiết đơn, đánh giá), xác thực email, đặt lại mật khẩu, theo dõi giao hàng, thanh toán thành công/chuyển khoản, liên hệ, hợp tác, tra cứu đơn, trang lỗi, trang chủ/footer/ô tìm kiếm tiếng Anh. Đồng thời bỏ các lớp cỡ chữ, độ đậm, giãn chữ, chữ in hoa và tên phông đang xung đột trên các tiêu đề đó; màu, khoảng cách, hover giữ nguyên. Blog tiếng Anh trước dùng chữ in hoa nét mảnh (`font-thin uppercase tracking-[0.15em]`), nay dùng tiêu đề serif như các trang tiếng Anh khác.

Không sửa code không còn dùng (không file nào import): `ZenProductList`, `ZenProductDetail`, `ZenProductCard`, `TraditionalProductCatalog`, `TraditionalProductFilter`, `TraditionalProductGridItem`, `TraditionalProductCard`, `traditional/tabs/*`, `reviews/ReviewsSection` (kéo theo `ReviewForm`, `ReviewList`). Có thể xóa sau.

**Chữ nhỏ.**
- `text-[10px]` và `text-[11px]` ở các component ngoài quản trị đổi thành `text-xs` (12px).
- Huy hiệu số yêu thích ở đầu trang từ 8px trong chấm 12px lên chấm 16px.
- Thanh thông báo trên cùng 12px.
- Trang chính sách: nhãn 9–10px lên 12px, đoạn văn 14–15px lên 15–16px, chú thích lên 13–14px.
- Phòng 3D: tên ô khái niệm 11px lên 14px, nhãn tính năng lên 12px.
- Trang quản trị: hơn 40 quy tắc 10–11px (tiêu đề cột bảng, trạng thái, chú thích, bộ lọc) lên 12px.
- Trang lỗi đăng nhập OAuth (`app/auth`) chuyển từ phông Manrope sang Be Vietnam Pro + Playfair như phần còn lại.

**Đã kiểm ở máy** (build production, 375px và 1440px): trang chủ, danh sách, chi tiết sản phẩm, thanh toán, blog, liên hệ, hợp tác, đăng nhập, tra cứu đơn, chính sách, 404, phòng 3D, trang chủ/blog/liên hệ/chi tiết sản phẩm tiếng Anh. Tiêu đề trang đều 32px (điện thoại) / 48px (máy tính), tiêu đề mục 32/52px, khối nội dung 24/34px, thẻ 19/22px. Chữ dưới 12px chỉ còn: chữ "TRẦM HƯƠNG VIỆT" dưới logo (9px, thuộc logo), nhãn danh mục trên thẻ sản phẩm và dòng bản quyền (11px), họa tiết trang trí và nhãn cảnh 3D (10px). Không tràn ngang. Chưa xem được trang tài khoản và quản trị vì cần đăng nhập; phần đó chỉ kiểm qua code.

**Lỗi dữ liệu blog phát hiện thêm.** Bài "Trầm hương là gì? Nguồn gốc và giá trị của trầm hương Việt Nam" đang lưu với đường dẫn rỗng (`slug: ""`), nên không mở được và sitemap sẽ gửi `/vi/blog/` trùng trang danh sách. Nguyên nhân: ô "Đường dẫn bài viết" ghi "Để trống để tự tạo từ tiêu đề", nhưng API chỉ tự tạo khi thêm bài mới; khi sửa bài thì lưu nguyên giá trị rỗng. Đã sửa `PostsService.update` (tạo từ tiêu đề mới, hoặc tiêu đề đang lưu nếu chỉ xóa ô đường dẫn), bỏ dấu gạch nối thừa ở đầu/cuối (ví dụ do dấu "?"), thêm 3 test. Phía web, các trang công khai không liệt kê bài không có đường dẫn (`services/blog-service.ts`); trang quản trị vẫn thấy đủ. **Sau khi triển khai, chủ shop mở bài này trong trang quản trị, để trống ô đường dẫn và bấm lưu một lần.**

## Phông theo ngôn ngữ và số tiền — kiểm lại 28/11/2026

**Phông.** Thêm `font-family` cho `<body>` trong `globals.css`: trước đó `<body>` kế thừa phông tính ở `<html>`, nơi chưa có biến phông của ngôn ngữ (next/font đặt biến trên `<body>`), nên chữ không có lớp riêng rơi về phông tiếng Việt. Họa tiết `.tp-note-mark` ghi cứng `serif`, nay dùng biến phông. Đo trên bản build (đếm phông thực tế của từng chữ): trang chủ, chi tiết sản phẩm, blog, liên hệ bản tiếng Việt chỉ có Be Vietnam Pro + Playfair Display; bản tiếng Anh chỉ có Montserrat + Cormorant Garamond; không chữ nào dùng phông của ngôn ngữ kia. Còn `font-mono` (phông đơn cách của hệ thống) cho mã đơn hàng ở trang thanh toán thành công, theo dõi giao hàng và trang lỗi đăng nhập; giữ nguyên vì là mã để đọc/chép.

**Số tiền.** Trước đây có 6 cách định dạng; 4 chỗ ghi cứng kiểu Việt (`ProductPrice` dòng giữ chỗ, số tiền chuyển khoản, dòng "Order total in VND" ở thanh toán tiếng Anh, ô tìm kiếm tiếng Anh), nên bản tiếng Anh lẫn "₫120,000" và "120.000 ₫". Nay mọi chỗ, kể cả trang quản trị, gọi một hàm `formatVnd` trong `lib/commerce.ts`: tiếng Việt "120.000 ₫", tiếng Anh "₫120,000". Bỏ dòng "Order total in VND" (thừa từ khi bản tiếng Anh đã hiện VND) và bỏ dòng "≈" lặp lại số tiền ở trang chuyển khoản.

**Kiểu chữ số.** Playfair và Cormorant mặc định dùng số kiểu cổ (chữ số nhấp nhô như chữ thường). Toàn site nay dùng số thẳng hàng. Thêm lớp `type-money`: số tiền luôn dùng phông chữ thường của ngôn ngữ, chữ số đều cột, đậm 600; áp cho giá trong `ProductPrice`, danh sách yêu thích, danh sách và chi tiết đơn tài khoản (ba chỗ này trước hiện giá bằng Playfair đậm). Đo trên bản build: mọi giá trên trang chủ và chi tiết sản phẩm cùng phông, cùng độ đậm, cùng kiểu chữ số ở cả hai ngôn ngữ. Ký tự ₫ có trong Be Vietnam Pro, Playfair và Montserrat; Cormorant không được dùng cho số tiền.

Email đơn hàng của API vẫn định dạng kiểu Việt cho cả thư song ngữ; giữ nguyên.

**Sửa kèm.** Trang blog tiếng Anh có tiêu đề tab và mô tả bằng tiếng Việt; nay có bản tiếng Anh.


## Blog và quản trị bài viết — 28/11/2026

Chủ shop đã chọn Blog A (bài nổi bật và lưới), Đọc bài C (ảnh và tiêu đề song song, bài liên quan bên phải), Quản lý B (danh sách và xem nhanh), Soạn bài A (nội dung bên trái, xuất bản và góp ý SEO bên phải). Đã dựng theo tổ hợp này, dùng màu và phông hiện tại; các chuyên mục VI/EN dùng cùng mã dữ liệu. Trang đọc không giữ cột trống nếu chưa có bài liên quan.

**Soạn bài:** nhập trực quan với H2, đậm/nghiêng, danh sách, liên kết, ảnh kèm mô tả; có chế độ HTML cho bài cũ, xem trước đã làm sạch HTML, tải ảnh bìa, lưu nháp và xuất bản. Có cảnh báo thay đổi chưa lưu khi đóng/tải lại trang. Bài cũ ở trạng thái lưu trữ vẫn quản lý và khôi phục được. Gỡ ảnh khỏi form không tự xoá tệp lưu trữ.

**SEO khi viết:** ô tiêu đề/mô tả SEO và xem trước tìm kiếm cập nhật theo nội dung; góp ý về mô tả, ảnh bìa, H2, liên kết và mô tả ảnh. Đây là góp ý biên tập, không phải điểm xếp hạng. Để trống SEO sẽ dùng tiêu đề/mô tả ngắn, sau đó nội dung nếu chưa có mô tả. Bài công khai có một H1, mục lục với ID riêng, canonical về bản `/vi` vì nội dung bài hiện chỉ có tiếng Việt, Open Graph/Twitter và BlogPosting có tác giả hoặc tổ chức, ngày đăng/ngày sửa, ngôn ngữ. Sitemap lấy ngày cập nhật; trang tìm kiếm, lọc và danh sách rỗng/lỗi không lập chỉ mục. Phân trang được sửa để đọc `last_page` từ API.

**Bảo toàn bài đã đăng:** API chỉ đặt ngày xuất bản ở lần đăng đầu, các lần lưu sau giữ nguyên. URL đã từng xuất bản giữ cố định ở cả form và API. Tiếp tục sửa nội dung và SEO trên chính URL đó. Không cần cột cơ sở dữ liệu mới.

**Kiểm tra:** kiểm thử blog ở web và API; TypeScript mã nguồn web (loại cache `.next` bị lặp file), TypeScript bản build API và lint các file liên quan. Đã xem blog/trang đọc với dữ liệu thật và kiểm tra canonical, BlogPosting, một H1; màn đọc 375px không tràn ngang. Quản trị được xem và thử chọn bài, H2, chèn ảnh/mô tả, xem trước và lưu nháp bằng component thật trong môi trường dữ liệu mẫu riêng, không dùng API ghi thật. Trang admin thật vẫn yêu cầu phiên đăng nhập. Chưa triển khai bản nâng cấp lên VPS.
