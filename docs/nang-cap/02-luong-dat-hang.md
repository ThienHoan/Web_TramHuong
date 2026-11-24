# 02 — Luồng đặt hàng

Đã thử trên site thật ở khổ điện thoại 375px ngày 10/11/2026: thêm vào giỏ, mở giỏ, vào form thanh toán bước 1. Phần đó chạy được. **Chưa bấm đặt đơn**, nên bước 2 (chọn giao hàng và thanh toán), trang mã QR SePay và email xác nhận chưa được kiểm.

Điểm đã tốt, giữ nguyên: ô nhập 16px cao 48px, có `autocomplete`, đặt hàng không cần tài khoản, thông báo "Đã thêm vào giỏ" có nút Thanh toán.

---

## CK-01 (P0) — Chọn địa chỉ phụ thuộc API bên ngoài và dùng danh sách cũ

**Hiện trạng.** Khi chưa bật GHN (giai đoạn 1), ba ô Tỉnh/Thành, Quận/Huyện, Phường/Xã lấy dữ liệu trực tiếp từ trình duyệt của khách tới `https://provinces.open-api.vn/api/…`:

- `apps/web/src/components/traditional/checkout/TraditionalLocationSelector.tsx`
- `apps/web/src/components/checkout/LocationSelector.tsx`

Hai vấn đề:

1. **Không có dự phòng.** Khi gọi lỗi, code chỉ `console.error`. Khách thấy ô chọn rỗng, không có thông báo, không có nút thử lại, và không đặt được hàng. Đây là dịch vụ miễn phí của bên thứ ba, shop không kiểm soát được.
2. **Dữ liệu trước sáp nhập.** Đường dẫn đang gọi (`/api/?depth=1`, nay chuyển hướng 302 sang `/api/v1/`) trả 63 tỉnh có cấp quận/huyện. Từ 01/07/2025 còn 34 tỉnh/thành và không còn cấp huyện. Dịch vụ này có bản `/api/v2/` trả danh sách mới (đã thử: `/api/v2/p/46?depth=2` trả "Thành phố Huế" với các phường/xã trực thuộc, mỗi phần tử có `name`, `code`, `province_code`).

Khi bật GHN, checkout dùng `components/checkout/ShippingAddressFields.tsx` lấy địa chỉ từ API của shop (`/shipping/addresses/provinces`). Phần đó không thuộc việc này.

**Việc cần làm.**

1. Đưa dữ liệu về phía shop. Đề xuất: lưu một bản chụp danh sách v2 (34 tỉnh/thành và phường/xã) thành file JSON tĩnh trong repo, phục vụ từ chính web, chỉ tải khi khách vào form thanh toán. Kiểm tra dung lượng trước; nếu lớn thì tách mỗi tỉnh một file. Ghi lại ngày chụp và nguồn để sau này cập nhật.
2. Gộp hai component chọn địa chỉ thành một.
3. Bỏ ô Quận/Huyện ở form mới. Các chỗ đang dùng `district` cần rà để không vỡ với đơn và địa chỉ cũ:
   - web (dưới `apps/web/src/`): `types/user.ts`, `types/order.ts`, `app/[locale]/account/profile/page.tsx`, `app/[locale]/account/orders/[id]/page.tsx`, `components/zen/ZenCheckout.tsx`, `GuestCheckoutForm.tsx` (`GuestSubmitData.district`), `TraditionalCheckout.tsx`, `lib/api-client.ts`
   - api (dưới `apps/api/src/`): `users/users.service.ts`, `users/users.controller.ts`, `orders/orders.service.ts`, `common/types/database.types.ts`

   `ShippingInfoDto` (`apps/api/src/orders/dto/create-order.dto.ts`) chỉ bắt buộc `name`, `phone`, `address`, `city`; `full_address` là tùy chọn. Vậy đơn mới có thể để `district` rỗng và ghép `full_address` thành "số nhà, phường/xã, tỉnh/thành". Đơn cũ và địa chỉ đã lưu của khách có `district` vẫn phải hiển thị được.
4. Thêm trạng thái lỗi rõ ràng: thông báo, nút thử lại, và một ô nhập tay "Phường/xã, tỉnh/thành" để khách vẫn đặt được nếu danh sách không tải.
5. Địa chỉ cửa hàng "153 Lý Thái Tổ, Hương Trà, Thành phố Huế" trong `SHOP_CONTACT` và JSON-LD: nhờ chủ shop xác nhận tên phường/xã mới.

**Nghiệm thu.**

- Trong DevTools, chặn mọi request ra ngoài tên miền của shop: form địa chỉ vẫn chọn được và đi tiếp được bước 2.
- Làm hỏng file dữ liệu (đổi tên tạm): hiện thông báo, nút thử lại, và ô nhập tay dùng được.
- Tài khoản có địa chỉ đã lưu kiểu cũ và trang chi tiết đơn cũ vẫn hiển thị đủ địa chỉ.
- `cd apps/api && npm run test:checkout` vẫn qua.

---

## CK-02 (P0) — Khách vãng lai không có ô email

**Hiện trạng.** Form khách vãng lai (`components/traditional/checkout/GuestCheckoutForm.tsx`) chỉ có họ tên, số điện thoại, địa chỉ. `TraditionalCheckout.tsx` gửi `email: session?.user.email || ""`, nên khách không đăng nhập luôn gửi email rỗng. API chỉ gửi thư xác nhận khi có email (`orders.service.ts`, đoạn gọi `mailService.sendOrderConfirmation`). Trong khi đó trang `/vi/order-lookup` ghi "Mã đơn có trong email xác nhận và trang đặt hàng thành công".

