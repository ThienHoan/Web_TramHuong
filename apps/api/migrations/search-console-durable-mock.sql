-- First install on TEST DB. Synthetic mock property only, no Google transport.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='30s';
CREATE TABLE public.seo_search_sync_state (
  property text PRIMARY KEY DEFAULT 'sc-domain:mock.example.invalid' CHECK(property='sc-domain:mock.example.invalid'),
  source text NOT NULL DEFAULT 'mock' CHECK(source='mock'),
  version integer NOT NULL DEFAULT 0 CHECK(version>=0),
  window_dates date[] NOT NULL DEFAULT '{}'::date[] CHECK(cardinality(window_dates) IN (0,14)),
  truncated_dates date[] NOT NULL DEFAULT '{}'::date[] CHECK(cardinality(truncated_dates)<=14),
  last_synced_at timestamptz,
  last_attempt_at timestamptz,
  last_error_code text CHECK(last_error_code IN ('INVALID_RESPONSE','UNAVAILABLE','RATE_LIMITED','QUOTA_EXCEEDED','TIMEOUT','REJECTED','CIRCUIT_OPEN','CONCURRENCY_LIMIT','STORAGE_UNAVAILABLE','BLOCKED')),
  lease_token uuid,
  lease_until timestamptz,
  CHECK((lease_token IS NULL)=(lease_until IS NULL)),
  CHECK((last_synced_at IS NULL)=(cardinality(window_dates)=0))
);
CREATE TABLE public.seo_search_metrics_daily (
  property text NOT NULL DEFAULT 'sc-domain:mock.example.invalid' CHECK(property='sc-domain:mock.example.invalid'),
  source text NOT NULL DEFAULT 'mock' CHECK(source='mock'),
  day date NOT NULL,
  query text NOT NULL CHECK(length(query) BETWEEN 1 AND 100 AND query !~ '[[:cntrl:]]'),
  page text NOT NULL CHECK(length(page)<=300 AND page ~ '^https://mock\.example\.invalid/[^?#[:space:][:cntrl:]]*$'),
  device text NOT NULL CHECK(device IN ('MOBILE','DESKTOP','TABLET')),
  country text NOT NULL CHECK(country ~ '^[a-z]{3}$'),
  clicks bigint NOT NULL CHECK(clicks BETWEEN 0 AND 1000000000),
  impressions bigint NOT NULL CHECK(impressions BETWEEN 0 AND 1000000000 AND impressions>=clicks),
  ctr numeric NOT NULL CHECK(ctr BETWEEN 0 AND 1),
  position numeric NOT NULL CHECK(position BETWEEN 0 AND 1000 AND (impressions=0 OR position>=1)),
  PRIMARY KEY(property,day,query,page,device,country),
  CHECK(abs(ctr-CASE WHEN impressions=0 THEN 0 ELSE clicks::numeric/impressions END)<=0.000001)
);
ALTER TABLE public.seo_search_sync_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seo_search_metrics_daily ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.seo_search_sync_state,public.seo_search_metrics_daily FROM PUBLIC,anon,authenticated;
GRANT ALL ON public.seo_search_sync_state,public.seo_search_metrics_daily TO service_role;

