-- Add quantity column to products table
ALTER TABLE public.products 
ADD COLUMN quantity INTEGER NOT NULL DEFAULT 0;

-- Add check constraint to ensure quantity is never negative
ALTER TABLE public.products 
ADD CONSTRAINT products_quantity_check CHECK (quantity >= 0);

-- (Optional) If we wanted to backfill existing products with a default stock other than 0:
-- UPDATE public.products SET quantity = 100 WHERE quantity = 0;
