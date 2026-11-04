# Capability matrix — đúng 11 tích hợp

03/11/2026. VERIFIED_DOCS nghĩa là đã đọc tài liệu chính thức; **không** chứng nhận credentials/account chạy được. Live account của tất cả tích hợp chưa được kiểm tra trong đợt này. GHN được tái sử dụng theo chỉ đạo, không triển khai lại.

| # | Provider | Existing capability | Quyết định / phase | Access và thiếu gì |
| --- | --- | --- | --- | --- |
| 1 | GHN | Official client, quote/preview/requote, reserve/create/recover, actions/labels/tickets, inbox, tracking, COD, admin | REUSED / Phase3 review | VERIFIED_DOCS; staging province từng pass theo docs cũ; live acceptance toàn luồng chưa chứng nhận; giữ GHN_ENABLED và SHIPPING_* hiện có |
| 2 | Resend | SMTP mail + Handlebars | OPTIMIZE / Phase4 | NEEDS_ACCOUNT/domain/verified recipient; EmailProvider adapter + mock; SMTP tiếp tục mặc định, cần outbox trước cutover |
| 3 | Gemini | chat message/SSE, cached catalog context, history compression, SDK | OPTIMIZE / Phase5 | NEEDS_ACCOUNT quota/model/data-policy confirmation; catalog price/stock revalidation, PII filtering, bounded tokens/timeout/day limit, 30 offline prompts |
| 4 | Supabase pgvector | Catalog search JS substring, SQL pg_trgm indexes; Supabase đã có | DEFERRED / Phase5 sau FTS benchmark | Owner export xác nhận pg_trgm, chưa có vector/unaccent; extension permission và model dimension chưa chọn; không tạo embedding table ngay |
| 5 | Cloudinary | Supabase Storage + sharp WebP/thumbnail + Next/Image AVIF/WebP | DEFERRED POC / Phase7 | NEEDS_ACCOUNT; 10–20 ảnh fixture benchmark trước khi quyết định; giữ URL nguồn |
| 6 | Google Sign-In | signInWithOAuth provider google, callback exchangeCodeForSession, Supabase guards | REUSED/OPTIMIZE / Phase6 | NEEDS_ACCOUNT provider/redirect/linking settings; không thêm auth endpoint/session hoặc external_identities trùng Supabase |
| 7 | GA4 | Shared consent/funnel mock P2-01a; admin revenue vẫn DB analytics | MOCK PARTIAL / Phase2 |8pre-purchase events + owner-only server purchase mock/durable dedupe P2-01b;2flags defaultOFF/no Google calls; guest capability/hosted SQL/live property pending |
| 8 | Search Console | metadata/sitemap/robots có sẵn; P2-02a ADMIN mock report/manual sync trong AnalyticsModule, executor dùng lại | MOCK / P2-02a; live còn thiếu | Verified property/OAuth chưa xác nhận; mock RAM 14 ngày, pagination/quota/freshness, job disabled; durable storage + encrypted token/rotation + real sync còn pending, xem11 |
| 9 | Merchant API | MerchantModule cũ Content API v2.1 custombatch/cron/admin sync | OPTIMIZE transport / Phase8 | VERIFIED_DOCS; legacy Content API sunset; NEEDS_ACCOUNT Merchant Center + API datasource + policy/website eligibility; không tạo Ads |
| 10 | PageSpeed Insights | P2-03a ADMIN mock mobile/desktop,24hcache,bounded RAM history/regression; AnalyticsModule/executor reused | MOCK / P2-03a; live pending | Six fixed synthetic targets, no cart/checkout/private URLs, job disabled; approved live URL/key/quota/durable history/field contract pending. No CrUX API thứ12; xem12 |
| 11 | Turnstile | Nest global throttler; contacts override, chat/status limit | MISSING / Phase1 | NEEDS_ACCOUNT site key/secret/hostname; mock siteverify; route action policy, expiry/replay/outage tests |

## Adapter contracts và route mapping dự kiến (design, chưa phải endpoint được triển khai)

Tất cả kết quả provider mới gồm `{source: mock|provider, checkedAt, status, data?, errorCode?}`. Mock không trả trạng thái delivered/synced như thực. Live adapters không được fallback thành mock-success âm thầm. Mutation không retry khi outcome chưa rõ.

| Provider | Internal input → output | Route/auth tái sử dụng hoặc bổ sung |
| --- | --- | --- |
| GHN | ShippingProvider contract hiện có → quote/shipment/tracking | Giữ /shipping/quote, /shipping/webhooks/ghn, /shipping/track/:orderId, /admin/shipping/*; không copy suggested endpoints của plan |
| Resend | eventType/orderId/recipient/templateVersion + rendered content → accepted/providerMessageId; delivered chỉ từ callback verified | MailService producer + worker nội bộ; future admin deliveries ADMIN/STAFF, không public send endpoint |
| Gemini | bounded message/history + sanitized active catalog → text + verified SKU refs | /chat/message và /chat/stream; giữ throttling; không thêm /ai/product-advisor trùng |
| pgvector | locale/query/price/category/availability → ranked catalog IDs | GET /products search hiện có; FTS fallback trước, vector flag off; không thêm /catalog/search nếu không cần |
| Cloudinary | admin validated image bytes + source checksum → publicId/variants/originalUrl | /storage/upload/product-image ADMIN; không public unsigned uploads |
| Google | Supabase PKCE code/session, provider subject → Supabase user/session | Login + /auth/callback giữ hiện tại; Nest verify Supabase session, Google ID token verification thuộc Supabase nếu tiếp tục flow đó |
| GA4 | consent + allowlisted ecommerce fields → queued/suppressed | Shared FE collector, không API báo doanh thu; purchase sau confirmed payment, transaction_id duy nhất; không phát purchase trên success-page mount |
| GSC | verified site/date/dimensions/startRow/rowLimit → top rows + data freshness | New /admin/seo/search-console/summary (read), /sync (ADMIN only), cả AuthGuard và RolesGuard; staff chỉ read nếu cho phép rõ |
| PSI | allowlisted public URL + mobile/desktop → nullable lab/field metrics + fetchedAt | New /admin/performance/audits/read và /run ADMIN only, scheduled lock; không gửi cookies/checkout PII |
| Merchant | published catalog + effective price/stock/locale canonical + datasource → pending/accepted/rejected/unknown | Giữ POST /merchant/sync ADMIN; bổ sung status/delta trong module cũ; không trả success khi batch có lỗi |
| Turnstile | token(max2048) + expected route action/hostname → verified/rejected/unavailable | Guard trên public contact/review/voucher-claim khi có claim route; voucher validate không phải claim. Signup do Supabase quản lý: kiểm tra hỗ trợ CAPTCHA trước, không thêm local signup API giả |

All new flags default OFF; chưa tạo adapter production hoặc gọi provider trong Phase0. Chỉ có mock infrastructure sau khi gate repository được ghi nhận. Các contract trên phải được refine theo endpoint chính thức trước mỗi batch.
