-- Add featured_section column
ALTER TABLE products ADD COLUMN IF NOT EXISTS featured_section VARCHAR(50) DEFAULT NULL;

-- Migrate existing data: Map is_featured=true to 'chapter_1'
UPDATE products SET featured_section = 'chapter_1' WHERE is_featured = true;

-- (Optional) Drop is_featured later, or keep it synced. For now we just focus on adding the new column.
-- We can also add an index for performance
CREATE INDEX IF NOT EXISTS idx_products_featured_section ON products(featured_section);