**Việc cần làm.**

1. Thêm ô email **không bắt buộc** vào `GuestCheckoutForm` và `GuestSubmitData`: `type="email"`, `autocomplete="email"`, chữ 16px, chú thích "Để nhận xác nhận đơn và mã tra cứu".
2. Truyền giá trị đó vào `shipping_info.email` ở `TraditionalCheckout.tsx` (và `ZenCheckout.tsx` cho bản tiếng Anh).
3. API: `ShippingInfoDto.email` hiện là `@IsOptional() @IsString()`. Thêm `@IsEmail()` để chặn giá trị sai định dạng; nhớ rằng web đang gửi chuỗi rỗng khi không có email, nên hoặc web bỏ hẳn trường khi rỗng, hoặc DTO chuyển chuỗi rỗng thành `undefined`.
4. Sửa câu ở trang tra cứu cho đúng với cả khách không nhập email.
5. Trang đặt hàng thành công: làm nổi mã đơn và nhắc khách chụp màn hình hoặc lưu lại, vì với khách không nhập email đây là nơi duy nhất có mã.

**Nghiệm thu.** Test đơn vị cho DTO (email hợp lệ, rỗng, sai định dạng). Đặt một đơn khách vãng lai có email ở môi trường thử: thư xác nhận tới. Đặt một đơn không email: vẫn thành công, tra cứu được bằng mã đơn và số điện thoại.

---

## CK-03 (P1) — Ngưỡng miễn phí giao hàng bị chép ở bốn nơi

**Hiện trạng.** Quy tắc "30.000₫, miễn phí từ 300.000₫" được viết cứng ở:

- `apps/api/src/orders/orders.service.ts` (đoạn `total >= 300000 … : 30000`)
- `apps/web/src/components/traditional/checkout/TraditionalCheckout.tsx`
- `apps/web/src/components/zen/ZenCheckout.tsx`
- `apps/web/src/app/[locale]/checkout/payment_select/page.tsx`

Đổi ngưỡng ở một nơi mà quên nơi khác thì số tiền khách thấy lệch với số tiền API tính. Khách cũng không được báo ngưỡng này ở trang sản phẩm hay trong giỏ.

**Việc cần làm.**

1. Một nguồn duy nhất: API trả phí và ngưỡng (có thể kèm vào `/shipping/status` mà checkout đã gọi), web đọc từ đó.
2. Hiện ngưỡng cho khách: dòng "Miễn phí giao từ 300.000₫" ở khu mua của trang sản phẩm, và thanh "Thêm X₫ nữa để được miễn phí giao" trong ngăn giỏ hàng (`TraditionalCartDrawer.tsx`). Chỉ hiện khi GHN checkout tắt, vì khi bật thì phí lấy theo báo giá thật.

**Nghiệm thu.** Đổi ngưỡng ở một chỗ trong API: checkout, giỏ hàng và trang sản phẩm cùng đổi theo. Tổng tiền hiển thị khớp tổng tiền đơn được tạo.

---

## CK-04 (P1) — Thư viện có cảnh báo bảo mật

`pnpm audit --prod` ngày 10/11/2026:

| Nơi | Mức high | Gói |
|---|---|---|
| `apps/api` | 7 (và 4 moderate) | `sharp` (3 cảnh báo về libvips, libheif, librsvg), `minimatch` (3), `ws` (1) |
| `apps/web` | 4 (và 2 moderate, 1 low) | `ws`, `browserslist` (2), `zod` |

Lưu ý về `sharp`: commit `62372a69` đã cố ý hạ API xuống `sharp 0.34.5` để chạy được trên Alpine x64. Bản vá yêu cầu từ `0.35.5`. Nâng lại thì phải kiểm build Docker trên đúng nền tảng triển khai, hoặc đổi image nền. Mức phơi nhiễm hiện thấp vì các đường tải ảnh lên đều yêu cầu quyền ADMIN (`storage.controller.ts`, `products.controller.ts`, `catalog-import.controller.ts`, `shipping/operations.controller.ts`).

`ws`, `minimatch`, `browserslist` phần lớn là phụ thuộc gián tiếp; thử `pnpm update` rồi dùng `pnpm.overrides` nếu cần.

**Nghiệm thu.** `pnpm audit --prod` không còn mức high ở cả hai app, hoặc mỗi mục còn lại có ghi chú lý do. Test API và build web vẫn qua.

---

## CK-05 (P2) — 24 cảnh báo ESLint

`npx eslint src` ở `apps/web`: 0 lỗi, 24 cảnh báo, chủ yếu `setState` trong `useEffect` và một chỗ gọi `Date.now()` khi render (`hooks/useContactProtection.ts`). Không chặn mở bán. `lo-trinh-mo-ban.md` đã ghi là sửa dần.

---

## Việc chưa kiểm, cần người có quyền thử

- Đặt một đơn COD và một đơn chuyển khoản SePay thật, xem email, trang thành công, webhook, hoàn kho khi hủy.
- Chạy `docs/security/prod-rls-audit.sql` trên Supabase.
- Bước 2 của checkout và trang QR trên điện thoại thật (bàn phím che ô nhập, nút bấm ở đáy màn hình).
