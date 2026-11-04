-- Metadata only. No orders/customer rows, RPC invocation or writes.
WITH f AS (
  SELECT p.oid,p.prosecdef FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
  WHERE n.nspname='public' AND p.proname='integration_record_purchase_mock'
    AND pg_get_function_identity_arguments(p.oid)='p_order_id uuid, p_actor_id uuid, p_consent boolean'
), ix AS (
  SELECT i.indisunique,i.indisvalid,pg_get_indexdef(i.indexrelid) AS definition,
    pg_get_expr(i.indpred,i.indrelid) AS predicate
  FROM pg_index i JOIN pg_class c ON c.oid=i.indexrelid JOIN pg_namespace n ON n.oid=c.relnamespace
  JOIN pg_class t ON t.oid=i.indrelid
  WHERE n.nspname='public' AND c.relname='integration_purchase_mock_payment_unique'
    AND t.relname='integration_outbox'
)
SELECT 'purchase_rpc_private' AS check_id,
  CASE WHEN NOT EXISTS(SELECT FROM f) THEN 'CHUA_CAI'
    WHEN (SELECT NOT has_function_privilege('anon',oid,'EXECUTE')
      AND NOT has_function_privilege('authenticated',oid,'EXECUTE')
      AND has_function_privilege('service_role',oid,'EXECUTE') FROM f) THEN 'PASS' ELSE 'FAIL' END AS status
UNION ALL
SELECT 'purchase_rpc_invoker',
  CASE WHEN NOT EXISTS(SELECT FROM f) THEN 'CHUA_CAI'
    WHEN (SELECT NOT prosecdef FROM f) THEN 'PASS' ELSE 'FAIL' END
UNION ALL
SELECT 'purchase_payment_dedupe_index',
  CASE WHEN NOT EXISTS(SELECT FROM ix) THEN 'CHUA_CAI'
    WHEN (SELECT indisunique AND indisvalid AND definition LIKE '%provider_message_id%'
      AND predicate LIKE '%ga4%' AND predicate LIKE '%mock%' AND predicate LIKE '%purchase%' FROM ix)
    THEN 'PASS' ELSE 'FAIL' END;
