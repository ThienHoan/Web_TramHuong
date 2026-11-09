# Thiên Phúc — Xưởng trầm đương đại

Phạm vi: hệ thống UI cửa hàng, tài khoản, mua hàng và quản trị. Giữ thương hiệu, dữ liệu, điều hướng và các tương tác hiện có.

Hướng thiết kế được chọn từ ngữ cảnh: chất giấy ấm, mực nâu, xanh rêu và đồng; chữ serif ở tiêu đề, sans ở nội dung và biểu mẫu. Dùng ảnh sản phẩm đã có. Bỏ các motif trang trí lặp, bóng dày và đánh giá giả. Header và footer trở thành điểm nhận diện chung.

Nhịp trải nghiệm: trang chủ mở thoáng → bộ sưu tập cho phép chọn → câu chuyện chậm → trải nghiệm 3D là điểm nhấn → sản phẩm và tư vấn là hành động kết thúc. Giữ các hiệu ứng chiều sâu hiện có và hỗ trợ giảm chuyển động. Mobile có khoảng cách, cỡ chữ và điều hướng riêng.

Các trang giao dịch ưu tiên khả năng đọc, nhãn trường, trạng thái tương tác và vùng chạm. Quản trị dùng sidebar trên desktop, điều hướng cuộn ngang trên mobile. Thay đổi hình ảnh không thay thế kiểm tra phân quyền ở API.

## Triển khai và xác minh

- Token màu dùng chung trong `globals.css`; phong cách và layout có phạm vi trong `atelier.css`.
- Dựng lại footer, bố cục đăng nhập, phần mở đầu bộ sưu tập, thẻ sản phẩm và khung quản trị. Thêm điều hướng tài khoản, đồng bộ form và các thành phần dùng chung.
- Không hiển thị đánh giá 5 sao cố định trên thẻ sản phẩm. Thay ô nhận tin chưa có xử lý bằng đường liên hệ hoạt động.
- Kiểm tra 8 trang công khai tại 1440px/390px: trang chủ Việt/Anh, sản phẩm, danh mục đầy đủ, đăng nhập, liên hệ, tra cứu đơn, blog. Không tràn ngang, ảnh hỏng hoặc pageerror.
- Kiểm tra tương tác: menu mobile, giỏ hàng và Escape/focus, xem nhanh, thêm biến thể vào giỏ khách, đổi số lượng/xóa, link thanh toán, lightbox sản phẩm, reduced-motion và cuộn cảm ứng.
- Các trang có đăng nhập như quản trị/tài khoản được kiểm tra mã và TypeScript, chưa xác minh trực quan bằng phiên tài khoản có quyền. Ảnh sản phẩm vẫn lấy từ dữ liệu đã lưu.

## Lớp giao diện dùng chung cho khách

Ô nhập, nút gửi và tiêu đề trên mọi trang khách lấy kiểu từ cuối phần chung trong `atelier.css`, nên hai ngôn ngữ luôn giống nhau. Thêm `data-bare` khi ô nhập hoặc nút nằm trong một control có kiểu riêng. Nút ngoài form dùng `.shop-btn` và `.shop-btn-secondary`; trang giao dịch dùng `.shop-page`, `.shop-card`, `.shop-field`, `.shop-status`.

Trang dùng chung hai ngôn ngữ lấy `ShopHeader`/`ShopFooter` (`components/layout/ShopChrome.tsx`) và chữ qua `useBilingual`. Trang chủ, danh mục, sản phẩm và blog vẫn giữ hai bố cục riêng cho Việt và Anh.

## Landing page: hành trình cuộn

- `HomeJourney`: ba câu chuyện chạy ngang theo cuộn dọc ở desktop; nút số và mũi tên điều hướng trực tiếp. Mobile dùng dải vuốt ngang tự nhiên.
- Cảnh vòng trầm dùng Three.js hiện có: cuộn để xoay, tách hạt và chuyển ba phần thông tin. Mobile có nút xoay/tách hạt. Mô hình là minh họa cấu trúc, không phải bản scan sản phẩm.
- GSAP ScrollTrigger chỉ tải cho landing page. MatchMedia và context được dọn khi đổi tuyến; không khóa wheel hoặc touch. Cảnh 3D tải khi gần màn hình, dùng chung cơ chế dừng render khi khuất/ẩn tab.
- Reduced-motion bỏ hành trình sticky và hiển thị toàn bộ thông tin, giữ ảnh tĩnh nếu không dùng WebGL. Nút chat vẫn hoạt động; lời chào tự bật được tắt ở landing page để không che nội dung.

### Bàn khám phá vòng trầm

Phần vòng trầm được bố cục lại trên một mặt nền liên tục: tiêu đề ngang, mô hình lớn bên trái, bảng thông tin và điều khiển bên phải, ba bước khám phá phía dưới. Chế độ studio riêng ẩn nền/sàn/bệ 3D cũ, giữ nguyên các cảnh mặc định của 3D lab. Ba góc gồm tổng thể, cấu trúc tách hạt và cận cảnh.

