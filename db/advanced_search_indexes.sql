-- Enable pg_trgm extension for partial match search (already likely enabled but good to ensure)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Index for product slug (already indexed, but ensuring gin/trgm for fuzzy search if needed)
CREATE INDEX IF NOT EXISTS idx_products_slug_trgm ON public.products USING gin (slug gin_trgm_ops);

-- Index for product translations title and description
-- Assuming product_translations table exists and has title/description
CREATE INDEX IF NOT EXISTS idx_product_translations_title_trgm ON public.product_translations USING gin (title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_product_translations_description_trgm ON public.product_translations USING gin (description gin_trgm_ops);

-- Index for category for faster filtering
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category);
