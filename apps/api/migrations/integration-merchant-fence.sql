-- First install on TEST DB only, after integration-delivery-foundation.sql and
-- integration-merchant-queue.sql. Per-product outbound send fence for the MOCK
-- Merchant worker. No product writes, live transport, account or scheduler.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';
CREATE TABLE public.integration_merchant_send_fence (
  product_id uuid PRIMARY KEY,
  environment text NOT NULL DEFAULT 'mock' CHECK(environment='mock'),
  started_generation bigint NOT NULL DEFAULT 0 CHECK(started_generation BETWEEN 0 AND 999999999),
  accepted_generation bigint CHECK(accepted_generation BETWEEN 1 AND 999999999),
  inflight_generation bigint,
  inflight_token uuid UNIQUE,
  inflight_until timestamptz,
  last_outcome text CHECK(last_outcome IN ('ACCEPTED','UNKNOWN','REJECTED')),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK((inflight_token IS NULL)=(inflight_until IS NULL) AND (inflight_token IS NULL)=(inflight_generation IS NULL)),
  CHECK(inflight_generation IS NULL OR inflight_generation=started_generation),
  CHECK(accepted_generation IS NULL OR accepted_generation<=started_generation)
);
ALTER TABLE public.integration_merchant_send_fence ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.integration_merchant_send_fence FROM PUBLIC,anon,authenticated;
GRANT ALL ON public.integration_merchant_send_fence TO service_role;

CREATE FUNCTION public.integration_merchant_fence_ready_mock()
RETURNS boolean LANGUAGE sql STABLE SET search_path=pg_catalog,public AS $$ SELECT true $$;

-- Shared ownership check: caller must hold a live WORKING merchant mutation lease.
CREATE FUNCTION public.integration_merchant_owned_row_mock(p_id uuid,p_lease_token uuid,p_version integer)
RETURNS public.integration_outbox LANGUAGE plpgsql SET search_path=pg_catalog,public AS $$
DECLARE r public.integration_outbox;
BEGIN
  SELECT * INTO r FROM public.integration_outbox WHERE id=p_id FOR UPDATE;
  IF NOT FOUND OR r.provider<>'merchant' OR r.environment<>'mock' OR r.operation_kind<>'mutation'
    OR r.state<>'WORKING' OR r.lease_token IS DISTINCT FROM p_lease_token OR r.version IS DISTINCT FROM p_version
    OR r.lease_until<=clock_timestamp()
    -- coalesce: a missing key must fail the check, not yield NULL and pass.
    OR coalesce(r.payload->>'productId','') !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    OR coalesce(r.payload->>'generation','') !~ '^[1-9][0-9]{0,8}$'
    OR coalesce(r.payload->>'fingerprint','') !~ '^[a-f0-9]{64}$'
  THEN RAISE EXCEPTION 'MERCHANT_LEASE_CONFLICT' USING ERRCODE='PT409'; END IF;
  RETURN r;
END;
$$;

CREATE FUNCTION public.integration_merchant_begin_send_mock(p_id uuid,p_lease_token uuid,p_version integer)
RETURNS jsonb LANGUAGE plpgsql SET search_path=pg_catalog,public SET lock_timeout='2s' AS $$
DECLARE r public.integration_outbox; f public.integration_merchant_send_fence; latest public.integration_outbox;
  v_product uuid; v_generation bigint; v_now timestamptz:=clock_timestamp();
BEGIN
  r:=public.integration_merchant_owned_row_mock(p_id,p_lease_token,p_version);
  v_product:=(r.payload->>'productId')::uuid; v_generation:=(r.payload->>'generation')::bigint;
  -- Same lock as enqueue: "latest generation" cannot change underneath us.
  PERFORM pg_advisory_xact_lock(hashtextextended('merchant:mock:'||v_product::text,0));
  SELECT * INTO latest FROM public.integration_outbox
  WHERE provider='merchant' AND environment='mock' AND payload->>'productId'=v_product::text
    AND payload->>'generation' ~ '^[1-9][0-9]{0,8}$'
  ORDER BY (payload->>'generation')::bigint DESC LIMIT 1;
  IF latest.id IS DISTINCT FROM r.id OR latest.payload->>'fingerprint' IS DISTINCT FROM r.payload->>'fingerprint' THEN
    RETURN jsonb_build_object('status','stale','generation',v_generation); END IF;
  INSERT INTO public.integration_merchant_send_fence(product_id) VALUES(v_product) ON CONFLICT DO NOTHING;
  SELECT * INTO f FROM public.integration_merchant_send_fence WHERE product_id=v_product FOR UPDATE;
  -- Monotonic: never start this generation twice nor an older one after a newer.
  IF v_generation<=f.started_generation THEN
    RETURN jsonb_build_object('status','stale','generation',v_generation); END IF;
  IF f.inflight_until>v_now THEN
    RETURN jsonb_build_object('status','busy','generation',v_generation,'inflightGeneration',f.inflight_generation); END IF;
  UPDATE public.integration_merchant_send_fence SET started_generation=v_generation,inflight_generation=v_generation,
    inflight_token=gen_random_uuid(),inflight_until=v_now+interval '60 seconds',updated_at=v_now
  WHERE product_id=v_product RETURNING * INTO f;
  RETURN jsonb_build_object('status','acquired','generation',v_generation,'fenceToken',f.inflight_token,
    'inflightUntil',f.inflight_until);
