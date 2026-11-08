-- Hoàn tác client-write-lockdown.sql: trả lại quyền ghi cho anon/authenticated
-- như trước (RLS policy vẫn quyết định ai ghi được dòng nào). Chỉ dùng khi cần gấp.
BEGIN;
DO $restore$
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
      EXECUTE format('GRANT INSERT, UPDATE, DELETE, TRUNCATE ON public.%I TO anon, authenticated', rel);
    END IF;
  END LOOP;
END;
$restore$;
COMMIT;
