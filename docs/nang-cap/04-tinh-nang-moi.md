# 04 — Tính năng mới

Xếp theo lợi ích trên công sức. Cột "Lợi ích" là nhận định của người rà soát dựa trên cách các shop nhỏ ở Việt Nam bán hàng; site chưa có số liệu đo (GA4 đang tắt) nên chưa có gì để kiểm chứng. Bật đo lường (FT-02) trước, rồi dùng số liệu để chọn việc tiếp theo.

Nên làm sau khi các việc P0 ở tài liệu 01 và 02 đã xong.

## Bảng tổng

| Mã | Tính năng | Lợi ích | Công sức | Phụ thuộc |
|---|---|---|---|---|
| FT-01 | Nút Zalo / Messenger / gọi nhanh | Kênh hỏi và chốt đơn quen thuộc của khách Việt | Nhỏ | Chủ shop cung cấp Zalo OA hoặc số Zalo |
| FT-02 | Bật GA4 và Search Console | Có số liệu để quyết định mọi việc khác | Nhỏ | Tài khoản Google; code đã có, đang tắt bằng cờ |
| FT-03 | Thanh "còn X₫ nữa được miễn phí giao" | Khuyến khích thêm món để đạt 300.000₫ | Nhỏ | CK-03 |
| FT-04 | Mã giảm đơn đầu khi để lại email hoặc Zalo | Có danh sách khách để bán lại không tốn quảng cáo | Nhỏ đến vừa | Hệ thống voucher đã có; cần chính sách dữ liệu được duyệt |
| FT-05 | Google Merchant Center | Sản phẩm hiện miễn phí ở tab Mua sắm | Vừa | Chính sách đã duyệt (SEO-07); code `apps/api/src/merchant` đã có, đang tắt |
| FT-06 | Đánh giá kèm ảnh và nhắc đánh giá sau khi giao | Tạo niềm tin; có sao trên Google khi đủ đánh giá thật | Vừa | Email khách (CK-02) |
| FT-07 | Set quà, gói quà kèm thiệp | Lấp danh mục quà tặng đang trống; giá trị đơn cao hơn | Vừa | Chủ shop có sản phẩm và giá |
| FT-08 | Mua lại một chạm | Nụ và nhang là hàng tiêu hao | Vừa | Khách có tài khoản hoặc link trong email |
| FT-09 | Giao hàng GHN | Phí thật, tự theo dõi đơn | Đã có code | Giai đoạn 2 trong `lo-trinh-mo-ban.md` |
| FT-10 | Tìm kiếm toàn văn | Chỉ đáng khi danh mục lớn | Đã có code | Migration `catalog-full-text-search.sql`; 5 sản phẩm thì chưa cần |

---

## FT-01 — Nút liên hệ nhanh

Hiện có: thanh thông báo trên cùng có hotline dạng `tel:`, chân trang có điện thoại, email, Facebook. Chat nổi là trợ lý AI, và ở giai đoạn 1 cờ `FEATURE_GEMINI_ADVISOR_ENABLED` đang tắt trong file mẫu; cần kiểm xem khi tắt thì khung chat trả lời gì cho khách.

Đề xuất: thêm đường dẫn Zalo và Messenger vào `SHOP_CONTACT` (`apps/web/src/lib/legal.ts`), hiện ở menu điện thoại, khu mua của trang sản phẩm ("Cần tư vấn? Gọi…" đã có sẵn dòng này), trang liên hệ và chân trang. Không thêm nút nổi thứ hai ở góc màn hình: vừa sửa xong chuyện nút nổi đè nội dung (MB-01). Nếu muốn một điểm chạm nổi duy nhất, cho nút chat mở ra ba lựa chọn: Zalo, gọi điện, hỏi trợ lý.

Nghiệm thu: trên điện thoại, chạm Zalo mở ứng dụng Zalo tới đúng tài khoản; chạm số điện thoại mở trình quay số.

## FT-02 — Đo lường

