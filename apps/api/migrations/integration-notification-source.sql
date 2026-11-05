-- First install on TEST DB only, after foundation + integration-notifications.sql.
-- Default DISABLED. No existing source functions/triggers are replaced.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='30s';

CREATE FUNCTION public.integration_publish_notification_mock(p_order_id uuid,p_event text)
RETURNS jsonb LANGUAGE plpgsql SET search_path=pg_catalog,public AS $$
DECLARE v_code text; v_status text; v_id uuid; v_key text;
BEGIN
  RETURN public.integration_capture_notification_mock(p_order_id,p_event);
EXCEPTION WHEN SQLSTATE 'PT422' OR SQLSTATE 'PT409' THEN
  v_code:=CASE SQLSTATE WHEN 'PT409' THEN 'NOTIFICATION_SOURCE_CONFLICT' ELSE 'NOTIFICATION_SNAPSHOT_INVALID' END;
  SELECT status::text INTO v_status FROM public.orders WHERE id=p_order_id;
  v_key:='notice_review_v1:'||p_order_id::text||':'||p_event||':'||coalesce(v_status,'UNKNOWN')||':'||v_code;
  INSERT INTO public.integration_outbox(provider,environment,dedupe_key,event_type,operation_kind,payload,state,last_error_code)
  VALUES('resend','mock',v_key,'notification_source_review','read',
    jsonb_build_object('orderId',p_order_id,'event',p_event,'status',v_status,'errorCode',v_code),'DEAD',v_code)
  ON CONFLICT(provider,environment,dedupe_key) DO NOTHING RETURNING id INTO v_id;
  IF v_id IS NULL THEN SELECT id INTO v_id FROM public.integration_outbox
    WHERE provider='resend' AND environment='mock' AND dedupe_key=v_key; END IF;
  RETURN jsonb_build_object('source','mock','status','requires_review','id',v_id,'state','DEAD','errorCode',v_code);
END;
$$;

CREATE FUNCTION public.integration_order_notification_mock()
RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog,public AS $$
BEGIN
  IF TG_OP='INSERT' THEN
    PERFORM public.integration_publish_notification_mock(NEW.id,'order_confirmation');
  ELSIF NEW.payment_status IS DISTINCT FROM OLD.payment_status AND NEW.payment_status='paid'
    AND NEW.payment_method='sepay' AND nullif(btrim(NEW.transaction_code),'') IS NOT NULL
    AND NEW.status::text IN ('PAID','SHIPPED','COMPLETED') THEN
    PERFORM public.integration_publish_notification_mock(NEW.id,'payment_success');
  ELSIF NEW.status IS DISTINCT FROM OLD.status THEN
    PERFORM public.integration_publish_notification_mock(NEW.id,'order_status');
  END IF;
  RETURN NEW;
END;
$$;

CREATE FUNCTION public.integration_reconcile_notifications_mock(p_after_id uuid DEFAULT NULL,p_limit integer DEFAULT 20)
RETURNS jsonb LANGUAGE plpgsql SET search_path=pg_catalog,public AS $$
DECLARE v_ids uuid[]; v_id uuid; o public.orders; v_rows jsonb:='[]'::jsonb;
  v_events text[]; v_event text; v_count integer:=0; v_cursor uuid;
BEGIN
  IF p_limit IS NULL OR p_limit NOT BETWEEN 1 AND 20 THEN
    RAISE EXCEPTION 'INVALID_NOTIFICATION_PAGE' USING ERRCODE='22023'; END IF;
  SELECT array_agg(id ORDER BY id) INTO v_ids FROM (
    SELECT id FROM public.orders WHERE p_after_id IS NULL OR id>p_after_id ORDER BY id LIMIT p_limit+1
  ) page;
  FOREACH v_id IN ARRAY coalesce(v_ids,'{}'::uuid[]) LOOP
    EXIT WHEN v_count>=p_limit;
    SELECT * INTO o FROM public.orders WHERE id=v_id FOR UPDATE;
    v_count:=v_count+1; v_cursor:=v_id;
    IF NOT FOUND THEN CONTINUE; END IF;
    v_events:='{}'::text[];
    IF o.status::text IN ('PENDING','AWAITING_PAYMENT') THEN
      v_events:=array_append(v_events,'order_confirmation');
    END IF;
    IF o.payment_status='paid' AND o.payment_method='sepay'
      AND nullif(btrim(o.transaction_code),'') IS NOT NULL AND o.status::text IN ('PAID','SHIPPED','COMPLETED') THEN
      v_events:=array_append(v_events,'payment_success');
    END IF;
    IF o.status::text IN ('SHIPPED','COMPLETED','CANCELED','EXPIRED')
      OR (o.status::text='PAID' AND NOT ('payment_success'=ANY(v_events))) THEN
      v_events:=array_append(v_events,'order_status');
    END IF;
    FOREACH v_event IN ARRAY v_events LOOP
      v_rows:=v_rows||jsonb_build_array(jsonb_build_object('orderId',v_id,'event',v_event,
        'outcome',public.integration_publish_notification_mock(v_id,v_event)));
    END LOOP;
  END LOOP;
  RETURN jsonb_build_object('source','mock','persistence','database','processedOrders',v_count,
    'limit',p_limit,'hasMore',coalesce(cardinality(v_ids),0)>p_limit,
    'nextCursor',CASE WHEN coalesce(cardinality(v_ids),0)>p_limit THEN v_cursor ELSE NULL END,'items',v_rows);
END;
$$;

REVOKE ALL ON FUNCTION public.integration_publish_notification_mock(uuid,text),public.integration_order_notification_mock(),public.integration_reconcile_notifications_mock(uuid,integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.integration_publish_notification_mock(uuid,text),public.integration_order_notification_mock(),public.integration_reconcile_notifications_mock(uuid,integer) TO service_role;
CREATE TRIGGER integration_order_notification_mock_v1 AFTER INSERT OR UPDATE ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.integration_order_notification_mock();
ALTER TABLE public.orders DISABLE TRIGGER integration_order_notification_mock_v1;
COMMIT;
