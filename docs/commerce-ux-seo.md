# Thiên Phúc — UX mua hàng và SEO

Phạm vi: hai ngôn ngữ, trang chủ → danh mục → chi tiết → giỏ hàng → checkout. Phong cách giữ nền giấy, xanh trầm, chữ serif và góc bo có phân cấp. Nghiên cứu tham chiếu ngày 09/11/2026; đây là giả thuyết thiết kế dựa trên nghiên cứu thương mại điện tử và mã hiện có, chưa phải kết quả phỏng vấn hay A/B test khách của Thiên Phúc.

## Khách cần biết gì, ở đâu?

| Thời điểm | Câu hỏi của khách | Cách triển khai |
| --- | --- | --- |
| Vào trang chủ | Cửa hàng bán gì? Tôi bắt đầu chọn ở đâu? | Mô tả rõ, CTA vào sản phẩm, tìm kiếm và danh mục thật; sản phẩm có giá xuất hiện trước các phần kể chuyện dài. |
| Xem danh mục | Có món hợp nhu cầu/ngân sách không? | Tên danh mục cụ thể, tìm không dấu, giá theo phân loại, lọc ngân sách theo giá sau ưu đãi, sắp xếp và trạng thái rỗng có đường đi tiếp. |
| Xem chi tiết | Hình dáng, phân loại, giá, thông số ra sao? | Ảnh không bị cắt, thumbnail/phóng to, giá VND thực trả, phân loại rõ, thông số có thật gần nút mua, đánh giá từ dữ liệu API. |
| Chuẩn bị mua | Còn hàng không? Phí giao hàng? Đổi trả thế nào? | Kiểm tra lượng tồn dùng chung, tính cả sản phẩm trong giỏ; giải thích phí/tổng ở checkout, liên kết chính sách và tư vấn trực tiếp. |
| Đã quyết định | Làm sao mua nhanh, có bắt đăng ký không? | Mua ngay thêm đúng phân loại vào giỏ rồi sang checkout; thêm vào giỏ có đường thanh toán; khách vãng lai; thanh mua trên mobile khi đã cuộn qua phần mua. |
| Thanh toán | Tôi đang đặt những gì, còn bước nào? | Giữ checkout hai bước đang có, xem lại đơn/chi phí/phương thức, tự điền thông tin và báo lỗi tại trường; không tạo đơn hoặc gửi thông tin khách trong kiểm tra UI. |

## Cơ sở nghiên cứu

