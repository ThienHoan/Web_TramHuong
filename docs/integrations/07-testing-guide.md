# Cách kiểm thử hạ tầng tích hợp

## Dashboard vận hành + rollback tích hợp (P9-02) — 05/11/2026

`pnpm --dir apps/api run test:ops`: 2 suite Jest (29 cases) + kiểm thử tích hợp
cài 8 migration vào một PGlite, chạy service thật (GA4, thông báo, Merchant,
GSC, PSI), đối chiếu số liệu dashboard rồi chạy toàn bộ script pause (59 checks).
Xem panel: `QA_API_PORT=4411 QA_WEB_PORT=4410 pnpm --dir apps/api run demo:analytics -- --ops-metrics-fixture`
rồi mở http://localhost:4410/vi/integration-lab/analytics. Chi tiết: [29](./29-ops-metrics-dashboard.md).

## Merchant send fence (P8-03) — 05/11/2026

`pnpm --dir apps/api run test:merchant-queue`: 4 suite Jest (85 cases) + workflow
P8-02 (24 checks) + kiểm thử fence hai worker (52 checks) trên PGlite. Kỳ vọng
`sendOrder` là giá cũ rồi giá mới nhất, `deferred:1` khi worker thứ hai gặp sản
phẩm đang gửi. Không gọi Google. Chi tiết và rollback: [28](./28-merchant-send-fence.md).

## Notification, media, Merchant — cập nhật05/11/2026

FullAPI58suites/816testsPASS. `test:notifications` gồm source/SMTP/provider/HTTP
và exactSQL37 +actualTSworkflow19checks; `test:merchant-queue` gồm mapper/service/
HTTP và exactSQL/TS24checks, có A→B→A/restart/UNKNOWN/roles/pause. Không realmail,
Google hoặc hostedwrites. `benchmark:media` đo12ảnh local, không Cloudinary/CWV.
[Hướng dẫn kích hoạt](./23-activation-guide.md) có flags/SQL/API/rollback và giới hạn;
đây chưa phải tất cả phase live hoàn tất. Các số liệu các batch bên dưới là lịch sử.

## FTS và chat nối thật vào catalog — cập nhật05/11/2026

`pnpm --dir apps/api run test:catalog-search` →5suites/106tests+58PostgreSQL
in-memory checksPASS. `pnpm --dir apps/web run test:chat` →4client/SSEtestsPASS.
FullAPIhiện55suites/757PASS. Labanalytics đã có ChatModule thật dùng catalog mẫu:
mở chat và hỏi **Sản phẩm mẫu dưới 200k**; bản `/en/` hỏi **sample item under200000VND**
(có thể dùng khoảng trắng giữa under và số). Kỳ vọng thẻ sản phẩm100000VND,
không gọi Gemini/Google/Supabase thật. Widget vẫn giữ bố cục hiện có.
Chat hiện là catalog assistance; không dùng lịch sử để tạo freeform model answer.

FTS mặc địnhtắt; chưa cài trên Supabase. GóiSQLtestDB/máyđo/metadata/pause trong
[19-catalog-fts.md](./19-catalog-fts.md). Khi chưa cài hoặc RPC lỗi, advisor dùng
bounded_keyword/100candidates cùng searchFallbackReason rõ ràng; flag không đủ
để chứng nhận hosted search đã chạy. Không cần embeddings/Gemini key để test.

## Các batch kết nối mới05/11/2026

Chạy `pnpm --dir apps/api run test:connections` →7suites/113testsPASS;
`pnpm --dir apps/web run test:connections` →7health+19OAuth testsPASS.
API tests chỉ mở localhost/mock auth/DB/provider, không cần credentials hoặc
server có sẵn. Web tests không network. FullAPI52suites/692testsPASS và web
analytics59testsPASS. Mở lab bằng `pnpm --dir apps/api run demo:analytics` rồi
vào `http://localhost:4400/vi/integration-lab/analytics` để xem panel11tích hợp.
Lab hiển thị cấu hình fixture, không đọc env/provider thật. Dashboard ADMIN chính
có panel tương tự gọi health API bằng session thật sau khi backend được restart.
Routes mới, browser checks, giới hạn và blockers trong
[18-connection-status-and-acceptance.md](./18-connection-status-and-acceptance.md).

