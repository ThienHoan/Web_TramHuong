-- Additive first install, review on TEST DB. No backfill, source trigger edits,
-- remote calls or change until the new API uses this service-only RPC.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='30s';
CREATE TABLE public.checkout_requests (
  request_key uuid PRIMARY KEY,
  user_id uuid,
  fingerprint text NOT NULL CHECK(fingerprint ~ '^[a-f0-9]{64}$'),
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
ALTER TABLE public.checkout_requests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.checkout_requests FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.checkout_requests TO service_role;

CREATE FUNCTION public.checkout_lookup_request(p_key uuid,p_user_id uuid,p_fingerprint text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE r public.checkout_requests; o public.orders;
BEGIN
  IF p_key IS NULL OR p_fingerprint IS NULL OR p_fingerprint !~ '^[a-f0-9]{64}$'
    THEN RAISE EXCEPTION 'CHECKOUT_INVALID_REQUEST' USING ERRCODE='22023'; END IF;
  SELECT * INTO r FROM public.checkout_requests WHERE request_key=p_key;
  IF NOT FOUND THEN RETURN NULL; END IF;
  IF r.user_id IS DISTINCT FROM p_user_id OR r.fingerprint<>p_fingerprint
    THEN RAISE EXCEPTION 'CHECKOUT_KEY_CONFLICT' USING ERRCODE='PT409'; END IF;
  IF r.order_id IS NULL THEN RAISE EXCEPTION 'CHECKOUT_ORDER_UNAVAILABLE' USING ERRCODE='PT410'; END IF;
  SELECT * INTO o FROM public.orders WHERE id=r.order_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'CHECKOUT_ORDER_UNAVAILABLE' USING ERRCODE='PT410'; END IF;
  RETURN jsonb_build_object('order',to_jsonb(o),'replayed',true);
END;
$$;

CREATE FUNCTION public.checkout_create_order(
  p_key uuid,p_user_id uuid,p_fingerprint text,p_items jsonb,p_shipping_info jsonb,
  p_payment_method text,p_voucher_code text,p_expected_subtotal numeric,
  p_expected_discount numeric,p_shipping_fee numeric,p_quote jsonb
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public SET lock_timeout='5s' AS $$
DECLARE v_id uuid:=gen_random_uuid(); v_reserved uuid; v_replay jsonb; p public.products;
  v public.vouchers; line jsonb; requested record; variant jsonb; original numeric;
  unit_price numeric; subtotal numeric:=0; discount numeric:=0; discount_value numeric;
  fee numeric; total numeric; v_code text:=nullif(upper(btrim(p_voucher_code)),'');
  now_at timestamptz; quote_row jsonb; order_data public.orders; saved public.orders;
BEGIN
  IF p_key IS NULL OR p_fingerprint IS NULL OR p_fingerprint !~ '^[a-f0-9]{64}$'
    OR p_payment_method IS NULL OR p_payment_method NOT IN ('cod','sepay','showroom')
    OR jsonb_typeof(p_items) IS DISTINCT FROM 'array'
    OR jsonb_typeof(p_shipping_info) IS DISTINCT FROM 'object'
    OR jsonb_array_length(p_items) NOT BETWEEN 1 AND 100
    OR p_expected_subtotal IS NULL OR p_expected_subtotal NOT BETWEEN 0 AND 1000000000000
    OR p_expected_discount IS NULL OR p_expected_discount NOT BETWEEN 0 AND p_expected_subtotal
    OR p_shipping_fee IS NULL OR p_shipping_fee NOT BETWEEN 0 AND 100000000
    THEN RAISE EXCEPTION 'CHECKOUT_INVALID_REQUEST' USING ERRCODE='22023'; END IF;

  -- A unique-key INSERT waits for another transaction using this key. A failed
  -- checkout rolls this reservation back; a committed checkout owns it forever.
  INSERT INTO public.checkout_requests(request_key,user_id,fingerprint,order_id)
    VALUES(p_key,p_user_id,p_fingerprint,v_id) ON CONFLICT(request_key) DO NOTHING RETURNING order_id INTO v_reserved;
  IF v_reserved IS NULL THEN
    v_replay:=public.checkout_lookup_request(p_key,p_user_id,p_fingerprint);
    IF v_replay IS NULL THEN RAISE EXCEPTION 'CHECKOUT_RETRY_SAME_KEY' USING ERRCODE='PT409'; END IF;
    RETURN v_replay;
  END IF;
  FOR line IN SELECT value FROM jsonb_array_elements(p_items) LOOP
    IF jsonb_typeof(line) IS DISTINCT FROM 'object' OR line->>'productId' IS NULL
      OR (line->>'productId') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      OR jsonb_typeof(line->'quantity') IS DISTINCT FROM 'number'
      OR (line->>'quantity')::numeric NOT BETWEEN 1 AND 100
      OR trunc((line->>'quantity')::numeric)<>(line->>'quantity')::numeric
      THEN RAISE EXCEPTION 'CHECKOUT_INVALID_ITEMS' USING ERRCODE='22023'; END IF;
  END LOOP;

  -- All checkouts lock products in UUID order, including repeated/variant lines.
  FOR requested IN SELECT (x->>'productId')::uuid id,sum((x->>'quantity')::integer) quantity
    FROM jsonb_array_elements(p_items) x GROUP BY (x->>'productId')::uuid ORDER BY (x->>'productId')::uuid
  LOOP
    SELECT * INTO p FROM public.products WHERE id=requested.id FOR UPDATE;
    IF NOT FOUND OR p.is_active IS DISTINCT FROM true
      THEN RAISE EXCEPTION 'CHECKOUT_PRODUCT_UNAVAILABLE' USING ERRCODE='PT409'; END IF;
    IF requested.quantity>100 OR p.quantity IS NULL OR p.quantity<requested.quantity
      THEN RAISE EXCEPTION 'CHECKOUT_OUT_OF_STOCK' USING ERRCODE='PT409'; END IF;
  END LOOP;
  IF v_code IS NOT NULL THEN
    SELECT * INTO v FROM public.vouchers WHERE vouchers.code=v_code FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'CHECKOUT_VOUCHER_UNAVAILABLE' USING ERRCODE='PT409'; END IF;
  END IF;
  now_at:=clock_timestamp();
  FOR line IN SELECT value FROM jsonb_array_elements(p_items) LOOP
    SELECT * INTO p FROM public.products WHERE id=(line->>'productId')::uuid;
    original:=p.price;
    IF nullif(line->>'variantId','') IS NOT NULL THEN
      SELECT value INTO variant FROM jsonb_array_elements(coalesce(p.variants,'[]'::jsonb))
        WHERE value->>'name'=line->>'variantId' LIMIT 1;
      IF NOT FOUND THEN RAISE EXCEPTION 'CHECKOUT_VARIANT_UNAVAILABLE' USING ERRCODE='PT409'; END IF;
      original:=coalesce((variant->>'price')::numeric,original);
    END IF;
    IF original IS NULL OR original NOT BETWEEN 0 AND 1000000000000
      OR coalesce(p.discount_percentage,0) NOT BETWEEN 0 AND 100
      THEN RAISE EXCEPTION 'CHECKOUT_CATALOG_INVALID' USING ERRCODE='PT409'; END IF;
    unit_price:=original;
    IF p.discount_percentage>0 AND (p.discount_start_date IS NULL OR p.discount_start_date<=now_at)
      AND (p.discount_end_date IS NULL OR p.discount_end_date>=now_at)
      THEN unit_price:=round(original*(1-p.discount_percentage::numeric/100)); END IF;
    IF (line->>'price')::numeric IS DISTINCT FROM unit_price
      OR (line->>'original_price')::numeric IS DISTINCT FROM original
      OR (line->>'discount_amount')::numeric IS DISTINCT FROM original-unit_price
      THEN RAISE EXCEPTION 'CHECKOUT_PRICE_CHANGED' USING ERRCODE='PT409'; END IF;
    subtotal:=subtotal+unit_price*(line->>'quantity')::integer;
  END LOOP;
  IF round(subtotal,2)<>round(p_expected_subtotal,2) THEN RAISE EXCEPTION 'CHECKOUT_PRICE_CHANGED' USING ERRCODE='PT409'; END IF;
  IF v_code IS NOT NULL THEN
    discount_value:=coalesce((to_jsonb(v)->>'discount_value')::numeric,(to_jsonb(v)->>'discount_amount')::numeric);
    IF v.is_active IS DISTINCT FROM true OR v.start_date IS NULL OR v.end_date IS NULL
      OR now_at<v.start_date OR now_at>v.end_date OR subtotal<coalesce(v.min_order_value,0)
      OR (v.usage_limit IS NOT NULL AND coalesce(v.usage_count,0)>=v.usage_limit)
      OR discount_value IS NULL OR discount_value<=0
      OR (upper(v.discount_type)='PERCENTAGE' AND discount_value>100)
      THEN RAISE EXCEPTION 'CHECKOUT_VOUCHER_UNAVAILABLE' USING ERRCODE='PT409'; END IF;
    discount:=discount_value;
    IF upper(v.discount_type)='PERCENTAGE' THEN
      discount:=subtotal*discount_value/100;
      IF v.max_discount_amount>0 THEN discount:=least(discount,v.max_discount_amount); END IF;
    END IF;
    discount:=least(discount,subtotal);
  END IF;
  discount:=round(discount,2);
  IF discount<>round(p_expected_discount,2) THEN RAISE EXCEPTION 'CHECKOUT_PRICE_CHANGED' USING ERRCODE='PT409'; END IF;
  fee:=CASE WHEN p_payment_method='showroom' THEN 0 WHEN p_quote IS NULL THEN CASE WHEN subtotal>=300000 THEN 0 ELSE 30000 END ELSE p_shipping_fee END;
  IF p_shipping_fee<>fee THEN RAISE EXCEPTION 'CHECKOUT_PRICE_CHANGED' USING ERRCODE='PT409'; END IF;
  total:=greatest(0,subtotal-discount+fee);
  IF p_quote IS NOT NULL THEN
    -- No carrier/network call under row locks. Revalidation is done by the API;
    -- here bind its exact persisted quote, owner, totals and expiry at commit.
    SELECT to_jsonb(s) INTO quote_row FROM public.shipping_records s
      WHERE s.key='quote:'||(p_quote->>'reference') AND s.kind='quote' AND s.state='VALID' FOR SHARE;
    IF NOT FOUND OR (quote_row->>'owner_id')::uuid IS DISTINCT FROM p_user_id
      OR (quote_row->'data')||jsonb_build_object('reference',p_quote->>'reference') IS DISTINCT FROM p_quote
      OR (p_quote->>'expiresAt')::timestamptz<=clock_timestamp()
      OR round((p_quote->>'subtotal')::numeric,2) IS DISTINCT FROM round(subtotal,2)
      OR round((p_quote->>'voucherDiscount')::numeric,2) IS DISTINCT FROM round(discount,2)
      OR round((p_quote->>'customerFee')::numeric,2) IS DISTINCT FROM round(fee,2)
      OR round((p_quote->>'total')::numeric,2) IS DISTINCT FROM round(total,2)
      THEN RAISE EXCEPTION 'SHIPPING_QUOTE_CHANGED' USING ERRCODE='PT409'; END IF;
  END IF;
  SELECT * INTO order_data FROM jsonb_populate_record(NULL::public.orders,jsonb_build_object(
    'id',v_id,'user_id',p_user_id,'status',CASE WHEN p_payment_method='sepay' THEN 'AWAITING_PAYMENT' ELSE 'PENDING' END,
    'payment_status','pending','payment_method',CASE WHEN p_payment_method='showroom' THEN 'cod' ELSE p_payment_method END,
    'payment_deadline',CASE WHEN p_payment_method='sepay' THEN clock_timestamp()+interval '15 minutes' ELSE NULL END,
    'total',total,'items',p_items,'shipping_info',p_shipping_info||jsonb_build_object('shipping_fee',fee),
    'voucher_code',v_code,'voucher_discount_amount',discount));
  INSERT INTO public.orders(id,user_id,status,payment_status,payment_method,payment_deadline,total,items,shipping_info,voucher_code,voucher_discount_amount)
    VALUES(order_data.id,order_data.user_id,order_data.status,order_data.payment_status,order_data.payment_method,
      order_data.payment_deadline,order_data.total,order_data.items,order_data.shipping_info,order_data.voucher_code,order_data.voucher_discount_amount)
    RETURNING * INTO saved;
  FOR requested IN SELECT (x->>'productId')::uuid id,sum((x->>'quantity')::integer) quantity
    FROM jsonb_array_elements(p_items) x GROUP BY (x->>'productId')::uuid ORDER BY (x->>'productId')::uuid
  LOOP
    UPDATE public.products SET quantity=quantity-requested.quantity WHERE id=requested.id AND quantity>=requested.quantity;
    IF NOT FOUND THEN RAISE EXCEPTION 'CHECKOUT_OUT_OF_STOCK' USING ERRCODE='PT409'; END IF;
  END LOOP;
  IF v_code IS NOT NULL THEN UPDATE public.vouchers SET usage_count=coalesce(usage_count,0)+1 WHERE id=v.id; END IF;
  RETURN jsonb_build_object('order',to_jsonb(saved),'replayed',false);
END;
$$;
REVOKE ALL ON FUNCTION public.checkout_lookup_request(uuid,uuid,text),public.checkout_create_order(uuid,uuid,text,jsonb,jsonb,text,text,numeric,numeric,numeric,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.checkout_lookup_request(uuid,uuid,text),public.checkout_create_order(uuid,uuid,text,jsonb,jsonb,text,text,numeric,numeric,numeric,jsonb) TO service_role;
COMMIT;
