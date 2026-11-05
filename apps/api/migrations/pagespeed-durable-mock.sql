-- First install on TEST DB. Synthetic allowlisted targets only, no PSI transport/key.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='30s';
CREATE TABLE public.seo_pagespeed_audit_state (
  target_id text NOT NULL CHECK(target_id IN ('home_vi','home_en','catalog_vi','catalog_en','product_vi','product_en')),
  strategy text NOT NULL CHECK(strategy IN ('mobile','desktop')),
  source text NOT NULL DEFAULT 'mock' CHECK(source='mock'),
  version integer NOT NULL DEFAULT 0 CHECK(version>=0),
  last_attempt_at timestamptz,
  last_error_code text CHECK(last_error_code IN ('INVALID_RESPONSE','UNAVAILABLE','RATE_LIMITED','QUOTA_EXCEEDED','TIMEOUT','REJECTED','CIRCUIT_OPEN','CONCURRENCY_LIMIT','STORAGE_UNAVAILABLE','BLOCKED')),
  lease_token uuid UNIQUE,
  lease_until timestamptz,
  PRIMARY KEY(target_id,strategy),
  CHECK((lease_token IS NULL)=(lease_until IS NULL))
);
CREATE TABLE public.seo_pagespeed_samples (
  target_id text NOT NULL,
  strategy text NOT NULL,
  source text NOT NULL DEFAULT 'mock' CHECK(source='mock'),
  measured_at timestamptz NOT NULL,
  stored_at timestamptz NOT NULL,
  lighthouse_version text NOT NULL CHECK(lighthouse_version ~ '^[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}(-mock)?$'),
  performance_score numeric CHECK(performance_score BETWEEN 0 AND 100),
  accessibility_score numeric CHECK(accessibility_score BETWEEN 0 AND 100),
  best_practices_score numeric CHECK(best_practices_score BETWEEN 0 AND 100),
  seo_score numeric CHECK(seo_score BETWEEN 0 AND 100),
  lcp_ms numeric CHECK(lcp_ms BETWEEN 0 AND 600000),
  cls numeric CHECK(cls BETWEEN 0 AND 100),
  tbt_ms numeric CHECK(tbt_ms BETWEEN 0 AND 600000),
  PRIMARY KEY(target_id,strategy,measured_at),
  FOREIGN KEY(target_id,strategy) REFERENCES public.seo_pagespeed_audit_state(target_id,strategy)
);
ALTER TABLE public.seo_pagespeed_audit_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seo_pagespeed_samples ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.seo_pagespeed_audit_state,public.seo_pagespeed_samples FROM PUBLIC,anon,authenticated;
GRANT ALL ON public.seo_pagespeed_audit_state,public.seo_pagespeed_samples TO service_role;

CREATE FUNCTION public.seo_pagespeed_read_mock()
RETURNS jsonb LANGUAGE plpgsql STABLE SET search_path=pg_catalog,public AS $$
DECLARE v jsonb;
BEGIN
  SELECT coalesce(jsonb_agg(jsonb_build_object(
    'targetId',s.target_id,'strategy',s.strategy,'lastAttemptAt',s.last_attempt_at,
    'lastError',s.last_error_code,'running',coalesce(s.lease_until>statement_timestamp(),false),
    'samples',(SELECT coalesce(jsonb_agg(jsonb_build_object(
        'measuredAt',m.measured_at,'storedAt',m.stored_at,'lighthouseVersion',m.lighthouse_version,
        'performanceScore',m.performance_score,'accessibilityScore',m.accessibility_score,
        'bestPracticesScore',m.best_practices_score,'seoScore',m.seo_score,
        'lcpMs',m.lcp_ms,'cls',m.cls,'tbtMs',m.tbt_ms) ORDER BY m.measured_at),'[]'::jsonb)
      FROM public.seo_pagespeed_samples m WHERE m.target_id=s.target_id AND m.strategy=s.strategy)
  ) ORDER BY s.target_id,s.strategy),'[]'::jsonb) INTO v FROM public.seo_pagespeed_audit_state s;
  RETURN jsonb_build_object('source','mock','reports',v);
