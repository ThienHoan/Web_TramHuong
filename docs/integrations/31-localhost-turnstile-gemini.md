# Hai batch localhost — Turnstile và Gemini Free

Cập nhật 05/11/2026 (Asia/Ho_Chi_Minh). Theo yêu cầu của chủ dự án: kiểm tra
phần đã có và đưa hai dịch vụ vào phase tương ứng. Đây là **kế hoạch triển khai
và nghiệm thu**, chưa phải bằng chứng hai API đã được nối hoặc gọi thật.

Chủ dự án đã chọn **Gemini Free — thử trên localhost** trong chat này. Không tự
bật billing hoặc chuyển model trả phí. Chính sách payload của batch: chỉ catalog
công khai; không gửi câu hỏi tự do, lịch sử chat, danh tính hay dữ liệu khách hàng.
Hạn mức số cụ thể và model còn phải chốt trước lần chạy thật.

## 1. Kết quả kiểm tra và phạm vi giao nhau

| Phần | Hiện trạng đọc từ code | Batch tiếp theo |
| --- | --- | --- |
| Turnstile, Phase 1 | `SiteverifyTurnstileAdapter` đã có fixed endpoint, timeout, giới hạn body và fake-transport tests; `ContactProtectionService` chỉ khởi tạo mock; form chỉ hiểu disabled/mock/unavailable | **P1-03b** — nối widget + Siteverify với khóa thử Cloudflare trên localhost |
| Gemini, Phase 5 | JSON/SSE chat đã dùng `CatalogAdvisorService`; advisor hỗ trợ catalog/FTS và mock ID selection; không còn gọi SDK Gemini từ `ChatService`; `liveModelAvailable=false` | **P5-01c** — adapter Gemini Free, payload catalog và hạn mức token bền vững |

**P5-01b đã dùng cho việc nối JSON/SSE chat vào catalog**, không dùng lại mã đó
cho adapter thật. P1-03 mock và P5-01a/b vẫn giữ bằng chứng nghiệm thu cũ.

Hai batch không cần sửa orders, SePay, GHN, vouchers, SMTP, GA4, Search Console,
PageSpeed hoặc Merchant. Tuy vậy, chúng **không hoàn toàn độc lập về file**:

- Turnstile sẽ sửa `integrations/contact-protection.service.ts`,
  `integrations/integrations.module.ts`, hook/widget contact và tests tương ứng.
- Gemini sẽ sửa `chat/chat.module.ts`, `chat/catalog-advisor.service.ts` và
  adapter/tests mới; giữ hợp đồng JSON/SSE và giá/tồn kho từ catalog.
- Điểm chung cần sửa lần lượt: `integrations/integrations.config.ts` nếu mở chế
  độ mới, `.env.example`, health API/schema/UI nếu thêm mode, và progress docs.
  Không đổi tên/mock mode thành live hoặc dùng `runMock` cho transport thật.
- `integration-delivery-foundation.sql` và repository quota hiện là mock-only;
  nếu cần mở quyền dùng cho live thì đó là thay đổi chung phải review riêng.

Trong lượt kiểm tra này chỉ cập nhật tài liệu, không sửa các file runtime trên,
không sửa `.env`, không dừng/restart server hoặc dùng cổng lab của phiên khác.
Snapshot chat Codex “Hoàn thành kết nối các phase” là `systemError` do giới hạn
sử dụng; không có bằng chứng trực tiếp về trạng thái phiên Claude bên ngoài.
Trước khi triển khai code: đọc lại progress, `git status` và diff hiện tại; tách
file adapter/tests trước, nối các file chung tuần tự sau khi kiểm tra thay đổi
mới. Không checkout/reset/stash đè phần đang có.

## 2. P1-03b — Turnstile khóa thử, form liên hệ localhost

Không phụ thuộc việc cài toàn bộ SQL trong hồ sơ live-readiness. Giữ mock hiện
có; thêm đường thử Cloudflare có opt-in riêng, default OFF và kill switch.
Chỉ development/test + loopback, khóa thử cố định; chặn production/staging trong
batch này. Không yêu cầu tài khoản Cloudflare cho đường dummy-key.

Checklist triển khai:

- [ ] Nối adapter đã có vào policy/service hiện hữu, không tạo ContactsModule
  thứ hai. Tách rõ mock nội bộ, Cloudflare test transport và production chưa hỗ trợ.
- [ ] Nối widget explicit-render vào form hiện hữu; load script chỉ khi opt-in,
  cleanup/reset sau submit, callback expiry/error khóa gửi và có retry VI/EN.
  Kiểm tra CSP với `challenges.cloudflare.com`; không nới `*` toàn site.
- [ ] BE xác minh trước persistence; không gửi tên/email/message contact hoặc
  remote IP trong request Siteverify của batch thử. Chỉ token + dummy secret.
- [ ] Giữ kiểm tra hostname/action/tuổi token trên đường thật; xác minh hành vi
  dummy response riêng, không nới production checks để làm dummy test pass.
- [ ] Lệnh nghiệm thu chạy fixture contact lưu RAM, bind loopback, cổng riêng
  không trùng listener đang có. Không boot toàn AppModule/cron/Supabase/SMTP.
- [ ] Fake-transport tests: success/fail/replay-key, sai origin/action/hostname,
  timeout/body lỗi, flag off/kill switch, production reject và không persist khi
  verify thất bại. Browser: desktop/mobile, expiry/reset/error, không tràn ngang.