- [Baymard — Product Page UX](https://baymard.com/research-articles/current-state-ecommerce-product-page-ux): ảnh cần đủ khả năng quan sát; thông tin giao hàng và chi phí nên tìm được gần khu mua; chính sách hỗ trợ quyết định. Áp dụng bằng nội dung và liên kết thật; không tự đặt phí hay thời hạn đổi trả.
- [Baymard — Checkout form fields](https://baymard.com/research-articles/checkout-flow-average-form-fields): giảm công sức nhập liệu và giữ luồng dễ hiểu. Dự án đã hỗ trợ guest checkout và autocomplete; giữ các cơ chế đó, giải thích từ trước khi khách vào checkout.
- [Google — Cấu trúc website thương mại điện tử](https://developers.google.com/search/docs/specialty/ecommerce/help-google-understand-your-ecommerce-site-structure): liên kết có thể thu thập từ trang chủ đến danh mục và sản phẩm. Triển khai các trang `/products/category/[category]`, liên kết HTML thật, sitemap theo toàn bộ phân trang API.
- [Google — Phân trang](https://developers.google.com/search/docs/specialty/ecommerce/pagination-and-incremental-page-loading): trang phân trang có URL/canonical riêng; hạn chế lập chỉ mục biến thể lọc/sắp xếp trùng lặp. Trang danh mục chính được index; tìm kiếm và tổ hợp lọc dùng `noindex, follow`.
- [Google — Product structured data](https://developers.google.com/search/docs/appearance/structured-data/product-snippet): markup mô tả đúng nội dung công khai. Giá/đồng tiền/tình trạng/rating khớp giao diện; URL variant chọn được đúng phân loại. Không khai shipping/return mặc định hoặc sao đánh giá khi chưa có.
- [Google — Core Web Vitals](https://web.dev/articles/defining-core-web-vitals-thresholds): mục tiêu theo dữ liệu người dùng thật ở p75: LCP ≤ 2,5s, INP ≤ 200ms, CLS ≤ 0,1. Kiểm tra dev không thay thế dữ liệu thực địa.

## Thay đổi kỹ thuật phục vụ trải nghiệm

- Một danh mục và một trang sản phẩm cho cả VI/EN; `/products/catalog` chuyển hướng vĩnh viễn và giữ bộ lọc cũ.
- Query được kiểm tra trước khi gửi API; không truyền NaN, ngân sách âm, page âm. Ngân sách đảo được chuẩn hóa.
- Với tìm kiếm/ngân sách/sắp xếp giá, đọc các trang API có cache rồi đối chiếu tên không dấu và giá của từng phân loại. Danh mục lớn nên chuyển phép đối chiếu này xuống chỉ mục tìm kiếm/SQL ở backend; cần đo dữ liệu thật trước khi chọn công cụ.
- Giá VND đồng nhất với thanh toán; bỏ tỷ giá USD cố định trước đây.
- Bỏ preload font phụ, bỏ opacity ban đầu của toàn trang và ảnh; giữ đầy đủ hành trình tương tác, vòng trầm tách hạt, bộ sưu tập và ba cảnh 3D trên trang chủ. Sản phẩm/tìm kiếm ở phía trước; các trải nghiệm giữ tải cảnh theo vùng xem và có đường sang danh mục sản phẩm thật.
- Giữ tracking đã có và chính sách đồng ý hiện tại. Không bật thêm thu thập hoặc gửi dữ liệu người dùng.

## Xác minh và đo tiếp

Kiểm tra tự động: stock variant cũ, giới hạn tồn dùng chung, giá có lịch ưu đãi, lọc và phân trang, tìm không dấu, markup giá/URL/currency/rating, JSON-LD an toàn. Chạy lại kiểm tra checkout idempotency và analytics.

Kiểm tra trực quan ở desktop/mobile: trang chủ, danh mục, tìm có/không có kết quả, lựa chọn và giá variant, đánh giá, mua ngay đến checkout khách, quay lại giỏ. Không gửi đơn thật.

Theo dõi funnel sau triển khai bằng cấu hình analytics được chủ cửa hàng cho phép: xem danh mục → xem sản phẩm → thêm giỏ → bắt đầu thanh toán → mua thành công. Chỉ đo doanh thu từ đơn được xác nhận, không từ click Mua ngay. So sánh theo thiết bị, nguồn truy cập và ngôn ngữ; giữ khoảng thời gian và lượng truy cập đủ để đánh giá thay đổi. Chưa có số liệu để khẳng định tăng tỷ lệ chuyển đổi hoặc thứ hạng.

## Nội dung cần cửa hàng hoàn thiện

Dữ liệu hiện tại có ảnh/mô tả thử nghiệm. Cần ảnh đúng sản phẩm, kích thước/quy cách, vật liệu, mùi hương và hướng dẫn sử dụng có căn cứ. Không thay ảnh bằng hình dựng rồi coi là ảnh thật. Các policy đang mang phiên bản `.draft`; cần chủ cửa hàng chốt phí, phạm vi giao hàng, thời gian và điều kiện đổi trả trước khi kinh doanh chính thức. Giao diện/SEO không tự tạo cam kết này.

## Tận dụng trải nghiệm đã có

Giữ các UI và tính năng đã được chọn: băng chuyền bộ sưu tập, hành trình ba cách thưởng trầm, vòng trầm tách hạt theo cuộn và phòng trải nghiệm ba chế độ. Không thay các khối này bằng một liên kết đơn. CTA của từng trải nghiệm lấy từ danh mục đang hoạt động; nếu chưa có nhóm tương ứng thì dẫn về danh mục chung hoặc tư vấn, không tự tạo nhóm sản phẩm. Ảnh tĩnh dự phòng, điều khiển bàn phím/mobile và giảm chuyển động tiếp tục hoạt động.

Tái sử dụng cửa sổ xem nhanh của trang chủ trong thẻ sản phẩm dùng chung, có cả VI/EN. Khách có thể đổi phân loại và thêm giỏ từ danh sách; giá, khóa phân loại và giới hạn tồn kho dùng cùng quy tắc với trang chi tiết.

`/vi/products` mặc định giữ trang cuộn ba chương Thượng Hạng / An Yên / Tâm Giao: thanh chuyển chương, phần giới thiệu, ảnh ngắt nhịp, nghi thức và khối quà tặng. Tìm kiếm/ngân sách nằm trong mục mở rộng ở đầu trang; danh sách đầy đủ, kết quả lọc, trang danh mục và phân trang vẫn dùng chung `ShopCatalog`. Có liên kết quay lại trang bộ sưu tập. Phân nhóm ưu tiên `featured_section` đã chọn trong quản trị; sản phẩm chưa xếp chương vẫn được hiển thị, không loại chỉ vì giá thấp. Giữ ảnh thật, xem nhanh và nút yêu thích trên thẻ sản phẩm. Ảnh biên tập chỉ minh họa không gian, không thay cho ảnh sản phẩm.
