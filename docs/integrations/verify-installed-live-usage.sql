-- Metadata only. CHUA_CAI = not installed, PASS = private service-role grant, FAIL = paused/misconfigured.
SELECT 'public.integration_reserve_live_usage(text,text,bigint,bigint)' AS check_name,
  CASE WHEN p.oid IS NULL THEN 'CHUA_CAI'
    WHEN NOT p.prosecdef AND p.proconfig @> ARRAY['search_path=pg_catalog, public']
      AND has_function_privilege('service_role',p.oid,'EXECUTE')
      AND NOT has_function_privilege('anon',p.oid,'EXECUTE')
      AND NOT has_function_privilege('authenticated',p.oid,'EXECUTE')
    THEN 'PASS' ELSE 'FAIL' END AS status
FROM (SELECT to_regprocedure('public.integration_reserve_live_usage(text,text,bigint,bigint)') AS oid) t
LEFT JOIN pg_proc p ON p.oid=t.oid;
