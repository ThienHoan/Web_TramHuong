-- P4-02a first install on TEST DB after integration-delivery-foundation.sql.
-- No order write/trigger or live transport. Atomic committed-snapshot capture.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='30s';

CREATE FUNCTION public.integration_notification_source_mock(p_order_id uuid,p_event text)
RETURNS jsonb LANGUAGE plpgsql SET search_path=pg_catalog,public AS $$
DECLARE o public.orders; v_to text; v_status text; v_subject text; v_template text;
  v_context jsonb; v_items jsonb; v_payment text:=''; v_mail jsonb;
BEGIN
  IF p_order_id IS NULL OR p_event IS NULL OR p_event NOT IN ('order_confirmation','payment_success','order_status')
  THEN RAISE EXCEPTION 'NOTIFICATION_INVALID_SOURCE' USING ERRCODE='22023'; END IF;
  SELECT * INTO o FROM public.orders WHERE id=p_order_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'NOTIFICATION_NOT_FOUND' USING ERRCODE='PT404'; END IF;
  IF o.status IS NULL OR o.status NOT IN ('PENDING','AWAITING_PAYMENT','PAID','SHIPPED','COMPLETED','CANCELED','EXPIRED')
    OR (p_event='order_confirmation' AND o.status IN ('CANCELED','EXPIRED'))
    OR (p_event='payment_success' AND (o.payment_status IS DISTINCT FROM 'paid' OR o.payment_method IS DISTINCT FROM 'sepay'
      OR nullif(btrim(o.transaction_code),'') IS NULL OR o.status NOT IN ('PAID','SHIPPED','COMPLETED')))
  THEN RETURN jsonb_build_object('source','mock','eligible',false); END IF;
  v_to:=lower(btrim(o.shipping_info->>'email'));
  IF v_to IS NULL OR length(v_to)>254 OR v_to !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
    OR o.total IS NULL OR o.total NOT BETWEEN 0 AND 1000000000000 OR o.total*100<>trunc(o.total*100)
    OR jsonb_typeof(o.items) IS DISTINCT FROM 'array'
  THEN RAISE EXCEPTION 'NOTIFICATION_SNAPSHOT_INVALID' USING ERRCODE='PT422'; END IF;
  IF jsonb_array_length(o.items) NOT BETWEEN 1 AND 100 THEN
    RAISE EXCEPTION 'NOTIFICATION_SNAPSHOT_INVALID' USING ERRCODE='PT422'; END IF;
  SELECT jsonb_agg(jsonb_build_object('title',left(coalesce(item->>'title',''),300),
    'price',item->'price','quantity',item->'quantity') ORDER BY ordinal) INTO v_items
    FROM jsonb_array_elements(o.items) WITH ORDINALITY x(item,ordinal);
  v_context:=jsonb_build_object('id',o.id,'total',o.total);
  IF p_event='payment_success' THEN
    v_status:='paid'; v_subject:='Payment Received for Order #'||o.id; v_template:='payment-success';
    v_payment:=encode(sha256(convert_to(btrim(o.transaction_code),'UTF8')),'hex');
  ELSIF p_event='order_confirmation' THEN
    v_status:='created'; v_subject:='Order Confirmation #'||o.id; v_template:='order-confirmation';
    v_context:=v_context||jsonb_build_object('items',v_items);
  ELSE
    v_status:=o.status; v_template:='order-status'; v_subject:='Order #'||o.id||' Update';
    v_context:=v_context||jsonb_build_object('status',o.status,'items',v_items);
  END IF;
  v_mail:=jsonb_build_object('to',v_to,'subject',v_subject,'template',v_template,'context',v_context);
  RETURN jsonb_build_object('source','mock','eligible',true,'orderId',o.id,'event',p_event,'status',v_status,
    'binding',encode(sha256(convert_to(v_mail::text||':'||v_payment,'UTF8')),'hex'),'mail',v_mail);
END;
$$;

