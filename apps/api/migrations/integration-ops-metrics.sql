-- First install on TEST DB only, after integration-delivery-foundation.sql.
-- One read-only aggregate RPC for the ADMIN health panel. Counts, timestamps and
-- fixed error codes only: no payload, order, email, search query or URL.
-- Optional stores (Search Console, PageSpeed, Merchant fence) are read if installed.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';
CREATE FUNCTION public.integration_ops_metrics_mock(p_window_days integer DEFAULT 7)
RETURNS jsonb LANGUAGE plpgsql STABLE SET search_path=pg_catalog,public SET statement_timeout='5s' AS $$
DECLARE v_now timestamptz:=statement_timestamp(); v_day date:=(statement_timestamp() AT TIME ZONE 'UTC')::date;
  v_since timestamptz; v_providers jsonb:='{}'::jsonb; p text; v_outbox jsonb; v_usage jsonb;
  v_gsc jsonb; v_psi jsonb; v_fence jsonb;
BEGIN
  IF p_window_days IS NULL OR p_window_days NOT BETWEEN 1 AND 31 THEN
    RAISE EXCEPTION 'INVALID_OPS_WINDOW' USING ERRCODE='22023'; END IF;
  v_since:=v_now-make_interval(days=>p_window_days);
  FOREACH p IN ARRAY ARRAY['resend','gemini','pgvector','cloudinary','google','ga4','search_console','merchant','pagespeed','turnstile'] LOOP
    SELECT jsonb_build_object(
      'queued',count(*) FILTER (WHERE state='QUEUED'),
      'working',count(*) FILTER (WHERE state='WORKING'),
      'accepted',count(*) FILTER (WHERE state IN ('ACCEPTED','DELIVERED') AND updated_at>=v_since),
      'unknown',count(*) FILTER (WHERE state='UNKNOWN' AND updated_at>=v_since),
      'dead',count(*) FILTER (WHERE state='DEAD' AND updated_at>=v_since),
      'lastAcceptedAt',max(updated_at) FILTER (WHERE state IN ('ACCEPTED','DELIVERED')),
      'lastErrorCode',(SELECT o.last_error_code FROM public.integration_outbox o
        WHERE o.provider=p AND o.environment='mock' AND o.state IN ('ACCEPTED','DELIVERED','UNKNOWN','DEAD')
        ORDER BY o.updated_at DESC,o.id LIMIT 1))
    INTO v_outbox FROM public.integration_outbox WHERE provider=p AND environment='mock';
    SELECT coalesce(jsonb_agg(jsonb_build_object('metric',metric,'used',used,'hardLimit',hard_limit) ORDER BY metric),'[]'::jsonb)
    INTO v_usage FROM public.integration_usage_daily WHERE provider=p AND environment='mock' AND day=v_day;
    v_providers:=v_providers||jsonb_build_object(p,jsonb_build_object('outbox',v_outbox,'usage',v_usage));
  END LOOP;
  IF to_regclass('public.seo_search_sync_state') IS NOT NULL THEN
    EXECUTE 'SELECT jsonb_build_object(''lastSuccessAt'',max(last_synced_at),''lastAttemptAt'',max(last_attempt_at),
      ''lastErrorCode'',(SELECT last_error_code FROM public.seo_search_sync_state ORDER BY last_attempt_at DESC NULLS LAST LIMIT 1))
      FROM public.seo_search_sync_state' INTO v_gsc;
  END IF;
  IF to_regclass('public.seo_pagespeed_audit_state') IS NOT NULL THEN
    EXECUTE 'SELECT jsonb_build_object(''lastSuccessAt'',(SELECT max(stored_at) FROM public.seo_pagespeed_samples),
      ''lastAttemptAt'',max(last_attempt_at),
      ''lastErrorCode'',(SELECT last_error_code FROM public.seo_pagespeed_audit_state ORDER BY last_attempt_at DESC NULLS LAST LIMIT 1))
      FROM public.seo_pagespeed_audit_state' INTO v_psi;
  END IF;
  IF to_regclass('public.integration_merchant_send_fence') IS NOT NULL THEN
    EXECUTE 'SELECT jsonb_build_object(''inflight'',count(*) FILTER (WHERE inflight_until>$1))
      FROM public.integration_merchant_send_fence' INTO v_fence USING v_now;
  END IF;
  RETURN jsonb_build_object('source','test_db_mock','observedAt',v_now,'windowDays',p_window_days,'usageDay',v_day,
    'providers',v_providers,'searchConsole',v_gsc,'pagespeed',v_psi,'merchantFence',v_fence);
END;
$$;
REVOKE ALL ON FUNCTION public.integration_ops_metrics_mock(integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.integration_ops_metrics_mock(integer) TO service_role;
COMMIT;
