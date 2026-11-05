-- Pause search only. Preserve the source catalog and expression index.
BEGIN;
REVOKE ALL ON FUNCTION public.catalog_search(text,text,numeric,numeric,text,integer) FROM PUBLIC,anon,authenticated,service_role;
COMMIT;
