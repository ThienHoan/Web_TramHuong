# Hướng dẫn cài TramHuong Smart Logistics trên staging

Cập nhật 2026-11-01. Các thao tác bên dưới do bạn chạy trên môi trường dev/staging. Chưa có SQL hoặc request GHN thật nào được agent thực hiện.

## 1. Chọn đúng Supabase

Localhost là nơi chạy web/API; database vẫn là project trong SUPABASE_URL. Chọn project dev/staging đã có schema dự án (users, products, orders và các bảng liên quan). Một project trống chưa thể chạy migration logistics. Không dùng dữ liệu khách thật để thử vận đơn.

API và web phải cùng project:
- apps/api/.env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.
- apps/web/.env.local: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY.
- Service-role chỉ ở backend. Giữ các biến khác đang có; không chép đè cả file .env bằng ví dụ.

Tài khoản admin phải là user hợp lệ của project staging. Schema cũ cần có transition_order và order integrity đã triển khai trước đây. Khi chuyển project, các cấu hình Auth/Google callback hiện có cũng cần tương ứng với project đó.

## 2. Dán SQL cài đặt lần đầu

Mở docs/shipping/install-smart-logistics.sql, Ctrl+A rồi Ctrl+C. Hoặc chạy PowerShell:

~~~powershell
Get-Content -LiteralPath 'F:\Web_TramHuong\docs\shipping\install-smart-logistics.sql' -Raw | Set-Clipboard
~~~

Lệnh này chỉ sao chép file, không chạy database.

Trong Supabase của đúng project: SQL Editor → New query → dán toàn bộ → Run, dùng vai trò quản trị SQL của project.

File gộp chính xác hai migration smart-logistics.sql và shipping-evidence-storage.sql trong một transaction, có kiểm tra schema trước. Nó tạo bảng/RPC/RLS/trigger, private bucket và chính sách ảnh. Không thêm sản phẩm, đơn mẫu hoặc kho giả; không tạo vận đơn.

Chạy một lần. Nếu báo bảng shipping đã tồn tại, dùng file kiểm tra ở bước 3. Không DROP bảng để chạy lại. Nếu bạn đã chạy riêng migration thứ nhất, không chạy file gộp: kiểm tra kết quả rồi chỉ áp dụng migration storage còn thiếu. Một bucket shipping-evidence đã public hoặc policy trùng tên cần được kiểm tra riêng.

## 3. Kiểm tra kết quả

Mở docs/shipping/verify-setup.sql, dán vào một New query rồi Run. File chỉ đọc schema/policy, không trả dữ liệu khách hoặc secret.

Kết quả mong đợi:
- Hai bảng và bốn RPC shipping installed=true.
- existing_order_transition_rpc=true. Nếu false, kiểm tra migration admin-order-integrity.sql cũ trước khi vận hành đơn.
- Hai bảng rls_enabled=true.
- shipping_tracking có policy shipping_tracking_owner; shipping_records không cấp quyền trực tiếp cho browser.
- Bucket shipping-evidence: public=false, file_size_limit=2097152, allowed_mime_types={image/jpeg}.
- Storage policy shipping_evidence_server_only là RESTRICTIVE.
- Publication supabase_realtime chứa shipping_tracking, không chứa shipping_records.
- Bảng orders có các trường ứng dụng đang dùng, gồm transaction_code cho SePay. Nếu thiếu, không tự đoán kiểu dữ liệu; cần đối chiếu schema trước khi thử payment.

Migration tự thêm projection vào publication nếu publication đã tồn tại. Nếu chưa thấy shipping_tracking, mở Database → Publications, tìm supabase_realtime và bật đúng shipping_tracking. Không bật shipping_records hoặc bỏ RLS để chữa lỗi tracking.

Không cần tự tạo bucket public hay viết policy upload cho khách. API nhận ảnh JPEG/PNG, chuyển thành JPEG và upload bằng service role.

## 4. Lấy GHN staging

Vào https://developer.ghn.dev → đăng nhập → menu tài khoản → Quản lý token → Token API. Thực hiện xác thực theo portal rồi copy token. Lấy ShopId của shop staging thuộc tài khoản đó. Token production và staging không dùng thay nhau.

Tài liệu: https://developer.ghn.vn/vi/docs/token/get-token

