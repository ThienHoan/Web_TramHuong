# 03 — Giao diện điện thoại

Quan sát ở khổ 375×812 trên site thật ngày 10/11/2026. Không có tràn ngang ở trang nào đã xem (trang chủ, danh sách, chi tiết, giỏ, thanh toán, đăng nhập, liên hệ, tra cứu đơn, blog, chính sách).

Đã tốt, giữ nguyên: thanh "Mua ngay" dính đáy ở trang chi tiết có tính vùng an toàn của iPhone, ngăn giỏ hàng, form thanh toán, menu dạng ngăn kéo.

---

## MB-01 (P0) — Hoàn tất phần đang sửa dở

Năm file dưới đây đã sửa nhưng **chưa chạy thử và chưa commit**. Cần mở từng trang ở 375px và 390px, sửa nếu lệch, rồi commit.

| File | Đã đổi gì | Cần kiểm gì |
|---|---|---|
| `components/layout/ScrollToTop.tsx` | Nút lên đầu trang thêm `hidden md:flex`: ẩn trên điện thoại, vì trước đó nó đè lên chữ và link ở góc trái dưới | Điện thoại không còn nút; desktop vẫn hiện sau khi cuộn 300px |
| `components/chat/ChatWidget.tsx` | Nút chat 48px trên điện thoại (trước 56px), cách mép 16px và tính `safe-area-inset-bottom`; khung chat rộng `100vw - 2rem`; ô nhập chat 16px trên điện thoại | Khung chat mở ra không tràn màn hình ở 375px và ở máy thấp (667px); ở trang chi tiết nút chat vẫn nằm trên thanh "Mua ngay" (quy tắc `body:has(.pd-buy-bar) [data-chat-widget]{bottom:100px}` trong `product-detail.css`); chạm ô nhập trên iPhone không bị phóng to trang |
| `components/checkout/checkout.css` | Ô mã ưu đãi 16px trong khối `@media (max-width: 760px)` | Chạm ô trên iPhone không phóng to; chữ không tràn ô |
| `components/traditional/product-detail.css` | Ảnh trang chi tiết ở điện thoại: rộng 90%, tỉ lệ 5/4 (trước 86%, 3/2) | Ảnh gốc là 3:2 nên bị cắt khoảng 17% chiều ngang; xem cả 5 sản phẩm để chắc sản phẩm không bị cắt mất. Muốn ảnh vuông thì cần ảnh gốc vuông |
| `components/shop/shop.css` | Trang danh sách ở điện thoại: ẩn dòng kicker và đoạn giới thiệu, tiêu đề 30px một dòng, breadcrumb gọn; thanh lọc còn hai hàng (ô tìm + nút Tìm kiếm, rồi Ngân sách + Sắp xếp); ô giá 16px | Xem bên dưới |

Chi tiết cần kiểm cho `shop.css`:

- `/vi/products?sort=newest` và `/vi/products/category/nu-tram`: ảnh sản phẩm đầu tiên phải lọt vào màn hình đầu.
- Tiêu đề "Toàn bộ phẩm trầm." dùng `<br/>` trong JSX. CSS ẩn `br` và chèn khoảng trắng bằng `h1 em::before`. Kiểm có đúng một khoảng trắng giữa "bộ" và "phẩm".
- Form lọc `ShopCatalogFilters` còn được dùng trong trang ba chương `/vi/products` (bên trong `details.collection-search` của `TraditionalProductList.tsx`). Quy tắc lưới mới áp cho cả hai nơi; mở mục "Tìm & lọc sản phẩm" ở đó để kiểm.
- Bảng "Ngân sách" (`.shop-price-filters > div`) định vị tuyệt đối theo form; mở ra phải nằm gọn trong màn hình.
- Bản tiếng Anh `/en/products` dùng chung component.

---

## MB-02 (P1) — Menu điện thoại

**Hiện trạng.** Menu (`components/traditional/TraditionalHeader.tsx`, phần `SheetContent`) có: ô tìm, Trang chủ, Sản phẩm, Tra cứu đơn, Thư viện hương trầm, Hợp tác, Liên hệ, Đăng nhập, Ngôn ngữ. Không có danh mục sản phẩm, không có số điện thoại.

**Việc cần làm.**

1. Dưới mục "Sản phẩm", thêm hàng nút danh mục dẫn tới `/products/category/{slug}`. Header là client component không nhận props, nên tải danh mục khi menu mở lần đầu bằng `useSWR` (đã có trong dự án) với `getCategories(locale)` từ `@/lib/api-client`. Chỉ hiện danh mục `is_active`; nên ẩn danh mục chưa có sản phẩm.
2. Thêm nút gọi `tel:` dùng `SHOP_CONTACT.phone` từ `@/lib/legal` (thanh thông báo `TopBar.tsx` đang dùng đúng hằng này). Khi có Zalo (xem FT-01 ở tài liệu 04) thì đặt cạnh.
3. Vùng chạm tối thiểu 44px.

**Nghiệm thu.** Mở menu ở 375px: thấy danh mục có hàng, chạm vào tới đúng trang và menu đóng lại; nút gọi mở trình quay số; khi API danh mục lỗi menu vẫn dùng được, chỉ thiếu hàng danh mục.

