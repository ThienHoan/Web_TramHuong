-- Metadata-only acceptance check for the owner's TEST Supabase SQL Editor.
-- One SELECT result. Does not read customer rows, call provider RPCs, or write.
-- PASS validates the named metadata condition, not full application behavior.
WITH relations AS (
  SELECT to_regclass('public.users') AS users,
         to_regclass('public.posts') AS posts,
         to_regclass('public.orders') AS orders,
         to_regclass('public.contacts') AS contacts,
         to_regclass('public.integration_outbox') AS outbox,
         to_regclass('public.integration_usage_daily') AS usage
), functions AS (
  SELECT to_regprocedure('public.integration_claim(text,text,integer,integer)') AS claim,
         to_regprocedure('public.integration_finish(uuid,uuid,integer,text,text,text)') AS finish,
         to_regprocedure('public.integration_reserve_usage(text,text,text,bigint,bigint)') AS reserve
)
SELECT check_name,
       CASE WHEN NOT installed THEN 'CHUA_CAI'
            WHEN condition IS TRUE THEN 'PASS' ELSE 'FAIL' END AS status
FROM relations r CROSS JOIN functions f
CROSS JOIN LATERAL (VALUES
  (1, 'users_anon_cannot_read_columns', r.users IS NOT NULL,
    NOT has_any_column_privilege('anon',r.users,'SELECT')),
  (2, 'users_authenticated_can_select_rows_subject_to_RLS', r.users IS NOT NULL,
    has_table_privilege('authenticated',r.users,'SELECT')),
  (3, 'users_authenticated_cannot_update_role', r.users IS NOT NULL,
    NOT has_column_privilege('authenticated',r.users,'role','UPDATE')),
  (4, 'users_authenticated_cannot_update_banned', r.users IS NOT NULL,
    NOT has_column_privilege('authenticated',r.users,'is_banned','UPDATE')),
  (5, 'posts_authenticated_cannot_write_directly', r.posts IS NOT NULL,
    NOT has_any_column_privilege('authenticated',r.posts,'INSERT')
      AND NOT has_any_column_privilege('authenticated',r.posts,'UPDATE')
      AND NOT has_table_privilege('authenticated',r.posts,'DELETE')),
  (6, 'orders_authenticated_cannot_write_directly', r.orders IS NOT NULL,
    NOT has_any_column_privilege('authenticated',r.orders,'INSERT')
      AND NOT has_any_column_privilege('authenticated',r.orders,'UPDATE')
      AND NOT has_table_privilege('authenticated',r.orders,'DELETE')),
  (7, 'contacts_anon_cannot_insert_directly', r.contacts IS NOT NULL,
    NOT has_any_column_privilege('anon',r.contacts,'INSERT')),
  (8, 'backend_profile_and_order_writes_preserved', r.users IS NOT NULL AND r.orders IS NOT NULL,
    has_table_privilege('service_role',r.users,'UPDATE')
      AND has_table_privilege('service_role',r.orders,'INSERT')),
  (9, 'profile_public_true_select_policy_removed', r.users IS NOT NULL,
    NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='users'
      AND cmd IN ('SELECT','ALL') AND qual='true'
      AND roles && ARRAY['public','anon','authenticated']::name[])),
  (10, 'outbox_private_and_rls_enabled', r.outbox IS NOT NULL,
    NOT has_any_column_privilege('anon',r.outbox,'SELECT')
      AND NOT has_any_column_privilege('authenticated',r.outbox,'SELECT')
      AND (SELECT relrowsecurity FROM pg_class WHERE oid=r.outbox)),
  (11, 'usage_private_and_rls_enabled', r.usage IS NOT NULL,
    NOT has_any_column_privilege('anon',r.usage,'SELECT')
      AND NOT has_any_column_privilege('authenticated',r.usage,'SELECT')
      AND (SELECT relrowsecurity FROM pg_class WHERE oid=r.usage)),
  (12, 'claim_rpc_service_only', f.claim IS NOT NULL,
    has_function_privilege('service_role',f.claim,'EXECUTE')
      AND NOT has_function_privilege('anon',f.claim,'EXECUTE')
      AND NOT has_function_privilege('authenticated',f.claim,'EXECUTE')),
  (13, 'finish_rpc_service_only', f.finish IS NOT NULL,
    has_function_privilege('service_role',f.finish,'EXECUTE')
      AND NOT has_function_privilege('anon',f.finish,'EXECUTE')
      AND NOT has_function_privilege('authenticated',f.finish,'EXECUTE')),
  (14, 'quota_rpc_service_only', f.reserve IS NOT NULL,
    has_function_privilege('service_role',f.reserve,'EXECUTE')
      AND NOT has_function_privilege('anon',f.reserve,'EXECUTE')
      AND NOT has_function_privilege('authenticated',f.reserve,'EXECUTE'))
) AS checks(position,check_name,installed,condition)
ORDER BY position;