Không gửi token hoặc service-role vào chat. Nếu chưa có quyền staging/token/shop, giữ GHN_ENABLED=false; vẫn kiểm tra được schema và cấu hình nội bộ, nhưng chưa có báo giá hoặc vận đơn thật.

## 5. Thêm cấu hình backend

Thêm/chỉnh đúng các biến dưới đây trong apps/api/.env, thay các placeholder trước khi bật:

~~~dotenv
GHN_ENABLED=true
GHN_ENV=staging
GHN_TOKEN=TOKEN_STAGING_CUA_BAN
GHN_SHOP_ID=SHOP_ID_SO_NGUYEN_CUA_BAN
GHN_TIMEOUT_MS=8000
GHN_READ_RETRIES=1
GHN_WEBHOOK_SECRET=CHUOI_NGAU_NHIEN_IT_NHAT_32_KY_TU

SHIPPING_CHECKOUT_ENABLED=false
SHIPPING_FULFILLMENT_ENABLED=false
SHIPPING_JOBS_ENABLED=false
~~~

Tạo secret tại máy bạn, rồi tự dán vào .env:

~~~powershell
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
~~~

Không đưa biến GHN vào NEXT_PUBLIC. Không thay GHN_ENV thành production.

Dừng tiến trình API cũ bằng Ctrl+C trong terminal đang chạy nó, rồi khởi động lại sau khi đã xác nhận Supabase dev/staging:

~~~powershell
Set-Location 'F:\Web_TramHuong\apps\api'
npm run start:dev
~~~

Terminal web riêng:

~~~powershell
Set-Location 'F:\Web_TramHuong\apps\web'
npm run dev
~~~

Nếu hai tiến trình đã chạy, dừng từng tiến trình cũ trước khi chạy lại để tránh trùng port. Thay .env.local của web cũng cần restart web.

Mở http://localhost:4000/api/shipping/status. Khi có credential và GHN_ENABLED=true, expected enabled=true, checkoutEnabled=false. Đây chỉ là kiểm tra cấu hình, không chứng minh token gọi được GHN.

Kiểm tra master data qua http://localhost:4000/api/shipping/addresses/provinces. Lỗi quyền/token phải sửa trước bước tiếp theo; không đổi sang production để thử.

## 6. Nhập kho và đóng gói

Đăng nhập ADMIN, mở http://localhost:3000/vi/admin/shipping.

1. Tab Kho: tên, ShopId staging, mã huyện GHN legacy của kho, khối lượng vỏ hộp và đệm thực đo, bật hoạt động.
2. Tab Đóng gói: UUID sản phẩm, tên biến thể nếu có, grams và ba chiều cm thực đo. Mỗi biến thể dùng một profile; không điền tên danh mục thay UUID. Giá vốn là tuỳ chọn, chỉ nhập khi biết.
3. Tab Tồn kho: chọn/nhập mã kho và sản phẩm/biến thể, số khả dụng thực tế nếu muốn dùng gợi ý kho. Phần này không tự đồng bộ hoặc thay thế tồn kho thương mại.
4. Tab Ưu đãi giao hàng: để chưa bật trong lần setup đầu. Quy tắc freeship hiện có vẫn được giữ.

Mã huyện là của GHN, không phải mã từ nguồn địa chỉ khác. Tra mã qua các endpoint:
- /api/shipping/addresses/legacy/provinces
- /api/shipping/addresses/legacy/districts?provinceId=ID_TINH_GHN

Dùng đúng địa chỉ pickup của shop. Không dùng số minh hoạ làm số đo thật. Hiện hỗ trợ một kiện nhẹ service2 dưới20kg, chiều<=200cm, giá trị khai báo<=5 triệu. Thiếu profile sẽ bị chặn thay vì lấy số đo giả.

## 7. Bật theo từng bước

**Báo giá trước:** đổi SHIPPING_CHECKOUT_ENABLED=true, restart API. Thử /vi/checkout và /en/checkout với sản phẩm test đã có profile. Chọn tỉnh/phường GHN, tính phí, kiểm tra tiền/voucher/ETA, đổi số điện thoại và tính lại. Chưa bật fulfillment/jobs.

