-- Explicit TEST DB operator opt-in, after app outbox suppresses SMTP.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='30s';
GRANT EXECUTE ON FUNCTION public.integration_shipment_notification_source_mock(uuid),public.integration_capture_shipment_notification_mock(uuid),public.integration_publish_shipment_notification_mock(uuid),public.integration_resolve_shipment_notification_mock(uuid,uuid,integer),public.integration_shipment_notification_mock(),public.integration_reconcile_shipment_notifications_mock(uuid,integer) TO service_role;
ALTER TABLE public.shipping_records ENABLE TRIGGER integration_shipment_notification_mock_v1;
COMMIT;
