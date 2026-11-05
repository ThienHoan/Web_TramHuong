-- Kiểm tra cài đặt đặt hàng nguyên khối (checkout-atomic.sql). Chỉ đọc metadata,
-- không đọc đơn hàng hay dữ liệu khách. Chạy trong Supabase SQL Editor.
--   CHUA_CAI  chưa cài
--   PASS      đã cài, chỉ backend (service_role) dùng được, trình duyệt không gọi được
--   TAM_DUNG  đã chạy checkout-atomic.pause.sql: không nhận đơn mới, vẫn tra lại đơn cũ
--   FAIL      cài sai quyền — KHÔNG bật API mới, báo lại để kiểm tra
WITH fn AS (
  SELECT name, to_regprocedure(signature) AS oid
  FROM (VALUES
    ('checkout_lookup_request', 'public.checkout_lookup_request(uuid,uuid,text)'),
    ('checkout_create_order', 'public.checkout_create_order(uuid,uuid,text,jsonb,jsonb,text,text,numeric,numeric,numeric,jsonb)'),
    ('transition_order (admin-order-integrity.sql, cần có trước)', 'public.transition_order(uuid,text,text)')
  ) AS v(name, signature)
),
fn_status AS (
  SELECT fn.name AS check_name,
    CASE
      WHEN p.oid IS NULL THEN 'CHUA_CAI'
      WHEN has_function_privilege('anon', p.oid, 'EXECUTE')
        OR has_function_privilege('authenticated', p.oid, 'EXECUTE') THEN 'FAIL'
      WHEN fn.name LIKE 'checkout_%'
        AND NOT (p.prosecdef AND coalesce(p.proconfig, '{}') @> ARRAY['search_path=pg_catalog, public']) THEN 'FAIL'
      WHEN NOT has_function_privilege('service_role', p.oid, 'EXECUTE')
        THEN CASE WHEN fn.name = 'checkout_create_order' THEN 'TAM_DUNG' ELSE 'FAIL' END
      ELSE 'PASS'
    END AS status
  FROM fn
  LEFT JOIN pg_proc p ON p.oid = fn.oid
),
tbl AS (
  SELECT 'bảng checkout_requests (chống tạo đơn trùng)' AS check_name,
    CASE
      WHEN c.oid IS NULL THEN 'CHUA_CAI'
      WHEN c.relrowsecurity
        AND NOT has_any_column_privilege('anon', c.oid, 'SELECT')
        AND NOT has_any_column_privilege('authenticated', c.oid, 'SELECT')
        AND NOT has_any_column_privilege('anon', c.oid, 'INSERT')
        AND NOT has_any_column_privilege('authenticated', c.oid, 'INSERT')
        AND NOT has_any_column_privilege('anon', c.oid, 'UPDATE')
        AND NOT has_any_column_privilege('authenticated', c.oid, 'UPDATE')
        AND NOT has_table_privilege('anon', c.oid, 'DELETE')
        AND NOT has_table_privilege('authenticated', c.oid, 'DELETE')
        THEN 'PASS'
      ELSE 'FAIL'
    END AS status
  FROM (SELECT to_regclass('public.checkout_requests') AS oid) t
  LEFT JOIN pg_class c ON c.oid = t.oid
)
SELECT check_name, status FROM tbl
UNION ALL
SELECT check_name, status FROM fn_status;