END;
$$;

CREATE FUNCTION public.integration_merchant_end_send_mock(p_fence_token uuid,p_outcome text)
RETURNS void LANGUAGE plpgsql SET search_path=pg_catalog,public SET lock_timeout='2s' AS $$
DECLARE f public.integration_merchant_send_fence;
BEGIN
  IF p_outcome IS NULL OR p_outcome NOT IN ('ACCEPTED','UNKNOWN','REJECTED') THEN
    RAISE EXCEPTION 'INVALID_MERCHANT_SEND_OUTCOME' USING ERRCODE='22023'; END IF;
  SELECT * INTO f FROM public.integration_merchant_send_fence WHERE inflight_token=p_fence_token FOR UPDATE;
  IF NOT FOUND OR p_fence_token IS NULL THEN RAISE EXCEPTION 'MERCHANT_FENCE_CONFLICT' USING ERRCODE='PT409'; END IF;
  UPDATE public.integration_merchant_send_fence SET inflight_generation=NULL,inflight_token=NULL,inflight_until=NULL,
    last_outcome=p_outcome,updated_at=clock_timestamp(),
    accepted_generation=CASE WHEN p_outcome='ACCEPTED' THEN f.inflight_generation ELSE accepted_generation END
  WHERE product_id=f.product_id;
END;
$$;

CREATE FUNCTION public.integration_merchant_defer_mock(p_id uuid,p_lease_token uuid,p_version integer)
RETURNS jsonb LANGUAGE plpgsql SET search_path=pg_catalog,public SET lock_timeout='2s' AS $$
DECLARE r public.integration_outbox; v_started bigint; v_now timestamptz:=clock_timestamp();
BEGIN
  r:=public.integration_merchant_owned_row_mock(p_id,p_lease_token,p_version);
  SELECT started_generation INTO v_started FROM public.integration_merchant_send_fence
  WHERE product_id=(r.payload->>'productId')::uuid FOR UPDATE;
  -- Requeue is only safe with proof that this generation never started sending.
  IF coalesce(v_started,0)>=(r.payload->>'generation')::bigint THEN
    RAISE EXCEPTION 'MERCHANT_SEND_ALREADY_STARTED' USING ERRCODE='PT409'; END IF;
  UPDATE public.integration_outbox SET state='QUEUED',lease_token=NULL,lease_until=NULL,version=version+1,
    attempts=greatest(attempts-1,0),next_at=v_now+interval '30 seconds',last_error_code='SEND_FENCE_BUSY',updated_at=v_now
  WHERE id=r.id RETURNING * INTO r;
  RETURN jsonb_build_object('id',r.id,'state',r.state,'nextAt',r.next_at);
END;
$$;

REVOKE ALL ON FUNCTION public.integration_merchant_fence_ready_mock(),public.integration_merchant_owned_row_mock(uuid,uuid,integer),
  public.integration_merchant_begin_send_mock(uuid,uuid,integer),public.integration_merchant_end_send_mock(uuid,text),
  public.integration_merchant_defer_mock(uuid,uuid,integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.integration_merchant_fence_ready_mock(),public.integration_merchant_owned_row_mock(uuid,uuid,integer),
  public.integration_merchant_begin_send_mock(uuid,uuid,integer),public.integration_merchant_end_send_mock(uuid,text),
  public.integration_merchant_defer_mock(uuid,uuid,integer) TO service_role;
COMMIT;
