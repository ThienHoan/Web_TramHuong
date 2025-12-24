-- Fix Foreign Key to allow joining with public.users
-- Previous definition referenced auth.users, which prevents PostgREST from detecting the relationship to 'users' table.

ALTER TABLE reviews
DROP CONSTRAINT IF EXISTS reviews_user_id_fkey;

ALTER TABLE reviews
ADD CONSTRAINT reviews_user_id_fkey
FOREIGN KEY (user_id)
REFERENCES public.users(id)
ON DELETE CASCADE;
