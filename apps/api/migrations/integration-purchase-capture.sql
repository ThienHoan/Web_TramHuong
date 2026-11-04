-- P2-01b. Manual TEST DB install only, after integration-delivery-foundation.sql.
-- No orders writes/triggers or external calls. RPC always records MOCK data.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='30s';

CREATE UNIQUE INDEX integration_purchase_mock_payment_unique
ON public.integration_outbox(provider,environment,provider_message_id)
WHERE provider='ga4' AND environment='mock' AND event_type='purchase' AND provider_message_id IS NOT NULL;

CREATE FUNCTION public.integration_record_purchase_mock(p_order_id uuid,p_actor_id uuid,p_consent boolean)
RETURNS jsonb LANGUAGE plpgsql SET search_path=pg_catalog,public SET lock_timeout='2s' AS $$
DECLARE
  o public.orders; old public.integration_outbox; row_item jsonb;
  v_items jsonb:='[]'::jsonb; v_payload jsonb; v_key text; v_tx text; v_payment text;
  v_sub numeric:=0; v_price numeric; v_qty integer; v_shipping numeric;
  v_total numeric; v_discount numeric; v_net numeric; v_prefix numeric:=0;
  v_previous numeric:=0; v_line numeric; v_unit numeric; v_rest integer;
  v_product text; v_variant text; v_base jsonb; v_id uuid;
