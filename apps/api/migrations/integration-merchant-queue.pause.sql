-- Preserve all source, outbox, quota and generation history.
BEGIN;
REVOKE EXECUTE ON FUNCTION public.integration_enqueue_merchant_mock(uuid,text,text) FROM service_role;
REVOKE EXECUTE ON FUNCTION public.integration_merchant_is_current_mock(uuid,bigint,text) FROM service_role;
COMMIT;
