-- Stops all durable-budgeted live calls (they fall back to catalog). Usage rows kept.
BEGIN;
REVOKE EXECUTE ON FUNCTION public.integration_reserve_live_usage(text,text,bigint,bigint) FROM service_role;
COMMIT;
