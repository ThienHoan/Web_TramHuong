# Đặt hàng nguyên khối và chống tạo đơn trùng

Cập nhật 06/11/2026. Trạng thái: **code và kiểm thử xong; đã cài lên project Supabase thử nghiệm**
(owner chạy `verify-installed-checkout.sql` ngày 06/11: 4/4 `PASS`). Đơn thử qua code API thật
trên project này ngày 06/11 (`pnpm smoke:hosted-order`, owner cho phép): 8/8 `PASS`, 10 request,
1 đơn tạo rồi hủy, kho trở về như cũ. Chưa deploy code mới.

> Project thử nghiệm này cũng là project mà web production lấy ảnh sản phẩm
> (`apps/web/next.config.ts`). Nếu chính project này sẽ thành production thì migration đã có
> sẵn ở đó; nếu tạo project production riêng thì phải cài lại toàn bộ migration ở project mới.

## Đã sửa gì

Trước đây, tạo đơn, trừ tồn kho và cộng lượt dùng voucher là các lệnh riêng lẻ:

- Hai khách cùng mua món cuối cùng có thể đều đặt được, khiến kho bị âm.
- Voucher chỉ còn 1 lượt vẫn có thể bị dùng 2 lần, vì số đếm được cập nhật từ giá trị đã đọc trước đó.
- Nếu lỗi xảy ra giữa chừng, đơn đã tạo nhưng kho chưa bị trừ.
- Bấm "Đặt hàng" 2 lần, hoặc mất mạng rồi bấm lại, sẽ tạo 2 đơn.

Bây giờ toàn bộ việc tạo đơn nằm trong **một giao dịch** của hàm DB `checkout_create_order`:

1. Khóa các sản phẩm theo thứ tự UUID, nên hai giỏ đảo thứ tự không bị kẹt khóa (deadlock).
2. Khóa voucher.
3. Kiểm tra lại giá, khuyến mãi và voucher. Nếu có báo giá giao hàng thì so với bản báo giá đã lưu, kể cả chủ sở hữu và hạn dùng.
4. Tạo đơn, trừ kho và cộng lượt voucher.

Lỗi ở bất kỳ bước nào thì **mọi thứ được hoàn tác**: không có đơn, kho và voucher giữ nguyên.

Chống trùng hoạt động như sau:

- Mỗi lần đặt hàng mang một `idempotencyKey`.
- Web tạo khóa này theo "ý định mua": giỏ hàng, người nhận, phương thức thanh toán, voucher và người mua. Khóa được lưu trong `sessionStorage` cho đến khi API xác nhận đơn.
- Gửi lại cùng khóa thì nhận lại **đúng đơn cũ**, kể cả khi hàng đã hết hoặc báo giá đã hết hạn sau đó.
- Cùng khóa nhưng nội dung khác thì bị từ chối (409 `CHECKOUT_KEY_CONFLICT`).
- Khi khách bắt đầu một lần thanh toán mới, các khóa của đơn đã xác nhận bị xóa. Nhờ vậy khách vẫn mua lại cùng giỏ được.

## Thành phần

| Phần | File |
|---|---|
| Hàm DB và bảng chống trùng | `apps/api/migrations/checkout-atomic.sql` |
| Tạm dừng nhận đơn | `apps/api/migrations/checkout-atomic.pause.sql` |
| Kiểm tra cài đặt (chỉ đọc) | `docs/checkout/verify-installed-checkout.sql` |
| Tính dấu vân tay ý định mua | `apps/api/src/orders/checkout-intent.ts` |
| Gọi hàm DB, đổi lỗi DB thành mã lỗi | `apps/api/src/orders/checkout.repository.ts` |
| Luồng tạo đơn | `apps/api/src/orders/orders.service.ts` (`create`) |
| Khóa phía web và thông báo lỗi | `apps/web/src/lib/checkout-attempt.ts`, `apps/web/src/services/order-service.ts` |

Bảng `checkout_requests` và hai hàm chỉ backend (`service_role`) dùng được. Trình duyệt và khóa anon không gọi được.

## Mã lỗi khách có thể gặp

| Mã | HTTP | Ý nghĩa |
|---|---|---|
| `CHECKOUT_OUT_OF_STOCK` | 409 | Không đủ hàng, vì người khác vừa mua trước |
| `CHECKOUT_PRODUCT_UNAVAILABLE` | 409 | Sản phẩm đã ngừng bán |
| `CHECKOUT_PRICE_CHANGED` | 409 | Giá, khuyến mãi hoặc phí giao hàng vừa đổi |
| `CHECKOUT_VOUCHER_UNAVAILABLE` | 409 | Voucher hết hạn hoặc hết lượt |
| `SHIPPING_QUOTE_CHANGED` | 409 | Báo giá giao hàng không còn khớp |
| `CHECKOUT_KEY_CONFLICT` | 409 | Cùng khóa nhưng nội dung khác |
| `CHECKOUT_DATABASE_NOT_READY` | 503 | Chưa cài migration hoặc đang tạm dừng |
| `CHECKOUT_RESULT_UNKNOWN` | 500/503 | Chưa rõ kết quả. Bấm lại với cùng thông tin là an toàn |

Web hiển thị các mã này bằng câu tiếng Việt hoặc tiếng Anh.

## Kiểm thử (06/11/2026)

