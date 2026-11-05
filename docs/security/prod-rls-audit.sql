-- Kiểm tra quyền truy cập trực tiếp vào database PRODUCTION (chỉ đọc).
-- Dán vào Supabase Dashboard → SQL Editor → Run. Chỉ đọc danh mục hệ thống:
-- không đổi bảng, dòng, policy hay quyền nào và không trả về dữ liệu khách.
--
-- Toàn bộ kết quả nằm trong MỘT bảng (SQL Editor chỉ hiện kết quả của câu
-- lệnh cuối cùng, nên file này cố ý chỉ có một câu SELECT).
--
-- "client" = ai cầm khóa anon công khai trên web (anon) hoặc bất kỳ tài khoản
-- đã đăng nhập (authenticated) gọi thẳng Supabase, không đi qua API của shop.
--
-- Cột risk:
--   CRITICAL  client đọc/ghi được bảng mà RLS đang tắt
--   HIGH      client ghi trực tiếp được (bỏ qua kiểm tra của API), view/hàm
--             vượt RLS, hoặc policy Storage cho ghi mà không kiểm tra người dùng
--   CHECK     cần xem bằng mắt (ví dụ: cho đọc danh mục sản phẩm là bình thường)
--   OK        client không truy cập được, hoặc RLS chặn hết
WITH rel AS (
  SELECT c.oid, c.relname, c.relkind, c.relrowsecurity AS rls_on,
         coalesce(array_to_string(c.reloptions, ','), '') ~* 'security_invoker=(true|on|1|yes)' AS invoker_view
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p', 'v', 'm', 'f')
    -- Bỏ qua bảng do extension tạo (ví dụ spatial_ref_sys của PostGIS).
    AND NOT EXISTS (SELECT 1 FROM pg_depend d
                    WHERE d.classid = 'pg_class'::regclass AND d.objid = c.oid AND d.deptype = 'e')
),
rel_access AS (
  SELECT r.oid, r.relname, r.relkind, r.rls_on, r.invoker_view,
         bool_or(a.can_read) AS client_read,
         bool_or(a.can_write) AS client_write,
         string_agg(a.role || ':' || CASE
                      WHEN a.can_read AND a.can_write THEN 'đọc+ghi'
                      WHEN a.can_write THEN 'ghi'
                      WHEN a.can_read THEN 'đọc'
                      ELSE '-' END, ' ' ORDER BY a.role) AS access
  FROM rel r
  CROSS JOIN LATERAL (
    SELECT x.role,
           has_any_column_privilege(x.role, r.oid, 'SELECT') AS can_read,
           (has_any_column_privilege(x.role, r.oid, 'INSERT')
             OR has_any_column_privilege(x.role, r.oid, 'UPDATE')
             OR has_table_privilege(x.role, r.oid, 'DELETE')
             OR has_table_privilege(x.role, r.oid, 'TRUNCATE')) AS can_write
    FROM (VALUES ('anon'::name), ('authenticated'::name)) AS x(role)
  ) a
  GROUP BY r.oid, r.relname, r.relkind, r.rls_on, r.invoker_view
),
pol AS (
  SELECT tablename AS relname,
         string_agg(format('%s%s [%s → %s] using(%s) check(%s)',
                           policyname,
                           CASE WHEN permissive = 'RESTRICTIVE' THEN ' (restrictive)' ELSE '' END,
                           cmd, array_to_string(roles, '/'),
                           left(coalesce(qual, '-'), 160), left(coalesce(with_check, '-'), 160)),
                    ' || ' ORDER BY policyname) AS policies,
         bool_or(permissive = 'PERMISSIVE' AND cmd IN ('INSERT', 'UPDATE', 'DELETE', 'ALL')) AS has_write_policy,
         bool_or(permissive = 'PERMISSIVE') AS has_any_policy
  FROM pg_policies
  WHERE schemaname = 'public'
  GROUP BY tablename
),
table_rows AS (
  SELECT
    CASE
      WHEN ra.relkind IN ('r', 'p') AND NOT ra.rls_on AND (ra.client_read OR ra.client_write) THEN 'CRITICAL'
      WHEN ra.relkind IN ('v', 'm', 'f') AND (ra.client_read OR ra.client_write) AND NOT ra.invoker_view THEN 'HIGH'
      WHEN ra.relkind IN ('r', 'p') AND ra.client_write AND coalesce(p.has_write_policy, false) THEN 'HIGH'
      WHEN ra.relkind IN ('v', 'm', 'f') AND (ra.client_read OR ra.client_write) THEN 'CHECK'
      WHEN ra.client_read AND coalesce(p.has_any_policy, false) THEN 'CHECK'
      ELSE 'OK'
    END AS risk,
    CASE ra.relkind WHEN 'v' THEN 'view' WHEN 'm' THEN 'materialized view' WHEN 'f' THEN 'foreign table' ELSE 'table' END AS kind,
    ra.relname::text AS name,
    ra.access || CASE WHEN ra.relkind IN ('r', 'p') THEN ' | RLS ' || CASE WHEN ra.rls_on THEN 'bật' ELSE 'TẮT' END ELSE '' END AS client_access,
    CASE
      WHEN ra.relkind IN ('v', 'm', 'f') AND NOT ra.invoker_view AND (ra.client_read OR ra.client_write)
        THEN 'Đọc qua view này bỏ qua RLS của bảng gốc'
      ELSE coalesce(p.policies, '(không có policy)')
    END AS detail
  FROM rel_access ra
  LEFT JOIN pol p ON p.relname = ra.relname
),
function_rows AS (
  -- Hàm SECURITY DEFINER chạy với quyền chủ sở hữu (vượt RLS). Client gọi được
  -- qua /rest/v1/rpc/<tên>. Hàm trigger và hàm của extension được bỏ qua.
  SELECT
    CASE WHEN p.proname = 'get_my_role' THEN 'CHECK' ELSE 'HIGH' END AS risk,
    'function' AS kind,
    p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')' AS name,
    concat_ws(' ',
      CASE WHEN has_function_privilege('anon', p.oid, 'EXECUTE') THEN 'anon:gọi được' END,
      CASE WHEN has_function_privilege('authenticated', p.oid, 'EXECUTE') THEN 'authenticated:gọi được' END) AS client_access,
    CASE WHEN p.proname = 'get_my_role'
      THEN 'Dùng trong policy; ổn nếu chỉ trả về role của chính người gọi'
      ELSE 'SECURITY DEFINER: client gọi trực tiếp được, chạy vượt RLS' END AS detail
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.prokind = 'f'
    AND p.prosecdef
    AND p.prorettype <> 'trigger'::regtype
    AND NOT EXISTS (SELECT 1 FROM pg_depend d
                    WHERE d.classid = 'pg_proc'::regclass AND d.objid = p.oid AND d.deptype = 'e')
    AND (has_function_privilege('anon', p.oid, 'EXECUTE')
         OR has_function_privilege('authenticated', p.oid, 'EXECUTE'))
),
bucket_rows AS (
  SELECT
    CASE WHEN b.public THEN 'CHECK' ELSE 'OK' END AS risk,
    'storage bucket' AS kind,
    b.id::text AS name,
    CASE WHEN b.public THEN 'public' ELSE 'private' END AS client_access,
    CASE WHEN b.public THEN 'Ai có đường link đều tải được file trong bucket này' ELSE '' END AS detail
  FROM storage.buckets b
),
storage_policy_rows AS (
  SELECT
    CASE
      WHEN sp.permissive = 'RESTRICTIVE' THEN 'OK'
      WHEN sp.cmd IN ('INSERT', 'UPDATE', 'DELETE', 'ALL')
           AND NOT (coalesce(sp.qual, '') || ' ' || coalesce(sp.with_check, '')) ~ '(auth\.(uid|role|jwt)|get_my_role)'
        THEN 'HIGH'
      ELSE 'CHECK'
    END AS risk,
    'storage policy' AS kind,
    sp.policyname::text AS name,
    sp.cmd || ' → ' || array_to_string(sp.roles, '/') AS client_access,
    'using(' || left(coalesce(sp.qual, '-'), 200) || ') check(' || left(coalesce(sp.with_check, '-'), 200) || ')' AS detail
  FROM pg_policies sp
  WHERE sp.schemaname = 'storage' AND sp.tablename = 'objects'
    AND sp.roles && ARRAY['public', 'anon', 'authenticated']::name[]
),
all_rows AS (
  SELECT * FROM table_rows
  UNION ALL SELECT * FROM function_rows
  UNION ALL SELECT * FROM bucket_rows
  UNION ALL SELECT * FROM storage_policy_rows
)
SELECT risk, kind, name, client_access, detail
FROM all_rows
ORDER BY CASE risk WHEN 'CRITICAL' THEN 0 WHEN 'HIGH' THEN 1 WHEN 'CHECK' THEN 2 ELSE 3 END,
         kind, name;
