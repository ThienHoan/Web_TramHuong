-- First install on TEST DB only, after integration-delivery-foundation.sql.
-- Enqueue serialization only. No product writes, live transport or scheduler.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';
CREATE FUNCTION public.integration_enqueue_merchant_mock(p_product_id uuid,p_action text,p_fingerprint text)
RETURNS jsonb LANGUAGE plpgsql SET search_path=pg_catalog,public AS $$
DECLARE r public.integration_outbox; v_generation bigint;
BEGIN
  IF p_product_id IS NULL OR p_action IS NULL OR p_action NOT IN ('upsert','withdraw')
    OR p_fingerprint IS NULL OR p_fingerprint !~ '^[a-f0-9]{64}$'
  THEN RAISE EXCEPTION 'INVALID_MERCHANT_EVENT' USING ERRCODE='22023'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('merchant:mock:'||p_product_id::text,0));
  SELECT * INTO r FROM public.integration_outbox
  WHERE provider='merchant' AND environment='mock' AND payload->>'productId'=p_product_id::text
    AND payload->>'generation' ~ '^[1-9][0-9]{0,8}$'
  ORDER BY (payload->>'generation')::bigint DESC LIMIT 1;
  IF FOUND AND r.payload->>'action'=p_action AND r.payload->>'fingerprint'=p_fingerprint THEN
    RETURN jsonb_build_object('id',r.id,'state',r.state,'status','duplicate');
  END IF;
  v_generation:=coalesce((r.payload->>'generation')::bigint,0)+1;
  IF v_generation>999999999 THEN RAISE EXCEPTION 'MERCHANT_GENERATION_LIMIT' USING ERRCODE='PT409'; END IF;
  INSERT INTO public.integration_outbox(provider,environment,dedupe_key,event_type,operation_kind,payload)
  VALUES('merchant','mock','merchant_v2:'||p_product_id::text||':'||v_generation::text,
    'catalog_'||p_action,'mutation',jsonb_build_object('productId',p_product_id,'action',p_action,
      'fingerprint',p_fingerprint,'generation',v_generation)) RETURNING * INTO r;
  RETURN jsonb_build_object('id',r.id,'state',r.state,'status','recorded');
END;
$$;
CREATE FUNCTION public.integration_merchant_is_current_mock(p_product_id uuid,p_generation bigint,p_fingerprint text)
RETURNS boolean LANGUAGE sql STABLE SET search_path=pg_catalog,public AS $$
  SELECT coalesce((SELECT payload->>'generation'=p_generation::text AND payload->>'fingerprint'=p_fingerprint
    FROM public.integration_outbox WHERE provider='merchant' AND environment='mock'
      AND payload->>'productId'=p_product_id::text AND payload->>'generation' ~ '^[1-9][0-9]{0,8}$'
    ORDER BY (payload->>'generation')::bigint DESC LIMIT 1),false);
$$;
REVOKE ALL ON FUNCTION public.integration_enqueue_merchant_mock(uuid,text,text) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.integration_merchant_is_current_mock(uuid,bigint,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.integration_enqueue_merchant_mock(uuid,text,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.integration_merchant_is_current_mock(uuid,bigint,text) TO service_role;
COMMIT;
