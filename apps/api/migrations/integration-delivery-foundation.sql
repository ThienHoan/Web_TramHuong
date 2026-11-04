-- P1-02d: additive first-install schema, manual TEST DB apply only.
-- No existing order/shipping table, trigger, RPC or application row is modified.
-- Live execution stays blocked; these functions only claim/reserve mock work.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';

CREATE TABLE public.integration_outbox (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL CHECK(provider IN ('resend','gemini','pgvector','cloudinary','google','ga4','search_console','merchant','pagespeed','turnstile')),
  environment text NOT NULL DEFAULT 'mock' CHECK(environment IN ('mock','staging','production')),
  dedupe_key text NOT NULL CHECK(length(dedupe_key) BETWEEN 1 AND 250),
  event_type text NOT NULL CHECK(event_type ~ '^[a-z][a-z0-9_]{0,63}$'),
  operation_kind text NOT NULL CHECK(operation_kind IN ('read','mutation')),
  payload jsonb NOT NULL DEFAULT '{}'::jsonb CHECK(jsonb_typeof(payload)='object' AND octet_length(payload::text)<=65536),
  state text NOT NULL DEFAULT 'QUEUED' CHECK(state IN ('QUEUED','WORKING','ACCEPTED','DELIVERED','UNKNOWN','DEAD')),
  attempts integer NOT NULL DEFAULT 0 CHECK(attempts BETWEEN 0 AND 8),
  version integer NOT NULL DEFAULT 1 CHECK(version>0),
  lease_token uuid,
  lease_until timestamptz,
  next_at timestamptz NOT NULL DEFAULT now(),
  provider_message_id text CHECK(length(provider_message_id)<=250),
  last_error_code text CHECK(last_error_code ~ '^[A-Z][A-Z0-9_]{0,63}$'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(provider,environment,dedupe_key),
  CHECK((state='WORKING')=(lease_token IS NOT NULL AND lease_until IS NOT NULL)),
  CHECK((lease_token IS NULL)=(lease_until IS NULL))
);
CREATE INDEX integration_outbox_due ON public.integration_outbox(provider,environment,state,next_at);
CREATE INDEX integration_outbox_expired ON public.integration_outbox(lease_until) WHERE state='WORKING';

CREATE TABLE public.integration_usage_daily (
  provider text NOT NULL CHECK(provider IN ('resend','gemini','pgvector','cloudinary','google','ga4','search_console','merchant','pagespeed','turnstile')),
  environment text NOT NULL CHECK(environment IN ('mock','staging','production')),
  day date NOT NULL,
  metric text NOT NULL CHECK(metric IN ('requests','tokens','emails','milli_credits')),
  used bigint NOT NULL DEFAULT 0 CHECK(used>=0),
  hard_limit bigint NOT NULL DEFAULT 0 CHECK(hard_limit BETWEEN 0 AND 1000000000000),
  warned_thresholds integer[] NOT NULL DEFAULT '{}'::integer[],
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(provider,environment,day,metric),
  CHECK(used<=hard_limit)
);

ALTER TABLE public.integration_outbox ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integration_usage_daily ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.integration_outbox,public.integration_usage_daily FROM PUBLIC,anon,authenticated;
GRANT ALL ON public.integration_outbox,public.integration_usage_daily TO service_role;

CREATE FUNCTION public.integration_claim(p_provider text,p_environment text,p_limit integer DEFAULT 10,p_lease_seconds integer DEFAULT 120)
RETURNS SETOF public.integration_outbox
LANGUAGE plpgsql SET search_path=pg_catalog,public AS $$
DECLARE v_now timestamptz:=clock_timestamp();
BEGIN
  IF p_environment IS DISTINCT FROM 'mock' THEN RAISE EXCEPTION 'LIVE_INTEGRATION_BLOCKED' USING ERRCODE='42501'; END IF;
  IF p_provider IS NULL OR p_provider NOT IN ('resend','gemini','pgvector','cloudinary','google','ga4','search_console','merchant','pagespeed','turnstile')
    OR p_limit IS NULL OR p_limit NOT BETWEEN 1 AND 20 OR p_lease_seconds IS NULL OR p_lease_seconds NOT BETWEEN 5 AND 300
  THEN RAISE EXCEPTION 'INVALID_INTEGRATION_CLAIM' USING ERRCODE='22023'; END IF;
  -- Recovery is bounded too. A lost mutation lease has an ambiguous outcome,
  -- so it must never be put back on an automatic send queue.
  WITH expired AS (
    SELECT id FROM public.integration_outbox
    WHERE provider=p_provider AND environment=p_environment AND state='WORKING' AND lease_until<=v_now
    ORDER BY lease_until,id LIMIT 20 FOR UPDATE SKIP LOCKED
  )
  UPDATE public.integration_outbox o SET
    state=CASE WHEN operation_kind='mutation' THEN 'UNKNOWN' WHEN attempts>=8 THEN 'DEAD' ELSE 'QUEUED' END,
    lease_token=NULL,lease_until=NULL,version=version+1,updated_at=v_now,next_at=v_now,
    last_error_code='LEASE_EXPIRED'
  FROM expired e WHERE o.id=e.id;
  RETURN QUERY
  WITH candidates AS (
    SELECT id FROM public.integration_outbox
    WHERE provider=p_provider AND environment=p_environment AND state='QUEUED' AND attempts<8 AND next_at<=v_now
    ORDER BY next_at,id LIMIT p_limit FOR UPDATE SKIP LOCKED
  )
  UPDATE public.integration_outbox o SET
    state='WORKING',attempts=attempts+1,version=version+1,
    lease_token=gen_random_uuid(),lease_until=v_now+make_interval(secs=>p_lease_seconds),updated_at=v_now
  FROM candidates c WHERE o.id=c.id RETURNING o.*;
END;
$$;

CREATE FUNCTION public.integration_finish(p_id uuid,p_lease_token uuid,p_version integer,p_outcome text,p_provider_message_id text DEFAULT NULL,p_error_code text DEFAULT NULL)
RETURNS public.integration_outbox
LANGUAGE plpgsql SET search_path=pg_catalog,public AS $$
DECLARE r public.integration_outbox; v_now timestamptz:=clock_timestamp(); v_state text;
BEGIN
  IF p_outcome IS NULL OR p_outcome NOT IN ('ACCEPTED','RETRY','UNKNOWN','DEAD')
    OR length(p_provider_message_id)>250 OR (p_error_code IS NOT NULL AND p_error_code !~ '^[A-Z][A-Z0-9_]{0,63}$')
  THEN RAISE EXCEPTION 'INVALID_INTEGRATION_OUTCOME' USING ERRCODE='22023'; END IF;
  SELECT * INTO r FROM public.integration_outbox WHERE id=p_id FOR UPDATE;
  IF NOT FOUND OR r.state<>'WORKING' OR r.lease_token IS DISTINCT FROM p_lease_token
    OR r.version IS DISTINCT FROM p_version OR r.lease_until<=v_now
  THEN RAISE EXCEPTION 'INTEGRATION_LEASE_CONFLICT' USING ERRCODE='PT409'; END IF;
  IF r.environment<>'mock' THEN RAISE EXCEPTION 'LIVE_INTEGRATION_BLOCKED' USING ERRCODE='42501'; END IF;
  IF r.operation_kind='mutation' AND p_outcome='RETRY'
  THEN RAISE EXCEPTION 'MUTATION_RETRY_FORBIDDEN' USING ERRCODE='22023'; END IF;
  v_state=CASE WHEN p_outcome='RETRY' THEN CASE WHEN r.attempts>=8 THEN 'DEAD' ELSE 'QUEUED' END ELSE p_outcome END;
  UPDATE public.integration_outbox SET state=v_state,lease_token=NULL,lease_until=NULL,
    provider_message_id=p_provider_message_id,last_error_code=p_error_code,version=version+1,updated_at=v_now,
    next_at=CASE WHEN v_state='QUEUED' THEN v_now+make_interval(secs=>least(3600,power(2,r.attempts)::integer)) ELSE next_at END
  WHERE id=r.id RETURNING * INTO r;
  RETURN r;
END;
$$;

CREATE FUNCTION public.integration_reserve_usage(p_provider text,p_environment text,p_metric text,p_amount bigint,p_hard_limit bigint)
RETURNS jsonb
LANGUAGE plpgsql SET search_path=pg_catalog,public AS $$
DECLARE r public.integration_usage_daily; v_day date:=(clock_timestamp() AT TIME ZONE 'UTC')::date; crossed integer[];
BEGIN
  IF p_environment IS DISTINCT FROM 'mock' THEN RAISE EXCEPTION 'LIVE_INTEGRATION_BLOCKED' USING ERRCODE='42501'; END IF;
  IF p_amount IS NULL OR p_amount NOT BETWEEN 1 AND 1000000000000 OR p_hard_limit IS NULL OR p_hard_limit NOT BETWEEN 0 AND 1000000000000
  THEN RAISE EXCEPTION 'INVALID_INTEGRATION_USAGE' USING ERRCODE='22023'; END IF;
  INSERT INTO public.integration_usage_daily(provider,environment,day,metric,hard_limit)
  VALUES(p_provider,p_environment,v_day,p_metric,p_hard_limit) ON CONFLICT DO NOTHING;
  SELECT * INTO r FROM public.integration_usage_daily
  WHERE provider=p_provider AND environment=p_environment AND day=v_day AND metric=p_metric FOR UPDATE;
  IF r.hard_limit<>p_hard_limit THEN RAISE EXCEPTION 'QUOTA_POLICY_CHANGED' USING ERRCODE='PT409'; END IF;
  IF p_amount>r.hard_limit-r.used THEN RAISE EXCEPTION 'INTEGRATION_QUOTA_EXCEEDED' USING ERRCODE='PT429'; END IF;
  SELECT coalesce(array_agg(t ORDER BY t),'{}'::integer[]) INTO crossed FROM unnest(ARRAY[60,80,95]) t
  WHERE (r.used+p_amount)*100>=r.hard_limit*t AND NOT(t=ANY(r.warned_thresholds));
  UPDATE public.integration_usage_daily SET used=used+p_amount,warned_thresholds=warned_thresholds||crossed,updated_at=clock_timestamp()
  WHERE provider=p_provider AND environment=p_environment AND day=v_day AND metric=p_metric RETURNING * INTO r;
  RETURN jsonb_build_object('used',r.used,'hardLimit',r.hard_limit,'newlyCrossed',crossed,'day',r.day,'source','mock');
END;
$$;

REVOKE ALL ON FUNCTION public.integration_claim(text,text,integer,integer) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.integration_finish(uuid,uuid,integer,text,text,text) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.integration_reserve_usage(text,text,text,bigint,bigint) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.integration_claim(text,text,integer,integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.integration_finish(uuid,uuid,integer,text,text,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.integration_reserve_usage(text,text,text,bigint,bigint) TO service_role;
COMMIT;
