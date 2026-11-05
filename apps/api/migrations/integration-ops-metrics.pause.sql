-- Read-only metrics RPC. After pause the health panel shows metricsSource=store_unavailable;
-- configuration stays visible. No row is changed.
BEGIN;
REVOKE EXECUTE ON FUNCTION public.integration_ops_metrics_mock(integer) FROM service_role;
COMMIT;
