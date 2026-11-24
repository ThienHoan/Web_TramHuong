# 01 — SEO kỹ thuật

Mục tiêu: để Google thu thập đúng trang, đúng ngôn ngữ, và không lập chỉ mục trang rác. Đây là điều kiện cần; nội dung và Google Business Profile ở [05-google-va-noi-dung.md](05-google-va-noi-dung.md) mới là thứ kéo thứ hạng.

Hiện trạng đo ngày 10/11/2026:

- Tìm `site:tramhuongthienphuchue.com` chỉ ra 2 kết quả: trang gốc (Google lưu **bản tiếng Anh**, kèm nút "Dịch trang này") và `/vi`. Không có trang sản phẩm nào.
- Sitemap có 30 URL, đã có `lastmod` và ảnh, chưa có `x-default`.
- Trang sản phẩm đã có `Product` + `Offer` + `BreadcrumbList`, canonical và hreflang đúng. Phần này tốt, giữ nguyên.

Mức ưu tiên: **P0** làm ngay, **P1** trong đợt này, **P2** khi rảnh, **Chờ** bị chặn bởi việc khác.

---

## SEO-01 (P0) — Trang không tồn tại trả mã 200

**Hiện trạng.** Các URL sau trả HTTP 200 kèm màn hình "404 — Không tìm thấy trang này":

```
200  /vi/khong-ton-tai          (robots: index, follow; canonical trỏ vào chính nó)
200  /vi/products/khong-co      (title "Không tìm thấy sản phẩm", robots: noindex)
```

Google gọi đây là soft 404. URL sai chính tả, URL cũ, URL do bot dò đều thành "trang thật".

**Nguyên nhân (giả thuyết, chưa thử gỡ để xác nhận).** `apps/web/src/app/[locale]/loading.tsx` bọc mọi trang dưới `[locale]` trong một Suspense. Next gửi phần khung với mã 200 trước, đến khi `notFound()` chạy thì mã đã gửi rồi. `loading.tsx` này lại render `HomeSkeleton`, nên khi chuyển sang trang sản phẩm hay blog khách thấy khung xương của trang chủ.

**Việc cần làm.**

1. Thử nhanh để xác nhận giả thuyết: tạm xóa `app/[locale]/loading.tsx`, `next build && next start`, rồi `curl` các URL trên.
2. Nếu đúng, chọn một trong hai:
   - **Đề xuất:** đưa trang chủ vào route group để giữ skeleton cho riêng nó: tạo `app/[locale]/(home)/page.tsx` (chuyển từ `app/[locale]/page.tsx`) và `app/[locale]/(home)/loading.tsx`, xóa `loading.tsx` ở gốc. URL không đổi.
   - Hoặc xóa hẳn `loading.tsx`. Chuyển trang vẫn có thanh tiến trình của `NextTopLoader` trong layout.
3. `apps/web/src/middleware.ts`: nhánh chặn `/admin` đang rewrite sang `/${locale}/404` để mượn màn hình 404. Sau khi sửa, kiểm tra nhánh này cũng trả mã 404.
4. Trang 404 nên có `robots: noindex`. Kiểm tra lại sau khi sửa; nếu Next chưa tự chèn thì thêm `export const metadata = { robots: { index: false } }` vào `app/[locale]/[...rest]/page.tsx`.

**Nghiệm thu** (bản production, thử cả hai User-Agent vì Next xử lý metadata khác nhau cho bot):

```bash
for p in /vi/khong-ton-tai /vi/products/khong-co /vi/products/category/khong-co /vi/blog/khong-co /vi/policies/khong-co /vi/admin; do curl -s -o /dev/null -w "%{http_code}  $p\n" "http://localhost:3000$p"; done
```

```bash
curl -s -o /dev/null -A "Googlebot" -w "%{http_code}\n" http://localhost:3000/vi/khong-ton-tai
```

Tất cả phải ra `404`. Các trang thật (`/vi`, `/vi/products`, một trang sản phẩm, một danh mục) vẫn ra `200`, và màn hình `ShopNotFound` vẫn hiện đúng.

