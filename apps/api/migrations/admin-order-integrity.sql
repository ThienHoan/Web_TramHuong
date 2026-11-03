-- Apply in Supabase SQL Editor before restarting the updated API.
-- Status validation and stock restoration run inside the order UPDATE transaction.
BEGIN;
CREATE OR REPLACE FUNCTION public.enforce_order_transition()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE
  item jsonb;
  product_id_value public.products.id%TYPE;
BEGIN
  IF NEW.status IS NOT DISTINCT FROM OLD.status THEN RETURN NEW; END IF;
  IF NOT COALESCE(
    (OLD.status = 'PENDING' AND NEW.status IN ('PAID', 'CANCELED')) OR
    (OLD.status = 'AWAITING_PAYMENT' AND NEW.status IN ('PAID', 'CANCELED', 'EXPIRED')) OR
    (OLD.status = 'PAID' AND NEW.status IN ('SHIPPED', 'CANCELED')) OR
    (OLD.status = 'SHIPPED' AND NEW.status = 'COMPLETED'), false) THEN
    RAISE EXCEPTION 'Invalid order transition: % -> %', OLD.status, NEW.status USING ERRCODE = '23514';
  END IF;
  IF NEW.status IN ('CANCELED', 'EXPIRED') THEN
    FOR item IN SELECT value FROM jsonb_array_elements(COALESCE(OLD.items::jsonb, '[]'::jsonb))
      ORDER BY value->>'productId'
    LOOP
      IF item->>'productId' IS NOT NULL AND (item->>'quantity')::numeric > 0 THEN
        product_id_value := item->>'productId';
        UPDATE public.products SET quantity = COALESCE(quantity, 0) + (item->>'quantity')::integer
          WHERE id = product_id_value;
      END IF;
    END LOOP;
  END IF;
  IF NEW.status = 'PAID' THEN NEW.payment_status = 'paid'; END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS enforce_order_transition ON public.orders;
CREATE TRIGGER enforce_order_transition BEFORE UPDATE OF status ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.enforce_order_transition();
CREATE OR REPLACE FUNCTION public.transition_order(p_id uuid, p_status text, p_expected_status text)
RETURNS jsonb LANGUAGE plpgsql SET search_path = public AS $$
DECLARE
  result public.orders;
  next_values public.orders;
  target_id public.orders.id%TYPE;
BEGIN
  -- jsonb_populate_record uses the actual column type (enum or text).
  SELECT * INTO next_values FROM jsonb_populate_record(NULL::public.orders, jsonb_build_object('status', p_status));
  target_id := p_id::text;
  UPDATE public.orders SET status = next_values.status WHERE id = target_id AND status::text = p_expected_status
    RETURNING * INTO result;
  IF NOT FOUND THEN RAISE EXCEPTION 'Order changed; refresh before retrying' USING ERRCODE = 'PT409'; END IF;
  RETURN to_jsonb(result);
END;
$$;
REVOKE ALL ON FUNCTION public.transition_order(uuid, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.transition_order(uuid, text, text) TO service_role;
COMMIT;
