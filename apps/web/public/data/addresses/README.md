# Địa chỉ hành chính hai cấp

Nguồn: https://provinces.open-api.vn/api/v2/?depth=2 (bản v2, sau sáp nhập 07/2025).
Chụp ngày 10/11/2026. Thống kê ở `v2/manifest.json`. Các mã giữ nguyên từ nguồn.

`provinces.json` chỉ gồm tỉnh/thành; `{code}.json` gồm phường/xã của tỉnh đó.
Checkout chỉ tải file cần dùng, không gọi dịch vụ bên ngoài. Không tự chuyển đổi
địa chỉ cũ của khách. Khách có thể nhập tay nếu danh sách thiếu hoặc không tải được.

Cập nhật: `node scripts/update-address-snapshot.mjs`; kiểm lại thay đổi dữ liệu
trước khi triển khai. Không chạy tự động khi build hoặc khi khách mở trang.
