-- SELECT metadata only; never read source rows, enqueue, claim or send mail.
WITH expected(signature) AS (VALUES
  ('public.integration_shipment_notification_source_mock(uuid)'),
  ('public.integration_capture_shipment_notification_mock(uuid)'),
  ('public.integration_publish_shipment_notification_mock(uuid)'),
  ('public.integration_resolve_shipment_notification_mock(uuid,uuid,integer)'),
  ('public.integration_shipment_notification_mock()'),
  ('public.integration_reconcile_shipment_notifications_mock(uuid,integer)')
), checks AS (
  SELECT signature AS check_name,CASE WHEN p.oid IS NULL THEN 'CHUA_CAI'
    WHEN NOT p.prosecdef AND p.proconfig @> ARRAY['search_path=pg_catalog, public']
      AND has_function_privilege('service_role',p.oid,'EXECUTE')
      AND NOT has_function_privilege('anon',p.oid,'EXECUTE')
      AND NOT has_function_privilege('authenticated',p.oid,'EXECUTE') THEN 'PASS' ELSE 'FAIL' END AS status
  FROM expected e LEFT JOIN pg_proc p ON p.oid=to_regprocedure(e.signature)
  UNION ALL
  SELECT 'shipment_source_trigger',CASE WHEN t.oid IS NULL THEN 'CHUA_CAI'
    WHEN t.tgfoid IS DISTINCT FROM to_regprocedure('public.integration_shipment_notification_mock()')
      OR t.tgtype<>21 OR t.tgisinternal THEN 'FAIL'
    WHEN t.tgenabled='D' THEN 'DISABLED' WHEN t.tgenabled='O' THEN 'ENABLED' ELSE 'FAIL' END
  FROM (SELECT 1) seed LEFT JOIN pg_trigger t ON t.tgrelid=to_regclass('public.shipping_records')
    AND t.tgname='integration_shipment_notification_mock_v1'
)
SELECT * FROM checks ORDER BY check_name;
