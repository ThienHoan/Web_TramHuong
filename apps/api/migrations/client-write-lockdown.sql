-- Chặn trình duyệt GHI thẳng vào database (khóa anon / tài khoản đăng nhập).
-- Mọi thao tác ghi của shop đều đi qua API (khóa service_role), API có kiểm tra
-- giá, quyền sở hữu, mua hàng... Ghi thẳng bằng khóa anon sẽ bỏ qua các kiểm tra đó
-- (ví dụ khách tự sửa review thành "đã xác minh", tự sửa review/giỏ hàng/wishlist).
--
-- KHÔNG đổi quyền ĐỌC (danh mục, sản phẩm, bài viết vẫn đọc được như cũ),
-- không đổi dữ liệu, không đổi policy. service_role (API) giữ nguyên toàn quyền.
-- Web hiện chỉ đọc trực tiếp bảng users và shipping_tracking (realtime).
-- Hoàn tác: client-write-lockdown.rollback.sql
BEGIN;
SET LOCAL lock_timeout = '5s';

DO $lockdown$
DECLARE
  rel text;
BEGIN
  FOREACH rel IN ARRAY ARRAY[
    'products', 'product_translations', 'categories', 'category_translations',
    'reviews', 'cart_items', 'wishlists', 'vouchers', 'user_events',
    'products_with_discounts'
  ]
  LOOP
    IF to_regclass('public.' || rel) IS NOT NULL THEN
      EXECUTE format('REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.%I FROM PUBLIC, anon, authenticated', rel);
      RAISE NOTICE 'locked writes: %', rel;
    END IF;
  END LOOP;
END;
$lockdown$;

COMMIT;
