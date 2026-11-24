# FT-06 — Nhắc đánh giá sau đơn hoàn thành

Phần email đã có code, **mặc định tắt**, chưa chạy migration hay gửi thư trên database thật.
Ảnh đánh giá chưa mở vì API vẫn phải dùng sharp 0.34.5 trên CPU máy chủ hiện tại.

## Cách hoạt động

- Migration `apps/api/migrations/review-reminders.sql` ghi đúng một lịch hẹn khi đơn chuyển sang `COMPLETED`; chờ **3 ngày**. Không lấy `updated_at` làm ngày giao và không gửi bù đơn cũ.
- Chỉ áp dụng đơn có tài khoản: API đánh giá hiện yêu cầu đăng nhập và xác minh đã mua. Đơn khách vãng lai chưa có luồng xác minh đánh giá riêng.
- Worker kiểm tra mỗi 30 phút, tối đa 20 đơn/lượt. Trước khi gửi, kiểm lại trạng thái đơn, email và những sản phẩm khách chưa đánh giá. Bỏ qua đơn hủy, sản phẩm ngừng bán và sản phẩm đã đánh giá.
- Link mở thẳng biểu mẫu đánh giá trên sản phẩm. Nội dung xin cảm nhận thật, không thưởng cho đánh giá tích cực.
- `ACCEPTED` chỉ có nghĩa nhà cung cấp email nhận yêu cầu. SMTP không rõ kết quả chuyển `UNKNOWN`, **không tự gửi lại**. Claim chưa được phép gửi có thể được worker khác nhận lại sau 10 phút; token cũ không thể gửi.
- Bảng/RPC chỉ dành cho service role. Worker không ghi email hoặc lỗi thô vào log.

## Trước khi bật

1. Áp migration trên **database thử** trước. Chạy `cd apps/api && npm run test:review-reminders`.
2. Dùng đơn tài khoản và email của người thử, chuyển `COMPLETED`. Trên database thử có thể đặt `due_at` của đúng đơn thử về quá khứ để không phải đợi ba ngày.
3. Xác nhận `FRONTEND_URL` trỏ đúng web và SMTP đã cấu hình. Kiểm tra nội dung thư, link, trạng thái hàng đợi và việc không gửi lại.
4. Sau khi kiểm thử, áp migration lên database đích và đặt `FEATURE_REVIEW_REMINDERS_ENABLED=true` khi muốn bắt đầu. `INTEGRATIONS_KILL_SWITCH=true` dừng worker.
5. Để tạm dừng: đặt cờ về `false`. Không đổi `UNKNOWN` thành `PENDING` nếu chưa kiểm tra nhà cung cấp xem thư đã được nhận hay chưa.

## Ảnh đánh giá

Chưa thêm endpoint tải ảnh cho khách. Cần nâng sharp lên bản đã vá và kiểm tra Docker/CPU đích trước, rồi mới thêm giới hạn MIME, kích thước, pixel, quyền sở hữu và lưu trữ ảnh đánh giá. Không bỏ giới hạn ADMIN của endpoint tải ảnh sản phẩm hiện tại để dùng tạm.