CREATE FUNCTION public.seo_search_read_mock()
RETURNS jsonb LANGUAGE plpgsql STABLE SET search_path=pg_catalog,public AS $$
DECLARE r public.seo_search_sync_state; v_days jsonb;
BEGIN
  SELECT * INTO r FROM public.seo_search_sync_state WHERE property='sc-domain:mock.example.invalid';
  IF NOT FOUND THEN RETURN jsonb_build_object('source','mock','property','sc-domain:mock.example.invalid',
    'version',0,'window','[]'::jsonb,'truncatedDates','[]'::jsonb,'days','[]'::jsonb,
    'lastSyncedAt',NULL,'lastAttemptAt',NULL,'lastError',NULL,'syncing',false); END IF;
  SELECT coalesce(jsonb_agg(jsonb_build_object('date',d,'rows',(
    SELECT coalesce(jsonb_agg(jsonb_build_object('keys',jsonb_build_array(m.day,m.query,m.page,m.device,m.country),
      'clicks',m.clicks,'impressions',m.impressions,'ctr',m.ctr,'position',m.position)
      ORDER BY m.query,m.page,m.device,m.country),'[]'::jsonb)
    FROM public.seo_search_metrics_daily m WHERE m.property=r.property AND m.day=d
  )) ORDER BY d),'[]'::jsonb) INTO v_days FROM unnest(r.window_dates) d;
  RETURN jsonb_build_object('source','mock','property',r.property,'version',r.version,'window',r.window_dates,
    'truncatedDates',r.truncated_dates,'days',v_days,'lastSyncedAt',r.last_synced_at,
    'lastAttemptAt',r.last_attempt_at,'lastError',r.last_error_code,
    'syncing',coalesce(r.lease_until>statement_timestamp(),false));
END;
$$;
CREATE FUNCTION public.seo_search_begin_mock()
RETURNS jsonb LANGUAGE plpgsql SET search_path=pg_catalog,public SET lock_timeout='2s' AS $$
DECLARE r public.seo_search_sync_state; v_now timestamptz:=clock_timestamp();
BEGIN
  INSERT INTO public.seo_search_sync_state(property) VALUES('sc-domain:mock.example.invalid') ON CONFLICT DO NOTHING;
  SELECT * INTO r FROM public.seo_search_sync_state WHERE property='sc-domain:mock.example.invalid' FOR UPDATE;
  IF r.lease_until>v_now THEN RAISE EXCEPTION 'SEARCH_SYNC_BUSY' USING ERRCODE='PT409'; END IF;
  UPDATE public.seo_search_sync_state SET version=version+1,lease_token=gen_random_uuid(),
    lease_until=v_now+interval '120 seconds',last_attempt_at=v_now,last_error_code=NULL
    WHERE property=r.property RETURNING * INTO r;
  RETURN jsonb_build_object('token',r.lease_token,'version',r.version,'startedAt',v_now);
END;
$$;
CREATE FUNCTION public.seo_search_complete_mock(p_token uuid,p_version integer,p_window date[],p_days jsonb,p_truncated date[])
RETURNS jsonb LANGUAGE plpgsql SET search_path=pg_catalog,public SET lock_timeout='2s' AS $$
DECLARE r public.seo_search_sync_state; i integer; d jsonb; v_row jsonb; k jsonb;
  v_clicks numeric; v_impressions numeric; v_ctr numeric; v_position numeric;
