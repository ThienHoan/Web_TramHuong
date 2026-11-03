# Nhập Excel sản phẩm và danh mục

## Cấu hình một lần

Chạy toàn bộ `apps/api/migrations/admin-catalog-import.sql` trong Supabase SQL Editor. File tạo hàm nhập và bảng biên nhận chống nhập trùng khi thử lại; chỉ service_role được gọi/đọc. Cấu trúc sản phẩm, danh mục và bản dịch hiện có được giữ nguyên. Preview gọi hàm với resource cố ý không hợp lệ để xác minh cấu hình, không ghi dữ liệu. Nút xác nhận bị khóa khi chưa xác minh được hàm.

Không cần gói Supabase Image Transformations trả phí. Bucket `product-images` hiện tại đã được kiểm tra chỉ đọc: public, không giới hạn MIME riêng. Backend dùng Sharp để lưu WebP chính tối đa 1600px và ảnh thu nhỏ tối đa 480px, xoay theo EXIF và bỏ metadata. Tên UUID mới tránh cache ảnh cũ; cache-control một năm. Ảnh tối ưu sẵn từ đúng bucket được tái sử dụng sau khi tải kiểm tra. Thumbnail được dùng ở bảng sản phẩm admin. File còn được sản phẩm tham chiếu sẽ không bị xóa vật lý khi gỡ ảnh trong editor, tránh làm hỏng ảnh dùng chung. Luồng upload trực tiếp và multipart sửa sản phẩm cũng dùng bộ tối ưu này.

## Cách sử dụng

1. Đăng nhập ADMIN, mở Sản phẩm hoặc Danh mục → Nhập Excel.
2. Tải file mẫu mới, đọc sheet Huong dan. Mẫu lấy danh mục hiện tại từ website, gồm sheet Danh muc hien co. Với sản phẩm, chọn tên danh mục trong danh sách thả xuống của cột danh_muc_slug; mã trong [ ] được dùng khi nhập.
3. Điền dữ liệu vào sheet San pham hoặc Danh muc. Xóa/thay dòng ví dụ.
4. Sản phẩm: điền tên ảnh vào anh_1 … anh_5 rồi chọn các file tương ứng từ máy/điện thoại; hoặc điền link ảnh HTTPS công khai.
5. Chọn bỏ qua (mặc định) hoặc cập nhật bản ghi trùng slug. Bấm Kiểm tra & xem trước.
6. Sửa các dòng báo lỗi, chọn lại file rồi kiểm tra lại. Có thể nhập riêng những dòng hợp lệ; dòng lỗi/skip không được gửi ghi dữ liệu.
7. Xác nhận nhập. Theo dõi tiến độ; có thể dừng sau dòng đang xử lý. Thử lại chỉ gửi các dòng lỗi/chưa xử lý với cùng request ID, không gửi lại dòng đã thành công.

Mỗi dòng được lưu độc lập trong một transaction: bản ghi gốc, hai bản dịch, biên nhận retry. Một dòng lỗi không hoàn tác những dòng khác đã nhập thành công. Trong trường hợp mạng mất sau khi server có thể đã commit, ảnh được giữ lại để tránh xóa ảnh đang được sản phẩm sử dụng; retry kiểm tra biên nhận trước khi upload lại.

## Cột và quy tắc

Sản phẩm: `slug`, `ten_san_pham`, `danh_muc_slug`, `gia`, `so_luong`, `mo_ta`, `anh_1` … `anh_5`, `ten_tieng_anh`, `mo_ta_tieng_anh`.
Danh mục: `slug`, `ten_danh_muc`, `mo_ta`, `ten_tieng_anh`, `mo_ta_tieng_anh`.

- Tối đa 200 dòng và 2 MB mỗi workbook .xlsx; ảnh tải từ máy tối đa 1.000 tên file mỗi lần, mỗi sản phẩm tối đa 5 ảnh, mỗi ảnh tối đa 5 MB.
- Giá bằng VND: nhập số 850000 hoặc số Excel, không nhập chuỗi 850.000/850,000. Tồn kho là số nguyên không âm.
- Slug duy nhất; khi tạo mới có thể để trống để tự tạo từ tên. Khi cập nhật, giữ đúng slug cũ để nhận diện bản ghi. Slug trùng trong cùng file là lỗi. Đối chiếu ảnh theo tên không phân biệt hoa thường, có xử lý tên file tiếng Việt multipart.
- Khi tạo mới, tên tiếng Anh trống lấy tên tiếng Việt. Khi cập nhật, tên tiếng Anh/mô tả/ảnh trống giữ giá trị cũ. Tên tiếng Việt, giá, tồn kho, danh mục lấy theo dòng mới. Không sửa biến thể, SEO, trạng thái hiển thị hoặc những trường không có trong mẫu.
- Danh sách danh mục là ảnh chụp dữ liệu tại thời điểm tải mẫu; tải lại mẫu sau khi thêm/đổi danh mục. Nếu website chưa có danh mục, thêm hoặc nhập danh mục trước. File cũ gõ slug thủ công vẫn được hỗ trợ; danh mục đã đổi hoặc xóa sẽ báo lỗi khi preview.
- Sản phẩm mới cần ảnh. File không đọc ảnh được dán nổi trong worksheet, không nhận công thức hoặc .xls cũ; lưu .xlsx và dán giá trị. HEIC phải chuyển sang JPEG/PNG/WebP/AVIF trước.

## Link ảnh

Link phải trả về file ảnh tải được. Google Drive hỗ trợ link từng file có quyền tải công khai, có giữ resource key. Thư mục Drive, file riêng tư, trang yêu cầu đăng nhập, trang HTML/confirm download sẽ báo lỗi để người dùng chọn file trực tiếp. Tính năng không tự cấp quyền Drive từ phiên đăng nhập Google và không dùng credentials của website để tải ảnh.

Backend kiểm tra HTTPS, chặn địa chỉ mạng nội bộ, ghim DNS khi kết nối TLS, kiểm tra từng redirect, giới hạn kích thước/thời gian và giải mã ảnh thật trước khi lưu. Không chuyển tiếp Cookie/Authorization đến link nguồn.

## Kiểm thử

102 kiểm thử backend và 11 kiểm tra PostgreSQL trong bộ nhớ đã đạt.

- Kiểm thử đơn vị/tích hợp HTTP với dữ liệu giả cho parser Excel, công thức, file nén quá lớn, số/slug, tên file tiếng Việt, quyền ADMIN, multipart, receipt/retry, rollback/cleanup và SSRF.
- `node scripts/verify-catalog-import-sql.cjs`: PostgreSQL PGlite trong bộ nhớ kiểm tra migration, tạo/cập nhật/skip/replay, giữ ảnh/mô tả/biến thể, rollback bản dịch lỗi và quyền hàm/bảng. Không kết nối database thật.
- UI Chromium riêng giả lập mọi API: tải mẫu, chọn Excel/ảnh, preview có lỗi, bỏ qua dòng không hợp lệ, retry dùng cùng request ID, giới hạn modal desktop/mobile và khóa xác nhận khi thiếu cấu hình.
- Đã tải thử chỉ đọc một ảnh công khai hiện có qua bộ tải mới và kiểm tra cấu hình bucket. Không nhập dữ liệu hoặc upload ảnh lên Supabase trong kiểm thử.