**Vận đơn staging:** sau khi quote/checkout đạt, đổi SHIPPING_FULFILLMENT_ENABLED=true và restart API. Chỉ dùng đơn thử staging đủ điều kiện. Đơn cũ dùng “Chuẩn bị đơn đã có”; chọn kho/địa chỉ/ca lấy mới rồi tạo. Lỗi không rõ kết quả phải Refresh/tra mã client, không tạo lại bằng một đơn hay request mới.

**Webhook:** cần URL HTTPS truy cập được từ bên ngoài; localhost không nhận trực tiếp callback GHN. Dùng endpoint staging đã deploy hoặc tunnel dev mà bạn đã có, không cần mua dịch vụ cho bước setup này. URL phải trỏ tới backend:

Nếu dùng ngrok trên Windows, cài CLI chính thức theo https://ngrok.com/download/windows. Lệnh share đã bỏ npx để không tải gói npm beta. Trong PowerShell:

~~~powershell
winget install ngrok -s msstore
~~~

Mở lại terminal sau khi cài, kiểm tra ngrok version, rồi cấu hình authtoken từ tài khoản https://dashboard.ngrok.com. Đây là authtoken của ngrok, khác GHN_TOKEN và GHN_WEBHOOK_SECRET; không gửi token vào chat.

~~~powershell
ngrok version
ngrok config add-authtoken "AUTHTOKEN_NGROK_CUA_BAN"
Set-Location 'F:\Web_TramHuong\apps\api'
npm run share
~~~

Giữ API ở port4000 và terminal ngrok chạy. Lấy URL HTTPS của ngrok rồi nối đúng path bên dưới. Nếu URL tunnel thay đổi, cập nhật lại endpoint trong portal GHN staging. Nếu ngrok chưa có trong PATH, mở terminal mới hoặc dùng bản cài Microsoft Store chính thức; không tiếp tục gọi npx ngrok.

~~~text
https://TEN_MIEN_STAGING_CUA_BAN/api/shipping/webhooks/ghn
~~~

Trong portal staging → menu tài khoản → Cấu hình webhook → tab Order:
- URL như trên.
- Custom header: x-ghn-secret.
- Giá trị: đúng GHN_WEBHOOK_SECRET trong backend.
- Bật quyền/sự kiện phù hợp; lưu cấu hình.

Tài liệu: https://developer.ghn.vn/vi/docs/webhook/callback-order-status
Portal có thể cần khoảng15 phút để cấu hình mới có hiệu lực. Không cấu hình endpoint này ở tab Ticket.

**Worker:** khi webhook đã xác thực và inbox lưu được, đổi SHIPPING_JOBS_ENABLED=true và restart API để xử lý nền. Nếu chưa bật jobs, inbox có thể còn QUEUED; admin có thao tác xử lý thủ công. Realtime theo dõi shipping_tracking; có fallback đọc backend, không liên tục gọi GHN.

**Ticket/ảnh/COD:** chỉ thử khi tài khoản GHN có quyền ticket, private storage đạt kiểm tra và các bước trên ổn. Xác nhận ngân hàng yêu cầu chứng từ thật; delivered không có nghĩa bank_confirmed.

## Khi có lỗi

| Hiện tượng | Kiểm tra |
| --- | --- |
| relation already exists | Đã cài hoặc cài một phần; chạy verify-setup, không xoá bảng |
| users/orders missing hoặc schema mismatch | Supabase mới chưa có schema ứng dụng hoặc sai kiểu cột |
| SHIPPING_DATABASE_NOT_READY | Migration chưa áp dụng ở đúng project API dùng |
| enabled=false | API chưa restart hoặc chưa đọc đúng .env |
| SHOP/Token/403 | Credential staging, shop thuộc tài khoản và quyền/IP được phép |
| SHIPPING_MEASURED_PACKAGE_REQUIRED | Profile của đúng UUID/biến thể và trạng thái hoạt động |
| PRIVATE_SHIPPING_EVIDENCE_BUCKET_REQUIRED | Bucket phải private và backend có service role |
| Không có callback | URL HTTPS từ bên ngoài, path /api, custom header, portal staging và thời gian cache |
| Inbox QUEUED | Worker chưa bật hoặc chưa drain |
| Không có realtime | Publication/projection RLS, đúng project và owner đã đăng nhập |

Gửi nguyên thông báo lỗi nếu cần xử lý tiếp; xoá token/secret trước khi gửi. Không dùng DROP, tắt RLS hoặc đổi bucket public để vượt lỗi.

