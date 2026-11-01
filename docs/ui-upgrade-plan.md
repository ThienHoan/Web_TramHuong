# Kế hoạch nâng cấp UI Thiên Phúc từ tham khảo XimiTech

Ngày khảo sát: 31/10/2026. Phạm vi: khảo sát và lập kế hoạch, chưa sửa giao diện hoặc cài thư viện.

## 1. Kết luận và ranh giới khảo sát

Giữ Next.js và hệ thống bán hàng hiện tại. Tận dụng Framer Motion, Lenis, Embla và Radix đã có; đầu tư vào bố cục, ảnh sản phẩm, phân lớp và nhịp chuyển động. Mục tiêu là chất lượng tương tác tương đương tham khảo trong ngôn ngữ thương hiệu trầm hương.

Đã tải HTML, bundle JS/CSS công khai và mở XimiTech bằng REA trong Chrome headless ở 1440 × 1000. Có lượt chụp với reduced motion và lượt bật motion, chờ tải rồi cuộn hai lần bằng PageDown. Đây là quan sát có giới hạn; chưa kiểm tra toàn bộ hover, kéo thả, menu, âm thanh, mobile hoặc đo FPS. Dự án Thiên Phúc được kiểm tra qua mã nguồn; chưa chạy và chụp UI hiện tại. Không suy ra backend của XimiTech từ frontend.

REA Evidence:
- `ev_b2af7180d426b8d573a20197dba9ae5c8a614abb5ba7480153b7ec3b8ea15636`: DOM và ảnh hero; network bị giới hạn 100 events nên không phải danh sách đầy đủ tài nguyên.
- `ev_3a961083a3da7573ce49ede3e3c27b72f715155cdcfd0874f5a4b21250209664`: bật motion, PageDown hai lần, chụp khu vực video; không ghi nhận page error trong cửa sổ này. Không phải bằng chứng mọi thao tác đều không lỗi.

## 2. Công nghệ của trang tham khảo

| Thành phần | Bằng chứng công khai | Vai trò / độ chắc chắn |
| --- | --- | --- |
| React | HTML preload `vendor-react-BeAfE0yy.js`, mã component trong bundle | Frontend component; xác nhận |
| Vite | `__vite__mapDeps`, `vite:preloadError` trong entry JS | Dấu vết build Vite rõ ràng; không có package.json gốc để xác định phiên bản |
| Motion | `vendor-motion-BnFn2Zdd.js`, scroll progress và spring trong entry JS | Animation, progress, spring; không xác định chính xác dependency version |
| Lenis 1.3.26 | Chuỗi version và lớp Lenis trong entry JS; khởi tạo duration 1.05, wheelMultiplier 0.9 | Cuộn mượt desktop; code bỏ qua khi reduced motion hoặc pointer coarse |
| Tailwind CSS | Utility classes trong DOM và biến `--tw-*` trong CSS | Styling; chưa kết luận phiên bản |
| Radix UI | `vendor-radix-Dcte6FR2.js` trong HTML | Bộ primitive UI; cần đọc sâu từng chunk để ánh xạ chính xác từng control |
| Three.js + GLTFLoader | Dynamic import `vendor-three-B7I90aUu.js`, `WebGLRenderer`, tải `/models/ximitech-logo-3d.glb` | Có triển khai logo 3D; không có nghĩa toàn trang hoặc hero đều là WebGL |
| CSS / requestAnimationFrame / IntersectionObserver | Transform translate3d, perspective, vòng RAF và observer trong entry JS | Gallery phối cảnh, cập nhật chuyển động, dừng một số công việc ngoài viewport |
| Font web | HTML yêu cầu Epilogue, Manrope, Inter, Playfair Display | Phân cấp chữ và tính cách thiết kế |

Nguồn gốc:
- https://ximitech.vn/
- https://ximitech.vn/assets/index-B8lSO_ol.js
- https://ximitech.vn/assets/vendor-motion-BnFn2Zdd.js
- https://ximitech.vn/assets/index-CxmKwHfD.css

Tên bundle có hash có thể thay đổi khi trang được deploy lại. Không thấy dấu hiệu GSAP/ScrollTrigger trong entry đã tìm; chưa đủ để kết luận chúng hoàn toàn vắng mặt ở mọi route/chunk.

Điểm đáng học: chữ lớn có phân cấp, bố cục thoáng, tương phản có chủ ý, gallery có chiều sâu, nội dung thay đổi theo cuộn, và phản hồi thao tác có quán tính. Thư viện chỉ cung cấp cơ chế; chất lượng phụ thuộc ảnh, bố cục, timing và kiểm soát tải.

