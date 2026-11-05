-- Metadata only; does not execute catalog_search or read product/customer rows.
SELECT 'catalog_search_rpc' AS check_name,
  CASE WHEN to_regprocedure('public.catalog_search(text,text,numeric,numeric,text,integer)') IS NULL THEN 'CHUA_CAI'
    WHEN has_function_privilege('service_role','public.catalog_search(text,text,numeric,numeric,text,integer)','EXECUTE')
      AND NOT has_function_privilege('anon','public.catalog_search(text,text,numeric,numeric,text,integer)','EXECUTE')
      AND NOT has_function_privilege('authenticated','public.catalog_search(text,text,numeric,numeric,text,integer)','EXECUTE') THEN 'PASS' ELSE 'FAIL' END AS status
UNION ALL
SELECT 'catalog_search_index', CASE WHEN EXISTS (
  SELECT 1 FROM pg_index WHERE indexrelid=to_regclass('public.catalog_translation_fts_v1') AND indisvalid AND indisready
) THEN 'PASS' ELSE 'CHUA_CAI' END
UNION ALL
SELECT 'catalog_search_invoker', CASE WHEN to_regprocedure('public.catalog_search(text,text,numeric,numeric,text,integer)') IS NULL THEN 'CHUA_CAI' WHEN EXISTS (
  SELECT 1 FROM pg_proc WHERE oid=to_regprocedure('public.catalog_search(text,text,numeric,numeric,text,integer)')
    AND NOT prosecdef AND provolatile='s'
) THEN 'PASS' ELSE 'FAIL' END;