BEGIN
  SELECT * INTO r FROM public.seo_search_sync_state WHERE property='sc-domain:mock.example.invalid' FOR UPDATE;
  IF NOT FOUND OR r.lease_token IS NULL OR r.lease_token IS DISTINCT FROM p_token OR r.version IS DISTINCT FROM p_version
    OR r.lease_until<=clock_timestamp() THEN RAISE EXCEPTION 'SEARCH_SYNC_LEASE_CONFLICT' USING ERRCODE='PT409'; END IF;
  IF p_window IS NULL OR cardinality(p_window)<>14 OR array_lower(p_window,1)<>1 OR p_window[1] IS NULL
    OR jsonb_typeof(p_days) IS DISTINCT FROM 'array' OR jsonb_array_length(p_days)<>14
    OR p_truncated IS NULL OR cardinality(p_truncated)>14 OR NOT p_truncated<@p_window
    OR cardinality(p_truncated)<>(SELECT count(DISTINCT x) FROM unnest(p_truncated) x)
  THEN RAISE EXCEPTION 'INVALID_SEARCH_SNAPSHOT' USING ERRCODE='22023'; END IF;
  -- Derived mock rows for these days are replaced atomically, not source data.
  DELETE FROM public.seo_search_metrics_daily WHERE property=r.property AND day=ANY(p_window);
  FOR i IN 1..14 LOOP
    d:=p_days->(i-1);
    IF p_window[i] IS DISTINCT FROM p_window[1]+(i-1) OR jsonb_typeof(d) IS DISTINCT FROM 'object'
      OR d->>'date' IS DISTINCT FROM p_window[i]::text OR jsonb_typeof(d->'rows') IS DISTINCT FROM 'array'
      OR jsonb_array_length(d->'rows')>200 THEN RAISE EXCEPTION 'INVALID_SEARCH_DAY' USING ERRCODE='22023'; END IF;
    FOR v_row IN SELECT value FROM jsonb_array_elements(d->'rows') LOOP
      k:=v_row->'keys';
      IF jsonb_typeof(v_row) IS DISTINCT FROM 'object' OR jsonb_typeof(k) IS DISTINCT FROM 'array'
        OR jsonb_array_length(k)<>5 OR k->>0 IS DISTINCT FROM p_window[i]::text
        OR EXISTS(SELECT 1 FROM jsonb_array_elements(k) x WHERE jsonb_typeof(x)<>'string')
        OR EXISTS(SELECT 1 FROM unnest(ARRAY['clicks','impressions','ctr','position']) name
          WHERE jsonb_typeof(v_row->name) IS DISTINCT FROM 'number') THEN
        RAISE EXCEPTION 'INVALID_SEARCH_ROW' USING ERRCODE='22023'; END IF;
      v_clicks:=(v_row->>'clicks')::numeric; v_impressions:=(v_row->>'impressions')::numeric;
      v_ctr:=(v_row->>'ctr')::numeric;v_position:=(v_row->>'position')::numeric;
      IF v_clicks<>trunc(v_clicks) OR v_impressions<>trunc(v_impressions) OR btrim(k->>1)=''
        OR length(k->>2)>length('https://mock.example.invalid')+250 THEN
        RAISE EXCEPTION 'INVALID_SEARCH_METRIC' USING ERRCODE='22023'; END IF;
      INSERT INTO public.seo_search_metrics_daily(property,day,query,page,device,country,clicks,impressions,ctr,position)
      VALUES(r.property,p_window[i],k->>1,k->>2,k->>3,k->>4,v_clicks,v_impressions,v_ctr,v_position);
    END LOOP;
  END LOOP;
  UPDATE public.seo_search_sync_state SET window_dates=p_window,truncated_dates=p_truncated,last_synced_at=clock_timestamp(),
    last_error_code=NULL,lease_token=NULL,lease_until=NULL WHERE property=r.property;
  RETURN public.seo_search_read_mock();
END;
$$;
CREATE FUNCTION public.seo_search_fail_mock(p_token uuid,p_version integer,p_code text)
RETURNS void LANGUAGE plpgsql SET search_path=pg_catalog,public SET lock_timeout='2s' AS $$
BEGIN
  IF p_code IS NULL OR p_code NOT IN ('INVALID_RESPONSE','UNAVAILABLE','RATE_LIMITED','QUOTA_EXCEEDED','TIMEOUT','REJECTED','CIRCUIT_OPEN','CONCURRENCY_LIMIT','STORAGE_UNAVAILABLE','BLOCKED') THEN
    RAISE EXCEPTION 'INVALID_SEARCH_ERROR_CODE' USING ERRCODE='22023'; END IF;
  UPDATE public.seo_search_sync_state SET lease_token=NULL,lease_until=NULL,last_error_code=p_code
  WHERE property='sc-domain:mock.example.invalid' AND lease_token=p_token AND version=p_version;
  IF NOT FOUND THEN RAISE EXCEPTION 'SEARCH_SYNC_LEASE_CONFLICT' USING ERRCODE='PT409'; END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.seo_search_read_mock(),public.seo_search_begin_mock(),public.seo_search_complete_mock(uuid,integer,date[],jsonb,date[]),public.seo_search_fail_mock(uuid,integer,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.seo_search_read_mock(),public.seo_search_begin_mock(),public.seo_search_complete_mock(uuid,integer,date[],jsonb,date[]),public.seo_search_fail_mock(uuid,integer,text) TO service_role;
COMMIT;