CREATE FUNCTION public.integration_capture_notification_mock(p_order_id uuid,p_event text)
RETURNS jsonb LANGUAGE plpgsql SET search_path=pg_catalog,public SET lock_timeout='2s' AS $$
DECLARE v_source jsonb; v_payload jsonb; v_key text; v_old public.integration_outbox; v_id uuid;
BEGIN
  PERFORM 1 FROM public.orders WHERE id=p_order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'NOTIFICATION_NOT_FOUND' USING ERRCODE='PT404'; END IF;
  v_source:=public.integration_notification_source_mock(p_order_id,p_event);
  IF (v_source->>'eligible')::boolean IS NOT TRUE THEN RETURN jsonb_build_object('source','mock','status','not_eligible'); END IF;
  v_key:='notice_v1:'||p_order_id||':'||p_event||':'||(v_source->>'status');
  v_payload:=v_source-'source'-'eligible'-'mail';
  SELECT * INTO v_old FROM public.integration_outbox WHERE provider='resend' AND environment='mock' AND dedupe_key=v_key;
  IF FOUND THEN
    IF v_old.payload IS DISTINCT FROM v_payload OR v_old.event_type IS DISTINCT FROM p_event OR v_old.operation_kind<>'mutation'
    THEN RAISE EXCEPTION 'NOTIFICATION_SOURCE_CONFLICT' USING ERRCODE='PT409'; END IF;
    RETURN jsonb_build_object('source','mock','status','duplicate','id',v_old.id,'state',v_old.state);
  END IF;
  INSERT INTO public.integration_outbox(provider,environment,dedupe_key,event_type,operation_kind,payload)
  VALUES('resend','mock',v_key,p_event,'mutation',v_payload) RETURNING id INTO v_id;
  RETURN jsonb_build_object('source','mock','status','recorded','id',v_id,'state','QUEUED');
END;
$$;

CREATE FUNCTION public.integration_resolve_notification_mock(p_id uuid,p_lease_token uuid,p_version integer)
RETURNS jsonb LANGUAGE plpgsql SET search_path=pg_catalog,public AS $$
DECLARE r public.integration_outbox; v_source jsonb;
BEGIN
  SELECT * INTO r FROM public.integration_outbox WHERE id=p_id FOR UPDATE;
  IF NOT FOUND OR r.provider<>'resend' OR r.environment<>'mock' OR r.operation_kind<>'mutation'
    OR r.state<>'WORKING' OR r.lease_token IS DISTINCT FROM p_lease_token OR r.version IS DISTINCT FROM p_version
    OR r.lease_until<=clock_timestamp() OR r.event_type NOT IN ('order_confirmation','payment_success','order_status')
    OR jsonb_typeof(r.payload->'orderId') IS DISTINCT FROM 'string'
  THEN RAISE EXCEPTION 'NOTIFICATION_LEASE_CONFLICT' USING ERRCODE='PT409'; END IF;
  PERFORM 1 FROM public.orders WHERE id=(r.payload->>'orderId')::uuid FOR SHARE;
  v_source:=public.integration_notification_source_mock((r.payload->>'orderId')::uuid,r.event_type);
  IF (v_source->>'eligible')::boolean IS NOT TRUE OR r.payload IS DISTINCT FROM (v_source-'source'-'eligible'-'mail')
  THEN RAISE EXCEPTION 'NOTIFICATION_SOURCE_CHANGED' USING ERRCODE='PT409'; END IF;
  RETURN jsonb_build_object('source','mock','mail',v_source->'mail');
END;
$$;

REVOKE ALL ON FUNCTION public.integration_notification_source_mock(uuid,text) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.integration_capture_notification_mock(uuid,text) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.integration_resolve_notification_mock(uuid,uuid,integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.integration_notification_source_mock(uuid,text),public.integration_capture_notification_mock(uuid,text),public.integration_resolve_notification_mock(uuid,uuid,integer) TO service_role;
COMMIT;
