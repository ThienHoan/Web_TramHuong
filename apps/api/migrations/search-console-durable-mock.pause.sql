-- Stop/finish workers first. Preserve all derived snapshots, leases and usage.
BEGIN;
REVOKE EXECUTE ON FUNCTION public.seo_search_read_mock(),public.seo_search_begin_mock(),public.seo_search_complete_mock(uuid,integer,date[],jsonb,date[]),public.seo_search_fail_mock(uuid,integer,text) FROM service_role;
COMMIT;
