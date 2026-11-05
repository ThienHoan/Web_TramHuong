-- First install on TEST DB after smart-logistics + integration notification source.
-- No original shipping/order function is replaced. Trigger installs DISABLED.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='30s';
CREATE FUNCTION public.integration_shipment_notification_source_mock(p_shipment_id uuid)
RETURNS jsonb LANGUAGE plpgsql SET search_path=pg_catalog,public AS $$
DECLARE s public.shipping_records; o public.orders; v_to text; v_code text; v_mail jsonb;
BEGIN
  SELECT * INTO s FROM public.shipping_records WHERE id=p_shipment_id AND kind='shipment';
  IF NOT FOUND OR s.order_id IS NULL OR s.key IS DISTINCT FROM 'shipment:staging:'||s.order_id::text
    AND s.key IS DISTINCT FROM 'shipment:production:'||s.order_id::text
    OR s.state NOT IN ('SHIPMENT_CREATED','PICKUP_PENDING','IN_TRANSIT','OUT_FOR_DELIVERY','DELIVERED',
      'DELIVERY_FAILED','RETURN_REQUESTED','RETURNING','RETURNED','CANCELLED','MANUAL_REVIEW') THEN
    RETURN jsonb_build_object('source','mock','eligible',false); END IF;
  SELECT * INTO o FROM public.orders WHERE id=s.order_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('source','mock','eligible',false); END IF;
  v_to:=lower(btrim(o.shipping_info->>'email')); v_code:=s.data->>'trackingCode';
  IF v_to IS NULL OR length(v_to)>254 OR v_to !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
    OR v_code IS NULL OR v_code !~ '^[A-Za-z0-9_-]{1,32}$' THEN
    RAISE EXCEPTION 'SHIPMENT_NOTIFICATION_SOURCE_INVALID' USING ERRCODE='PT422'; END IF;
  v_mail:=jsonb_build_object('to',v_to,'subject','Shipment update / Thong tin giao hang #'||o.id::text,
    'template','shipment-status','context',jsonb_build_object('id',o.id,'trackingCode',v_code,'status',s.state));
  RETURN jsonb_build_object('source','mock','eligible',true,'orderId',o.id,'shipmentId',s.id,'status',s.state,
    'binding',encode(sha256(convert_to(v_mail::text||':'||s.id::text,'UTF8')),'hex'),'mail',v_mail);
END;
$$;
CREATE FUNCTION public.integration_capture_shipment_notification_mock(p_shipment_id uuid)
RETURNS jsonb LANGUAGE plpgsql SET search_path=pg_catalog,public SET lock_timeout='2s' AS $$
DECLARE v_source jsonb; v_payload jsonb; v_key text; r public.integration_outbox; v_id uuid;
BEGIN
  PERFORM 1 FROM public.shipping_records WHERE id=p_shipment_id AND kind='shipment' FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('source','mock','status','not_eligible'); END IF;
  v_source:=public.integration_shipment_notification_source_mock(p_shipment_id);
  IF (v_source->>'eligible')::boolean IS NOT TRUE THEN RETURN jsonb_build_object('source','mock','status','not_eligible'); END IF;
  v_payload:=v_source-'source'-'eligible'-'mail';
  v_key:='ship_notice_v1:'||p_shipment_id::text||':'||(v_source->>'status');
  SELECT * INTO r FROM public.integration_outbox WHERE provider='resend' AND environment='mock' AND dedupe_key=v_key;
  IF FOUND THEN
    IF r.payload IS DISTINCT FROM v_payload OR r.event_type<>'shipment_status' OR r.operation_kind<>'mutation' THEN
      RAISE EXCEPTION 'SHIPMENT_NOTIFICATION_SOURCE_CONFLICT' USING ERRCODE='PT409'; END IF;
    RETURN jsonb_build_object('source','mock','status','duplicate','id',r.id,'state',r.state);
  END IF;
  INSERT INTO public.integration_outbox(provider,environment,dedupe_key,event_type,operation_kind,payload)
  VALUES('resend','mock',v_key,'shipment_status','mutation',v_payload) RETURNING id INTO v_id;
  RETURN jsonb_build_object('source','mock','status','recorded','id',v_id,'state','QUEUED');
END;
$$;
CREATE FUNCTION public.integration_publish_shipment_notification_mock(p_shipment_id uuid)
RETURNS jsonb LANGUAGE plpgsql SET search_path=pg_catalog,public AS $$
DECLARE s public.shipping_records; v_code text; v_key text; v_id uuid;
BEGIN
  RETURN public.integration_capture_shipment_notification_mock(p_shipment_id);
EXCEPTION WHEN SQLSTATE 'PT422' OR SQLSTATE 'PT409' THEN
  v_code:=CASE SQLSTATE WHEN 'PT409' THEN 'NOTIFICATION_SOURCE_CONFLICT' ELSE 'NOTIFICATION_SNAPSHOT_INVALID' END;
  SELECT * INTO s FROM public.shipping_records WHERE id=p_shipment_id;
  v_key:='ship_review_v1:'||p_shipment_id::text||':'||s.state||':'||v_code;
  INSERT INTO public.integration_outbox(provider,environment,dedupe_key,event_type,operation_kind,payload,state,last_error_code)
  VALUES('resend','mock',v_key,'shipment_source_review','read',
    jsonb_build_object('orderId',s.order_id,'shipmentId',s.id,'status',s.state,'errorCode',v_code),'DEAD',v_code)
  ON CONFLICT(provider,environment,dedupe_key) DO NOTHING RETURNING id INTO v_id;
  IF v_id IS NULL THEN SELECT id INTO v_id FROM public.integration_outbox WHERE provider='resend' AND environment='mock' AND dedupe_key=v_key; END IF;
  RETURN jsonb_build_object('source','mock','status','requires_review','id',v_id,'state','DEAD','errorCode',v_code);
