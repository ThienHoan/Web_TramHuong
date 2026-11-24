-- Install first on a TEST database. The worker stays off until
-- FEATURE_REVIEW_REMINDERS_ENABLED=true. No backfill of old orders.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';
CREATE TABLE public.order_review_reminders (
  order_id uuid PRIMARY KEY REFERENCES public.orders(id) ON DELETE CASCADE,
  due_at timestamptz NOT NULL,
  state text NOT NULL DEFAULT 'PENDING' CHECK (state IN ('PENDING','CLAIMED','SENDING','ACCEPTED','UNKNOWN','SKIPPED')),
  lease_token uuid,
  attempted_at timestamptz,
  finished_at timestamptz
);
CREATE INDEX ON public.order_review_reminders(due_at) WHERE state='PENDING';
ALTER TABLE public.order_review_reminders ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.order_review_reminders FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.order_review_reminders TO service_role;

CREATE FUNCTION public.review_reminder_capture() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
BEGIN
  IF NEW.status='COMPLETED' AND OLD.status IS DISTINCT FROM NEW.status AND NEW.user_id IS NOT NULL THEN
    INSERT INTO public.order_review_reminders(order_id,due_at)
    VALUES(NEW.id,clock_timestamp()+interval '3 days') ON CONFLICT DO NOTHING;
  ELSIF NEW.status IN ('CANCELED','EXPIRED') THEN
    UPDATE public.order_review_reminders SET state='SKIPPED',finished_at=clock_timestamp()
      WHERE order_id=NEW.id AND state IN ('PENDING','CLAIMED');
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER order_review_reminder_capture AFTER UPDATE OF status ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.review_reminder_capture();
REVOKE ALL ON FUNCTION public.review_reminder_capture() FROM PUBLIC,anon,authenticated;

CREATE FUNCTION public.review_reminder_claim(p_limit integer DEFAULT 20)
RETURNS TABLE(order_id uuid,lease_token uuid)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
BEGIN
  IF p_limit IS NULL OR p_limit<1 OR p_limit>50 THEN RAISE EXCEPTION 'REVIEW_REMINDER_INVALID_LIMIT'; END IF;
  -- An abandoned claim is safe to retry: prepare() has not authorized SMTP.
  UPDATE public.order_review_reminders r SET state='PENDING',lease_token=NULL
    WHERE r.state='CLAIMED' AND r.attempted_at<clock_timestamp()-interval '10 minutes';
  -- After SMTP was authorized its outcome is uncertain; never auto-send it twice.
  UPDATE public.order_review_reminders r SET state='UNKNOWN',finished_at=clock_timestamp()
    WHERE r.state='SENDING' AND r.attempted_at<clock_timestamp()-interval '10 minutes';
  RETURN QUERY WITH due AS (
    SELECT r.order_id FROM public.order_review_reminders r
      WHERE r.state='PENDING' AND r.due_at<=clock_timestamp()
      ORDER BY r.due_at,r.order_id LIMIT p_limit FOR UPDATE SKIP LOCKED
  ) UPDATE public.order_review_reminders r SET state='CLAIMED',lease_token=gen_random_uuid(),attempted_at=clock_timestamp()
    FROM due WHERE r.order_id=due.order_id RETURNING r.order_id,r.lease_token;
END $$;

CREATE FUNCTION public.review_reminder_prepare(p_order_id uuid,p_token uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE r public.order_review_reminders; o public.orders; v_to text; v_items jsonb;
BEGIN
  -- Always lock orders before reminder rows, as the capture trigger does.
  SELECT * INTO o FROM public.orders WHERE id=p_order_id FOR UPDATE;
  IF NOT FOUND THEN RETURN NULL; END IF;
  SELECT * INTO r FROM public.order_review_reminders WHERE order_id=p_order_id FOR UPDATE;
  IF NOT FOUND OR r.state<>'CLAIMED' OR r.lease_token IS DISTINCT FROM p_token THEN RETURN NULL; END IF;
  IF o.status='COMPLETED' AND o.user_id IS NOT NULL THEN
    SELECT lower(btrim(coalesce(nullif(btrim(o.shipping_info->>'email'),''),u.email))) INTO v_to FROM public.users u WHERE u.id=o.user_id;
    SELECT jsonb_agg(jsonb_build_object('slug',p.slug,'title',coalesce(
      (SELECT t.title FROM public.product_translations t WHERE t.product_id=p.id AND t.locale='vi' LIMIT 1),p.slug))) INTO v_items
    FROM public.products p WHERE p.is_active IS TRUE
      AND EXISTS (SELECT 1 FROM jsonb_array_elements(coalesce(o.items,'[]'::jsonb)) i
        WHERE coalesce(i->>'productId',i->>'product_id',i->>'id')=p.id::text)
      AND NOT EXISTS (SELECT 1 FROM public.reviews v WHERE v.user_id=o.user_id AND v.product_id=p.id);
  END IF;
  IF v_to IS NULL OR length(v_to)>254 OR v_to!~'^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' OR v_items IS NULL THEN
    UPDATE public.order_review_reminders SET state='SKIPPED',finished_at=clock_timestamp() WHERE order_id=p_order_id;
    RETURN NULL;
  END IF;
  UPDATE public.order_review_reminders SET state='SENDING',attempted_at=clock_timestamp() WHERE order_id=p_order_id;
  RETURN jsonb_build_object('to',v_to,'items',v_items);
END $$;

CREATE FUNCTION public.review_reminder_finish(p_order_id uuid,p_token uuid,p_state text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE changed integer;
BEGIN
  IF p_state IS NULL OR p_state NOT IN ('ACCEPTED','UNKNOWN') THEN RAISE EXCEPTION 'REVIEW_REMINDER_INVALID_STATE'; END IF;
  UPDATE public.order_review_reminders SET state=p_state,finished_at=clock_timestamp()
    WHERE order_id=p_order_id AND state='SENDING' AND lease_token=p_token;
  GET DIAGNOSTICS changed=ROW_COUNT;
  RETURN changed=1;
END $$;
REVOKE ALL ON FUNCTION public.review_reminder_claim(integer),public.review_reminder_prepare(uuid,uuid),public.review_reminder_finish(uuid,uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.review_reminder_claim(integer),public.review_reminder_prepare(uuid,uuid),public.review_reminder_finish(uuid,uuid,text) TO service_role;
COMMIT;
