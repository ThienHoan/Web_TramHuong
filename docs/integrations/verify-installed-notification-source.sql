-- Metadata only; no capture/reconcile/source rows or provider requests.
WITH expected(signature) AS (VALUES
  ('public.integration_publish_notification_mock(uuid,text)'),
  ('public.integration_order_notification_mock()'),
  ('public.integration_reconcile_notifications_mock(uuid,integer)')
), checks AS (
  SELECT signature AS check_name, CASE WHEN p.oid IS NULL THEN 'CHUA_CAI'
    WHEN NOT p.prosecdef AND p.proconfig @> ARRAY['search_path=pg_catalog, public']
      AND has_function_privilege('service_role',p.oid,'EXECUTE')
      AND NOT has_function_privilege('anon',p.oid,'EXECUTE')
      AND NOT has_function_privilege('authenticated',p.oid,'EXECUTE') THEN 'PASS' ELSE 'FAIL' END AS status
  FROM expected e LEFT JOIN pg_proc p ON p.oid=to_regprocedure(e.signature)
  UNION ALL
  SELECT 'order_source_trigger',CASE WHEN t.oid IS NULL THEN 'CHUA_CAI'
    WHEN t.tgfoid IS DISTINCT FROM to_regprocedure('public.integration_order_notification_mock()')
      OR t.tgtype<>21 OR t.tgisinternal THEN 'FAIL'
    WHEN t.tgenabled='D' THEN 'DISABLED' WHEN t.tgenabled='O' THEN 'ENABLED' ELSE 'FAIL' END
  FROM (SELECT 1) seed LEFT JOIN pg_trigger t ON t.tgrelid=to_regclass('public.orders')
    AND t.tgname='integration_order_notification_mock_v1'
)
SELECT * FROM checks ORDER BY check_name;