---

## SEO-02 (P0) — Ngôn ngữ mặc định đang là tiếng Anh

**Hiện trạng.**

```
curl -I https://tramhuongthienphuchue.com/                       → 307 /en
curl -I -H "Accept-Language: vi-VN" …                            → 307 /vi
curl -I -H "Accept-Language: en-US,en;q=0.9,vi;q=0.8" …          → 307 /en
```

Googlebot không gửi `Accept-Language` nên được đưa vào `/en`, và Google đang hiển thị trang gốc bằng tiếng Anh cho người tìm ở Việt Nam. Người Việt để điện thoại tiếng Anh cũng rơi vào bản tiếng Anh.

**Nguyên nhân.** `apps/web/src/i18n/routing.ts`: `defaultLocale: 'en'`.

**Việc cần làm.**

1. `routing.ts`: `defaultLocale: 'vi'`.
2. **Cần chủ shop chốt:** có tắt tự nhận ngôn ngữ theo trình duyệt không. Đề xuất tắt (`localeDetection: false`), vì khách của shop là người Việt và nút đổi ngôn ngữ đã có sẵn. Nếu để bật, máy tiếng Anh vẫn vào `/en`.
3. `middleware.ts`: dòng `pathname.match(/^\/(vi|en)/)?.[1] || 'en'` đổi mặc định thành `'vi'`.
4. Rà các giá trị mặc định `locale = 'en'` trong `apps/web/src/services/` (ví dụ `productService.getCategories`). Chúng không gây lỗi vì nơi gọi đều truyền locale, nhưng nên thống nhất.
5. Thêm `x-default` trỏ về bản tiếng Việt ở mọi nơi khai `alternates.languages`:
   - `app/[locale]/layout.tsx` (`generateMetadata`)
   - `app/[locale]/products/page.tsx`
   - `app/[locale]/products/category/[category]/page.tsx`
   - `app/[locale]/products/[slug]/page.tsx`
   - `app/sitemap.ts`

**Nghiệm thu.**

```bash
curl -s -o /dev/null -w "%{redirect_url}\n" http://localhost:3000/
```

Ra `/vi`. Nếu chọn tắt tự nhận ngôn ngữ thì thêm `-H "Accept-Language: en-US"` vẫn ra `/vi`. Trang `/vi` có `<link rel="alternate" hreflang="x-default" …/vi>`. Nút đổi ngôn ngữ ở header vẫn chuyển được sang `/en`.

---

## SEO-03 (P0) — Sitemap và trang mỏng

**Hiện trạng.** Sitemap đang gửi cho Google:

- 2 danh mục không có sản phẩm (`phu-kien`, `qua-tang`), mỗi cái ở hai ngôn ngữ. Trang của chúng trả 200, cho lập chỉ mục, mô tả chỉ 40 ký tự.
- Bài blog thử `zxczxc` ở cả `/vi/blog/zxczxc` và `/en/blog/zxczxc`. Bài viết chỉ có một ngôn ngữ nên hai URL này trùng nội dung.

**Nguyên nhân.** `apps/web/src/app/sitemap.ts` đưa mọi danh mục `is_active` vào, và lặp mỗi bài viết qua cả hai locale. API `/categories` không trả số sản phẩm (các trường: `id, slug, is_active, created_at, updated_at, translation`).

**Việc cần làm.**

1. Trong `sitemap.ts`, bỏ danh mục không có sản phẩm đang bán. Sitemap đã tải toàn bộ sản phẩm nên có thể gom `category.slug` từ đó, không cần gọi thêm API.
2. `app/[locale]/products/category/[category]/page.tsx`: khi danh mục không có sản phẩm, `generateMetadata` trả `robots: { index: false, follow: true }`. Trang vẫn mở được cho khách.
3. Bài blog: chỉ đưa `/vi/blog/{slug}` vào sitemap, và ở `app/[locale]/blog/[slug]/page.tsx` đặt canonical của bản `/en/blog/{slug}` về bản `/vi`. Khi nào bài viết có bản dịch thật thì bỏ quy tắc này.
4. Thêm `x-default` (xem SEO-02).

