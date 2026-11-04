# P1-02a — permissions patch cho database thử nghiệm

Owner xác nhận ngày03/11/2026 database đang thử nghiệm. ENV-01 resolved về mục đích sử dụng; không cấp quyền production/billing/giao dịch thật. Patch SQL chưa chạy trên Supabase vì không có SQL connector và truy cập Brave timeout; không cố gọi REST endpoint không được công bố để chạy SQL bằng service-role key.

## Operator acceptance update

Owner báo03/11/2026 đã chạy thành công trên Supabase thử nghiệm. Apply status OWNER_REPORTED_SUCCESS; không chạy lại. Agent chưa kiểm chứng metadata hoặc thực hiện remote smoke test; statement chưa áp dụng ở phần đầu là lịch sử trước owner update.

## Files và phạm vi

- Apply: `apps/api/migrations/integration-permissions.sql`.
- Emergency rollback: `apps/api/migrations/integration-permissions.rollback.sql`, dựa trên policies/grants trong owner export03/11; không phải rollback universal.
- Verification fixture: `apps/api/scripts/verify-integration-permissions.cjs`.
- Login: bỏ truy vấn email trên bảng users trước đăng ký OTP. Supabase Auth xử lý OTP/existing identity, giữ callback và dữ liệu signup hiện tại.

Patch chỉ đổi ACL/RLS trên users/posts/orders/order_items/contacts và search_path của get_my_role(). Không tạo bảng, không sửa rows hay delete/backfill, không thay RPC/trigger/order/payment/GHN transitions. Security repair cho đường có sẵn, không phải feature tích hợp mới; không có flag để bật lại quyền ghi công khai. All integration flags vẫn default OFF.

| Path | Sau patch |
| --- | --- |
| Browser authenticated profile SELECT | Chính profile của user; policy admin/staff read hiện có được giữ |
| Browser profile writes, kể cả role/is_banned | Denied; UsersService field allowlist + AuthGuard/RolesGuard dùng service_role |
| Browser public posts SELECT | Chỉ published theo policy hiện có |
| Blog write | Backend guarded service_role; direct authenticated write denied kể cả staff/admin |
| Browser order/order_items SELECT | Giữ SELECT và owner/admin policies hiện có |
| Direct order/order_items/contact mutation | Denied; đường backend tạo đơn/throttled contact giữ nguyên |
| Auth signup/profile-sync triggers | Giữ nguyên, security-definer owner tiếp tục tạo/cập nhật profile |
| Existing service_role | Giữ grants/BYPASSRLS; không revoke backend privileges |

Revokes xử lý cả table ACL và explicit column ACL; REVOKE table-only chưa đủ nếu đã từng GRANT UPDATE(role). RLS enabled không có nghĩa column protected. Không đổi role memberships/default privileges/views; products_with_discounts và các grant ngoài5 tables vẫn cần review riêng.

## Kiểm thử thực chạy

`env -i PATH=/opt/homebrew/bin:/usr/bin:/bin NODE_ENV=test /opt/homebrew/opt/node/bin/node scripts/verify-integration-permissions.cjs` tại apps/api → PASS42 checks, PostgreSQL in-memory, remoteRequests=0/productionWrites=0, exact apply+rollback scripts. Không load dotenv hoặc clients Supabase/GHN. Kiểm tra migration correctness bằng dữ liệu giả: own/other profiles, CUSTOMER/STAFF/ADMIN principals, read published blog, denied writes, explicit column grant removal, backend profile/blog/contact/order/payment persistence, rerun idempotent, data counts qua rollback/reapply. Đây không phải deployed endpoint exploit hoặc full security-audit certification; script không chạy hành động trái quyền trước patch.

Web `pnpm exec eslint 'src/app/[locale]/(auth)/login/page.tsx'` PASS; `pnpm exec tsc --noEmit` PASS. Browser/live OTP không chạy để tránh mail/account mutations. Next config/style/Zen/Traditional markup không đổi.

Attempt dedicated audit sandbox: sandbox-exec trong tool sandbox bị sandbox_apply EPERM; approved external bootstrap retry abort134 trước target run; Docker daemon không có socket. Không có dedicated isolation claim hoặc live security probe. Local trusted migration fixture chạy bằng execution sandbox thường với environment allowlist; không dùng kết quả để nâng source concerns thành confirmed hosted vulnerability.

## Áp dụng trên test Supabase

1. Deploy/use local web có thay đổi signup trước; nếu frontend cũ vẫn chạy, email precheck bị deny nhưng OTP code cũ vẫn tiếp tục vì không xử lý profile-query error. Không khởi động full backend chỉ để chạy migration do cron có outbound hiện hữu.
2. Chọn đúng project thử nghiệm, lưu schema-only backup/grants/policies hiện tại. Rollback đi kèm chỉ dùng nếu metadata chưa thay đổi từ export; nếu đã thay đổi, dùng backup mới.
3. Chạy toàn bộ integration-permissions.sql bằng SQL Editor role postgres. Transaction có lock timeout5s/statement timeout30s và preflight existing tables/function. Nếu lỗi, transaction không commit một phần; ROLLBACK nếu editor còn báo aborted transaction.
4. Chạy lại inspect-staging-schema.sql và gửi report; hoặc verify5tables ACL/policies, profile đọc own, public published blog và backend checkout mocks. Không gửi token/customer rows và không tạo payment/shipment thật.

Rollback: ưu tiên sửa hẹp khi client bị deny ngoài dự kiến; backend paths phải giữ service_role. Emergency rollback SQL phục hồi quyền cũ **bao gồm lỗ hổng cấu hình trước đó**, không restore dữ liệu và không đảo mail/transaction đã có. Không chạy tự động. Reapply forward patch sau khi sửa client. Live usage/role inheritance/Data API exposure vẫn cần operator acceptance, không suy42local checks là hosted proof.

Sources checked03/11/2026: [PostgreSQL REVOKE](https://www.postgresql.org/docs/17/sql-revoke.html), [Supabase column privileges](https://supabase.com/docs/guides/database/postgres/column-level-security), [Supabase OTP](https://supabase.com/docs/reference/javascript/auth-signinwithotp).
