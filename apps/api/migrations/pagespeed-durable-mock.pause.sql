-- Stop/finish workers first. Preserve all samples, state, leases and usage.
BEGIN;
REVOKE EXECUTE ON FUNCTION public.seo_pagespeed_read_mock(),public.seo_pagespeed_begin_mock(text,text),public.seo_pagespeed_record_mock(uuid,integer,jsonb),public.seo_pagespeed_fail_mock(uuid,integer,text) FROM service_role;
COMMIT;