Bài thử `zxczxc` là dữ liệu, chủ shop xóa trong trang quản trị.

**Nghiệm thu.** Mở `/sitemap.xml`: không còn URL danh mục rỗng, mỗi bài blog một URL. `curl -s …/vi/products/category/phu-kien | grep -o '<meta name="robots"[^>]*>'` ra `noindex, follow` khi danh mục còn rỗng, và tự trở lại `index` khi có sản phẩm.

---

## SEO-04 (P1) — Tiêu đề và mô tả

**Hiện trạng.**

| Trang | Tiêu đề hiện tại | Vấn đề |
|---|---|---|
| `/vi` | Thiên Phúc — Trầm hương Việt \| Hương Việt. Nếp an yên. | Không có "Huế", "nụ trầm", "nhang trầm" |
| `/vi/contact`, `/vi/partnership` | Giống hệt trang chủ | Trùng tiêu đề và mô tả, cho lập chỉ mục |
| `/vi/order-lookup`, `/vi/order-confirmation/[id]`, `/vi/shipping/[orderId]` | Giống hệt trang chủ | Trang tiện ích, không nên lập chỉ mục |
| Danh mục | "Nụ xông · Hình ảnh, phân loại & giá bán" | Mô tả lấy từ database chỉ 40 ký tự |

Các nhánh `checkout`, `(auth)`, `account` đã có `layout.tsx` đặt `noindex`; không cần sửa.

**Việc cần làm.**

1. Trang chủ: thêm `generateMetadata` ở trang chủ. Chữ cụ thể **cần chủ shop duyệt**; gợi ý:
   - Tiêu đề: `Trầm hương Huế Thiên Phúc — Nụ trầm, nhang trầm, quà tặng`
   - Mô tả: `Trầm hương Thiên Phúc tại 153 Lý Thái Tổ, Huế: nụ trầm, thanh trầm xông và quà tặng. Xem ảnh thật, giá bán, đặt hàng không cần tài khoản, giao toàn quốc.`

   Lý do có chữ "Huế": có một "Trầm Hương Thiên Phúc" khác ở Đà Nẵng và sản phẩm cùng tên trên Shopee đang chiếm kết quả khi tìm tên thương hiệu.
2. `contact` và `partnership` là client component (`'use client'` ở dòng đầu) nên không export metadata được. Thêm `layout.tsx` cùng thư mục, theo cách `app/[locale]/checkout/layout.tsx` đang làm, với tiêu đề và mô tả riêng.
3. `order-lookup`, `order-confirmation/[id]`, `shipping/[orderId]`: thêm tiêu đề riêng và `robots: { index: false, follow: false }`.
4. Danh mục: nếu mô tả trong database ngắn hơn khoảng 80 ký tự thì ghép thêm câu mẫu, ví dụ `"{mô tả} Xem ảnh thật, giá bán và phân loại {tên danh mục} tại Thiên Phúc Huế."`. Việc viết đoạn giới thiệu 150–300 chữ cho từng danh mục là của chủ shop (xem 05).

**Nghiệm thu.** Không còn hai trang cho lập chỉ mục nào trùng `<title>`. Có thể kiểm bằng cách tải các URL trong sitemap và so tiêu đề.

---

## SEO-05 (P1) — Dữ liệu cấu trúc cho bài viết

**Hiện trạng.** `/vi/blog/{slug}` chỉ có `WebSite + Store` chung của layout. Không có `BlogPosting`, không có canonical riêng, `og:type` không phải `article`.

**Việc cần làm** ở `app/[locale]/blog/[slug]/page.tsx`:

1. Thêm JSON-LD `BlogPosting`: `headline`, `description`, `image`, `datePublished`, `dateModified`, `author`, `publisher` trỏ `@id` của Store (`{SITE_URL}/#store`, định nghĩa trong `components/seo/JsonLd.tsx`), `mainEntityOfPage`.
2. Thêm `BreadcrumbJsonLd` (component đã có ở `components/seo/BreadcrumbJsonLd.tsx`).
3. `generateMetadata`: thêm `alternates.canonical`, `openGraph.type = 'article'`, `publishedTime`.
4. Trang danh sách `/vi/blog`: mô tả hiện 59 ký tự, viết lại cho đủ ý.

