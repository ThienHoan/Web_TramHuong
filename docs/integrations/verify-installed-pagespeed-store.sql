-- Metadata only: no samples, lease, usage or provider call. Run in TEST DB SQL Editor.
-- CHUA_CAI = not installed, PASS = installed with private grants, FAIL = paused/misconfigured.
WITH fn(check_name) AS (VALUES
  ('public.seo_pagespeed_read_mock()'),
  ('public.seo_pagespeed_begin_mock(text,text)'),
  ('public.seo_pagespeed_record_mock(uuid,integer,jsonb)'),
  ('public.seo_pagespeed_fail_mock(uuid,integer,text)')
), tbl(check_name) AS (VALUES
  ('public.seo_pagespeed_audit_state'),
  ('public.seo_pagespeed_samples')
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
SELECT t.check_name,
  CASE WHEN c.oid IS NULL THEN 'CHUA_CAI'
    WHEN c.relrowsecurity
      AND has_table_privilege('service_role',c.oid,'SELECT')
      AND NOT has_table_privilege('anon',c.oid,'SELECT,INSERT,UPDATE,DELETE')
      AND NOT has_table_privilege('authenticated',c.oid,'SELECT,INSERT,UPDATE,DELETE')
    THEN 'PASS' ELSE 'FAIL' END AS status
FROM tbl t LEFT JOIN pg_class c ON c.oid=to_regclass(t.check_name)
ORDER BY 1;