Code đã có: `apps/web/src/components/analytics/` (có hộp xin đồng ý), `apps/api/src/analytics/` (GA4, Search Console, PageSpeed). Cờ trong `deploy/env.production.example`: `FEATURE_GA4_ENABLED`, `FEATURE_SEARCH_CONSOLE_SYNC_ENABLED`, `FEATURE_PAGESPEED_AUDIT_ENABLED`, tất cả đang `false`. Cách bật: `docs/integrations/33-huong-dan-kich-hoat.md` và `docs/integrations/23-activation-guide.md`.

Search Console thì không cần code: chủ shop xác minh tên miền (lộ trình ghi đã có bản ghi TXT) và gửi sitemap. Xem tài liệu 05.

Phễu cần theo dõi: xem danh mục, xem sản phẩm, thêm giỏ, bắt đầu thanh toán, mua thành công; tách theo điện thoại/desktop và nguồn truy cập.

## FT-03 — Thanh miễn phí giao hàng

Trong `TraditionalCartDrawer.tsx` và khối tóm tắt đơn ở checkout: "Thêm X₫ nữa để được miễn phí giao" kèm thanh tiến độ; khi đạt thì đổi thành "Đơn này được miễn phí giao". Lấy ngưỡng từ nguồn duy nhất của CK-03. Ẩn khi GHN checkout bật.

## FT-04 — Mã giảm đơn đầu

Hệ thống voucher đã có (`apps/api/src/vouchers`, trang quản trị voucher). Cần thêm: một form ngắn (ở chân trang hoặc sau khi xem vài sản phẩm, không dùng popup che màn hình khi vừa vào), lưu email kèm sự đồng ý, gửi mã. Việc lưu email để tiếp thị phải khớp với chính sách bảo vệ dữ liệu cá nhân mà chủ shop duyệt; xem `docs/compliance/`.

## FT-05 — Google Merchant Center

`apps/api/src/merchant` đã có đồng bộ sản phẩm, đang tắt bằng `FEATURE_MERCHANT_SYNC_ENABLED`. Điều kiện của Google: trang chính sách đổi trả và giao hàng công khai, thông tin liên hệ, giá và tồn kho trên trang khớp với dữ liệu gửi lên. Vì vậy phải chờ chính sách được duyệt. Tài liệu: `docs/integrations/22-merchant-delivery.md`, `docs/integrations/28-merchant-send-fence.md`.

## FT-06 — Đánh giá

Đã có: đánh giá theo sản phẩm, điểm trung bình (`apps/api/src/reviews`, `TraditionalProductReviews.tsx`). Chưa có đánh giá nào trên site thật. Thêm: thư nhắc đánh giá vài ngày sau khi đơn chuyển sang đã giao, kèm link thẳng tới form; cho đính ảnh. Chỉ khai `aggregateRating` trong dữ liệu cấu trúc từ đánh giá thật.

Lưu ý bảo mật nếu cho khách tải ảnh: hiện mọi đường tải ảnh đều yêu cầu ADMIN, và `sharp` ở API đang ở bản có cảnh báo (CK-04). Cho khách tải ảnh là mở đường dữ liệu không tin cậy vào `sharp`; nâng `sharp` trước, giới hạn định dạng và dung lượng.

## FT-07 — Set quà

Danh mục `qua-tang` trống. Cần chủ shop quyết định sản phẩm, giá, hộp. Phần code có thể cần: sản phẩm dạng combo, lựa chọn gói quà và lời nhắn ở checkout. Kiểm tra mô hình sản phẩm hiện tại (biến thể, `featured_section`) đã đủ chưa trước khi thêm bảng mới.

## FT-08 — Mua lại

Ở trang đơn hàng của tài khoản và trong email xác nhận: nút "Mua lại đơn này" đưa đúng các món vào giỏ. Kiểm tồn kho và giá hiện tại khi thêm, không dùng giá cũ.

---

## Không đề xuất lúc này

- **Ứng dụng di động, chương trình tích điểm, đại lý nhiều cấp:** quá sớm khi chưa có đơn đầu tiên.
- **Thêm cổng thanh toán:** COD và chuyển khoản SePay đủ cho giai đoạn đầu.
- **Popup, đồng hồ đếm ngược, "còn 2 sản phẩm" giả:** trái với giọng thương hiệu và với nguyên tắc không tự tạo cam kết trong `docs/commerce-ux-seo.md`.