| Lệnh | Kết quả |
|---|---|
| `apps/api`: `pnpm test:checkout` | Jest 5 bộ, 44 ca; DB trong bộ nhớ (PGlite) 10 ca: PASS |
| `apps/api`: `pnpm test:checkout-concurrency` | PostgreSQL 17 thật, 2 kết nối độc lập: 4 kịch bản PASS |
| `apps/web`: `pnpm test:checkout` | 5 ca PASS (khóa theo ý định, bấm 2 lần, mất mạng, lưu trữ lỗi) |
| Toàn bộ Jest API | 71 bộ, 1098 ca PASS |
| `verify-installed-checkout.sql` trên DB trong bộ nhớ | 6 ca PASS: chưa cài, đã cài, tạm dừng và 3 kiểu sai quyền |

Bốn kịch bản chạy trên PostgreSQL thật:

- Hai khách tranh món cuối: chỉ một đơn, và quan sát được kết nối thứ hai phải chờ khóa.
- Cùng một khóa gửi song song: chỉ một đơn được ghi.
- Voucher lượt cuối dùng cho hai giỏ khác nhau: chỉ một lần dùng được ghi nhận.
- Hai giỏ đảo thứ tự sản phẩm: không bị kẹt khóa.

Để chắc bài kiểm thử thật sự bắt được lỗi, tôi đã thử cố ý làm hỏng code (mutation test):

- Bỏ khóa voucher: bài kiểm thử báo lỗi vì voucher bị dùng 2 lần.
- Bỏ khóa sản phẩm và điều kiện trừ kho: bài kiểm thử báo lỗi vì bán quá số hàng còn.

Kiểm thử trên PostgreSQL thật cần Docker Desktop đang chạy và có sẵn image `postgres:17-alpine`. Thêm `--allow-image-pull` nếu muốn tải image. Container tạm không có mạng, không mở cổng và tự xóa sau khi chạy. Bài kiểm thử không đọc `.env` và không ghi vào DB nào khác.

**Chưa chạy:**

- Bộ kiểm thử giao diện trình duyệt `apps/web/scripts/verify-shipping-ui.cjs`. Bộ này kiểm tra từng trường của payload, nên trường mới `idempotencyKey` không làm nó hỏng, nhưng vẫn cần chạy lại trước khi phát hành.
- Đơn thử trên project thử nghiệm: đã chạy 06/11, 8/8 `PASS` (xem đầu trang).
  Script: `apps/api`: `pnpm smoke:hosted-order` (chạy không cờ thì chỉ in kế hoạch).
  Nó đặt 1 đơn COD khách vãng lai, gửi lại cùng khóa, thử khóa trùng với địa chỉ khác, rồi hủy
  mọi đơn đã tạo để trả kho (khoảng 11 request, tối đa 16). Đã kiểm thử offline 4 ca, gồm ca DB mất
  chống trùng: script báo FAIL và vẫn hủy hết đơn, kho về như cũ.

## Thứ tự triển khai (bắt buộc)

1. **DB TEST trước.** Nếu chưa có `admin-order-integrity.sql` thì chạy file đó trước, sau đó chạy `checkout-atomic.sql`. Tiếp theo chạy `docs/checkout/verify-installed-checkout.sql`; phải ra 4 dòng `PASS`.
2. **Deploy API và web cùng lúc.**
   - Web mới gửi `idempotencyKey`, mà API cũ từ chối trường lạ.
   - API mới bắt buộc có khóa, nên web cũ sẽ bị từ chối.
   - Tab trình duyệt mở từ trước khi deploy sẽ báo lỗi một lần; khách tải lại trang là được.
3. **Không deploy API mới trước khi DB có hàm.** Nếu làm vậy, mọi đơn sẽ báo `CHECKOUT_DATABASE_NOT_READY`.
4. **Production** chỉ làm sau khi bản TEST chạy ổn: cài migration trước, deploy sau.

Migration không có `IF NOT EXISTS`. Chạy lần hai sẽ báo lỗi và tự hủy toàn bộ trong giao dịch, không làm hỏng gì.

## Tạm dừng và quay lại

- **Tạm dừng:** chạy `checkout-atomic.pause.sql`.
  - API trả 503 `CHECKOUT_DATABASE_NOT_READY`, và web báo "Dịch vụ đặt hàng đang được cập nhật".
  - Tra lại đơn đã tạo vẫn hoạt động.
  - **Tạm dừng nghĩa là ngừng nhận đơn mới.**
- **Bật lại:**
  ```sql
  GRANT EXECUTE ON FUNCTION public.checkout_create_order(uuid,uuid,text,jsonb,jsonb,text,text,numeric,numeric,numeric,jsonb) TO service_role;
  ```
- **Quay về code cũ:** deploy lại bản API và web trước đó, chỉ khi không còn đơn mới nào đang xử lý. Giữ nguyên bảng `checkout_requests`, đừng xóa, vì đó là lịch sử chống trùng.

## Giới hạn còn lại

- Tồn kho vẫn tính theo sản phẩm. Các biến thể dùng chung kho, giống như trước.
- Báo giá GHN vẫn được tính lại bằng một lời gọi mạng **trước** giao dịch, để không giữ khóa trong lúc chờ mạng. Bên trong giao dịch chỉ so với bản báo giá đã lưu.
- Kiểu dữ liệu thật của `orders.status` và `payment_method` trên DB có thể khác DB kiểm thử. Đó là lý do phải chạy trên DB TEST trước.
