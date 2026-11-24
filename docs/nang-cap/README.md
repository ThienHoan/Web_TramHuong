# Kế hoạch nâng cấp Thiên Phúc — bản giao việc

Lập ngày 10/11/2026 từ một lượt rà soát site đang chạy thật (`https://tramhuongthienphuchue.com`) và mã nguồn ở commit `d140d844`. Bộ tài liệu này viết cho người (hoặc model) sẽ code tiếp: mỗi việc có hiện trạng, nguyên nhân, cách làm đề xuất và cách nghiệm thu.

Lộ trình mở bán của chủ shop vẫn là [`docs/deploy/lo-trinh-mo-ban.md`](../deploy/lo-trinh-mo-ban.md). Bộ này bổ sung những gì lượt rà soát tìm thêm, không thay thế nó.

Tiến độ triển khai và các mục cần chủ shop cung cấp thông tin: [TRANG-THAI.md](TRANG-THAI.md). Hướng dẫn kiểm thử và bật thư nhắc đánh giá: [06-nhac-danh-gia.md](06-nhac-danh-gia.md).

## Tóm tắt một đoạn

Phần kỹ thuật lõi ổn: API 73 bộ test / 1.139 test đều qua, web không lỗi TypeScript trong `src`, ESLint 0 lỗi và 24 cảnh báo, máy chủ phản hồi 0,1–0,3 giây, không có lỗi JavaScript trên trang chủ, trang sản phẩm và thanh toán. Site chưa mở bán được vì ba nhóm việc: nội dung còn là dữ liệu thử, luồng đặt hàng còn vài chỗ hở, và Google gần như chưa biết tới site (mới lập chỉ mục 2 trang).

## Các tài liệu

| File | Nội dung | Ai làm |
|---|---|---|
| [01-seo-ky-thuat.md](01-seo-ky-thuat.md) | Lỗi kỹ thuật cản Google: mã 404, ngôn ngữ mặc định, sitemap, tiêu đề, dữ liệu cấu trúc | Code |
| [02-luong-dat-hang.md](02-luong-dat-hang.md) | Chọn địa chỉ, email khách vãng lai, ngưỡng miễn phí giao, thư viện có cảnh báo bảo mật | Code |
| [03-giao-dien-dien-thoai.md](03-giao-dien-dien-thoai.md) | Phần mobile đang sửa dở trong working tree và phần còn lại | Code |
| [04-tinh-nang-moi.md](04-tinh-nang-moi.md) | Tính năng mới xếp theo lợi ích trên công sức | Code + chủ shop |
| [05-google-va-noi-dung.md](05-google-va-noi-dung.md) | Search Console, Google Business Profile, bài viết, quảng cáo ít tiền | Chủ shop |

## Thứ tự đề xuất

1. **SEO kỹ thuật** (01, các việc P0): rẻ, và mỗi ngày chậm là một ngày Google lưu sai.
2. **Luồng đặt hàng** (02, CK-01 và CK-02): phải xong trước khi có khách thật.
3. **Hoàn tất mobile** (03): đã sửa dở 5 file, cần chạy thử rồi commit.
4. **Việc của chủ shop** làm song song với 1–3: duyệt chính sách, xóa dữ liệu thử, thêm sản phẩm và ảnh, Google Business Profile (xem 05 và mục "Việc chỉ chủ shop làm được" bên dưới).
5. **Tính năng mới** (04) sau khi đã bán được đơn đầu tiên.

## Trạng thái working tree lúc bàn giao

Có 5 file đã sửa, **chưa commit, chưa chạy thử trên trình duyệt**. Chi tiết từng thay đổi ở [03-giao-dien-dien-thoai.md](03-giao-dien-dien-thoai.md).

```
apps/web/src/components/chat/ChatWidget.tsx
apps/web/src/components/checkout/checkout.css
apps/web/src/components/layout/ScrollToTop.tsx
apps/web/src/components/shop/shop.css
apps/web/src/components/traditional/product-detail.css
```

Thư mục `.agent/` chưa được theo dõi có từ trước, không thuộc đợt này.

