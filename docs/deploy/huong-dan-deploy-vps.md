# Hướng dẫn đưa Trầm Hương lên VPS

Cập nhật 06/11/2026. Dành cho VPS **Ubuntu 22.04 hoặc 24.04**, tối thiểu 2 GB RAM.

## Cách hoạt động

```
Khách ──HTTPS──► Caddy (VPS, cổng 80/443, tự lấy chứng chỉ Let's Encrypt)
                   ├─ /api/*  ──► container API (NestJS, cổng 4000 nội bộ)
                   └─ còn lại ──► container Web (Next.js, cổng 3000 nội bộ)
Database + ảnh: Supabase (không nằm trên VPS)
```

Mỗi lần push lên nhánh `main`, GitHub Actions sẽ:

1. Build 2 image Docker và gắn tag theo mã commit.
2. Đẩy image lên GitHub Container Registry (ghcr.io).
3. SSH vào VPS, tải image mới và khởi động lại.
4. Kiểm tra API đã chạy; nếu API không lên thì báo lỗi.

Các file liên quan:

| File | Vai trò |
|---|---|
| `.github/workflows/deploy.yml` | Quy trình build và deploy |
| `docker-compose.prod.yml` | 3 container: caddy, api, web |
| `deploy/Caddyfile` | HTTPS, chuyển `www` về tên miền chính, header bảo mật |
| `deploy/setup-vps.sh` | Cài VPS mới (chạy một lần) |
| `deploy/env.production.example` | Mẫu biến môi trường |

`nginx/default.conf` cũ không còn được dùng.

## Trước khi bắt đầu (khuyến nghị mạnh)

- **Thu hồi khóa Supabase bị lộ** trong lịch sử git: vào Supabase, mục **Project Settings → API Keys**, rồi xóa secret key cũ (`sb_secret_…`).
- Project Supabase đang dùng là project lâu nay bạn dùng để thử. Nếu dùng chính project này làm production, hãy dọn dữ liệu thử (đơn kiểm thử, dữ liệu mock) trước khi mở bán.

## Bước 1 — Trỏ tên miền về VPS

Ở nơi quản lý DNS của tên miền, tạo 2 bản ghi:

| Loại | Tên | Giá trị |
|---|---|---|
| A | `@` | IP của VPS |
| A | `www` | IP của VPS |

- Nếu dùng Cloudflare, lúc đầu để **DNS only** (đám mây màu xám) để Caddy lấy được chứng chỉ.
- Kiểm tra bằng lệnh `ping ten-mien.vn`: phải ra đúng IP của VPS. Thường mất từ vài phút đến vài giờ.

## Bước 2 — Tạo khóa SSH cho GitHub Actions (trên máy của bạn)

```bash
ssh-keygen -t ed25519 -f ~/.ssh/tramhuong_deploy -N "" -C github-deploy
```

Lệnh tạo ra 2 file:

- `~/.ssh/tramhuong_deploy.pub` là **khóa công khai**, đặt lên VPS.
- `~/.ssh/tramhuong_deploy` là **khóa bí mật**, dán vào GitHub. Không gửi khóa này cho ai.

## Bước 3 — Cài VPS (chạy một lần)

Từ thư mục dự án trên máy bạn, copy script lên VPS:

```bash
scp deploy/setup-vps.sh root@IP_VPS:/root/
```

Sau đó SSH vào VPS và chạy script, dán **nội dung file `.pub`** vào trong dấu nháy:

```bash
ssh root@IP_VPS
sudo bash /root/setup-vps.sh "ssh-ed25519 AAAA...nội dung file .pub... github-deploy"
```

Script sẽ:

- Cài Docker.
- Mở tường lửa cho cổng 22, 80, 443.
- Thêm 2 GB swap.
- Bật tự động cập nhật bảo mật.
- Tạo user `deploy` dùng được Docker.

Thử đăng nhập bằng khóa mới:

```bash
ssh -i ~/.ssh/tramhuong_deploy deploy@IP_VPS "docker ps"
```

## Bước 4 — Chuẩn bị biến môi trường

1. Copy mẫu và điền giá trị. Hai file này đã được đưa vào `.gitignore`.
   ```bash
   cp deploy/env.production.example deploy/env.production
   ```
   - Thay `ten-mien.vn` bằng tên miền thật.
   - Lấy khóa Supabase trong **Project Settings → API**.
   - Điền SePay, mật khẩu email (SMTP) và GHN nếu có.
   - Không cần `TRUST_PROXY`: mặc định đã đúng khi chạy sau Caddy.