BEGIN
  IF p_order_id IS NULL OR p_actor_id IS NULL OR p_consent IS DISTINCT FROM true
  THEN RAISE EXCEPTION 'PURCHASE_CONSENT_REQUIRED' USING ERRCODE='22023'; END IF;
  SELECT * INTO o FROM public.orders WHERE id=p_order_id AND user_id=p_actor_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'PURCHASE_NOT_FOUND' USING ERRCODE='PT404'; END IF;
  IF o.payment_status IS DISTINCT FROM 'paid' OR o.payment_method IS DISTINCT FROM 'sepay'
    OR o.status IS NULL OR o.status NOT IN ('PAID','SHIPPED','COMPLETED')
    OR nullif(btrim(o.transaction_code),'') IS NULL
  THEN RETURN jsonb_build_object('source','mock','status','not_eligible'); END IF;
  IF jsonb_typeof(o.items) IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'INVALID_PURCHASE_SNAPSHOT' USING ERRCODE='PT422'; END IF;
  IF jsonb_array_length(o.items) NOT BETWEEN 1 AND 100
    OR jsonb_typeof(o.shipping_info->'shipping_fee') IS DISTINCT FROM 'number'
    OR o.total IS NULL OR o.voucher_discount_amount IS NULL
  THEN RAISE EXCEPTION 'INVALID_PURCHASE_SNAPSHOT' USING ERRCODE='PT422'; END IF;
  v_total:=o.total*100; v_discount:=o.voucher_discount_amount*100;
  v_shipping:=(o.shipping_info->>'shipping_fee')::numeric*100;
  IF v_total NOT BETWEEN 0 AND 100000000000000 OR v_total<>trunc(v_total)
    OR v_discount NOT BETWEEN 0 AND 100000000000000 OR v_discount<>trunc(v_discount)
    OR v_shipping NOT BETWEEN 0 AND 100000000000000 OR v_shipping<>trunc(v_shipping)
  THEN RAISE EXCEPTION 'INVALID_PURCHASE_SNAPSHOT' USING ERRCODE='PT422'; END IF;
  FOR row_item IN SELECT value FROM jsonb_array_elements(o.items) LOOP
    IF jsonb_typeof(row_item->'price') IS DISTINCT FROM 'number'
      OR jsonb_typeof(row_item->'quantity') IS DISTINCT FROM 'number'
      OR (row_item->>'quantity')::numeric NOT BETWEEN 1 AND 999
      OR (row_item->>'quantity')::numeric<>trunc((row_item->>'quantity')::numeric)
    THEN RAISE EXCEPTION 'INVALID_PURCHASE_SNAPSHOT' USING ERRCODE='PT422'; END IF;
    v_price:=(row_item->>'price')::numeric*100; v_qty:=(row_item->>'quantity')::numeric::integer;
    IF v_price NOT BETWEEN 0 AND 100000000000000 OR v_price<>trunc(v_price)
    THEN RAISE EXCEPTION 'INVALID_PURCHASE_SNAPSHOT' USING ERRCODE='PT422'; END IF;
    v_product:=coalesce(row_item->>'productId',row_item->>'product_id');
    v_variant:=coalesce(row_item->>'variantId',row_item->>'variant_id');
    IF v_product IS NULL OR v_product !~* '^([a-f0-9]{8}-([a-f0-9]{4}-){3}[a-f0-9]{12}|[a-z][a-z0-9_-]{0,63})$'
      OR (v_variant IS NOT NULL AND v_variant !~* '^([a-f0-9]{8}-([a-f0-9]{4}-){3}[a-f0-9]{12}|[a-z][a-z0-9_-]{0,63})$')
    THEN RAISE EXCEPTION 'INVALID_PURCHASE_SNAPSHOT' USING ERRCODE='PT422'; END IF;
    v_sub:=v_sub+v_price*v_qty;
  END LOOP;
  v_net:=v_total-v_shipping;
  IF v_net<0 OR v_discount>v_sub OR v_net<>v_sub-v_discount
  THEN RAISE EXCEPTION 'INVALID_PURCHASE_SNAPSHOT' USING ERRCODE='PT422'; END IF;

  FOR row_item IN SELECT value FROM jsonb_array_elements(o.items) LOOP
    v_price:=(row_item->>'price')::numeric*100; v_qty:=(row_item->>'quantity')::numeric::integer;
    v_prefix:=v_prefix+v_price*v_qty;
    v_line:=CASE WHEN v_sub=0 THEN 0 ELSE floor(v_net*v_prefix/v_sub) END-v_previous;
    v_previous:=v_previous+v_line;
    v_unit:=floor(v_line/v_qty); v_rest:=mod(v_line,v_qty)::integer;
    v_base:=jsonb_build_object('item_id',coalesce(row_item->>'productId',row_item->>'product_id'));
    v_variant:=coalesce(row_item->>'variantId',row_item->>'variant_id');
    IF v_variant IS NOT NULL THEN v_base:=v_base||jsonb_build_object('item_variant',v_variant); END IF;
    IF v_rest>0 THEN
      v_items:=v_items||jsonb_build_array(v_base||jsonb_build_object('price',(v_unit+1)/100,'quantity',v_rest));
    END IF;
    IF v_qty>v_rest THEN
      v_items:=v_items||jsonb_build_array(v_base||jsonb_build_object('price',v_unit/100,'quantity',v_qty-v_rest));
    END IF;
  END LOOP;
  v_tx:='gp_mock_v1_'||encode(sha256(convert_to('ga4:purchase:v1:'||p_order_id::text,'UTF8')),'hex');
  v_payment:='sp_'||encode(sha256(convert_to('sepay:payment:v1:'||btrim(o.transaction_code),'UTF8')),'hex');
  v_key:='purchase_v1:'||v_tx;
  v_payload:=jsonb_build_object('transaction_id',v_tx,'currency','VND','value',v_net/100,
    'shipping',v_shipping/100,'tax',0,'items',v_items);
  SELECT * INTO old FROM public.integration_outbox WHERE provider='ga4' AND environment='mock' AND dedupe_key=v_key;
  IF FOUND THEN
    IF old.event_type<>'purchase' OR old.state<>'ACCEPTED' OR old.payload IS DISTINCT FROM v_payload OR old.provider_message_id IS DISTINCT FROM v_payment OR old.operation_kind<>'mutation'
    THEN RAISE EXCEPTION 'PURCHASE_CONFLICT' USING ERRCODE='PT409'; END IF;
    RETURN jsonb_build_object('source','mock','status','duplicate','transactionId',v_tx);
  END IF;
  BEGIN
    INSERT INTO public.integration_outbox(provider,environment,dedupe_key,event_type,operation_kind,payload,state,attempts,provider_message_id)
    VALUES('ga4','mock',v_key,'purchase','mutation',v_payload,'ACCEPTED',1,v_payment) RETURNING id INTO v_id;
  EXCEPTION WHEN unique_violation THEN
    RAISE EXCEPTION 'PURCHASE_CONFLICT' USING ERRCODE='PT409';
  END;
  PERFORM public.integration_reserve_usage('ga4','mock','requests',1,100);
  RETURN jsonb_build_object('source','mock','status','recorded','transactionId',v_tx);
END;
$$;
REVOKE ALL ON FUNCTION public.integration_record_purchase_mock(uuid,uuid,boolean) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.integration_record_purchase_mock(uuid,uuid,boolean) TO service_role;
COMMIT;
