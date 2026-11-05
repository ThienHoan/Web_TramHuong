-- Disable this producer BEFORE pausing original capture grants/restoring SMTP.
-- Preserve source rows, outbox, usage, leases and all other triggers.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='30s';
ALTER TABLE public.orders DISABLE TRIGGER integration_order_notification_mock_v1;
REVOKE EXECUTE ON FUNCTION public.integration_publish_notification_mock(uuid,text),public.integration_order_notification_mock(),public.integration_reconcile_notifications_mock(uuid,integer) FROM service_role;
COMMIT;