2. Mã hóa base64 để dán vào GitHub (trên macOS, lệnh này chép sẵn vào clipboard):
   ```bash
   base64 -i deploy/env.production | pbcopy
   ```

## Bước 5 — Cài đặt trên GitHub

Vào repo trên GitHub, mục **Settings → Secrets and variables → Actions**.

**Secrets** (tab Secrets):

| Tên | Giá trị |
|---|---|
| `VPS_HOST` | IP của VPS |
| `VPS_USER` | `deploy` |
| `VPS_KEY` | Toàn bộ nội dung file `~/.ssh/tramhuong_deploy` (khóa bí mật) |
| `ENV_FILE` | Chuỗi base64 ở bước 4 |

`ENV_FILE` cũ có thể vẫn còn trên GitHub, nhưng không xem lại được, nên hãy ghi đè bằng giá trị mới.

**Variables** (tab Variables):

| Tên | Giá trị |
|---|---|
| `DOMAIN` | Tên miền chính, không có `www` và `https://` (ví dụ `ten-mien.vn`) |

## Bước 6 — Cài đặt ở các dịch vụ bên ngoài

- **Supabase**, mục **Authentication → URL Configuration**:
  - Site URL: `https://ten-mien.vn`
  - Redirect URLs: thêm `https://ten-mien.vn/**`
- **SePay** (webhook): `https://ten-mien.vn/api/orders/sepay-webhook`
- **GHN** (webhook, nếu dùng): `https://ten-mien.vn/api/shipping/webhooks/ghn`

## Bước 7 — Deploy

1. Commit và push code lên `main`.
2. Mở tab **Actions** trên GitHub và xem workflow "Build and Deploy to VPS". Lần đầu mất khoảng 5–10 phút.
3. Muốn deploy lại mà không đổi code: vào Actions, chọn workflow này rồi bấm **Run workflow**.

Lưu ý: code đặt hàng mới cần migration `checkout-atomic.sql`. Migration này đã cài trên project Supabase hiện tại (checker 4/4 PASS ngày 06/11). Nếu dùng project Supabase khác thì phải cài trước khi deploy; xem `docs/checkout/atomic-checkout.md`.

## Bước 8 — Kiểm tra sau khi deploy

- [ ] `https://ten-mien.vn` mở được và có ổ khóa HTTPS. `https://www.ten-mien.vn` tự chuyển về tên miền chính.
- [ ] `https://ten-mien.vn/api` trả về phản hồi của API.
- [ ] Đăng nhập (email và Google) xong thì quay lại đúng tên miền.
- [ ] Ảnh sản phẩm hiển thị.
- [ ] Đặt 1 đơn COD thử, rồi hủy trong trang quản trị và kiểm tra kho được trả lại.
- [ ] Đơn chuyển khoản: trang thanh toán hiện mã QR. Sau khi chuyển khoản thử, đơn tự chuyển sang "đã thanh toán", tức webhook SePay hoạt động.

Xem log trên VPS:

```bash
ssh deploy@IP_VPS
cd ~/tramhuong-deploy
docker compose --env-file deploy.env -f docker-compose.prod.yml ps
docker compose --env-file deploy.env -f docker-compose.prod.yml logs --tail 100 api
```

## Quay lại bản trước (rollback)

Cách 1: trên GitHub, vào Actions, mở lần deploy thành công gần nhất trước đó rồi bấm **Re-run all jobs**.

Cách 2: làm trực tiếp trên VPS, thay `TAG` bằng mã commit muốn quay về:

```bash
cd ~/tramhuong-deploy
sed -i 's/^TAG=.*/TAG=<ma-commit-cu>/' deploy.env
docker compose --env-file deploy.env -f docker-compose.prod.yml up -d
```

## Lỗi thường gặp

| Hiện tượng | Cách xử lý |
|---|---|
| Caddy không lấy được chứng chỉ | DNS chưa trỏ đúng IP, hoặc Cloudflare đang bật proxy (đám mây cam). Đợi DNS rồi chạy `docker compose ... restart caddy` |
| Workflow báo `ENV_FILE is missing NEXT_PUBLIC_...` | Thiếu biến trong `env.production`; điền lại rồi cập nhật secret |
| Workflow báo `Set the DOMAIN repository variable` | Chưa tạo biến `DOMAIN` ở bước 5 |
| `denied` khi tải image từ ghcr.io | Vào GitHub, mục **Packages**, chọn package `tramhuong-api`/`tramhuong-web`, rồi **Package settings → Manage Actions access**, thêm repo này |
| Đặt hàng báo "Dịch vụ đặt hàng đang được cập nhật" | Database chưa có migration `checkout-atomic.sql` |
