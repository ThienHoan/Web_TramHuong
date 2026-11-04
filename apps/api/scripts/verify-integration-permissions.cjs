// Authored migration regression fixture. No dotenv, sockets or remote clients.
// Synthetic rows only; PGlite runs PostgreSQL in memory.
const { PGlite } = require('@electric-sql/pglite');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const assert = require('node:assert/strict');

const migration = readFileSync(join(__dirname, '../migrations/integration-permissions.sql'), 'utf8');
const rollback = readFileSync(join(__dirname, '../migrations/integration-permissions.rollback.sql'), 'utf8');
const identities = {
  customer: '00000000-0000-4000-8000-000000000001',
  other: '00000000-0000-4000-8000-000000000002',
  admin: '00000000-0000-4000-8000-000000000003',
  staff: '00000000-0000-4000-8000-000000000004',
};

(async () => {
  const db = new PGlite();
  let checks = 0;
  const check = (actual, expected) => { assert.deepEqual(actual, expected); checks++; };
  const role = async (name, principal = '') => {
    assert.ok(['postgres', 'anon', 'authenticated', 'service_role'].includes(name));
    await db.exec(`RESET ROLE; SET ROLE ${name}`);
    await db.query("SELECT set_config('request.jwt.claim.sub', $1, false)", [principal]);
  };
  const deny = async (sql, params = []) => {
    await assert.rejects(() => db.query(sql, params), (error) => error.code === '42501');
    checks++;
  };
  try {
    await db.exec(`
      CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
      CREATE SCHEMA auth;
      CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$
        SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
      $$;
      GRANT USAGE ON SCHEMA public, auth TO anon, authenticated, service_role;
      CREATE TYPE user_role AS ENUM ('CUSTOMER', 'STAFF', 'ADMIN');
      CREATE TABLE public.users(id uuid PRIMARY KEY, email text, full_name text, role user_role DEFAULT 'CUSTOMER', is_banned boolean DEFAULT false);
      CREATE TABLE public.posts(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), slug text, title text, content text, status text DEFAULT 'draft');
      CREATE TABLE public.orders(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid, total numeric, status text DEFAULT 'PENDING', payment_status text DEFAULT 'pending', transaction_code text);
      CREATE TABLE public.order_items(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), order_id uuid);
      CREATE TABLE public.contacts(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), email text, message text);
      CREATE FUNCTION public.get_my_role() RETURNS text LANGUAGE sql SECURITY DEFINER AS $$ SELECT role::text FROM public.users WHERE id = auth.uid() $$;
      ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
      ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
      ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
      ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
      ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
      CREATE POLICY "Admins and Staff can view all profiles" ON public.users FOR SELECT USING (get_my_role() IN ('ADMIN','STAFF'));
      CREATE POLICY "Public posts are viewable by everyone." ON public.posts FOR SELECT USING(status = 'published');
      CREATE POLICY "Users can view own orders" ON public.orders FOR SELECT USING(user_id = auth.uid());
      CREATE POLICY "Admin and Staff can view all orders" ON public.orders FOR SELECT USING(get_my_role() IN ('ADMIN','STAFF'));
      CREATE POLICY "Users can view own order items" ON public.order_items FOR SELECT USING(EXISTS(SELECT 1 FROM public.orders WHERE orders.id=order_items.order_id AND orders.user_id=auth.uid()));
      GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
    `);
    // Restore snapshot policies/ACLs to establish the expected starting shape.
    // No unauthorized pre-patch action or real identity is exercised.
    await db.exec(rollback);
    for (const [name, id] of Object.entries(identities)) {
      await db.query('INSERT INTO public.users(id,email,full_name,role) VALUES($1,$2,$3,$4)',
        [id, `${name}@example.invalid`, 'Fixture', name === 'admin' ? 'ADMIN' : name === 'staff' ? 'STAFF' : 'CUSTOMER']);
      await db.query('INSERT INTO public.orders(id,user_id,total) VALUES($1,$1,200000)', [id]);
    }
    await db.exec("INSERT INTO public.posts(slug,title,status) VALUES('published','Fixture','published'),('draft','Fixture','draft')");
    // Explicit column grants must be removed even when relation grants vanish.
    await db.exec('GRANT UPDATE(role) ON public.users TO authenticated; GRANT INSERT(total) ON public.orders TO authenticated');
    await db.exec(migration);
    await db.exec(migration); checks++; // repeat-safe, no additional tables/rows

    await role('anon');
    await deny('SELECT email FROM public.users');
    check((await db.query('SELECT slug FROM public.posts')).rows, [{ slug: 'published' }]);
    await deny("INSERT INTO public.contacts(email,message) VALUES('fixture@example.invalid','Fixture')");
    await deny("INSERT INTO public.orders(total) VALUES(1)");

    await role('authenticated', identities.customer);
    check((await db.query('SELECT id,role,email FROM public.users')).rows, [{ id: identities.customer, role: 'CUSTOMER', email: 'customer@example.invalid' }]);
    check((await db.query('SELECT id FROM public.users WHERE id=$1', [identities.other])).rows, []);
    await deny("UPDATE public.users SET role='ADMIN' WHERE id=$1", [identities.customer]);
    await deny('UPDATE public.users SET is_banned=false WHERE id=$1', [identities.customer]);
    await deny('UPDATE public.users SET full_name=$1 WHERE id=$2', ['Direct write', identities.customer]);
    await deny('INSERT INTO public.users(id,email,role) VALUES(gen_random_uuid(),$1,$2)', ['fixture@example.invalid', 'ADMIN']);
    check((await db.query('SELECT id FROM public.orders')).rows, [{ id: identities.customer }]);
    await deny("INSERT INTO public.orders(user_id,total,payment_status) VALUES($1,1,'paid')", [identities.customer]);
    await deny('UPDATE public.orders SET total=1 WHERE id=$1', [identities.customer]);
    await deny('DELETE FROM public.orders WHERE id=$1', [identities.customer]);
    await deny('INSERT INTO public.order_items(order_id) VALUES($1)', [identities.customer]);
    await deny("INSERT INTO public.posts(title) VALUES('Fixture')");
    await deny("UPDATE public.posts SET title='Changed' WHERE slug='published'");
    await deny("DELETE FROM public.posts WHERE slug='published'");
    await deny("INSERT INTO public.contacts(email,message) VALUES('fixture@example.invalid','Fixture')");
    await deny('TRUNCATE public.users');
    check((await db.query('SELECT slug FROM public.posts')).rows, [{ slug: 'published' }]);

    for (const principal of ['admin', 'staff']) {
      await role('authenticated', identities[principal]);
      check((await db.query('SELECT id FROM public.users')).rows.length, 4);
      await deny("UPDATE public.users SET role='ADMIN' WHERE id=$1", [identities.other]);
      await deny("INSERT INTO public.posts(title) VALUES('Direct write')");
    }

    await role('service_role');
    check((await db.query('SELECT id FROM public.users')).rows.length, 4);
    await db.query('UPDATE public.users SET full_name=$1 WHERE id=$2', ['Backend profile edit', identities.customer]); checks++;
    await db.query("UPDATE public.users SET role='STAFF',is_banned=true WHERE id=$1", [identities.other]); checks++;
    await db.exec("INSERT INTO public.posts(slug,title) VALUES('backend','Backend draft')"); checks++;
    await db.query("INSERT INTO public.orders(user_id,total) VALUES($1,230000)", [identities.customer]); checks++;
    await db.query("UPDATE public.orders SET payment_status='paid',status='PAID',transaction_code='fixture-sepay' WHERE id=$1", [identities.customer]); checks++;
    await db.exec("INSERT INTO public.contacts(email,message) VALUES('fixture@example.invalid','Backend contact')"); checks++;

    await role('postgres');
    check((await db.query('SELECT full_name FROM public.users WHERE id=$1', [identities.customer])).rows[0].full_name, 'Backend profile edit');
    check((await db.query('SELECT payment_status FROM public.orders WHERE id=$1', [identities.customer])).rows[0].payment_status, 'paid');
    check((await db.query('SELECT count(*)::int AS n FROM public.orders')).rows[0].n, 5);
    const definition = (await db.query("SELECT proconfig FROM pg_proc WHERE oid='public.get_my_role()'::regprocedure")).rows[0].proconfig;
    check(definition, ['search_path=pg_catalog, public']);
    await db.exec(rollback);
    check((await db.query("SELECT has_table_privilege('authenticated','public.users','UPDATE') AS original_acl")).rows[0].original_acl, true);
    check((await db.query('SELECT count(*)::int AS n FROM public.orders')).rows[0].n, 5);
    await db.exec(migration);
    check((await db.query("SELECT has_column_privilege('authenticated','public.users','role','UPDATE') AS protected")).rows[0].protected, false);
    console.log(JSON.stringify({ batch: 'P1-02a', engine: 'in-memory PostgreSQL', checks, remoteRequests: 0, productionWrites: 0, rollback: 'PASS', migration: 'PASS' }));
  } finally { await db.close(); }
})().catch((error) => { console.error(error.message); process.exitCode = 1; });
