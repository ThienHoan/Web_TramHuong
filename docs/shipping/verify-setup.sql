-- Read-only verification. This never displays tokens, customer data or bank details.
SELECT 'shipping_records' AS component,
       to_regclass('public.shipping_records') IS NOT NULL AS installed
UNION ALL SELECT 'shipping_tracking', to_regclass('public.shipping_tracking') IS NOT NULL
UNION ALL SELECT 'write_record_rpc', to_regprocedure('public.shipping_write_record(text,text,text,jsonb,integer,uuid,uuid)') IS NOT NULL
UNION ALL SELECT 'reserve_rpc', to_regprocedure('public.shipping_reserve_shipment(uuid,text,jsonb)') IS NOT NULL
UNION ALL SELECT 'attach_snapshot_rpc', to_regprocedure('public.shipping_attach_snapshot(uuid,numeric,jsonb)') IS NOT NULL
UNION ALL SELECT 'complete_cod_rpc', to_regprocedure('public.shipping_complete_cod(text,integer,text,integer,integer)') IS NOT NULL
UNION ALL SELECT 'existing_order_transition_rpc', to_regprocedure('public.transition_order(uuid,text,text)') IS NOT NULL;

SELECT c.relname AS table_name, c.relrowsecurity AS rls_enabled
FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname='public' AND c.relname IN ('shipping_records','shipping_tracking');

SELECT schemaname,tablename,policyname,permissive,roles,cmd
FROM pg_policies
WHERE (schemaname='public' AND tablename IN ('shipping_records','shipping_tracking'))
   OR (schemaname='storage' AND policyname='shipping_evidence_server_only');

SELECT id,public,file_size_limit,allowed_mime_types
FROM storage.buckets WHERE id='shipping-evidence';

SELECT pubname,schemaname,tablename FROM pg_publication_tables
WHERE pubname='supabase_realtime' AND schemaname='public'
  AND tablename IN ('shipping_records','shipping_tracking');

SELECT column_name,data_type,udt_name
FROM information_schema.columns WHERE table_schema='public' AND table_name='orders'
  AND column_name IN ('id','user_id','items','total','status','payment_method','payment_status','shipping_info','transaction_code')
ORDER BY column_name;
