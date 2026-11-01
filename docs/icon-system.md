# Hệ thống icon

Icon chức năng dùng `lucide-react`, nét mặc định 1.65 và màu `currentColor`. Ưu tiên kích thước 18, 20 hoặc 24px, tùy vị trí. Không cần thêm thư viện hoặc kết nối Icons8.

## Cách dùng

- Thành phần mới: import trực tiếp icon Lucide cần dùng.
- Thành phần đã chuyển từ Material Symbols: dùng `AppIcon` tại `apps/web/src/components/icons/AppIcon.tsx`. Bảng tên tương thích giữ nguyên các giá trị trạng thái và cấu hình cũ; bổ sung ánh xạ tại đây khi cần.
- Biểu tượng thương hiệu: `LotusIcon`, `AgarwoodIcon`, `IncenseBurnerIcon`, `IncenseConeIcon` tại `BrandIcons.tsx`. Đây là SVG riêng của dự án, dùng cho hoa sen, miếng trầm, lư hương và nụ trầm.

```tsx
<ShoppingBag size={20} aria-hidden="true" />
<AppIcon name="local_shipping" className="text-xl" />
<IncenseBurnerIcon size={24} aria-hidden="true" />
```

Icon trang trí cần `aria-hidden="true"`. Nút chỉ có icon cần `aria-label` mô tả hành động trên chính nút. Các nút bật/tắt như yêu thích cần trạng thái `aria-pressed` khi phù hợp.

## Font cũ

CSS không còn khai báo hoặc tải Material Symbols. Tệp font cũ vẫn được giữ trong `public/fonts/material-icons/` nhưng giao diện không sử dụng. Không thêm lại các span `material-symbols-outlined`.

## Kiểm tra

Đã kiểm tra TypeScript, ESLint các thành phần thay đổi, giao diện desktop/mobile, menu, giỏ hàng, hiện/ẩn mật khẩu và các trang Việt/Anh. Kiểm tra trình duyệt không ghi nhận yêu cầu tải font Material Symbols hoặc lỗi JavaScript ở các trang được kiểm tra.
