-- First install. Opt-in owner alerts, independent of customer email delivery.
-- Review on TEST DB first. Both producers are installed DISABLED; no backfill.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='30s';
CREATE TABLE public.ops_automation_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL CHECK (kind IN ('order.created','contact.created')),
  source_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  state text NOT NULL DEFAULT 'QUEUED' CHECK (state IN ('QUEUED','WORKING','CAPTURED','ACCEPTED','UNKNOWN','DEAD')),
  lease_token uuid,
  lease_until timestamptz,
  finished_at timestamptz,
  UNIQUE(kind,source_id)
);
CREATE INDEX ops_automation_queue ON public.ops_automation_events(created_at,id) WHERE state='QUEUED';
CREATE INDEX ops_automation_leases ON public.ops_automation_events(lease_until) WHERE state='WORKING';
ALTER TABLE public.ops_automation_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.ops_automation_events FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.ops_automation_events TO service_role;

CREATE FUNCTION public.ops_automation_capture() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
BEGIN
  IF TG_TABLE_SCHEMA<>'public' OR TG_TABLE_NAME NOT IN ('orders','contacts') OR TG_OP<>'INSERT'
    THEN RAISE EXCEPTION 'AUTOMATION_INVALID_SOURCE'; END IF;
  INSERT INTO public.ops_automation_events(kind,source_id)
    VALUES(CASE TG_TABLE_NAME WHEN 'orders' THEN 'order.created' ELSE 'contact.created' END,NEW.id)
    ON CONFLICT(kind,source_id) DO NOTHING;
  RETURN NEW;
END;
$$;
CREATE TRIGGER ops_automation_order_created AFTER INSERT ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.ops_automation_capture();
ALTER TABLE public.orders DISABLE TRIGGER ops_automation_order_created;
CREATE TRIGGER ops_automation_contact_created AFTER INSERT ON public.contacts
  FOR EACH ROW EXECUTE FUNCTION public.ops_automation_capture();
ALTER TABLE public.contacts DISABLE TRIGGER ops_automation_contact_created;

-- Claim once. An abandoned lease becomes UNKNOWN, never automatically resent.
CREATE FUNCTION public.ops_automation_claim() RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE r public.ops_automation_events;
BEGIN
  UPDATE public.ops_automation_events SET state='UNKNOWN',finished_at=clock_timestamp(),lease_token=NULL,lease_until=NULL
    WHERE id IN (SELECT id FROM public.ops_automation_events WHERE state='WORKING' AND lease_until<=clock_timestamp()
      ORDER BY lease_until FOR UPDATE SKIP LOCKED LIMIT 20);
  SELECT * INTO r FROM public.ops_automation_events WHERE state='QUEUED'
    ORDER BY created_at,id FOR UPDATE SKIP LOCKED LIMIT 1;
  IF NOT FOUND THEN RETURN NULL; END IF;
  UPDATE public.ops_automation_events SET state='WORKING',lease_token=gen_random_uuid(),
    lease_until=clock_timestamp()+interval '2 minutes' WHERE id=r.id RETURNING * INTO r;
  RETURN jsonb_build_object('id',r.id,'kind',r.kind,'sourceId',r.source_id,'createdAt',r.created_at,'leaseToken',r.lease_token);
END;
$$;
CREATE FUNCTION public.ops_automation_finish(p_id uuid,p_lease_token uuid,p_outcome text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE r public.ops_automation_events;
BEGIN
  IF p_outcome IS NULL OR p_outcome NOT IN ('CAPTURED','ACCEPTED','UNKNOWN','DEAD')
    THEN RAISE EXCEPTION 'AUTOMATION_INVALID_OUTCOME' USING ERRCODE='22023'; END IF;
  SELECT * INTO r FROM public.ops_automation_events WHERE id=p_id FOR UPDATE;
  IF NOT FOUND OR r.state<>'WORKING' OR r.lease_token IS DISTINCT FROM p_lease_token
    OR r.lease_until<=clock_timestamp()
    THEN RAISE EXCEPTION 'AUTOMATION_LEASE_CONFLICT' USING ERRCODE='PT409'; END IF;
  UPDATE public.ops_automation_events SET state=p_outcome,finished_at=clock_timestamp(),lease_token=NULL,lease_until=NULL WHERE id=p_id;
  RETURN jsonb_build_object('id',p_id,'state',p_outcome);
END;
$$;
REVOKE ALL ON FUNCTION public.ops_automation_capture(),public.ops_automation_claim(),public.ops_automation_finish(uuid,uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.ops_automation_claim(),public.ops_automation_finish(uuid,uuid,text) TO service_role;
COMMIT;
