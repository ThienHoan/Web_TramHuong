-- Add discount fields to products table
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS discount_percentage INTEGER DEFAULT 0 CHECK (discount_percentage >= 0 AND discount_percentage <= 100),
ADD COLUMN IF NOT EXISTS discount_start_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS discount_end_date TIMESTAMP WITH TIME ZONE;

-- Add comment for documentation
COMMENT ON COLUMN products.discount_percentage IS 'Discount percentage (0-100). Used to calculate final_price.';
COMMENT ON COLUMN products.discount_start_date IS 'When discount becomes active. NULL = active immediately if discount_percentage > 0.';
COMMENT ON COLUMN products.discount_end_date IS 'When discount expires. NULL = never expires.';

-- Create function to calculate final_price
CREATE OR REPLACE FUNCTION calculate_final_price(
  base_price DECIMAL,
  discount_pct INTEGER,
  start_date TIMESTAMP WITH TIME ZONE,
  end_date TIMESTAMP WITH TIME ZONE
) RETURNS DECIMAL AS $$
DECLARE
  now_utc TIMESTAMP WITH TIME ZONE := NOW();
  is_active BOOLEAN := FALSE;
BEGIN
  -- Check if discount is currently active
  IF discount_pct > 0 THEN
    -- Check start date (NULL means started)
    IF start_date IS NULL OR now_utc >= start_date THEN
      -- Check end date (NULL means never expires)
      IF end_date IS NULL OR now_utc <= end_date THEN
        is_active := TRUE;
      END IF;
    END IF;
  END IF;
  
  -- Calculate final price
  IF is_active THEN
    RETURN base_price * (1 - discount_pct::DECIMAL / 100);
  ELSE
    RETURN base_price;
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Optional: Create view with computed fields for easy querying
CREATE OR REPLACE VIEW products_with_discounts AS
SELECT 
  p.*,
  calculate_final_price(
    p.price,
    p.discount_percentage,
    p.discount_start_date,
    p.discount_end_date
  ) AS final_price,
  (
    p.price - calculate_final_price(
      p.price,
      p.discount_percentage,
      p.discount_start_date,
      p.discount_end_date
    )
  ) AS savings,
  (
    p.discount_percentage > 0 AND
    (p.discount_start_date IS NULL OR NOW() >= p.discount_start_date) AND
    (p.discount_end_date IS NULL OR NOW() <= p.discount_end_date)
  ) AS is_on_sale
FROM products p;

COMMENT ON VIEW products_with_discounts IS 'Products with computed discount fields: final_price, savings, is_on_sale';
