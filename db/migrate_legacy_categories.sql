-- 1. Create Categories from existing Products
-- Finds all unique 'category' strings from products, converts them to slugs, and inserts them.
INSERT INTO public.categories (slug, is_active)
SELECT DISTINCT 
  -- Simple slugify: lowercase, replace spaces with dashes
  regexp_replace(lower(trim(category)), '\s+', '-', 'g') as slug,
  true
FROM public.products
WHERE category IS NOT NULL 
  AND category != ''
-- Avoid duplicates if you already created some
ON CONFLICT (slug) DO NOTHING;

-- 2. Create English Translations for these new categories
INSERT INTO public.category_translations (category_id, locale, name, description)
SELECT 
  c.id, 
  'en', 
  -- Simple nameify: capitalize, replace dashes with spaces (Attempt to make it readable)
  initcap(replace(c.slug, '-', ' ')), 
  'Auto-migrated category'
FROM public.categories c
WHERE NOT EXISTS (
  SELECT 1 FROM public.category_translations ct 
  WHERE ct.category_id = c.id AND ct.locale = 'en'
);

-- 3. Create Vietnamese Translations (Placeholder, you can edit later)
INSERT INTO public.category_translations (category_id, locale, name, description)
SELECT 
  c.id, 
  'vi', 
  initcap(replace(c.slug, '-', ' ')), 
  'Danh mục cũ (Cần cập nhật)'
FROM public.categories c
WHERE NOT EXISTS (
  SELECT 1 FROM public.category_translations ct 
  WHERE ct.category_id = c.id AND ct.locale = 'vi'
);