---

## MB-03 (P1) — Rà các ô nhập nhỏ hơn 16px

iPhone tự phóng to trang khi chạm vào ô nhập có chữ nhỏ hơn 16px. Đã sửa ô mã ưu đãi, ô chat và ô giá. Chưa rà: form liên hệ, hợp tác, đăng nhập/đăng ký, đặt lại mật khẩu, tra cứu đơn, form viết đánh giá, ô tìm kiếm toàn màn hình (`ZenSearchOverlay`), trang tài khoản.

Cách rà nhanh ở mỗi trang, trong DevTools khổ điện thoại:

```js
[...document.querySelectorAll('input,select,textarea')].filter(e => parseFloat(getComputedStyle(e).fontSize) < 16).map(e => e.name || e.id || e.placeholder)
```

**Nghiệm thu.** Lệnh trên trả mảng rỗng ở các trang khách dùng.

---

## MB-04 (P1) — Cảnh 3D tự tải trên điện thoại

**Hiện trạng.** `components/traditional/home/HomeJourney.tsx` dùng `IntersectionObserver` để tải `createPreviewScene` (Three.js) khi khách cuộn tới khu "Bên trong một vòng trầm", trên mọi thiết bị trừ khi máy bật giảm chuyển động. Bên dưới canvas đã có sẵn ảnh tĩnh. Phòng trải nghiệm (`ExperienceLab`) thì đã chờ khách bấm "Mở không gian 3D".

Chủ shop đã chọn giữ các cảnh 3D, nên không gỡ.

**Việc cần làm.** Trên thiết bị chạm màn hình hẹp, cho khu vòng trầm làm giống phòng trải nghiệm: hiện ảnh tĩnh kèm nút "Xem 3D", chỉ tải Three.js khi bấm. Trước khi làm, đo trên một máy Android tầm trung để biết mức ảnh hưởng thật; chưa có số đo.

**Nghiệm thu.** Ở khổ điện thoại, cuộn hết trang chủ mà không bấm gì: tab Network không tải chunk Three.js. Bấm nút thì cảnh 3D chạy như cũ. Desktop không đổi.

---

## MB-05 (P2) — Tiêu đề hiện dần theo cuộn

`components/traditional/home/LandingTextMotion.tsx` cho từng chữ của tiêu đề bắt đầu ở độ mờ 14% và rõ dần khi tiêu đề đi từ 92% xuống 55% chiều cao màn hình. Trên điện thoại, tiêu đề vừa lộ ra ở đáy màn hình thì gần như chưa đọc được. Cần xem trên máy thật rồi mới quyết; nếu thấy khó đọc thì nâng độ mờ ban đầu (ví dụ 0,45) và kết thúc sớm hơn (ví dụ `top 70%`) cho màn hình hẹp.

---

## MB-06 (Chờ chủ shop) — Nội dung không khớp hàng đang bán

Trang chủ có ba khu vực nói về vòng trầm ("Mang hương theo mình", "Bên trong một vòng trầm", nút "Tìm vòng trầm phù hợp"), và gợi ý sẵn của chat gồm "Vòng tay trầm hương nữ", "Tư vấn quà tặng sếp". Cửa hàng hiện có 5 sản phẩm, đều là nụ và thanh trầm; danh mục quà tặng trống. Khách bấm vào sẽ tới trang không có món đó.

Chủ shop chọn: nhập vòng trầm và set quà, hoặc đổi nội dung sang nụ và nhang. Phần code theo sau:

- Gợi ý chat (mảng `suggestions` trong `ChatWidget.tsx`) nên lấy theo danh mục đang có hàng.
- Các nút dẫn của khu trải nghiệm lấy từ `lib/experience-shopping.ts`; kiểm tra khi không có danh mục tương ứng thì dẫn về đâu.

---

## MB-07 (P1) — Trang chi tiết thiếu thông tin quyết định mua

- Không có bảng thông số (số viên, trọng lượng, thời gian cháy, thành phần). CSS cho bảng đã có (`.pd-specs`, `.pd-key-facts`); cần dữ liệu từ chủ shop.
- Không nhắc ngưỡng miễn phí giao (xem CK-03).
- Chưa có đánh giá nào; khu đánh giá đang hiện trạng thái rỗng.

---

## MB-08 (P2) — Chỗ lệch kiểu

- `/vi/blog` dùng bố cục canh giữa, khác với các trang còn lại.
- Bản tiếng Anh có khối "Join the Circle of Stillness" ghi "Newsletter subscriptions are not available yet". Ẩn khối này cho tới khi có tính năng.
- Bản tiếng Anh có đoạn "For generations, the artisans of Hue… passed down through centuries". Chủ shop cần xác nhận câu này đúng với thực tế của cửa hàng.

---

## Đính chính so với nhận xét ban đầu

Lượt rà soát đầu có ghi "màn hình đầu trang chủ chỉ có chữ, ảnh nằm dưới". Xem lại thì ảnh hero bắt đầu ở khoảng 1/4 dưới của màn hình đầu và nút mua đã nằm trên nếp gấp. Không cần sửa phần hero.