## 1. Chạy kiểm thử tự động trên máy

Tại terminal:

```bash
cd /Users/thienhoannha/Documents/Du_An/Web_TramHuong/apps/api
pnpm run test:integrations
```

Không cần bật web/backend server hoặc điền API key cho lệnh này. Script chạy lần lượt các Jest tests có services được mock và hai PostgreSQL in-memory fixtures; không load app bootstrap/cron hay kết nối Supabase, SMTP, ngân hàng, GHN hoặc provider mới. Fixtures có thể insert/update/rollback dữ liệu giả trong PostgreSQL memory; không phải dữ liệu trên Supabase của bạn.

Kết quả thực chạy03/11/2026:

| Kết quả cuối | Kiểm tra |
| --- | --- |
| 15 suites,137 tests passed | Flags mặc định off/kill switch, live blocked, timeout, read retry, mutation unknown outcome, circuit/concurrency, mock quota/rate, repository/consumer, contact protection và log privacy; thêm hồi quy orders/payment/voucher/auth/GHN config |
| checks42, migration=PASS, rollback=PASS | Quyền hồ sơ/blog/order/contact, giữ service-role backend và rollback/reapply |
| checks57, schema=PASS, pause=PASS | Outbox dedupe/lease/version/recovery, durable mock quota/hard stop/warnings, pause giữ dữ liệu |

Có thể thấy log ERROR SHIPPING_QUOTE_EXPIRED/SHIPPING_QUOTE_REQUIRED hoặc amount mismatch từ các tình huống chủ động kiểm tra từ chối request. Xem trạng thái PASS/FAIL cuối bộ và exit code: không coi mọi dòng ERROR trong negative test là test thất bại. Script dừng ngay nếu một bước trả exit code khác0. No dependencies/billing được thêm.

## 2. Kiểm tra metadata thực trên Supabase thử nghiệm

Mở `docs/integrations/verify-installed-foundation.sql`, copy toàn bộ và chạy SQL Editor đúng test project. Đây là **một SELECT chỉ đọc metadata**; không đọc rows khách hàng, không gọi claim/finish/reserve RPC hay tạo event/usage.

- PASS: điều kiện metadata cụ thể khớp cấu hình dự kiến.
- FAIL: quyền/RLS/EXECUTE khác dự kiến; gửi bảng kết quả14dòng để đối chiếu, không chạy lại migration mù.
- CHUA_CAI: bảng/RPC outbox chưa cài. Nếu mới chạy permission migration, kỳ vọng9PASS +5CHUA_CAI. Nếu cả hai migrations đã chạy và chưa pause, kỳ vọng14PASS. Nếu đã chủ động pause,3RPC checks trả FAIL là đúng tác dụng pause.

Checker đã được thử local trước cài, sau permission-only, sau đủ hai migrations (14PASS) và sau pause (3RPC checks FAIL). Không suy metadataPASS là end-to-end provider acceptance. SQL Editor mặc định chạy quyền postgres, vì vậy `SELECT * FROM users` ở đó không đại diện quyền CUSTOMER; dùng fixtures có SET ROLE và luồng web để kiểm tra quyền người dùng.

## 3. Kiểm tra giao diện đang có

Trên website local với backend kết nối DB thử nghiệm và tài khoản đã có:

1. Đăng nhập CUSTOMER → Hồ sơ → đổi tên → lưu → reload: tên mới giữ lại, session không bị mất.
2. Mở danh sách/lịch sử đơn của chính tài khoản: tải được dữ liệu được phép.
3. Đăng xuất → xem blog đã xuất bản: đọc được nội dung public.
4. Đăng nhập ADMIN/STAFF → quản trị blog/hồ sơ theo quyền: backend tải được dữ liệu; direct-client writes bị chặn theo thiết kế.
5. Thử thêm sản phẩm vào giỏ, áp voucher, mở checkout và kiểm tra tổng tiền/địa chỉ. Dừng trước xác nhận đặt đơn/thanh toán thật để giữ đúng phạm vi test không giao dịch của Master Plan.

