# Tự động hóa vận hành — bản localhost

Phạm vi: giám sát website/API/DB, cảnh báo đơn/liên hệ mới và sao lưu PostgreSQL
cùng ảnh Supabase. Chủ dự án chọn **chỉ xem bản thử localhost**, chưa bật gửi thật.
Không thay thế SePay, chuyển trạng thái đơn, tồn kho, GHN hoặc email khách hàng.

## 1. Mở bản thử

Từ thư mục gốc, sau khi cài dependencies sẵn có:

```bash
pnpm --dir apps/api run demo:automation
```

Mở **http://127.0.0.1:4500**. Không cần chạy web/API chính, Docker hay n8n.
Không đọc `.env`. Lab dựng PostgreSQL trong bộ nhớ bằng PGlite, cài chính xác
migration mới rồi dùng controller/guard/repository và worker thật với nguồn giả.
API lab dùng một cổng loopback ngẫu nhiên, token chỉ giữ trong process.

1. Bấm **Tạo đơn mẫu**, **Tạo liên hệ mẫu**: hai sự kiện ở trạng thái chờ.
2. Bấm **Chạy hàng đợi**: kết quả là **Đã ghi nhận tại máy** (`CAPTURED`). Bấm lại
   không tạo thông báo trùng. Không phải email/Telegram đã được giao.
3. **Mô phỏng mất kết nối** tạo hai lần lỗi liên tiếp; bấm **Khôi phục kết nối**
   ghi một cảnh báo phục hồi cho từng đích. Probe trong lab là phản hồi giả lập.
4. **Tạo & kiểm tra bản sao lưu** mã hóa một luồng PostgreSQL giả và một blob ảnh
   giả, rồi giải mã/kiểm tra hash. Không chạy `pg_dump`, không đọc ảnh/DB thật.

Lab bind `127.0.0.1`, chỉ phục vụ tệp cố định, kiểm tra Origin cho thao tác, không
cho nhập URL/SQL tùy ý. Đóng terminal/Ctrl+C để dừng; dữ liệu SQL mẫu mất khi dừng.
Tệp mã hóa/captures mẫu nằm trong thư mục tạm có quyền riêng. Giao diện dùng tông
thương hiệu hiện có, font hệ thống để không tải tài nguyên ngoài; chỉ có chế độ sáng.

Bản thử terminal, tự kết thúc:

```bash
pnpm --dir apps/api run automation -- demo
```

Kết quả nêu rõ `remoteRequests:0`, `hostedWrites:0`, `realMessages:0`.
Khóa backup mẫu được lưu riêng trong thư mục tạm của lệnh CLI, chỉ cho dữ liệu giả.

## 2. Phần đã triển khai trong ứng dụng

| Route (prefix `/api`) | Quyền / hành vi |
| --- | --- |
| `GET /automation/live` | Công khai; chỉ `{status:'ok'}`, không đọc DB/cấu hình |
| `GET /automation/ready` | Token máy riêng + flag; đọc tối đa một ID sản phẩm, deadline 3s |
| `POST /automation/events/claim` | Token máy + flag; nhận một sự kiện và lease 2 phút |
| `POST /automation/events/finish` | Token máy + flag; chỉ ID, lease, outcome cố định |

`AUTOMATION_ENABLED=false` mặc định: route máy trả 404 trước khi chạm DB. Token
máy 32 byte ngẫu nhiên ở dạng base64url (43 ký tự), khác token người dùng và token
webhook. Chỉ có quyền health/hàng đợi chủ shop; không cấp quyền sửa đơn hay tài khoản.
Header Bearer được hệ thống log hiện có che. Không đưa token vào frontend.

SQL riêng `apps/api/migrations/ops-automation.sql` tạo hàng đợi thông báo cho
**chủ cửa hàng**. Không dùng hàng đợi email khách hàng đang giới hạn ở chế độ mock.
Sự kiện chỉ có loại, UUID tham chiếu và thời gian; không lấy tên, điện thoại,
địa chỉ, email, nội dung lời nhắn, tổng tiền hay trạng thái thanh toán.

Hai trigger AFTER INSERT cho orders/contacts **được cài ở trạng thái DISABLED**.
Không quét/gửi lại đơn hoặc liên hệ lịch sử. Khi được bật, INSERT nguồn và ghi
sự kiện là một transaction: nếu hàng đợi lỗi, INSERT nguồn sẽ rollback. Điều này
không biến toàn bộ checkout nhiều request thành một transaction.

Worker claim tối đa 20 sự kiện mỗi lượt. Chống claim trùng bằng row lock/lease,
nguồn duy nhất `(kind,source_id)`. Lease bỏ dở trở thành `UNKNOWN`, không tự phát
lại. Gửi webhook đúng một lần; timeout/5xx/ack sai là `UNKNOWN`, 4xx là `DEAD`.
`ACCEPTED` chỉ có nghĩa đầu nhận trả ack khớp event ID, chưa chứng minh tin nhắn
đến người đọc. `CAPTURED` là đã lưu ở máy; không chuyển thành gửi thật về sau.