Điểm tương tác và thanh ba bước đồng bộ với cuộn; có ba sắc gỗ, ánh sáng ấm/tự nhiên và nút ghép lại. Ảnh tham khảo có ghi nguồn, không giả là ảnh sản phẩm của cửa hàng. Trên mobile và reduced-motion, khách dùng các nút để đọc thông tin mà không cần hành trình sticky.

Kiểm tra bằng Chrome tại 2560/1440/1024/390/375px: không tràn ngang; chọn điểm, đổi sắc gỗ/ánh sáng, reset và reduced-motion đạt; không có pageerror. TypeScript và ESLint các thành phần thay đổi đạt.

### Gallery có chiều sâu theo tham khảo Ximitech

Dải ba câu chuyện dùng thẻ trung tâm lớn, hai thẻ bên nghiêng/lùi/tối nhẹ. Tiêu đề, mô tả, số thứ tự và CTA tách khỏi ảnh. GSAP điều khiển một playhead chung với scrub 0.75s; vị trí, chiều sâu, opacity và trạng thái nội dung được tính từ cùng playhead. Các thẻ dùng CSS 3D, giữ bảng màu và tài nguyên Thiên Phúc.

Có lăn chuột, kéo chuột, phím mũi tên và nút chuyển cảnh. Mobile/reduced-motion giữ dải cuộn native và nội dung đầy đủ. Bỏ `data-lenis-prevent` của dải cũ để Lenis nhận wheel trên vùng ảnh desktop. Đã kiểm tra wheel thực tế có trạng thái trung gian và trạng thái ổn định khác nhau, cùng thao tác kéo/nút/bàn phím, responsive và reduced-motion.

### Chữ hiện theo tiến trình đọc

`LandingTextMotion` dùng GSAP SplitText cho các tiêu đề biên tập tĩnh; không chia chữ của form, tiêu đề gallery thay đổi theo state hoặc bảng điều khiển 3D. Từ bắt đầu với opacity 0.14 khi tới vùng 92% chiều cao màn hình, sáng dần lần lượt và về vị trí ở vùng 55%. Các đoạn giới thiệu dịch nhẹ và hiện theo cuộn. Gallery có hiệu ứng xuất hiện từng từ khi đổi cảnh.

SplitText giữ aria-label của tiêu đề; matchMedia hoàn nguyên markup và opacity khi bật reduced-motion hoặc rời trang. Nếu không tải được JavaScript tăng cường, nội dung gốc vẫn hiển thị. Kiểm tra trên trình duyệt cho thấy các từ lần lượt ở opacity 0.14 → các giá trị trung gian khác nhau → 1; không nhân đôi từ khi đổi reduced-motion hoặc đổi viewport.

### Tối ưu khựng khi cuộn vào 3D

Đo bằng Chrome trên localhost với wheel liên tục phát hiện hai long task 814ms/341ms và khoảng frame tối đa khoảng 1154ms khi tới cảnh 3D. Không thấy vòng lặp ResizeObserver liên tục trong kịch bản này.

- Chuyển các map chất liệu procedural sang WebP lossless dựng sẵn trong `public/editorial/materials/`. Tái tạo bằng `node scripts/bake-materials.cjs` khi đứng tại `apps/web`.
- Chỉ tải nhóm chất liệu cần cho từng chế độ. Studio vòng trầm không tạo PMREM/environment và shadow map không sử dụng, dùng pixel ratio tối đa 1.25 và compileAsync trước render đầu.
- Phòng 3D nhúng thứ hai chỉ khởi tạo khi khách bấm mở; cảnh studio chính vẫn chạy theo cuộn. Trang 3D lab độc lập vẫn tự khởi tạo khi tới màn hình.
- Lượt đo sau thay đổi không còn long task ở các đoạn đo; khoảng frame tối đa ở gallery khoảng 77ms. Đây là số đo cục bộ trên dev server, không phải cam kết FPS cho mọi thiết bị.
- Kiểm tra nút mở 3D nhúng, tự mở 3D lab, sắc gỗ/ánh sáng, reset, mobile và reduced-motion đạt; không ghi nhận pageerror.

### Cuộn theo trình duyệt

Đã gỡ Lenis trên toàn website vì cuộn mượt làm trang nặng. Cuộn chuột dùng cơ chế gốc của trình duyệt; các hiệu ứng theo cuộn của GSAP ScrollTrigger vẫn giữ. Thuộc tính `data-lenis-prevent` không còn tác dụng và đã được xóa.

### Nhịp kết thúc cảnh vòng trầm

Tiến trình cuộn có bốn nhịp: toàn cảnh → tách hạt → cận cảnh → lùi camera/ghép vòng. Khoảng 80–97% tiến trình dành cho nhịp kết thúc, để mô hình trở về toàn cảnh trước khi section hết sticky. Bảng thông tin thu nhẹ và hiện lời chuyển tiếp; cuộn ngược khôi phục từng cảnh. Các nút góc nhìn chọn điểm nằm trước nhịp kết thúc nên vẫn có thể dừng để xem cận cảnh.

Giới hạn cuộn căn theo chiều cao thật của stage thay vì chỉ chiều cao viewport, để cửa sổ desktop thấp cũng kết thúc chuyển động trước khi unpin. Không thêm khóa wheel hoặc chặn cuộn; mobile/reduced-motion vẫn dùng các nút và bố cục thông thường.