Đăng ký OTP/email delivery và SePay/GHN thật là acceptance riêng cần quyền trước; fixtures local không chứng minh những đường đó đã hoạt động thực. Không cần gửi password, access token hay thông tin khách hàng để báo lỗi; chỉ gửi thao tác, thông báo lỗi/status và thời điểm.

## 4. Demo form liên hệ mới

Chạy `pnpm --dir apps/api run demo:contact-protection` từ repository root, mở http://localhost:4400/vi/contact. Đây là fixture local, lưu RAM và không cần API key/Supabase. Trong terminal khác chạy `pnpm --dir apps/api run test:contact-http`: kỳ vọng18assertions PASS. Hướng dẫn và giới hạn đầy đủ trong [08-contact-protection.md](./08-contact-protection.md).

## Phạm vi chưa có trên UI

Executor/outbox/quota hiện là nền backend; chưa có màn hình quản trị để bấm mô phỏng timeout/quota, đã có consumer mock gọi tường minh nhưng chưa có cron worker/producer source hooks hay API adapter thực được kích hoạt. Các bài test tự động mới là cách kiểm tra logic này ở phiên bản hiện tại. Ngoại lệ là contact mock với flag bật trong development/test; không phải chống bot Cloudflare thật. All new integrations remain default OFF; credentials/real-provider staging acceptance được theo dõi riêng.


## 5. GA4 mock và consent (P2-01a)

Từ repository root chạy pnpm --dir apps/api run demo:analytics, mở http://localhost:4400/vi/integration-lab/analytics (hoặc /en/). Chờ Mode:mock, thử Từ chối→đổi giỏ (events0), Đồng ý→thêm/tăng/xóa (payloadVND), rồi rút consent (buffer rỗng). Nút purchase giả không được sinh purchase. Lab chỉ nằm trong bản Next tạm, không phải route production. Hai demo dùng chung4400/4401 nên dừng demo cũ trước.

Chạy logic: pnpm --dir apps/web run test:analytics →35PASS; policy/RBAC: pnpm --dir apps/api run test:analytics →13PASS, không cần credentials. API test mở cổng localhost tạm. Không phải DebugView/Google test. Xem [09-ga4-mock-collector.md](./09-ga4-mock-collector.md) cho file manifest, giới hạn, privacy, rollback và phần purchase còn lại.


## 6. Purchase server mock (P2-01b)

Lệnh demo: pnpm --dir apps/api run demo:analytics. Phần Purchase từ server giả lập: chọn consent→đơn mẫu pending (not_eligible/0)→giả lập paid→capture (recorded/1)→bấm lại hoặc reload (duplicate/1). Cả source và outbox là PostgreSQL giả tại máy, không gọi SePay hoặc ghi Supabase. Khác P2-01a, purchase được giữ trong fixture server, không phải buffer frontend.

pnpm --dir apps/api run test:analytics chạy43APItests và73SQLchecks+40roundingcases. pnpm --dir apps/web run test:analytics hiện43tests. Khi demo còn chạy, pnpm --dir apps/api run test:purchase-http chạy26checks với auth/owner/paid/dedupe/6concurrentrequests. [10-purchase-capture.md](./10-purchase-capture.md) có file manifest, hướng dẫn install testDB, checker3metadata, flags/rollback và blockers. Không cần chạy SQL để xem demo. Chưa cài migration trên hosted project; không chạy lại permission migration đã báo thành công.

## 7. Search Console mock (P2-02a)

Chạy `pnpm --dir apps/api run test:seo` (4 suite Jest có HTTP loopback + kiểm thử SQL lưu trữ bền vững 50 checks trên PGlite, cập nhật05/11) và `pnpm --dir apps/web run test:seo` (8 schema/fetch tests, không network). Bật lưu DB thử nghiệm: xem [26](./26-search-console-durable-store.md). Không cần Google credentials hoặc SQL. Full API regression04/11:39suites/416testsPASS. Bộ script có thể cần quyền mở cổng loopback trong sandbox; không dùng AppModule hoặc env thật.

