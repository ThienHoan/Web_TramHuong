-- Additive only. Review and apply manually; the agent never runs this remotely.
BEGIN;
CREATE TABLE public.shipping_records (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 key text NOT NULL UNIQUE CHECK(length(key) BETWEEN 1 AND 250),
 kind text NOT NULL CHECK(kind IN ('warehouse','profile','inventory','quote','shipment','action','inbox','event','exception','return','cod','ticket','notification','promotion')),
 state text NOT NULL CHECK(length(state) BETWEEN 1 AND 60),
 owner_id uuid REFERENCES public.users(id),
 order_id uuid REFERENCES public.orders(id),
 data jsonb NOT NULL CHECK(jsonb_typeof(data)='object'),
 version integer NOT NULL DEFAULT 1 CHECK(version>0),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX shipping_records_queue ON public.shipping_records(kind,state,updated_at);
CREATE INDEX shipping_records_order ON public.shipping_records(order_id,kind);
CREATE INDEX shipping_records_owner ON public.shipping_records(owner_id,kind,created_at);
CREATE INDEX shipping_records_carrier ON public.shipping_records((data->>'shopId'),(data->>'trackingCode')) WHERE kind='shipment';
CREATE UNIQUE INDEX shipping_unique_carrier_code ON public.shipping_records((split_part(key,':',2)),(data->>'shopId'),(data->>'trackingCode')) WHERE kind='shipment' AND data->>'trackingCode' IS NOT NULL;
CREATE TABLE public.shipping_tracking (
 id uuid PRIMARY KEY REFERENCES public.shipping_records(id),
 order_id uuid NOT NULL REFERENCES public.orders(id),
 owner_id uuid REFERENCES public.users(id),
 state text NOT NULL,
 tracking_code text,
 estimated_delivery_at timestamptz,
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX shipping_tracking_order ON public.shipping_tracking(order_id);
ALTER TABLE public.shipping_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipping_tracking ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.shipping_records,public.shipping_tracking FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.shipping_tracking TO authenticated;
GRANT ALL ON public.shipping_records,public.shipping_tracking TO service_role;
CREATE POLICY shipping_tracking_owner ON public.shipping_tracking FOR SELECT TO authenticated USING(owner_id=auth.uid());

CREATE FUNCTION public.shipping_write_record(
 p_key text,p_kind text,p_state text,p_data jsonb,p_expected_version integer,
 p_owner_id uuid DEFAULT NULL,p_order_id uuid DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE r public.shipping_records%ROWTYPE;
BEGIN
 IF p_expected_version=0 THEN
   INSERT INTO public.shipping_records(key,kind,state,data,owner_id,order_id)
   VALUES(p_key,p_kind,p_state,p_data,p_owner_id,p_order_id)
   ON CONFLICT(key) DO NOTHING RETURNING * INTO r;
 ELSE
   UPDATE public.shipping_records SET state=p_state,data=p_data,version=version+1,updated_at=now()
   WHERE key=p_key AND kind=p_kind AND version=p_expected_version
     AND owner_id IS NOT DISTINCT FROM p_owner_id AND order_id IS NOT DISTINCT FROM p_order_id
   RETURNING * INTO r;
 END IF;
 IF r.id IS NULL THEN RAISE EXCEPTION 'Shipping record changed; refetch before retry' USING ERRCODE='PT409'; END IF;
 IF r.kind='shipment' AND r.order_id IS NOT NULL THEN
   INSERT INTO public.shipping_tracking(id,order_id,owner_id,state,tracking_code,estimated_delivery_at)
   VALUES(r.id,r.order_id,r.owner_id,r.state,r.data->>'trackingCode',NULLIF(r.data->>'eta','')::timestamptz)
   ON CONFLICT(id) DO UPDATE SET state=EXCLUDED.state,tracking_code=EXCLUDED.tracking_code,
     estimated_delivery_at=EXCLUDED.estimated_delivery_at,updated_at=now();
 END IF;
 RETURN to_jsonb(r);
END $$;
REVOKE ALL ON FUNCTION public.shipping_write_record(text,text,text,jsonb,integer,uuid,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.shipping_write_record(text,text,text,jsonb,integer,uuid,uuid) TO service_role;

CREATE FUNCTION public.shipping_reserve_shipment(p_order_id uuid,p_key text,p_data jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE o public.orders%ROWTYPE; r jsonb;
BEGIN
 SELECT * INTO o FROM public.orders WHERE id=p_order_id FOR UPDATE;
 IF NOT FOUND OR o.status::text NOT IN ('PENDING','PAID')
  OR (o.payment_method::text<>'cod' AND o.payment_status::text<>'paid')
  OR o.shipping_info->>'delivery_method'='pickup'
  OR o.shipping_info->'shipping_snapshot' IS NULL
  OR o.shipping_info->'shipping_snapshot' IS DISTINCT FROM p_data->'snapshot'
 THEN RAISE EXCEPTION 'Order not fulfillable' USING ERRCODE='PT409'; END IF;
 IF o.payment_status::text NOT IN ('pending','paid') OR (p_data->>'codAmount')::numeric IS DISTINCT FROM (CASE WHEN o.payment_status::text='paid' THEN 0 ELSE o.total END)
 THEN RAISE EXCEPTION 'Invalid COD reservation' USING ERRCODE='PT409'; END IF;
 r=public.shipping_write_record(p_key,'shipment','SHIPMENT_PENDING',p_data,0,o.user_id,p_order_id);
 PERFORM public.shipping_write_record('cod:expected:'||(r->>'id'),'cod','EXPECTED',jsonb_build_object('type','expected','amount',(p_data->>'codAmount')::numeric,'shipmentId',r->>'id'),0,NULL,p_order_id);
 RETURN r;
END $$;
REVOKE ALL ON FUNCTION public.shipping_reserve_shipment(uuid,text,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.shipping_reserve_shipment(uuid,text,jsonb) TO service_role;
CREATE FUNCTION public.shipping_attach_snapshot(p_order_id uuid,p_total numeric,p_snapshot jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE o public.orders%ROWTYPE;
BEGIN
 SELECT * INTO o FROM public.orders WHERE id=p_order_id FOR UPDATE;
 IF NOT FOUND OR o.total<>p_total OR o.status::text NOT IN ('PENDING','PAID')
  OR EXISTS(SELECT 1 FROM public.shipping_records WHERE kind='shipment' AND order_id=p_order_id)
 THEN RAISE EXCEPTION 'Order changed during preparation' USING ERRCODE='PT409'; END IF;
 UPDATE public.orders SET shipping_info=COALESCE(shipping_info,'{}'::jsonb)||jsonb_build_object('shipping_snapshot',p_snapshot)
 WHERE id=p_order_id;
 RETURN p_snapshot;
END $$;
REVOKE ALL ON FUNCTION public.shipping_attach_snapshot(uuid,numeric,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.shipping_attach_snapshot(uuid,numeric,jsonb) TO service_role;
CREATE FUNCTION public.shipping_complete_cod(p_ship_key text,p_ship_version integer,p_action_key text,p_action_version integer,p_amount integer)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE s public.shipping_records%ROWTYPE;a public.shipping_records%ROWTYPE;result jsonb;delta integer;
BEGIN
 SELECT * INTO s FROM public.shipping_records WHERE key=p_ship_key FOR UPDATE;
 SELECT * INTO a FROM public.shipping_records WHERE key=p_action_key FOR UPDATE;
 IF s.id IS NULL OR a.id IS NULL OR s.kind<>'shipment' OR a.kind<>'action' OR a.state<>'PENDING' OR a.order_id IS DISTINCT FROM s.order_id
  OR a.data->>'action' IS DISTINCT FROM 'updateCod' OR a.data->>'shipmentId' IS DISTINCT FROM s.id::text
  OR s.version<>p_ship_version OR a.version<>p_action_version OR p_amount<0 OR p_amount>5000000
  OR (COALESCE((s.data->>'codAmount')::integer,0)=0 AND p_amount>0)
  OR (p_amount>0 AND EXISTS(SELECT 1 FROM public.orders WHERE id=s.order_id AND payment_status::text='paid'))
 THEN RAISE EXCEPTION 'COD reconciliation conflict' USING ERRCODE='PT409'; END IF;
 delta=p_amount-COALESCE((s.data->>'codAmount')::integer,0);
 PERFORM public.shipping_write_record(s.key,'shipment',s.state,jsonb_set(s.data,'{codAmount}',to_jsonb(p_amount)),s.version,s.owner_id,s.order_id);
 PERFORM public.shipping_write_record('cod:adjust:'||a.id::text,'cod','ADJUSTED',jsonb_build_object('type','expected_adjustment','amount',delta,'actorId',a.owner_id,'shipmentId',s.id),0,NULL,s.order_id);
 result=public.shipping_write_record(a.key,'action','DONE',a.data,a.version,a.owner_id,a.order_id);
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.shipping_complete_cod(text,integer,text,integer,integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.shipping_complete_cod(text,integer,text,integer,integer) TO service_role;
CREATE FUNCTION public.shipping_guard_order_cancel() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog,public AS $$
BEGIN
 IF NEW.status::text IN ('CANCELED','EXPIRED') AND NEW.status IS DISTINCT FROM OLD.status
  AND EXISTS(SELECT 1 FROM public.shipping_records WHERE order_id=OLD.id AND kind='shipment' AND state NOT IN ('CANCELLED','RETURNED'))
 THEN RAISE EXCEPTION 'Resolve carrier shipment before cancelling order' USING ERRCODE='PT409'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER shipping_guard_order_cancel BEFORE UPDATE OF status ON public.orders FOR EACH ROW EXECUTE FUNCTION public.shipping_guard_order_cancel();
CREATE FUNCTION public.shipping_alert_paid_cod() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
BEGIN
 IF NEW.payment_status::text='paid' AND OLD.payment_status IS DISTINCT FROM NEW.payment_status THEN
  INSERT INTO public.shipping_records(key,kind,state,order_id,data)
  SELECT 'paid-active-cod:'||s.id::text,'exception','OPEN',NEW.id,
    jsonb_build_object('type','ONLINE_PAID_WITH_ACTIVE_COD','severity','high','shipmentId',s.id,'carrierCodAmount',s.data->'codAmount')
  FROM public.shipping_records s WHERE s.kind='shipment' AND s.order_id=NEW.id AND s.state NOT IN ('CANCELLED','RETURNED')
   AND CASE WHEN jsonb_typeof(s.data->'codAmount')='number' THEN (s.data->>'codAmount')::numeric>0 ELSE false END
  ON CONFLICT(key) DO NOTHING;
 END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.shipping_alert_paid_cod() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER shipping_alert_paid_cod AFTER UPDATE OF payment_status ON public.orders FOR EACH ROW EXECUTE FUNCTION public.shipping_alert_paid_cod();

-- Only the sanitized projection participates in Realtime. Operators still
-- need to enable Realtime for their project; no privileged payload is published.
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM pg_publication WHERE pubname='supabase_realtime') THEN
   ALTER PUBLICATION supabase_realtime ADD TABLE public.shipping_tracking;
 END IF;
END $$;
COMMIT;
