-- Create reviews table
CREATE TABLE IF NOT EXISTS reviews (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE NOT NULL,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, product_id)
);

-- Enable Row Level Security
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- Policies
-- 1. Public Read (Anyone can read reviews)
CREATE POLICY "Public Reviews are viewable by everyone" 
ON reviews FOR SELECT 
USING (true);

-- 2. Authenticated Insert (Users can create their own reviews)
-- Note: The API will handle the "Verified Purchase" check logic. 
-- DB just ensures they are logged in and sets user_id correctly.
CREATE POLICY "Users can create their own reviews" 
ON reviews FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = user_id);

-- 3. Users can Update/Delete their own reviews
CREATE POLICY "Users can update own reviews" 
ON reviews FOR UPDATE 
TO authenticated 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own reviews" 
ON reviews FOR DELETE 
TO authenticated 
USING (auth.uid() = user_id);

-- 4. Admins can delete any review (Assuming 'role' in users public table or claim)
-- If you verify admin via API application logic, this RLS might not cover it fully 
-- without a custom function, but for now Public Read + User Write is sufficient.

-- Auto-update updated_at trigger
CREATE EXTENSION IF NOT EXISTS moddatetime;

CREATE TRIGGER handle_updated_at 
BEFORE UPDATE ON reviews 
FOR EACH ROW 
EXECUTE PROCEDURE moddatetime (updated_at);
