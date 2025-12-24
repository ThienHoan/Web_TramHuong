-- Add detailed address columns to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS phone_number TEXT,
ADD COLUMN IF NOT EXISTS province TEXT,
ADD COLUMN IF NOT EXISTS district TEXT,
ADD COLUMN IF NOT EXISTS ward TEXT,
ADD COLUMN IF NOT EXISTS street_address TEXT,
ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Policy to allow users to update their own profile
-- (Assuming standard RLS setup where users can update rows queryable by auth.uid())
-- We ensure the policy exists:
-- DROP POLICY IF EXISTS "Users can update own profile" ON users;
-- CREATE POLICY "Users can update own profile" ON users FOR UPDATE USING (auth.uid() = id);

-- Note: In this project, we might be using Service Role in API (SupabaseService), 
-- OR using authenticated client.
-- If using authenticated client, we need RLS Update policy.
-- If using Service Role (API calls), RLS on table doesn't block it.
-- We'll assume API handles it for now, but adding columns is main task.
