-- Non-destructive rollback: pause workers/quota calls, preserve all events/usage.
-- Also disable provider feature flags / set INTEGRATIONS_KILL_SWITCH=true.
BEGIN;
REVOKE EXECUTE ON FUNCTION public.integration_claim(text,text,integer,integer) FROM service_role;
REVOKE EXECUTE ON FUNCTION public.integration_finish(uuid,uuid,integer,text,text,text) FROM service_role;
REVOKE EXECUTE ON FUNCTION public.integration_reserve_usage(text,text,text,bigint,bigint) FROM service_role;
COMMIT;
