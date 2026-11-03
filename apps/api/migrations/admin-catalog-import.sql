-- Apply once in Supabase SQL Editor before using Excel import.
-- Each row, its translations and its retry receipt commit atomically.
BEGIN;
CREATE TABLE IF NOT EXISTS public.admin_catalog_imports (
  request_id uuid PRIMARY KEY,
  actor_id uuid NOT NULL,
  payload_hash text NOT NULL,
  result jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.admin_catalog_imports ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.admin_catalog_imports FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT ON public.admin_catalog_imports TO service_role;

CREATE OR REPLACE FUNCTION public.admin_import_catalog_row(
  p_resource text, p_row jsonb, p_mode text, p_request_id uuid, p_actor_id uuid, p_hash text
) RETURNS jsonb LANGUAGE plpgsql SET search_path=public AS $$
DECLARE
  receipt public.admin_catalog_imports;
  category_record public.categories;
  product_record public.products;
  existing boolean;
  operation text;
  outcome jsonb;
  row_slug text := p_row->>'slug';
BEGIN
  IF p_resource NOT IN ('products','categories') OR p_mode NOT IN ('skip','update')
    OR p_actor_id IS NULL OR p_request_id IS NULL OR length(p_hash) <> 64
    OR row_slug IS NULL OR row_slug !~ '^[a-z0-9]+([-_][a-z0-9]+)*$'
    OR length(row_slug)>120 OR COALESCE(length(p_row->>'name'),0)=0 THEN
    RAISE EXCEPTION 'Invalid catalog import input' USING ERRCODE='22023';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(p_request_id::text,0));
  SELECT * INTO receipt FROM public.admin_catalog_imports WHERE request_id=p_request_id;
  IF FOUND THEN
    IF receipt.actor_id <> p_actor_id OR receipt.payload_hash <> p_hash THEN
      RAISE EXCEPTION 'Import request already used for different data' USING ERRCODE='22023';
    END IF;
    RETURN receipt.result || jsonb_build_object('replayed',true);
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(p_resource || '/' || row_slug,0));
  IF p_resource='categories' THEN
    SELECT * INTO category_record FROM public.categories WHERE slug=row_slug FOR UPDATE;
    existing := FOUND;
    IF existing AND p_mode='skip' THEN
      outcome := jsonb_build_object('id',category_record.id,'slug',row_slug,'action','skipped');
    ELSE
      IF NOT existing THEN
        INSERT INTO public.categories(slug,is_active) VALUES(row_slug,true) RETURNING * INTO category_record;
      END IF;
      INSERT INTO public.category_translations(category_id,locale,name,description)
      VALUES(category_record.id,'vi',p_row->>'name',COALESCE(p_row->>'description',''))
      ON CONFLICT(category_id,locale) DO UPDATE SET name=EXCLUDED.name,
        description=CASE WHEN p_row ? 'description' THEN EXCLUDED.description ELSE category_translations.description END;
      INSERT INTO public.category_translations(category_id,locale,name,description)
      VALUES(category_record.id,'en',COALESCE(p_row->>'name_en',p_row->>'name'),COALESCE(p_row->>'description_en',p_row->>'description',''))
      ON CONFLICT(category_id,locale) DO UPDATE SET
        name=CASE WHEN p_row ? 'name_en' THEN EXCLUDED.name ELSE category_translations.name END,
        description=CASE WHEN p_row ? 'description_en' THEN EXCLUDED.description ELSE category_translations.description END;
      operation := CASE WHEN existing THEN 'updated' ELSE 'created' END;
      outcome := jsonb_build_object('id',category_record.id,'slug',row_slug,'action',operation);
    END IF;
  ELSE
    SELECT * INTO product_record FROM public.products WHERE slug=row_slug FOR UPDATE;
    existing := FOUND;
    IF existing AND p_mode='skip' THEN
      outcome := jsonb_build_object('id',product_record.id,'slug',row_slug,'action','skipped');
    ELSE
      SELECT * INTO category_record FROM public.categories WHERE slug=p_row->>'category' FOR KEY SHARE;
      IF NOT FOUND THEN RAISE EXCEPTION 'Category not found' USING ERRCODE='23503'; END IF;
      IF (p_row->>'price')::numeric < 0 OR (p_row->>'quantity')::numeric < 0
        OR (p_row->>'quantity')::numeric <> trunc((p_row->>'quantity')::numeric)
        OR jsonb_typeof(p_row->'images') <> 'array' OR jsonb_array_length(p_row->'images')>5 THEN
        RAISE EXCEPTION 'Invalid product values' USING ERRCODE='22023';
      END IF;
      IF NOT existing THEN
        IF jsonb_array_length(p_row->'images')=0 THEN RAISE EXCEPTION 'Product image required' USING ERRCODE='22023'; END IF;
        INSERT INTO public.products(slug,price,quantity,category_id,images,is_active,style)
          VALUES(row_slug,(p_row->>'price')::numeric,(p_row->>'quantity')::integer,category_record.id,
            ARRAY(SELECT jsonb_array_elements_text(p_row->'images')),true,'both') RETURNING * INTO product_record;
      ELSE
        UPDATE public.products SET price=(p_row->>'price')::numeric,quantity=(p_row->>'quantity')::integer,
          category_id=category_record.id,
          images=CASE WHEN jsonb_array_length(p_row->'images')>0 THEN ARRAY(SELECT jsonb_array_elements_text(p_row->'images')) ELSE images END
          WHERE id=product_record.id;
      END IF;
      INSERT INTO public.product_translations(product_id,locale,title,description)
      VALUES(product_record.id,'vi',p_row->>'name',COALESCE(p_row->>'description',''))
      ON CONFLICT(product_id,locale) DO UPDATE SET title=EXCLUDED.title,
        description=CASE WHEN p_row ? 'description' THEN EXCLUDED.description ELSE product_translations.description END;
      INSERT INTO public.product_translations(product_id,locale,title,description)
      VALUES(product_record.id,'en',COALESCE(p_row->>'name_en',p_row->>'name'),COALESCE(p_row->>'description_en',p_row->>'description',''))
      ON CONFLICT(product_id,locale) DO UPDATE SET
        title=CASE WHEN p_row ? 'name_en' THEN EXCLUDED.title ELSE product_translations.title END,
        description=CASE WHEN p_row ? 'description_en' THEN EXCLUDED.description ELSE product_translations.description END;
      operation := CASE WHEN existing THEN 'updated' ELSE 'created' END;
      outcome := jsonb_build_object('id',product_record.id,'slug',row_slug,'action',operation);
    END IF;
  END IF;
  outcome := outcome || jsonb_build_object('replayed',false);
  INSERT INTO public.admin_catalog_imports(request_id,actor_id,payload_hash,result) VALUES(p_request_id,p_actor_id,p_hash,outcome);
  RETURN outcome;
END;
$$;
REVOKE ALL ON FUNCTION public.admin_import_catalog_row(text,jsonb,text,uuid,uuid,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_import_catalog_row(text,jsonb,text,uuid,uuid,text) TO service_role;
COMMIT;
