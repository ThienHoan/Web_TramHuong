-- Metadata only: no order/customer rows, enqueue, claim, delivery or provider call.
WITH expected(signature) AS (VALUES
  ('public.integration_notification_source_mock(uuid,text)'),
  ('public.integration_capture_notification_mock(uuid,text)'),
  ('public.integration_resolve_notification_mock(uuid,uuid,integer)'),
  ('public.integration_enqueue_merchant_mock(uuid,text,text)'),
  ('public.integration_merchant_is_current_mock(uuid,bigint,text)')
)
SELECT signature AS check_name,
  CASE WHEN p.oid IS NULL THEN 'CHUA_CAI'
    WHEN NOT p.prosecdef AND p.proconfig @> ARRAY['search_path=pg_catalog, public']
      AND has_function_privilege('service_role',p.oid,'EXECUTE')
      AND NOT has_function_privilege('anon',p.oid,'EXECUTE')
      AND NOT has_function_privilege('authenticated',p.oid,'EXECUTE')
    THEN 'PASS' ELSE 'FAIL' END AS status
FROM expected e LEFT JOIN pg_proc p ON p.oid=to_regprocedure(e.signature)
ORDER BY signature;