## 3. Hiện trạng dự án

| Khu vực | Quan sát trong mã | Việc cần làm |
| --- | --- | --- |
| Stack | Next 16.1.0, React 19.2.3, Tailwind 4, Radix/shadcn, Framer Motion 12, Lenis 1.3.16, Embla 8 | Giữ stack, kiểm tra khả năng của phiên bản cài thực tế trước triển khai |
| Hai hướng UI | `/vi` dùng TraditionalHome; locale khác dùng ZenHome | Dùng chung nguyên tắc motion và component tương tác; vẫn cho phép hai art direction khác nhau |
| TraditionalHome | Hero carousel ba slide, nhiều ScrollReveal lặp lại, story và khu sản phẩm, ảnh hardcode từ googleusercontent | Ưu tiên một hero có tiêu điểm; phân nhịp các section, thay ảnh bằng bộ ảnh thương hiệu có quyền sử dụng |
| ZenHome | Hero nền ảnh và chữ giữa, showcase, story | Áp dụng cùng chất lượng tài sản và motion; thiết kế lại riêng theo nhánh Zen |
| SmoothScroll | Lenis mount trong layout; RAF tự lặp, cleanup chỉ destroy Lenis | Giữ ID RAF và cancel khi cleanup; xét reduced motion, thiết bị chạm, route, modal/drawer và nested scroll |
| ScrollReveal | Mỗi instance tạo observer, opacity ban đầu 0, blur 4px, transition-all, will-change cố định | Tránh ẩn nội dung thiết yếu khi JS lỗi; chỉ animate thuộc tính cần thiết; bỏ blur toàn cục, giảm observer và will-change |
| Motion tokens | Có duration, easing, variants và REDUCED_MOTION trong lib/motion.ts | Chuẩn hóa và nối thực tế vào component; khai báo hằng chưa đồng nghĩa hỗ trợ reduced motion đã hoạt động |
| Typography / màu | Layout khai báo bảy font; CSS có nhiều nhóm token Traditional/brand/primary | Đo font tải thực tế, giảm về hai family mỗi hướng UI; thống nhất vai trò token và kiểm tra contrast |

File chính: `apps/web/src/components/traditional/TraditionalHome.tsx`, `apps/web/src/components/zen/ZenHome.tsx`, `apps/web/src/components/ui/SmoothScroll.tsx`, `apps/web/src/components/ui/ScrollReveal.tsx`, `apps/web/src/lib/motion.ts`, `apps/web/src/app/globals.css`, `apps/web/src/app/[locale]/layout.tsx`.

## 4. Hướng thiết kế đề xuất

Giả định để lập kế hoạch: ưu tiên trang chủ tiếng Việt và luồng mua hàng; giữ nhận diện Thiên Phúc; ảnh mới và trải nghiệm tương tác sẽ được duyệt ở bước thiết kế. Chưa chốt thay giao diện tiếng Anh bằng giao diện tiếng Việt.

Hướng khuyên dùng: **Di sản trầm hương đương đại**. Nền kem ấm, nâu gỗ sâu, vàng làm điểm nhấn, đỏ trầm cho chi tiết thương hiệu. Serif cho câu chuyện và sans dễ đọc cho giá, form, menu. Ảnh macro và ánh sáng chân thực tạo chiều sâu.

Hai phương án wireframe cần dựng ở đầu triển khai:
- A — Editorial có chiều sâu: hero bất đối xứng, ảnh sản phẩm lớn, story chuyển cảnh ngắn, gallery và sản phẩm. Khuyên dùng vì cân bằng thương hiệu và mua hàng.
- B — Boutique ưu tiên mua sắm: hero gọn hơn, danh mục và sản phẩm lên sớm, story ngắn phía sau. Phù hợp nếu số liệu cho thấy khách chủ yếu vào chọn hàng ngay.

Không lấy tài sản hình ảnh, copy hoặc bố cục chi tiết của XimiTech. Không đưa loader phần trăm, âm thanh hay 3D vào chỉ vì trang tham khảo có chúng.

## 5. Hành trình trang chủ và bản đồ chuyển động

