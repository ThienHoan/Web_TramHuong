-- P1-02a. Manual apply on the owner's confirmed TEST Supabase only.
-- No application rows, table/column changes, payment or shipping state changes.
-- Pair with docs/integrations/05-permissions-rollout.md before applying.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';

-- Fail atomically if the expected existing schema is missing.
DO $preflight$
BEGIN
  IF to_regclass('public.users') IS NULL
    OR to_regclass('public.posts') IS NULL
    OR to_regclass('public.orders') IS NULL
    OR to_regclass('public.order_items') IS NULL
    OR to_regclass('public.contacts') IS NULL
    OR to_regprocedure('public.get_my_role()') IS NULL
  THEN
    RAISE EXCEPTION 'PERMISSIONS_SCHEMA_MISMATCH: compare the schema export first';
  END IF;
END;
$preflight$;

-- Revoke BOTH relation and explicit column ACLs. Table REVOKE alone does not
-- remove an earlier column-level GRANT. Leave the backend service role intact.
DO $acl$
DECLARE relation_name text; columns_list text;
BEGIN
  FOREACH relation_name IN ARRAY ARRAY['users','posts','orders','order_items','contacts']
  LOOP
    SELECT string_agg(quote_ident(attname), ', ' ORDER BY attnum)
      INTO columns_list
      FROM pg_attribute
      WHERE attrelid = format('public.%I', relation_name)::regclass
        AND attnum > 0 AND NOT attisdropped;
    EXECUTE format('REVOKE ALL PRIVILEGES ON TABLE public.%I FROM PUBLIC, anon, authenticated', relation_name);
    EXECUTE format('REVOKE ALL PRIVILEGES (%s) ON TABLE public.%I FROM PUBLIC, anon, authenticated', columns_list, relation_name);
  END LOOP;
END;
$acl$;

-- Existing clients may read their own profile; all profile writes already go
-- through UsersService's field allowlist, AuthGuard and RolesGuard.
GRANT SELECT ON public.users TO authenticated;
GRANT SELECT ON public.posts TO anon, authenticated;
GRANT SELECT ON public.orders, public.order_items TO authenticated;

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public profiles are viewable by everyone." ON public.users;
DROP POLICY IF EXISTS "Users can insert their own profile." ON public.users;
DROP POLICY IF EXISTS "Users can update own profile." ON public.users;
DROP POLICY IF EXISTS "Admins can update roles" ON public.users;
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
CREATE POLICY "Users can view own profile" ON public.users
  FOR SELECT TO authenticated USING (auth.uid() = id);

-- Keep the existing admin/staff SELECT policy and get_my_role() body.
-- Restrict lookup resolution; do not change identity or privilege assignment.
ALTER FUNCTION public.get_my_role() SET search_path TO pg_catalog, public;

DROP POLICY IF EXISTS "Admins can insert posts" ON public.posts;
DROP POLICY IF EXISTS "Admins can update posts" ON public.posts;
DROP POLICY IF EXISTS "Admins can delete posts" ON public.posts;
DROP POLICY IF EXISTS "Users can create own orders" ON public.orders;
DROP POLICY IF EXISTS "Users can create own order items" ON public.order_items;
DROP POLICY IF EXISTS "Public can insert contacts" ON public.contacts;

-- Backend service_role has BYPASSRLS and retains its existing privileges.
-- Auth triggers, order CAS/stock triggers, SePay and GHN RPCs are untouched.
COMMIT;
