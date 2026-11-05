-- Pause producer before restoring SMTP; preserve all source/outbox/usage rows.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='30s';
ALTER TABLE public.shipping_records DISABLE TRIGGER integration_shipment_notification_mock_v1;
REVOKE EXECUTE ON FUNCTION public.integration_shipment_notification_source_mock(uuid),public.integration_capture_shipment_notification_mock(uuid),public.integration_publish_shipment_notification_mock(uuid),public.integration_resolve_shipment_notification_mock(uuid,uuid,integer),public.integration_shipment_notification_mock(),public.integration_reconcile_shipment_notifications_mock(uuid,integer) FROM service_role;
COMMIT;
