-- Stop Merchant drains first. Preserves fence rows, outbox generations and usage.
-- After pause, drain answers 503 before claiming any row.
BEGIN;
REVOKE EXECUTE ON FUNCTION public.integration_merchant_fence_ready_mock(),public.integration_merchant_owned_row_mock(uuid,uuid,integer),
  public.integration_merchant_begin_send_mock(uuid,uuid,integer),public.integration_merchant_end_send_mock(uuid,text),
  public.integration_merchant_defer_mock(uuid,uuid,integer) FROM service_role;
COMMIT;