Dùng dữ liệu có thật trong bài. Không tự điền tên tác giả hay ngày.

**Nghiệm thu.** Dán URL bài viết vào Rich Results Test của Google: nhận ra `Article`, không lỗi.

---

## SEO-06 (P2) — Mọi trang HTML đều `no-store`

**Hiện trạng.** `curl -I /vi` trả `cache-control: private, no-cache, no-store, max-age=0, must-revalidate`. Mọi trang render lại ở mỗi lượt xem.

**Nguyên nhân có khả năng.** `generateMetadata` trong `app/[locale]/layout.tsx` gọi `headers()` để đọc `x-pathname` (do middleware gắn) rồi dựng canonical và hreflang. Dùng `headers()` ở layout gốc buộc cả cây trang render động. Middleware còn gọi `supabase.auth.getUser()` cho mọi request.

**Việc cần làm.** Chỉ làm khi đo thấy cần (hiện máy chủ vẫn phản hồi 0,1–0,3 giây). Hướng đi: bỏ `headers()` khỏi layout, để từng trang tự khai `alternates` (các trang sản phẩm, danh mục đã tự khai), rồi đặt `revalidate` cho trang sản phẩm, danh mục và blog. Đây là thay đổi rộng; cần kiểm lại canonical của mọi loại trang sau khi làm.

**Nghiệm thu.** Trang sản phẩm trả `cache-control` cho phép lưu đệm; canonical và hreflang của mọi loại trang không đổi so với trước.

---

## SEO-07 (Chờ chủ shop) — Khai giao hàng và đổi trả cho Google

`Offer` của sản phẩm chưa có `shippingDetails` và `hasMerchantReturnPolicy`. Đây là chủ ý (xem `docs/commerce-ux-seo.md`): chưa có chính sách được duyệt thì không khai. Khi chủ shop duyệt chính sách và bỏ đuôi `.draft` ở `LEGAL_POLICY_VERSION`, thêm hai trường này với đúng phí (30.000₫, miễn phí từ 300.000₫ nếu vẫn giữ), thời gian giao và thời hạn đổi trả đã duyệt. Chúng cần cho kết quả mua sắm của Google và cho Merchant Center.

`aggregateRating` cũng chỉ khai khi có đánh giá thật.

---

## SEO-08 (P2) — Bảy họ phông chữ

`app/[locale]/layout.tsx` khai `Geist`, `Geist_Mono`, `Be_Vietnam_Pro`, `Playfair_Display`, `Cormorant_Garamond`, `Montserrat`, `Manrope`. `docs/ui-upgrade-plan.md` đã đặt mục tiêu giảm về hai họ cho mỗi hướng giao diện. Tìm biến phông nào còn được CSS dùng (`--font-*`), bỏ phần còn lại.

**Nghiệm thu.** Chữ tiếng Việt có dấu hiển thị đúng ở trang chủ, trang sản phẩm, thanh toán, blog, quản trị; số file phông tải ở trang chủ giảm.

---

## SEO-09 (Quyết định của chủ shop) — Chặn bot AI trong robots.txt

`app/robots.ts` đang chặn `GPTBot`, `ChatGPT-User`, `Google-Extended`, `ClaudeBot`, `anthropic-ai`, `CCBot`, `Bytespider`, `Applebot-Extended`, `AmazonBot`. Việc này không ảnh hưởng thứ hạng Google Search. Hệ quả: các trợ lý AI sẽ không đọc và không dẫn nguồn về site khi người dùng hỏi mua trầm ở Huế. Nếu muốn có thêm nguồn khách này thì bỏ chặn `ChatGPT-User` (và các bot tìm kiếm của trợ lý), vẫn giữ chặn các bot thu thập để huấn luyện. Không cần làm gì nếu chủ shop muốn giữ như cũ.