- [ ] Sau khi chủ dự án duyệt lệnh và payload cụ thể: tối đa **1 POST Siteverify**,
  không retry tự động, báo rõ HTTP/provider result; test widget có thể tạo request
  Cloudflare riêng nên không tính là toàn bộ phiên chỉ có một network request.

Cloudflare công bố dummy keys dùng được trên localhost và bộ pass/fail/spent để
kiểm tra các nhánh. Dummy success **không chứng minh chống bot thật**, single-use
và hostname/action production vẫn cần nghiệm thu với widget thật sau này.
Nguồn: [Testing](https://developers.cloudflare.com/turnstile/troubleshooting/testing/),
[Siteverify](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/).

Rollback dự kiến: tắt opt-in + restart đúng process của batch; bỏ script/widget
khỏi phiên thử. Không xóa contact hay chỉnh schema. Chưa đánh dấu P1-03b hoàn tất.

## 3. P5-01c — Gemini Free, catalog-only và token budget

Chọn Free không chứng minh key hiện tại thuộc project chưa bật billing, model
còn free hoặc quota còn khả dụng. Cần xác nhận project/model trước khi chạy;
không gọi API chỉ để thăm dò và không tự đổi model khi nhận 429/quota error.

Checklist triển khai:

- [ ] Dùng ChatModule/advisor hiện có; adapter transport inject được để kiểm thử
  offline; audit SDK có sẵn trước khi chọn REST/SDK, không thêm SDK trùng.
- [ ] Allowlist payload: ID/tên sản phẩm công khai đã lọc active/in-stock, thứ tự
  retrieval và chỉ dẫn cố định. Không chuyển tiếp raw query/history, contact,
  cookies, user/order/session IDs, tokens hoặc mô tả sản phẩm tùy ý. Tìm/lọc theo
  câu hỏi và ngân sách ở server; JSON model chỉ trả tối đa 5 ID thuộc candidates.
- [ ] Re-read catalog và dựng lại slug/link/giá/stock từ DB như advisor hiện có;
  không dùng freeform model text làm thông tin có thẩm quyền. Lỗi/ID lạ/quota
  hết trả catalog fallback, giữ JSON/SSE tương thích, không chặn mua hàng.
- [ ] Chốt model free hỗ trợ structured output, max input/output/thinking tokens,
  trần calls/ngày và tokens/ngày. Không coi RAM counter hay `maxOutputTokens`
  riêng lẻ là giới hạn tổng token/ngày.
- [ ] Reuse `integration_usage_daily`/reservation RPC nếu phù hợp, nhưng hiện
  repository/RPC mock-only chưa cho quyền live. Thiết kế phần mở rộng tối thiểu
  trước khi sửa; chỉ cài TEST DB khi có quyền, không giả định đã có migration.
- [ ] Reserve nguyên tử phần token tối đa trước generation, tính cả đầu vào,
  đầu ra/thinking và request count; reserve cả countTokens nếu dùng. Dùng ngày
  UTC của DB; concurrent calls/restart không reset quota; storage lỗi thì không
  gọi provider. Timeout/unknown không trả lại reservation hoặc tự retry.
- [ ] Offline tests: payload không chứa PII/raw query/history, ID giả, prompt
  injection, fresh price/stock, timeout/429/malformed response, concurrent quota,
  restart/day rollover, thiếu/paused DB quota và fallback. Model/usage chưa có
  bằng chứng thì health không báo live-ready.
- [ ] Sau khi duyệt model, hạn mức, payload và lệnh: tối đa **1 generateContent**
  với catalog giả/công khai. Nếu cần countTokens phải liệt kê và xin duyệt thêm
  request đó trước; không ngầm mở thêm call hoặc billing. Ghi usage thật nếu có,
  unknown thì giữ reserved amount; không ghi prompt/response chứa dữ liệu riêng.

Điều khoản Unpaid Services cho phép Google dùng input/output để cải thiện sản
phẩm và có human review; vì vậy batch chỉ gửi catalog công khai. Chính sách này
không tương đương cam kết zero retention. Nguồn:
[Gemini terms — Unpaid Services](https://aistudio.google.com/docs/terms#unpaid-services),
[Structured output](https://aistudio.google.com/docs/structured-output).

Rollback dự kiến: tắt live opt-in/feature flag + restart đúng process; chat tiếp
tục dùng catalog/FTS. Giữ quota ledger để không mở lại hạn mức trong cùng ngày.
Không sửa billing. Chưa đánh dấu P5-01c hoàn tất.

## 4. Thứ tự và nghiệm thu

1. P1-03b: code + fake transport + fixture/browser offline → duyệt lần gọi
   Cloudflare → nghiệm thu test-key transport; production gate vẫn mở.
2. P5-01c: chốt model/hạn mức Free + thiết kế quota → adapter/fake transport +
   TEST DB quota tests → duyệt từng request → nghiệm thu Gemini Free localhost.
3. Đồng bộ health/progress theo bằng chứng thực tế. Không đóng toàn Phase 1/5
   chỉ bằng một lần provider trả 200.

Lượt rà soát này đọc source và chạy lại 6 suites contact/chat hiện có; kết quả
thực tế ghi trong `implementation-progress.md`. Không có API authenticated,
hosted SQL, billing, `.env` change, commit hoặc push trong lượt này.