| Nhịp | Trải nghiệm | Chuyển động desktop | Mobile / reduced motion |
| --- | --- | --- | --- |
| Nhận diện | Hiểu sản phẩm và cảm giác bình an; CTA “Khám phá bộ sưu tập” nhìn thấy ngay | Hero 3–4 lớp: nền gỗ, sản phẩm tách nền, tiền cảnh, khói nhẹ; parallax biên độ nhỏ; chữ xuất hiện theo cụm | Bố cục riêng, ảnh tĩnh có chiều sâu, CTA không phụ thuộc animation |
| Tin tưởng | Nguồn gốc và cam kết có chứng cứ | Dải nội dung tĩnh, hover nhẹ | Không marquee bắt buộc; đọc và chạm bình thường |
| Hiểu giá trị | “Dó bầu → kết trầm → thưởng hương” | Một story sticky ngắn, ảnh chuyển theo tiến độ cuộn; ba mốc đọc rõ | Ba khối nội dung dọc; bỏ pin/scrub khi reduce |
| Khám phá | Chọn vòng tay, nhang, nụ hoặc dụng cụ | Gallery Embla kéo ngang, phối cảnh nhẹ và ảnh cận cảnh khi hover | Swipe tự nhiên, nút điều hướng có nhãn; không tilt theo chuột |
| Chọn mua | So sánh sản phẩm, giá và đặc tính | Card có ảnh thứ hai, quick view, wishlist; phản hồi thêm giỏ rõ | Hành động luôn có nút chạm, không giấu sau hover |
| Cảm nhận | Thấy sản phẩm trong không gian sống | Gallery ảnh editorial bất đối xứng, reveal nhỏ | Ảnh responsive, không ép thành scene dài |
| Quyết định | Đọc tư vấn / đánh giá / liên hệ và mua | Accordion, feedback nhẹ, footer gọn | Dễ đọc, focus rõ, CTA không che nội dung |

Đường cảm xúc: tò mò → an tâm → thấu hiểu → muốn chạm → dễ lựa chọn → tin tưởng hành động. Đỉnh trải nghiệm đặt ở story kết trầm, trước khi chuyển sang mua sắm.

Signature đề xuất: ảnh macro vân gỗ chuyển từ thân dó sang thớ trầm rồi khớp với hạt vòng/miếng trầm thành phẩm khi cuộn. Câu người xem có thể nhớ: “Trang mà cuộn xuống là thấy một thớ gỗ trở thành món trầm mình đang chọn.” Đây là ý tưởng cần prototype và kiểm chứng ảnh ghép; chưa phải hiệu ứng đã làm.

## 6. Kiến trúc triển khai

- Motion/Framer Motion hiện có: useScroll, useTransform, spring, AnimatePresence; dùng motion value thay setState theo mỗi tick cuộn. Tài liệu: https://motion.dev/docs/react-scroll-animations
- Lenis chỉ cho vùng/route thích hợp trên desktop; cuộn tự nhiên cho thiết bị chạm và reduced motion. Modal mở phải phối hợp khóa nền và cho nội dung modal cuộn được. Tài liệu: https://github.com/darkroomengineering/lenis
- Embla cho gallery và carousel sản phẩm; Radix cho drawer, dialog, accordion phù hợp. Giữ logic giỏ hàng, wishlist và API hiện có.
- CSS sticky + transform/opacity cho story và depth. Chỉ đưa GSAP vào nếu prototype chứng minh có nhu cầu timeline mà stack hiện tại khó đáp ứng; không thêm hai bộ điều khiển cho cùng một phần tử.
- Three.js là tùy chọn giai đoạn sau khi có model sản phẩm tốt và đo được lợi ích. Bản đầu dùng ảnh phân lớp; không đặt WebGL trên đường tải thiết yếu.
- Giữ shell, dữ liệu và SEO trong server component khi phù hợp; tách các vùng animation thành client island. Lazy load quick view, scene/video và chức năng ngoài màn hình.
- Tạo các khối dự kiến: HomeHero, AgarwoodStory, CollectionGallery, FeaturedProducts, EditorialGallery, MotionProvider. Hai locale dùng nội dung và art direction riêng trên cùng quy tắc tương tác.

Thông số khởi điểm để thử: phản hồi nút 120–180ms; menu/dialog 200–300ms; section reveal 450–650ms, lệch 12–24px; stagger 40–70ms; tilt tối đa khoảng 3 độ trên thiết bị có chuột. Đây là giá trị prototype, điều chỉnh theo quan sát thực tế.

## 7. Các đợt công việc

