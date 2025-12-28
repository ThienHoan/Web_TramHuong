-- Add variant columns to cart_items
ALTER TABLE public.cart_items 
ADD COLUMN IF NOT EXISTS variant_id text,
ADD COLUMN IF NOT EXISTS variant_name text;

-- Add variant columns to order_items
ALTER TABLE public.order_items 
ADD COLUMN IF NOT EXISTS variant_id text,
ADD COLUMN IF NOT EXISTS variant_name text;

-- Fix Unique Constraint on cart_items to allow same product with different variants
DO $$ 
BEGIN 
    -- Try to drop the likely constraint name. If name is different, user check DB.
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'cart_items_user_id_product_id_key') THEN 
        ALTER TABLE cart_items DROP CONSTRAINT cart_items_user_id_product_id_key; 
    END IF;
    -- Also drop unique index if it exists separately
    DROP INDEX IF EXISTS cart_items_user_id_product_id_key;
END $$;

-- Add new Unique Index including variant_id (treating NULL as empty string for uniqueness)
CREATE UNIQUE INDEX IF NOT EXISTS cart_items_user_product_variant_idx 
ON cart_items (user_id, product_id, COALESCE(variant_id, ''));
