-- 1. Relax user_id constraint (Allow null for admin seed reviews)
ALTER TABLE reviews ALTER COLUMN user_id DROP NOT NULL;

-- 2. Add new columns for Manual Reviewer details
ALTER TABLE reviews 
ADD COLUMN IF NOT EXISTS reviewer_name TEXT,
ADD COLUMN IF NOT EXISTS reviewer_avatar TEXT,
ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE;

-- 3. Modify Unique Constraint
-- Drop the old strict unique constraint (user_id, product_id)
-- Note: 'reviews_user_id_product_id_key' might be the auto-generated name. 
-- We try to drop any existing unique constraint on these columns.
ALTER TABLE reviews DROP CONSTRAINT IF EXISTS reviews_user_id_product_id_key;

-- Create a PARTIAL unique index. 
-- Only enforce uniqueness for REAL users (where user_id IS NOT NULL).
-- Admin seed reviews (user_id IS NULL) can be unlimited per product.
CREATE UNIQUE INDEX IF NOT EXISTS reviews_user_product_unique 
ON reviews(user_id, product_id) 
WHERE user_id IS NOT NULL;

-- 4. Update Policy to allow Admin to insert rows with null user_id?
-- The existing policy "Users can create their own reviews" checks (auth.uid() = user_id).
-- If we want Admin to insert via API (using Service Role or Admin Client), we don't strictly need RLS change if using Service Role.
-- BUT if using an authenticated Admin User client:
-- We need a policy to allow Admin to Insert where user_id is NULL.
-- Assuming Admin has a "service_role" or specific claim, but usually RLS applies.
-- Let's add policy:
CREATE POLICY "Admins can create seed reviews" 
ON reviews FOR INSERT 
TO authenticated 
WITH CHECK (
  -- Allow if user is admin (requires a way to check admin in SQL, usually checking users table or claims)
  -- For now, if your API handles it with Service Role key (SupabaseService.getClient()), RLS is bypassed.
  -- If using standard client:
  auth.uid() IN (SELECT id FROM users WHERE role = 'ADMIN')
);