Demo chung `pnpm --dir apps/api run demo:analytics`, mở [lab tiếng Việt](http://localhost:4400/vi/integration-lab/analytics). Panel Search Console ở đầu trang dùng synthetic admin token **chỉ trong file QA**, server vẫn chạy AuthGuard/RolesGuard thật. Đây không phải tài khoản Supabase. Nhấn Đồng bộ mẫu: xuất hiện14 ngày Pacific,2 ngày thiếu,4 truy vấn,1 trang sản phẩm CTR thấp. Bấm lại không cộng trùng. Ba lượt sync liên tiếp trong cùng phút có thể chạm30read attempts/phút, báo quota và giữ timestamp/bảng cũ; chờ phút sau thử lại. Daily hard cap100attempts/process, restart demo reset RAM/budget. Không gọi Google.

Trong ứng dụng chính, panel ở `/{locale}/admin/dashboard` dùng session hiện hữu; flagfalse thì ẩn panel, POST503. Bật mock thử bằng FEATURE_SEARCH_CONSOLE_SYNC_ENABLED=true + NODE_ENV development/test và INTEGRATIONS_ENV=mock, kill switchfalse; không sửa env thật tự động. Staging/production bị chặn dù có flag. Chỉ ADMIN đọc/sync, STAFF/CUSTOMER403, guest401. Lịch job luôn tắt và GET không sync. Không đổi scope của dashboard doanh thu.

Xem [11-search-console-mock.md](./11-search-console-mock.md) cho contract, file manifest, kết quả thực tế, blockers và rollback. Dữ liệu mẫu RAM không được coi là durable incremental upsert hoặc chứng nhận GSC live/Phase2 hoàn tất.

## 8. PageSpeed diagnostics mock (P2-03a)

`pnpm --dir apps/api run test:pagespeed`: 4 suite Jest (87 cases, có HTTP loopback) + kiểm thử SQL lịch sử bền vững 58 checks trên PGlite (cập nhật05/11). `pnpm --dir apps/web run test:pagespeed`: 11 schema/fetch cases, không network. Bật lưu lịch sử vào DB thử nghiệm: xem [27](./27-pagespeed-durable-history.md). Không cần API key, SQL hoặc Supabase credentials. FullAPI04/11:41suites/470testsPASS; APIbuild/scopedlint/webtsc/scopedlintPASS.

Demo `pnpm --dir apps/api run demo:analytics`, mở [lab](http://localhost:4400/vi/integration-lab/analytics), tìm **PageSpeed · Mẫu**. Chọn URL/mobile→Đo mẫu:4Lighthouse scores, labLCP/CLS/TBT và1history. Bấm lại:cached/history1. Bấm **PageSpeed mẫu: sang ngày mới** rồi đo lại:history2 và4regression warnings (86→71points,2200→3000msLCP,0.04→0.12CLS,160→410msTBT, ngày giả05→06/11/2026). Đồng hồ này chỉ trong RAM, không đổi OS/GSC/GA4. Ngày giả luân phiên nhanh/chậm; bước tiếp có thể cải thiện.

Desktop/URLkhác có history/baseline riêng. Mở Lịch sử mẫu, tối đa30/pair. FieldLCP/INP/CLS luôn trống ở batch này; không giả định CrUX sẵn có hoặc đổi TBT thành INP. Số liệu lab cũng là giả, không đại diện hiệu năng website hiện tại.

App chính mount ở admin/dashboard, ADMIN-only; flagfalse ẩn panel/POST503. Chỉ mock/development-test, kill switch/staging/production chặn. GETkhôngđo, không polling/cron/provider script. Whitelist fixtureorigin `.invalid`; URL live cần duyệt. Cartdrawer/checkout/private/transactionpages loại khỏi đo. RollbackFEATURE_PAGESPEED_AUDIT_ENABLED=false+restart/reload, không SQLcleanup. Xem [12-pagespeed-mock.md](./12-pagespeed-mock.md) cho files/thresholds/blockers; không suy fullPhase2/livePSI hoàn tất.


## 9. GA4 local browser reporting test (P2-LIVE-02)

See14-ga4-local-browser-test.md. Fromapps/api: node scripts/demo-contact-protection.cjs --analytics --ga4-local-test-fixture usesfakeGoogle204. Actualoperator-only node scripts/demo-contact-protection.cjs --analytics --ga4-live-test readslocalGA4credentials, dedicatedteststream, allowsMAX1reportingattempt/run. Do notstartactualmode withoutownerpermission: this sends /mp/collect ratherthan/debug. Inlab top panel firstdenyprivacy(buttondisabled), grant/readcopy, thenmanualsendlocal_test_action. No eventbeforeclick; ecommerceunderpanelstillmock. OpenGoogleAnalyticsTestproperty->Admin->Hiển thị dữ liệu->DebugView toconfirmingestion. HTTPaccepteddoesnotproveingestion. Do notrepeatifresultunknown. Ownerauthorized04/11actualHTTP204once, DebugViewpending.

API45suites534tests/web46logic testsPASS forbatch; contact18HTTP/purchase26HTTPregressionsPASS. Productdebugflagdefaultfalse; .envrealnotedited. StopownQAprocess ordisableflag/restart forrollback. No browsercookies/GoogleSDK/productionfinancialevents.


## 10. Funnel localhost có consent (P2-LIVE-03)

Dừng lab cũ dùng cổng4400/4401. Từ `apps/api` chạy `node scripts/demo-contact-protection.cjs --analytics --ga4-funnel-fixture`, mở `/vi/integration-lab/analytics` hoặc `/en/` trên localhost4400. Đây là **transport giả, không gọi Google**. Chọn Đồng ý ở quyền riêng tư → bấm Bật phiên thử funnel → xem/chọn sản phẩm, thêm/xóa giỏ và mở checkout. Chỉ thao tác mới được chuyển tiếp, không gửi lại lịch sử. Nút purchase giả phải bị chặn. Thu hồi consent: phiên tắt, nút bật bị khóa, giỏ hàng vẫn dùng được. Tải lại/đổi locale cũng đóng phiên.

Đã kiểm thử05/11:46API suites/576tests+3casebổsung,55web logic, contact18HTTP và purchase26HTTP PASS;22requests qua transport giả trong browser cuối, đủ8tên sự kiện, zero Google. Phiên thử15phút/20attempts, hàng đợi10/TTL30giây, không retry; quota server process100/ngày và30lần/phút, không phải quota distributed. Chi tiết, manifest, hạn chế và lệnh opt-in kiểm thử Google thật **chưa chạy trong batch này** tại [15-ga4-local-funnel.md](./15-ga4-local-funnel.md). Các flag thật vẫn mặc định OFF; không cần sửa SQL, không gửi secret vào chat.


## 11. Phiên tự tắt / hết lượt (P2-LIVE-03d)

Giới hạn20lượt của bản live lab là **cho cả đợt chạy máy chủ**, không cấp lại khi bạn bấm Bật phiên thử. Khi hết lượt, UI mới báo rõ nguyên nhân và khóa bật lại trên trang đó. Hết15phút, consent, tài khoản, policy, quota và lỗi mạng có thông báo riêng; không tự gửi lại sự kiện chưa rõ kết quả. Mã phiên trên panel đối chiếu với ga_session_id trong DebugView, không phải nhãnweb chung.

Thử an toàn bằng transportgiả: chạy `node scripts/demo-contact-protection.cjs --analytics --ga4-funnel-limit-fixture` từ apps/api; trên process mới chạy `node scripts/verify-ga4-test-limit.cjs`. Sau20fakeacceptances, lượt tiếp theo/duplicate phải blocked/test_limit, Googlecalls0. Vào lab bậtphiên+thêmgiỏ: thấy thông báo hết lượt, không chỉ “đã tắt”. Xem [16-ga4-session-diagnostics.md](./16-ga4-session-diagnostics.md). Không tự reset hoặc tăng quota live để che lỗi; mở đợt live mới là thao tác vận hành riêng.
