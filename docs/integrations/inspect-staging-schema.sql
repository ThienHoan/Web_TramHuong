-- Phase0 DB-01: operator-reviewed metadata only.
-- Run ONLY against a confirmed local/staging PostgreSQL project.
-- No application rows, DDL or DML. Do not run automatically.
-- Returns ONE row / ONE schema_report JSON object containing all 13 sections.
-- Review/redact embedded secrets in function definitions before sharing output.
BEGIN TRANSACTION READ ONLY;

SELECT jsonb_build_object(
  'database', (SELECT COALESCE(jsonb_agg(to_jsonb(metadata_row)), '[]'::jsonb)
    FROM (
      SELECT current_database() AS database_name, current_setting('server_version') AS server_version
    ) AS metadata_row),
  'extensions', (SELECT COALESCE(jsonb_agg(to_jsonb(metadata_row)), '[]'::jsonb)
    FROM (
      SELECT extname, extversion FROM pg_extension ORDER BY extname
    ) AS metadata_row),
  'columns', (SELECT COALESCE(jsonb_agg(to_jsonb(metadata_row)), '[]'::jsonb)
    FROM (
      SELECT table_schema, table_name, column_name, data_type, udt_name,
             is_nullable, column_default
      FROM information_schema.columns
      WHERE table_schema = 'public'
      ORDER BY table_name, ordinal_position
    ) AS metadata_row),
  'rls', (SELECT COALESCE(jsonb_agg(to_jsonb(metadata_row)), '[]'::jsonb)
    FROM (
      SELECT n.nspname AS schema_name, c.relname AS table_name,
             c.relrowsecurity AS rls_enabled, c.relforcerowsecurity AS rls_forced
      FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p')
      ORDER BY c.relname
    ) AS metadata_row),
  'policies', (SELECT COALESCE(jsonb_agg(to_jsonb(metadata_row)), '[]'::jsonb)
    FROM (
      SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
      FROM pg_policies WHERE schemaname IN ('public', 'storage')
      ORDER BY schemaname, tablename, policyname
    ) AS metadata_row),
  'table_grants', (SELECT COALESCE(jsonb_agg(to_jsonb(metadata_row)), '[]'::jsonb)
    FROM (
      SELECT grantee, table_schema, table_name, privilege_type
      FROM information_schema.table_privileges
      WHERE table_schema = 'public'
      ORDER BY table_name, grantee, privilege_type
    ) AS metadata_row),
  'column_grants', (SELECT COALESCE(jsonb_agg(to_jsonb(metadata_row)), '[]'::jsonb)
    FROM (
      SELECT grantee, table_name, column_name, privilege_type
      FROM information_schema.column_privileges
      WHERE table_schema = 'public'
      ORDER BY table_name, column_name, grantee, privilege_type
    ) AS metadata_row),
  'constraints', (SELECT COALESCE(jsonb_agg(to_jsonb(metadata_row)), '[]'::jsonb)
    FROM (
      SELECT n.nspname AS schema_name, c.relname AS table_name,
             co.conname, pg_get_constraintdef(co.oid) AS definition
      FROM pg_constraint co
      JOIN pg_class c ON c.oid = co.conrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public'
      ORDER BY c.relname, co.conname
    ) AS metadata_row),
  'indexes', (SELECT COALESCE(jsonb_agg(to_jsonb(metadata_row)), '[]'::jsonb)
    FROM (
      SELECT schemaname, tablename, indexname, indexdef
      FROM pg_indexes WHERE schemaname = 'public'
      ORDER BY tablename, indexname
    ) AS metadata_row),
  'triggers', (SELECT COALESCE(jsonb_agg(to_jsonb(metadata_row)), '[]'::jsonb)
    FROM (
      SELECT n.nspname AS schema_name, c.relname AS table_name, t.tgname,
             pg_get_triggerdef(t.oid) AS definition
      FROM pg_trigger t
      JOIN pg_class c ON c.oid = t.tgrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND NOT t.tgisinternal
      ORDER BY c.relname, t.tgname
    ) AS metadata_row),
  'functions', (SELECT COALESCE(jsonb_agg(to_jsonb(metadata_row)), '[]'::jsonb)
    FROM (
      SELECT n.nspname AS schema_name, p.proname,
             pg_get_function_identity_arguments(p.oid) AS arguments,
             p.prosecdef AS security_definer, p.proacl AS grants,
             pg_get_functiondef(p.oid) AS definition
      FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public' AND p.prokind = 'f'
        AND NOT EXISTS (
          SELECT 1 FROM pg_depend d
          WHERE d.classid = 'pg_proc'::regclass AND d.objid = p.oid AND d.deptype = 'e'
        )
      ORDER BY p.proname, p.oid
    ) AS metadata_row),
  'publications', (SELECT COALESCE(jsonb_agg(to_jsonb(metadata_row)), '[]'::jsonb)
    FROM (
      SELECT pubname, schemaname, tablename
      FROM pg_publication_tables WHERE schemaname = 'public'
      ORDER BY pubname, tablename
    ) AS metadata_row),
  'managed_tables', (SELECT COALESCE(jsonb_agg(to_jsonb(metadata_row)), '[]'::jsonb)
    FROM (
      SELECT table_schema, table_name
      FROM information_schema.tables
      WHERE table_schema IN ('supabase_migrations', 'auth')
      ORDER BY table_schema, table_name
    ) AS metadata_row)
) AS schema_report;

ROLLBACK;
