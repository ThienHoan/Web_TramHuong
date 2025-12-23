-- Add missing columns to public.users if they don't exist
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS last_sign_in_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS is_banned boolean default false;
