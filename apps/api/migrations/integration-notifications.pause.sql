-- Preserve source orders and durable outbox/usage. No destructive cleanup.
BEGIN;
REVOKE ALL ON FUNCTION public.integration_notification_source_mock(uuid,text),public.integration_capture_notification_mock(uuid,text),public.integration_resolve_notification_mock(uuid,uuid,integer) FROM PUBLIC,anon,authenticated,service_role;
COMMIT;
