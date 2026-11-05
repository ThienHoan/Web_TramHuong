-- P5-02a: first-install package for manual TEST DB review. Not applied remotely.
-- No source row, table grant, RLS policy, trigger or model provider is changed.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';

CREATE FUNCTION public.catalog_search_normalize(p_text text)
RETURNS text LANGUAGE sql IMMUTABLE PARALLEL SAFE
SET search_path = pg_catalog AS $$
  SELECT trim(regexp_replace(
    regexp_replace(translate(lower(normalize(coalesce(p_text,''), NFD)), 'đ', 'd'), U&'[\0300-\036f]', '', 'g'),
    '[^a-z0-9]+', ' ', 'g'));
$$;

CREATE FUNCTION public.catalog_search_vector(p_title text, p_description text)
RETURNS tsvector LANGUAGE sql IMMUTABLE PARALLEL SAFE
SET search_path = pg_catalog,public AS $$
  SELECT setweight(to_tsvector('simple'::regconfig, public.catalog_search_normalize(left(coalesce(p_title,''),300))), 'A') ||
    setweight(to_tsvector('simple'::regconfig, public.catalog_search_normalize(
      regexp_replace(left(coalesce(p_description,''),10000), '<[^>]*>', ' ', 'g'))), 'B');
$$;

-- Transactional index creation may briefly block writes: review catalog size first.
CREATE INDEX catalog_translation_fts_v1 ON public.product_translations
USING gin (public.catalog_search_vector(title,description)) WHERE locale IN ('vi','en');

CREATE FUNCTION public.catalog_search(
  p_query text, p_locale text, p_min_price numeric DEFAULT 0,
  p_max_price numeric DEFAULT 1000000000000, p_category_id text DEFAULT NULL,
  p_limit integer DEFAULT 20
)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY INVOKER
SET search_path = pg_catalog,public SET timezone = 'UTC' AS $$
DECLARE v_query tsquery; v_terms text; v_result jsonb; v_now timestamptz := statement_timestamp();
BEGIN
  IF p_query IS NULL OR length(p_query) NOT BETWEEN 2 AND 120
    OR p_locale IS NULL OR p_locale NOT IN ('vi','en')
    OR p_limit IS NULL OR p_limit NOT BETWEEN 1 AND 20
    OR p_min_price IS NULL OR p_max_price IS NULL
    OR p_min_price::text IN ('NaN','Infinity','-Infinity') OR p_max_price::text IN ('NaN','Infinity','-Infinity')
    OR p_min_price NOT BETWEEN 0 AND 1000000000000 OR p_max_price NOT BETWEEN 0 AND 1000000000000
    OR p_min_price <> trunc(p_min_price) OR p_max_price <> trunc(p_max_price) OR p_min_price > p_max_price
    OR (p_category_id IS NOT NULL AND p_category_id !~ '^[a-zA-Z0-9_-]{1,100}$')
  THEN RAISE EXCEPTION 'CATALOG_SEARCH_INVALID_INPUT' USING ERRCODE='22023'; END IF;

  SELECT string_agg(term,' ' ORDER BY ordinal) INTO v_terms
  FROM regexp_split_to_table(public.catalog_search_normalize(p_query),' +') WITH ORDINALITY q(term,ordinal)
  WHERE length(term)>1 AND term NOT IN ('toi','muon','mua','tim','san','pham','tu','van','cho','and','the','want','buy','find');
  IF v_terms IS NULL THEN RETURN '[]'::jsonb; END IF;
  v_query := plainto_tsquery('simple'::regconfig,v_terms);

  WITH matching AS (
    SELECT DISTINCT ON (p.id)
      p.id,p.slug,p.price,p.quantity,p.is_active,p.category_id,p.variants,
      p.discount_percentage,p.discount_start_date,p.discount_end_date,t.title,
      ts_rank_cd(public.catalog_search_vector(t.title,t.description),v_query,32) AS score,
      CASE WHEN p.discount_percentage>0
        AND (p.discount_start_date IS NULL OR p.discount_start_date<=v_now)
        AND (p.discount_end_date IS NULL OR p.discount_end_date>=v_now)
        THEN round(p.price*(1-p.discount_percentage::numeric/100)) ELSE p.price END AS effective_price
    FROM public.product_translations t JOIN public.products p ON p.id=t.product_id
    WHERE t.locale=p_locale AND t.locale IN ('vi','en')
      AND public.catalog_search_vector(t.title,t.description) @@ v_query
      AND p.is_active IS TRUE AND p.quantity>0 AND p.quantity=trunc(p.quantity)
      AND p.price BETWEEN 1 AND 9007199254740991 AND p.price=trunc(p.price)
      AND p.discount_percentage BETWEEN 0 AND 100
      AND (p.discount_start_date IS NULL OR p.discount_end_date IS NULL OR p.discount_start_date<=p.discount_end_date)
      AND (p.variants IS NULL OR p.variants='[]'::jsonb)
      AND (p_category_id IS NULL OR p.category_id::text=p_category_id)
      AND p.slug ~ '^[a-zA-Z0-9_-]{1,200}$' AND length(trim(t.title)) BETWEEN 1 AND 300
    ORDER BY p.id,score DESC,t.id
  ), limited AS (
    SELECT * FROM matching WHERE effective_price>0 AND effective_price BETWEEN p_min_price AND p_max_price
    ORDER BY score DESC,id LIMIT p_limit
  )
  SELECT coalesce(jsonb_agg(jsonb_build_object(
    'id',id,'slug',slug,'price',price,'quantity',quantity,'is_active',is_active,
    'category_id',category_id,'variants',variants,'discount_percentage',discount_percentage,
    'discount_start_date',discount_start_date,'discount_end_date',discount_end_date,
    'translation',jsonb_build_object('title',title),'rank',score
  ) ORDER BY score DESC,id),'[]'::jsonb) INTO v_result FROM limited;
  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.catalog_search_normalize(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.catalog_search_vector(text,text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.catalog_search_normalize(text), public.catalog_search_vector(text,text) FROM anon;
-- Pure helpers support ordinary source/index maintenance without table access.
GRANT EXECUTE ON FUNCTION public.catalog_search_normalize(text), public.catalog_search_vector(text,text) TO authenticated,service_role;
REVOKE ALL ON FUNCTION public.catalog_search(text,text,numeric,numeric,text,integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.catalog_search(text,text,numeric,numeric,text,integer) TO service_role;
COMMIT;
