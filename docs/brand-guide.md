# Thiên Phúc — nhận diện website

## Nền tảng

Tên chính thức hiển thị: **Thiên Phúc**. Giữ dấu tiếng Việt trong cả giao diện tiếng Anh. Dòng mô tả: **Trầm hương Việt** / **Vietnamese agarwood**.

Câu thương hiệu đề xuất và đang áp dụng: **Hương Việt. Nếp an yên.**

Huế là địa điểm cửa hàng, không phải một tuyên bố rằng mọi sản phẩm đều có xuất xứ từ Huế. Không bổ sung năm thành lập, chứng nhận, giải thưởng hoặc cam kết chất lượng khi chưa có thông tin xác thực.

## Dấu và kiểu chữ

Giữ hình hoa sen hiện có. Mẫu kết hợp dấu và tên dùng chung nằm trong `apps/web/src/components/brand/BrandIdentity.tsx`. Khung vòm, tên serif và dòng mô tả có khoảng cách chữ cố định tạo hình thức thống nhất.

- Bản thường: mực xanh trên nền giấy.
- Bản đảo: chữ giấy và nét đồng trên nền xanh.
- Bản gọn: sidebar/quản trị, không bóp méo hoặc bỏ dấu tiếng Việt.
- Dấu tròn: dấu biên tập “Thiên Phúc / Huế · Việt Nam”, không dùng như chứng nhận.
- Tiêu đề và wordmark dùng serif hiện có của website. Nội dung và biểu mẫu giữ sans hiện có.

## Màu chủ đạo

| Vai | Mã |
| --- | --- |
| Xanh thương hiệu | `#29392f` |
| Đồng nhạt | `#b99b67` |
| Giấy | `#f8f5ee` |
| Mực | `#302e28` |

Giữ khoảng trống quanh dấu ít nhất bằng chiều rộng một cánh sen. Không thêm bóng, glow hoặc xoay logo điều hướng; dấu biên tập trên ảnh được nghiêng nhẹ. Không dùng icon chức năng thay dấu thương hiệu.

## Tài nguyên

Trong `apps/web/public/brand/`:

- `mark.svg`: dấu độc lập cho tab trình duyệt và ứng dụng.
- `wordmark.svg`: bản tên + dấu dạng vector có thể chỉnh sửa; SVG dùng Georgia/Arial nên cần kiểm tra font khi mở trên công cụ thiết kế khác.
- `icon-32.png`, `icon-180.png`, `icon-512.png`: các kích thước cố định.
- `social-card.png`: ảnh chia sẻ 1200 × 630, bản SVG nguồn ở `social-card.svg`.

Tái tạo bằng `node scripts/build-brand-assets.cjs` tại `apps/web`. Tệp favicon ICO và App Router icon được tạo từ cùng dấu; các tài nguyên cũ được giữ nhưng không còn được metadata sử dụng.

## Cách viết

Viết rõ, thân thiện, có nhịp chậm. Ưu tiên thông tin giúp khách chọn phẩm vật và sử dụng trầm. Không dùng các tên thương hiệu khác như Agarwood Zen hoặc tên chung “Tram Huong” thay tên cửa hàng.

Header, footer Việt/Anh, sidebar quản trị và ảnh chia sẻ dùng cùng tên/dấu. Nguồn ảnh tham khảo của đơn vị khác vẫn phải ghi rõ, không biến thành ảnh sản phẩm của Thiên Phúc.
