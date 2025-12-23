-- Indexes for Products Table Performance
-- Run this in Supabase SQL Editor

-- 1. Slug Index (Unique, but good to be explicit if not auto-covered for partial search, though usually unique cover equality)
-- CREATE INDEX IF NOT EXISTS idx_products_slug ON public.products(slug); -- Already unique constraint

-- 2. Category Index (Filtering)
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category);

-- 3. Price Index (Sorting/Filtering)
CREATE INDEX IF NOT EXISTS idx_products_price ON public.products(price);

-- 4. Quantity Index (Stock Status Filtering)
CREATE INDEX IF NOT EXISTS idx_products_quantity ON public.products(quantity);

-- 5. Is Active Index (Status Filtering)
CREATE INDEX IF NOT EXISTS idx_products_is_active ON public.products(is_active);

-- 6. Created At Index (Default Sorting)
CREATE INDEX IF NOT EXISTS idx_products_created_at ON public.products(created_at DESC);

-- 7. Composite Index for common Admin Filter (Active + Category)
CREATE INDEX IF NOT EXISTS idx_products_active_category ON public.products(is_active, category);
