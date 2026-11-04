-- EMERGENCY TEST-DB ROLLBACK ONLY. Restores the original insecure permissions.
-- Based on owner metadata export reviewed 2026-11-03, not a universal rollback.
-- Capture a fresh schema-only backup before applying; compare any later policy changes.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';
REVOKE ALL PRIVILEGES ON TABLE public."users" FROM PUBLIC, anon, authenticated;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone." ON public."users";
DROP POLICY IF EXISTS "Users can insert their own profile." ON public."users";
DROP POLICY IF EXISTS "Users can update own profile." ON public."users";
DROP POLICY IF EXISTS "Admins can update roles" ON public."users";
DROP POLICY IF EXISTS "Users can view own profile" ON public."users";
REVOKE ALL PRIVILEGES ON TABLE public."posts" FROM PUBLIC, anon, authenticated;
DROP POLICY IF EXISTS "Admins can insert posts" ON public."posts";
DROP POLICY IF EXISTS "Admins can update posts" ON public."posts";
DROP POLICY IF EXISTS "Admins can delete posts" ON public."posts";
REVOKE ALL PRIVILEGES ON TABLE public."orders" FROM PUBLIC, anon, authenticated;
DROP POLICY IF EXISTS "Users can create own orders" ON public."orders";
REVOKE ALL PRIVILEGES ON TABLE public."order_items" FROM PUBLIC, anon, authenticated;
DROP POLICY IF EXISTS "Users can create own order items" ON public."order_items";
REVOKE ALL PRIVILEGES ON TABLE public."contacts" FROM PUBLIC, anon, authenticated;
DROP POLICY IF EXISTS "Public can insert contacts" ON public."contacts";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."users" TO "anon";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."users" TO "authenticated";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."posts" TO "anon";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."posts" TO "authenticated";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."orders" TO "anon";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."orders" TO "authenticated";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."order_items" TO "anon";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."order_items" TO "authenticated";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."contacts" TO "anon";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."contacts" TO "authenticated";
CREATE POLICY "Public can insert contacts" ON public."contacts" AS PERMISSIVE FOR INSERT TO PUBLIC WITH CHECK (true);
CREATE POLICY "Users can create own order items" ON public."order_items" AS PERMISSIVE FOR INSERT TO PUBLIC WITH CHECK ((EXISTS ( SELECT 1
   FROM orders
  WHERE ((orders.id = order_items.order_id) AND (orders.user_id = auth.uid())))));
CREATE POLICY "Users can create own orders" ON public."orders" AS PERMISSIVE FOR INSERT TO PUBLIC WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "Admins can delete posts" ON public."posts" AS PERMISSIVE FOR DELETE TO "authenticated" USING (true);
CREATE POLICY "Admins can insert posts" ON public."posts" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (true);
CREATE POLICY "Admins can update posts" ON public."posts" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (true);
CREATE POLICY "Admins can update roles" ON public."users" AS PERMISSIVE FOR UPDATE TO PUBLIC USING ((EXISTS ( SELECT 1
   FROM users users_1
  WHERE ((users_1.id = auth.uid()) AND (users_1.role = 'ADMIN'::user_role)))));
CREATE POLICY "Public profiles are viewable by everyone." ON public."users" AS PERMISSIVE FOR SELECT TO PUBLIC USING (true);
CREATE POLICY "Users can insert their own profile." ON public."users" AS PERMISSIVE FOR INSERT TO PUBLIC WITH CHECK ((auth.uid() = id));
CREATE POLICY "Users can update own profile." ON public."users" AS PERMISSIVE FOR UPDATE TO PUBLIC USING ((auth.uid() = id));
CREATE POLICY "Users can view own profile" ON public."users" AS PERMISSIVE FOR SELECT TO PUBLIC USING ((auth.uid() = id));
ALTER FUNCTION public.get_my_role() RESET search_path;
COMMIT;