END;
$$;
CREATE FUNCTION public.seo_pagespeed_begin_mock(p_target text,p_strategy text)
RETURNS jsonb LANGUAGE plpgsql SET search_path=pg_catalog,public SET lock_timeout='2s' AS $$
DECLARE r public.seo_pagespeed_audit_state; v_now timestamptz:=clock_timestamp(); v_latest public.seo_pagespeed_samples;
BEGIN
  IF p_target IS NULL OR p_target NOT IN ('home_vi','home_en','catalog_vi','catalog_en','product_vi','product_en')
    OR p_strategy IS NULL OR p_strategy NOT IN ('mobile','desktop') THEN
    RAISE EXCEPTION 'PAGESPEED_TARGET_NOT_ALLOWED' USING ERRCODE='22023'; END IF;
  INSERT INTO public.seo_pagespeed_audit_state(target_id,strategy) VALUES(p_target,p_strategy) ON CONFLICT DO NOTHING;
  SELECT * INTO r FROM public.seo_pagespeed_audit_state WHERE target_id=p_target AND strategy=p_strategy FOR UPDATE;
  SELECT * INTO v_latest FROM public.seo_pagespeed_samples WHERE target_id=p_target AND strategy=p_strategy
    ORDER BY measured_at DESC LIMIT 1;
  -- Cache hit: no lease, no budget, no new history row.
  IF v_latest.stored_at>v_now-interval '24 hours' THEN RETURN jsonb_build_object('cached',true); END IF;
  IF r.lease_until>v_now THEN RAISE EXCEPTION 'PAGESPEED_AUDIT_BUSY' USING ERRCODE='PT409'; END IF;
  UPDATE public.seo_pagespeed_audit_state SET version=version+1,lease_token=gen_random_uuid(),
    lease_until=v_now+interval '60 seconds',last_attempt_at=v_now,last_error_code=NULL
    WHERE target_id=p_target AND strategy=p_strategy RETURNING * INTO r;
  RETURN jsonb_build_object('cached',false,'token',r.lease_token,'version',r.version,'startedAt',v_now,
    'latestMeasuredAt',v_latest.measured_at);
END;
$$;
CREATE FUNCTION public.seo_pagespeed_record_mock(p_token uuid,p_version integer,p_sample jsonb)
RETURNS jsonb LANGUAGE plpgsql SET search_path=pg_catalog,public SET lock_timeout='2s' AS $$
DECLARE r public.seo_pagespeed_audit_state; v_now timestamptz:=clock_timestamp(); v_measured timestamptz;
  v_lab jsonb; k text;
