-- Add SEO columns to Product Translations
ALTER TABLE public.product_translations 
ADD COLUMN IF NOT EXISTS seo_title text,
ADD COLUMN IF NOT EXISTS seo_description text;

-- Add Performance Indexes

-- Orders: Optimize 'My Orders' history query
CREATE INDEX IF NOT EXISTS orders_user_created_at_idx ON public.orders (user_id, created_at DESC);

-- Reviews: Optimize fetching reviews for a product
CREATE INDEX IF NOT EXISTS reviews_product_created_at_idx ON public.reviews (product_id, created_at DESC);

-- Wishlist: Optimize 'Is Liked' check (Using 'wishlists' table name)
CREATE INDEX IF NOT EXISTS wishlists_user_product_idx ON public.wishlists (user_id, product_id);

-- Posts: Optimize Blog sorting by date
CREATE INDEX IF NOT EXISTS posts_published_at_idx ON public.posts (published_at DESC);

-- Analytics Helper: Wishlist aggregation
CREATE INDEX IF NOT EXISTS wishlists_product_idx ON public.wishlists (product_id);
