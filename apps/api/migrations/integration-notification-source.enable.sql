-- Explicit operator opt-in on reviewed TEST DB only. Process outbox opt-in must
-- already suppress SMTP. Database trigger is independent of process kill switch.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='30s';
DO $$ BEGIN
  IF NOT has_function_privilege('service_role','public.integration_capture_notification_mock(uuid,text)','EXECUTE')
    OR NOT has_function_privilege('service_role','public.integration_notification_source_mock(uuid,text)','EXECUTE')
    OR NOT has_function_privilege('service_role','public.integration_resolve_notification_mock(uuid,uuid,integer)','EXECUTE')
  THEN RAISE EXCEPTION 'NOTIFICATION_CAPTURE_NOT_READY'; END IF;
END $$;
GRANT EXECUTE ON FUNCTION public.integration_publish_notification_mock(uuid,text),public.integration_order_notification_mock(),public.integration_reconcile_notifications_mock(uuid,integer) TO service_role;
ALTER TABLE public.orders ENABLE TRIGGER integration_order_notification_mock_v1;
COMMIT;