| Đợt | Công việc và file | Kết quả kiểm chứng | Ước lượng |
| --- | --- | --- | --- |
| 0 | Chạy app, xác định trạng thái API, chụp /vi và /en desktop/mobile; đo production baseline; kiểm kê ảnh và quyền dùng | Có ảnh hiện trạng, chỉ số nền, danh sách asset thiếu | 0.5–1 ngày |
| 1 | Dựng hai wireframe A/B, moodboard và hero tĩnh desktop/mobile; chốt font, màu, nội dung và asset | Chọn được bố cục trước khi làm animation diện rộng | 1–2 ngày |
| 2 | Sửa SmoothScroll, ScrollReveal, lib/motion.ts; scope provider, tokens và font | Cleanup đúng, reduce hoạt động, dialog/nested scroll không xung đột | 1–1.5 ngày |
| 3 | Tách TraditionalHome; dựng hero phân lớp và story prototype | Chụp đầu/giữa/cuối scene, chữ/CTA đọc được; đạt ngân sách tải | 2–3 ngày |
| 4 | Header/menu, gallery, card, quick view, cart drawer, product detail; kế thừa provider/API | Luồng chọn → chi tiết → thêm giỏ → thanh toán hoạt động | 2–3 ngày |
| 5 | Áp dụng quy tắc tương tác cho Zen; rà blog/contact/checkout; kiểm tra responsive, accessibility và production | Ảnh đối chiếu hai locale, kết quả QA và build/lint | 1.5–2 ngày |

Ước lượng tổng: 8–12.5 ngày công, giả định ảnh/nội dung sẵn và backend chạy được. Chụp mới, dựng model/video, thời gian chờ duyệt hoặc sửa backend tính riêng. Có thể ra bản trang chủ trước sau đợt 3.

## 8. Ngân sách và tiêu chí nghiệm thu

- Đo bản production cùng điều kiện trước/sau. Mục tiêu Core Web Vitals ngoài thực tế: p75 LCP ≤ 2.5s, INP ≤ 200ms, CLS ≤ 0.1; cần dữ liệu người dùng thật để xác nhận. Lab chỉ dùng làm proxy so sánh.
- Dùng ảnh responsive AVIF/WebP, kích thước khai báo rõ; ảnh hero ưu tiên, ảnh dưới fold lazy. Ngân sách ban đầu đề xuất ảnh hero mobile ≤ 250KB, desktop ≤ 450KB, điều chỉnh nếu chất lượng ảnh không đạt.
- Không tải model hoặc video nặng trong critical path. Nếu có video, có poster và chỉ tải khi gần viewport; thông tin chính phải có bản HTML/ảnh tĩnh.
- Performance trace trên thiết bị mục tiêu: hướng tới 60fps khi cuộn, không có long task lặp lại do animation. Không cam kết mọi máy đều 60fps.
- Chụp 375/390, 768, 1440, 1920px; không tràn ngang, không che giá/CTA. Chrome, Edge và Safari/iOS thực hoặc môi trường kiểm thử được ghi rõ.
- Reduced motion bỏ parallax/scrub/pinning và chuyển động liên tục. Nội dung/CTA vẫn hiện nếu JS chậm hoặc lỗi.
- Keyboard mở/đóng menu, quick view và drawer; focus trap và trả focus đúng; Escape hoạt động; touch target ưu tiên ≥ 44px, chữ thường contrast ≥ 4.5:1.
- Kiểm tra trực tiếp hero đầu/giữa/cuối, cuộn ngược, đổi route, mở drawer khi đang cuộn, đổi locale, lọc sản phẩm, wishlist, thêm giỏ, checkout và chat widget. Không đưa chuyển động gây chờ vào bước thanh toán.
- Chạy lint/build; kiểm tra hydration, lỗi console và network cần thiết. Chỉ thêm test tích hợp cho hành vi mới có rủi ro như khóa cuộn/focus/cart; không tạo test chỉ sao chép implementation.

## 9. Thông tin cần chốt ở bước thiết kế

Ưu tiên đầu tiên: chất lượng ảnh sản phẩm/ảnh macro và bố cục hero. Cần xác nhận bộ ảnh có quyền dùng, mức giữ khác biệt giữa /vi và /en, và ưu tiên thương hiệu hay chuyển đổi bán hàng để chọn A/B. Những điểm này không cản trở bản kế hoạch, nhưng phải chốt trước triển khai art direction cuối cùng.

Giới hạn skill: ui-ux tập trung vào màn app; hướng storefront/landing trong kế hoạch dựa thêm vào scroll-craft và quan sát trang tham khảo, chưa phải bản thiết kế đã được người dùng duyệt.
