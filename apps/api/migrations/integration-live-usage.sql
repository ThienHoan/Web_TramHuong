-- First install on TEST DB only, after integration-delivery-foundation.sql.
-- Durable daily budget for REAL provider calls made under INTEGRATIONS_ENV=staging.
-- Reuses integration_usage_daily (environment='staging' rows). Reservation happens
-- before the outbound call; there is no refund. Providers allowlisted explicitly.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';
CREATE FUNCTION public.integration_reserve_live_usage(p_provider text,p_metric text,p_amount bigint,p_hard_limit bigint)
RETURNS jsonb LANGUAGE plpgsql SET search_path=pg_catalog,public SET lock_timeout='2s' AS $$
DECLARE r public.integration_usage_daily; v_day date:=(clock_timestamp() AT TIME ZONE 'UTC')::date; crossed integer[];
BEGIN
  IF p_provider IS NULL OR p_provider NOT IN ('gemini') OR p_metric IS NULL OR p_metric NOT IN ('requests','tokens')
    OR p_amount IS NULL OR p_amount NOT BETWEEN 1 AND 1000000 OR p_hard_limit IS NULL OR p_hard_limit NOT BETWEEN 1 AND 100000000
  THEN RAISE EXCEPTION 'INVALID_LIVE_USAGE' USING ERRCODE='22023'; END IF;
  INSERT INTO public.integration_usage_daily(provider,environment,day,metric,hard_limit)
  VALUES(p_provider,'staging',v_day,p_metric,p_hard_limit) ON CONFLICT DO NOTHING;
  SELECT * INTO r FROM public.integration_usage_daily
  WHERE provider=p_provider AND environment='staging' AND day=v_day AND metric=p_metric FOR UPDATE;
  IF r.hard_limit<>p_hard_limit THEN RAISE EXCEPTION 'QUOTA_POLICY_CHANGED' USING ERRCODE='PT409'; END IF;
  IF p_amount>r.hard_limit-r.used THEN RAISE EXCEPTION 'LIVE_QUOTA_EXCEEDED' USING ERRCODE='PT429'; END IF;
  SELECT coalesce(array_agg(t ORDER BY t),'{}'::integer[]) INTO crossed FROM unnest(ARRAY[60,80,95]) t
  WHERE (r.used+p_amount)*100>=r.hard_limit*t AND NOT(t=ANY(r.warned_thresholds));
  UPDATE public.integration_usage_daily SET used=used+p_amount,warned_thresholds=warned_thresholds||crossed,updated_at=clock_timestamp()
  WHERE provider=p_provider AND environment='staging' AND day=v_day AND metric=p_metric RETURNING * INTO r;
  RETURN jsonb_build_object('used',r.used,'hardLimit',r.hard_limit,'newlyCrossed',crossed,'day',r.day,'environment','staging');
END;
$$;
REVOKE ALL ON FUNCTION public.integration_reserve_live_usage(text,text,bigint,bigint) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.integration_reserve_live_usage(text,text,bigint,bigint) TO service_role;
COMMIT;