## 3. Kết nối DB thử nghiệm sau khi xem demo

**Chưa có bước nào ở mục này được tự chạy lên DB của bạn.**

1. Xác nhận đúng project thử nghiệm; sao lưu và rà migration.
2. Cài `ops-automation.sql` một lần. Cài lại sẽ bị từ chối thay vì xóa lịch sử.
3. Deploy API chứa AutomationModule; tự điền flag/token vào môi trường server.
4. Copy `ops/automation/runner.env.example` ra file runtime riêng, quyền 600;
   điền cùng API token, chọn `AUTOMATION_TRANSPORT=local` và thư mục riêng.
5. Kiểm tra readiness; sau đó mới chạy `ops-automation.enable.sql` trên TEST DB.
6. Tạo nguồn mẫu bằng luồng ứng dụng trên TEST DB, chạy worker local và đọc capture.

CLI **không tự nạp `.env`**. Nạp môi trường bằng process manager hoặc Node hỗ trợ
`--env-file` với file runtime tin cậy; không dùng file env lấy từ người khác.

```bash
# Chạy từ apps/api; thay đường dẫn env bằng file riêng bạn đã điền.
node --env-file=/etc/tramhuong-automation/runner.env scripts/automation/cli.cjs status --execute
node --env-file=/etc/tramhuong-automation/runner.env scripts/automation/cli.cjs events --execute
node --env-file=/etc/tramhuong-automation/runner.env scripts/automation/cli.cjs monitor --execute
```

Không có `--execute`: chỉ in kế hoạch, không network, không backup, không claim.
`cycle --execute` chạy monitor rồi events; dùng scheduler hệ điều hành khi thật sự
muốn chạy liên tục. Mẫu systemd ở `ops/automation/`, chưa được cài/bật tự động.
Chỉ một runner dùng mỗi state directory. File lock còn sau crash cần kiểm tra
process cũ đã dừng rồi mới xóa đúng `runner.lock`; không tự phá lock theo tuổi.

Giám sát mỗi phút và cảnh báo sau 2 lần lỗi là cấu hình đề xuất, không phải cam
kết uptime. Runner phải ở máy khác nếu muốn phát hiện toàn bộ VPS chết/mất mạng.
Runner cùng VPS không tự phát cảnh báo khi chính VPS đã dừng. Website probe chỉ
kiểm tra HTTP 200; không thay thế kiểm thử đăng nhập/checkout.

## 4. Sao lưu có mã hóa và kiểm tra

Backup là tác vụ riêng vì tốn I/O và giữ quyền DB/Storage riêng. Copy
`ops/automation/backup.env.example` thành file `backup.env` riêng, quyền 600. Không truyền key
DB, service_role hoặc khóa mã hóa sang n8n. Runner chỉ xuất mã kết quả chung,
không in lỗi provider/chuỗi kết nối hoặc giá trị secrets.

- Cần `pg_dump` cùng hoặc mới hơn major PostgreSQL của DB, và kết nối trực tiếp
  hoặc session pooler phù hợp. Dùng `PGSSLMODE=verify-full` + CA tin cậy.
- `pg_dump --format=custom --no-owner --no-acl`: toàn DB theo quyền user, gồm
  schema/data, không gồm global roles. Lỗi dump/permission làm cả lượt thất bại.
- Liệt kê/download từng object, có phân trang và folder, mặc định bucket
  `product-images` theo StorageService. Thêm bucket khác vào allowlist nếu cần.
- Từng tệp và manifest dùng AES-256-GCM với nonce ngẫu nhiên, header được xác thực.
  Không ghi dump/ảnh plaintext ra đĩa. Tên archive được hash; đường dẫn object
  chỉ nằm trong manifest mã hóa. Có hash/size plaintext để kiểm tra toàn vẹn.
- Chỉ công bố `last-success.json` sau khi đã giải mã/xác thực và kiểm tra mọi
  archive. Lượt lỗi giữ nguyên bản thành công trước. Monitor báo stale sau 36h
  hoặc khi lượt mới thất bại, tệp thành công bị thiếu/đổi kích thước.
- Giới hạn hiện tại: 2 GiB dump, 25 MiB/object, 20.000 mục/bucket, 4 GiB tổng
  plaintext. Vượt giới hạn thì thất bại rõ ràng, không báo backup một phần là đủ.
  Storage không có snapshot chung với PostgreSQL: nên chạy lúc ít ghi, và cần
  thử khôi phục để đối chiếu DB/ảnh. File thay đổi khi tải có thể làm lượt lỗi.

```bash
node --env-file=/etc/tramhuong-automation/backup.env scripts/automation/cli.cjs backup --execute
node --env-file=/etc/tramhuong-automation/backup.env scripts/automation/cli.cjs verify-backup --execute
```