BEGIN
  SELECT * INTO r FROM public.seo_pagespeed_audit_state WHERE lease_token=p_token FOR UPDATE;
  IF NOT FOUND OR p_token IS NULL OR r.version IS DISTINCT FROM p_version OR r.lease_until<=v_now THEN
    RAISE EXCEPTION 'PAGESPEED_LEASE_CONFLICT' USING ERRCODE='PT409'; END IF;
  IF jsonb_typeof(p_sample) IS DISTINCT FROM 'object' OR p_sample->>'source' IS DISTINCT FROM 'mock'
    OR p_sample->>'targetId' IS DISTINCT FROM r.target_id OR p_sample->>'strategy' IS DISTINCT FROM r.strategy
    OR jsonb_typeof(p_sample->'measuredAt') IS DISTINCT FROM 'string'
    OR jsonb_typeof(p_sample->'lighthouseVersion') IS DISTINCT FROM 'string'
    OR jsonb_typeof(p_sample->'lab') IS DISTINCT FROM 'object' THEN
    RAISE EXCEPTION 'INVALID_PAGESPEED_SAMPLE' USING ERRCODE='22023'; END IF;
  v_lab:=p_sample->'lab';
  FOREACH k IN ARRAY ARRAY['performanceScore','accessibilityScore','bestPracticesScore','seoScore','lcpMs','cls','tbtMs'] LOOP
    IF NOT (v_lab ? k) OR jsonb_typeof(v_lab->k) NOT IN ('number','null') THEN
      RAISE EXCEPTION 'INVALID_PAGESPEED_METRIC' USING ERRCODE='22023'; END IF;
  END LOOP;
  v_measured:=(p_sample->>'measuredAt')::timestamptz;
  IF v_measured>v_now+interval '5 minutes' OR v_measured<v_now-interval '1 day'
    OR EXISTS(SELECT 1 FROM public.seo_pagespeed_samples WHERE target_id=r.target_id AND strategy=r.strategy AND measured_at>=v_measured)
  THEN RAISE EXCEPTION 'NON_INCREMENTAL_PAGESPEED_SAMPLE' USING ERRCODE='22023'; END IF;
  INSERT INTO public.seo_pagespeed_samples(target_id,strategy,measured_at,stored_at,lighthouse_version,
    performance_score,accessibility_score,best_practices_score,seo_score,lcp_ms,cls,tbt_ms)
  VALUES(r.target_id,r.strategy,v_measured,v_now,p_sample->>'lighthouseVersion',
    (v_lab->>'performanceScore')::numeric,(v_lab->>'accessibilityScore')::numeric,(v_lab->>'bestPracticesScore')::numeric,
    (v_lab->>'seoScore')::numeric,(v_lab->>'lcpMs')::numeric,(v_lab->>'cls')::numeric,(v_lab->>'tbtMs')::numeric);
  -- Existing bounded history contract: newest 30 derived mock samples per pair.
  DELETE FROM public.seo_pagespeed_samples WHERE target_id=r.target_id AND strategy=r.strategy AND measured_at NOT IN (
    SELECT measured_at FROM public.seo_pagespeed_samples WHERE target_id=r.target_id AND strategy=r.strategy
    ORDER BY measured_at DESC LIMIT 30);
  UPDATE public.seo_pagespeed_audit_state SET lease_token=NULL,lease_until=NULL,last_error_code=NULL
    WHERE target_id=r.target_id AND strategy=r.strategy;
  RETURN public.seo_pagespeed_read_mock();
END;
$$;
CREATE FUNCTION public.seo_pagespeed_fail_mock(p_token uuid,p_version integer,p_code text)
RETURNS void LANGUAGE plpgsql SET search_path=pg_catalog,public SET lock_timeout='2s' AS $$
BEGIN
  IF p_code IS NULL OR p_code NOT IN ('INVALID_RESPONSE','UNAVAILABLE','RATE_LIMITED','QUOTA_EXCEEDED','TIMEOUT','REJECTED','CIRCUIT_OPEN','CONCURRENCY_LIMIT','STORAGE_UNAVAILABLE','BLOCKED') THEN
    RAISE EXCEPTION 'INVALID_PAGESPEED_ERROR_CODE' USING ERRCODE='22023'; END IF;
  UPDATE public.seo_pagespeed_audit_state SET lease_token=NULL,lease_until=NULL,last_error_code=p_code
  WHERE lease_token=p_token AND version=p_version;
  IF NOT FOUND THEN RAISE EXCEPTION 'PAGESPEED_LEASE_CONFLICT' USING ERRCODE='PT409'; END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.seo_pagespeed_read_mock(),public.seo_pagespeed_begin_mock(text,text),public.seo_pagespeed_record_mock(uuid,integer,jsonb),public.seo_pagespeed_fail_mock(uuid,integer,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.seo_pagespeed_read_mock(),public.seo_pagespeed_begin_mock(text,text),public.seo_pagespeed_record_mock(uuid,integer,jsonb),public.seo_pagespeed_fail_mock(uuid,integer,text) TO service_role;
COMMIT;