## Việc chỉ chủ shop làm được

Những việc này không code thay được. Chúng chặn mở bán, và vài việc code ở trên phải chờ chúng.

| Việc | Hiện trạng trên site thật (10/11/2026) | Chặn việc code nào |
|---|---|---|
| Duyệt chính sách | Trang `/vi/policies/returns` hiện "Bản nháp để rà soát trên localhost… Chưa phê duyệt để mở bán chính thức"; 4 ô `[SELLER CONFIRMATION REQUIRED]` trong `apps/web/src/lib/legal.ts`; các trang chính sách đang `noindex` | SEO-07 (khai báo giao hàng/đổi trả cho Google) |
| Xóa dữ liệu thử | Giá 50.004₫ ở "Trầm Nụ Huế Cao Cấp"; bài blog "zxczxc Buuu" dùng ảnh Unsplash bản trả phí; tồn kho 99–103 | — |
| Thêm sản phẩm | 5 sản phẩm; danh mục "Phụ kiện xông trầm" và "Set quà tặng" trống | FT-07 |
| Khớp nội dung với hàng bán | Trang chủ có ba khu vực về vòng trầm và gợi ý chat "Vòng tay trầm hương nữ", nhưng không bán vòng | MB-06 |
| Ảnh sản phẩm lớn hơn | Ảnh trình duyệt nhận được chỉ rộng khoảng 490–735px dù trang xin bản 1080px, lên desktop bị phóng to | — |
| Email cửa hàng | Đang là Gmail cá nhân trong `SHOP_CONTACT` | — |
| Kiểm tra quyền database, đặt đơn thử thật | Theo `lo-trinh-mo-ban.md`; chưa xác minh được từ bên ngoài | — |

## Quyết định đã có của chủ shop — đừng làm ngược

[`docs/commerce-ux-seo.md`](../commerce-ux-seo.md) ghi rõ: giữ băng chuyền bộ sưu tập, hành trình ba cách thưởng trầm, vòng trầm tách hạt theo cuộn, phòng trải nghiệm 3D ba chế độ, và trang `/vi/products` ba chương. Không thay các khối này bằng một liên kết đơn. Mọi đề xuất trong bộ tài liệu này sửa quanh các khối đó chứ không gỡ chúng.

Tài liệu đó cũng ghi: không khai giao hàng/đổi trả mặc định và không khai sao đánh giá trong dữ liệu cấu trúc khi chưa có thật.

## Cách kiểm tra chung

```bash
cd apps/api && npx jest --silent
```

```bash
cd apps/web && npx tsc --noEmit
```

```bash
cd apps/web && npx eslint src
```

Lưu ý khi chạy `tsc`: thư mục `apps/web/.next/types/` trên máy này có các file trùng tên kiểu `routes.d 2.ts`, `validator 2.ts` (bản sao do hệ điều hành tạo). Chúng làm `tsc` báo lỗi giả. Xóa `.next` rồi chạy lại; lỗi thật chỉ tính trong `src/`.

Mã trạng thái HTTP (việc SEO-01) phải kiểm bằng bản production (`next build` rồi `next start`), vì chế độ dev trả mã khác.

Web chạy local cần API ở `localhost:4000` (`NEXT_PUBLIC_API_URL` không đặt thì mặc định như vậy). API local chạy cả các tác vụ định kỳ (`order-cleanup` mỗi 5 phút, `shipping.jobs`), nên hãy biết chắc `apps/api/.env` đang trỏ vào database nào trước khi bật.

## Giới hạn của lượt rà soát

- Chưa đặt đơn thử, chưa xem trang quản trị, chưa đăng nhập.
- Chưa đo tốc độ trên điện thoại thật và chưa chạy PageSpeed.
- Ảnh chụp lấy từ ô trình duyệt bị ẩn nên hiệu ứng theo cuộn và ảnh tải chậm không đánh giá được qua ảnh; phần đó cần xem trên máy thật.
- Kết quả Google xem một lần vào 10/11/2026 với `hl=vi&gl=vn`; thứ hạng thay đổi theo ngày và theo người tìm.