END;
$$;
CREATE FUNCTION public.integration_resolve_shipment_notification_mock(p_id uuid,p_lease_token uuid,p_version integer)
RETURNS jsonb LANGUAGE plpgsql SET search_path=pg_catalog,public AS $$
DECLARE r public.integration_outbox; v_source jsonb;
BEGIN
  SELECT * INTO r FROM public.integration_outbox WHERE id=p_id FOR UPDATE;
  IF NOT FOUND OR r.provider<>'resend' OR r.environment<>'mock' OR r.event_type<>'shipment_status'
    OR r.operation_kind<>'mutation' OR r.state<>'WORKING' OR r.lease_token IS DISTINCT FROM p_lease_token
    OR r.version IS DISTINCT FROM p_version OR r.lease_until<=clock_timestamp()
    OR jsonb_typeof(r.payload->'shipmentId') IS DISTINCT FROM 'string' THEN
    RAISE EXCEPTION 'SHIPMENT_NOTIFICATION_LEASE_CONFLICT' USING ERRCODE='PT409'; END IF;
  PERFORM 1 FROM public.shipping_records WHERE id=(r.payload->>'shipmentId')::uuid FOR SHARE;
  v_source:=public.integration_shipment_notification_source_mock((r.payload->>'shipmentId')::uuid);
  IF (v_source->>'eligible')::boolean IS NOT TRUE OR r.payload IS DISTINCT FROM v_source-'source'-'eligible'-'mail' THEN
    RAISE EXCEPTION 'SHIPMENT_NOTIFICATION_SOURCE_CHANGED' USING ERRCODE='PT409'; END IF;
  RETURN jsonb_build_object('source','mock','mail',v_source->'mail');
END;
$$;
CREATE FUNCTION public.integration_shipment_notification_mock()
RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog,public AS $$
BEGIN
  IF NEW.kind='shipment' THEN
    IF TG_OP='INSERT' THEN PERFORM public.integration_publish_shipment_notification_mock(NEW.id);
    ELSIF NEW.state IS DISTINCT FROM OLD.state OR NEW.data->>'trackingCode' IS DISTINCT FROM OLD.data->>'trackingCode'
      OR NEW.order_id IS DISTINCT FROM OLD.order_id THEN
      PERFORM public.integration_publish_shipment_notification_mock(NEW.id);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
CREATE FUNCTION public.integration_reconcile_shipment_notifications_mock(p_after_id uuid DEFAULT NULL,p_limit integer DEFAULT 20)
RETURNS jsonb LANGUAGE plpgsql SET search_path=pg_catalog,public AS $$
DECLARE v_ids uuid[]; v_id uuid; s public.shipping_records; v_items jsonb:='[]'::jsonb; v_count integer:=0; v_cursor uuid;
BEGIN
  IF p_limit IS NULL OR p_limit NOT BETWEEN 1 AND 20 THEN RAISE EXCEPTION 'INVALID_NOTIFICATION_PAGE' USING ERRCODE='22023'; END IF;
  SELECT array_agg(id ORDER BY id) INTO v_ids FROM (SELECT id FROM public.shipping_records
    WHERE kind='shipment' AND order_id IS NOT NULL AND (p_after_id IS NULL OR id>p_after_id) ORDER BY id LIMIT p_limit+1) page;
  FOREACH v_id IN ARRAY coalesce(v_ids,'{}'::uuid[]) LOOP
    EXIT WHEN v_count>=p_limit;
    SELECT * INTO s FROM public.shipping_records WHERE id=v_id AND kind='shipment' FOR UPDATE;
    v_count:=v_count+1;v_cursor:=v_id;
    IF NOT FOUND THEN CONTINUE; END IF;
    v_items:=v_items||jsonb_build_array(jsonb_build_object('orderId',s.order_id,'shipmentId',s.id,'event','shipment_status',
      'outcome',public.integration_publish_shipment_notification_mock(s.id)));
  END LOOP;
  RETURN jsonb_build_object('source','mock','persistence','database','processedShipments',v_count,'limit',p_limit,
    'hasMore',coalesce(cardinality(v_ids),0)>p_limit,'nextCursor',CASE WHEN coalesce(cardinality(v_ids),0)>p_limit THEN v_cursor ELSE NULL END,'items',v_items);
END;
$$;
REVOKE ALL ON FUNCTION public.integration_shipment_notification_source_mock(uuid),public.integration_capture_shipment_notification_mock(uuid),public.integration_publish_shipment_notification_mock(uuid),public.integration_resolve_shipment_notification_mock(uuid,uuid,integer),public.integration_shipment_notification_mock(),public.integration_reconcile_shipment_notifications_mock(uuid,integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.integration_shipment_notification_source_mock(uuid),public.integration_capture_shipment_notification_mock(uuid),public.integration_publish_shipment_notification_mock(uuid),public.integration_resolve_shipment_notification_mock(uuid,uuid,integer),public.integration_shipment_notification_mock(),public.integration_reconcile_shipment_notifications_mock(uuid,integer) TO service_role;
CREATE TRIGGER integration_shipment_notification_mock_v1 AFTER INSERT OR UPDATE ON public.shipping_records
FOR EACH ROW EXECUTE FUNCTION public.integration_shipment_notification_mock();
ALTER TABLE public.shipping_records DISABLE TRIGGER integration_shipment_notification_mock_v1;
COMMIT;
