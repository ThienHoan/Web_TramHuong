-- Stop purchase collection while retaining every event, quota and payment fact.
BEGIN;
REVOKE EXECUTE ON FUNCTION public.integration_record_purchase_mock(uuid,uuid,boolean) FROM service_role;
COMMIT;