Khóa thật: sinh 32 byte random base64, giữ bản sao ngoại tuyến riêng với archive.
**Chưa có tự xóa bản cũ hoặc tự upload ra ngoài**. Bản sao trên cùng VPS chưa bảo
vệ được mất VPS; cần chọn nơi lưu thứ hai trước production. Theo dõi dung lượng.

Kiểm tra giải mã/hash không đồng nghĩa đã phục hồi PostgreSQL thành công. Trước
production cần một lần diễn tập vào DB/Storage cô lập: giải mã archive, dùng
`pg_restore --list` rồi restore theo quy trình Supabase, đối chiếu số hàng,
tồn kho/đơn và object. Có lệnh `unpack-backup --execute` để xuất plaintext vào thư mục mới chỉ định bằng
`AUTOMATION_RESTORE_DIR`; lệnh từ chối ghi đè thư mục đã tồn tại, không kết nối DB.
Chỉ dùng trong môi trường khôi phục riêng có quyền truy cập phù hợp. Ví dụ:

```bash
node --env-file=/etc/tramhuong-automation/backup.env scripts/automation/cli.cjs unpack-backup --execute
```

Không có lệnh restore tự động vào DB thật trong gói này.

## 5. Workflow n8n đã chuẩn bị, chưa bật

`n8n/owner-inbox.workflow.json` là inbox metadata không có node gửi tin nhắn,
`active:false`. Chưa import/chạy trên một n8n instance trong lượt này. User chọn
localhost trước nên chưa chọn tài khoản hay kênh nhận thật.

Khi được yêu cầu nối sau: import, chọn Header Auth với header `Authorization`,
giá trị `Bearer <AUTOMATION_WEBHOOK_TOKEN>` (khác API token), kiểm tra trường
metadata, rồi mới publish. Cấu hình URL cố định và bật webhook transport riêng.
HTTP redirect bị từ chối; payload không chứa lease hoặc PII. Ack cần đúng
`{accepted:true,eventId:<id>}`. Đây chỉ là n8n inbox acceptance; muốn giao tin nhắn
cần bổ sung node/kênh được chủ shop chọn và nghiệm thu riêng. Không dùng static
workflow data làm bằng chứng exactly-once; không tự replay `UNKNOWN`.

## 6. Dừng / kiểm tra lỗi

1. Dừng timer/runner, chạy `ops-automation.pause.sql` để tắt **hai producer mới**.
2. Đặt `AUTOMATION_ENABLED=false` và restart API. Không xóa queue/captures/backup.
3. Xem trạng thái bằng SQL riêng trên TEST DB:

```sql
SELECT state,count(*) FROM public.ops_automation_events GROUP BY state;
SELECT id,kind,source_id,state,created_at,finished_at
FROM public.ops_automation_events
WHERE state IN ('UNKNOWN','DEAD') ORDER BY created_at LIMIT 20;
```

Kiểm tra đầu nhận/log riêng trước khi quyết định gửi lại. Không đổi state hàng
loạt, xóa dedupe key hay sửa payment/order để chữa thông báo. Existing SMTP,
notification mock, GHN và deployment workflow không bị thay thế.

## 7. Kiểm thử và bằng chứng

```bash
pnpm --dir apps/api run test:automation
pnpm --dir apps/api run build
```

Các test sử dụng fixture hoặc socket loopback: HTTP auth/DTO/projection, exact SQL
disabled/enable/pause/rollback/private grants/lease, worker dedupe/outcome/lock,
monitor recovery, encryption/empty objects/tampering/failed backup. Không đọc
real env, không hosted writes, không gửi mail/Telegram/Gemini/GHN/SePay.

Kết quả đã chạy trong lượt triển khai này: **25 test PASS** (14 HTTP/repository,
9 runner/backup, 1 exact SQL scenario nhiều assertions, 1 workflow projection),
Nest build PASS, ESLint module mới 0 lỗi/0 cảnh báo, `git diff --check` PASS.
Browser localhost: tạo đơn + liên hệ → 2 CAPTURED; drain lần hai → 0; mất kết nối
→ 3 cảnh báo; phục hồi → 3 thông báo; backup mẫu verified. Desktop 1280px và
mobile 375px không tràn ngang; không có console error trong bản thử.
Ảnh: `/private/tmp/tramhuong-automation-preview.png`,
`/private/tmp/tramhuong-automation-mobile.png`.

Chưa nghiệm thu: n8n import/execution, gửi tin nhắn thật, systemd trên VPS,
pg_dump/pg_restore với PostgreSQL thật, DB/Storage thật hoặc bản sao ngoài VPS.
Kiểm tra mẫu mã hóa/giải mã không được xem là đã đóng các bước này.

Tài liệu chính thức tham chiếu khi xây:
- [Supabase database backups](https://supabase.com/docs/guides/platform/backups):
  backup DB không chứa nội dung Storage objects; vì vậy backup ảnh tách riêng.
- [Supabase Storage list](https://supabase.com/docs/reference/javascript/storage-from-list).
- [n8n Webhook](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.webhook/):
  Header Auth, test/production URL, response node.
