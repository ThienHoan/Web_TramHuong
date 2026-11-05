-- Metadata only: no outbox rows, fence rows, claims or provider call. Run in TEST DB SQL Editor.
-- CHUA_CAI = not installed, PASS = installed with private grants, FAIL = paused/misconfigured.
WITH fn(check_name) AS (VALUES
  ('public.integration_merchant_fence_ready_mock()'),
  ('public.integration_merchant_owned_row_mock(uuid,uuid,integer)'),
  ('public.integration_merchant_begin_send_mock(uuid,uuid,integer)'),
  ('public.integration_merchant_end_send_mock(uuid,text)'),
  ('public.integration_merchant_defer_mock(uuid,uuid,integer)')
)
SELECT f.check_name,
  CASE WHEN p.oid IS NULL THEN 'CHUA_CAI'
    WHEN NOT p.prosecdef AND p.proconfig @> ARRAY['search_path=pg_catalog, public']
      AND has_function_privilege('service_role',p.oid,'EXECUTE')
      AND NOT has_function_privilege('anon',p.oid,'EXECUTE')
      AND NOT has_function_privilege('authenticated',p.oid,'EXECUTE')
    THEN 'PASS' ELSE 'FAIL' END AS status
FROM fn f LEFT JOIN pg_proc p ON p.oid=to_regprocedure(f.check_name)
UNION ALL
SELECT 'public.integration_merchant_send_fence',
  CASE WHEN c.oid IS NULL THEN 'CHUA_CAI'
    WHEN c.relrowsecurity
      AND has_table_privilege('service_role',c.oid,'SELECT')
      AND NOT has_table_privilege('anon',c.oid,'SELECT,INSERT,UPDATE,DELETE')
      AND NOT has_table_privilege('authenticated',c.oid,'SELECT,INSERT,UPDATE,DELETE')
    THEN 'PASS' ELSE 'FAIL' END
FROM (SELECT to_regclass('public.integration_merchant_send_fence') AS oid) t LEFT JOIN pg_class c ON c.oid=t.oid
ORDER BY 1;
