-- Create wishlists table
CREATE TABLE IF NOT EXISTS wishlists (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, product_id)
);

-- Enable RLS
ALTER TABLE wishlists ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any to avoid conflicts
DROP POLICY IF EXISTS "Users can view their own wishlist" ON wishlists;
DROP POLICY IF EXISTS "Users can add to their own wishlist" ON wishlists; -- Dropping the old "add" policy
DROP POLICY IF EXISTS "Users can manage their own wishlist" ON wishlists; -- Dropping the new "manage" policy if it existed
DROP POLICY IF EXISTS "Users can remove from their own wishlist" ON wishlists; -- Dropping the old "remove" policy

-- Create policies
CREATE POLICY "Users can view their own wishlist" 
ON wishlists FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own wishlist" 
ON wishlists FOR ALL 
USING (auth.uid() = user_id);

CREATE POLICY "Users can remove from their own wishlist" 
ON wishlists FOR DELETE 
USING (auth.uid() = user_id);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_wishlists_user_id ON wishlists(user_id);
CREATE INDEX IF NOT EXISTS idx_wishlists_product_id ON wishlists(product_id);
