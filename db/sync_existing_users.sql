-- Backfill existing users from auth.users to public.users
INSERT INTO public.users (id, email, full_name, role, created_at)
SELECT 
    id, 
    email, 
    raw_user_meta_data->>'full_name', 
    'ADMIN', -- Defaulting everyone to ADMIN for now (or change to CUSTOMER) to ensure access. 
             -- You should probably manually set specific users to ADMIN later.
    created_at
FROM auth.users
ON CONFLICT (id) DO NOTHING;

-- UPDATE your specific user to ADMIN if needed
-- UPDATE public.users SET role = 'ADMIN' WHERE email = 'your_email@example.com';
