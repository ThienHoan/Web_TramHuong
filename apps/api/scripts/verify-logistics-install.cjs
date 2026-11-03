// In-memory verification of the exact copy/paste installer, never remote SQL.
const {PGlite}=require('@electric-sql/pglite');
const {readFileSync}=require('node:fs');
const {join}=require('node:path');
const assert=require('node:assert/strict');
(async()=>{
 const db=new PGlite();
 try{
  await db.exec(`CREATE ROLE anon;CREATE ROLE authenticated;CREATE ROLE service_role BYPASSRLS;
  CREATE SCHEMA auth;CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$SELECT null::uuid$$;
  CREATE TABLE public.users(id uuid PRIMARY KEY);
  CREATE TABLE public.orders(id uuid PRIMARY KEY,user_id uuid,total numeric,status text,payment_method text,payment_status text,shipping_info jsonb);
  CREATE SCHEMA storage;CREATE TABLE storage.buckets(id text PRIMARY KEY,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
  CREATE TABLE storage.objects(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),bucket_id text);ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;`);
  const sql=readFileSync(join(__dirname,'../../../docs/shipping/install-smart-logistics.sql'),'utf8');
  await db.exec(sql);
  const result=await db.query(`SELECT to_regclass('public.shipping_records') IS NOT NULL AS records,to_regclass('public.shipping_tracking') IS NOT NULL AS tracking,(SELECT public=false FROM storage.buckets WHERE id='shipping-evidence') AS private_bucket`);
  assert.deepEqual(result.rows[0],{records:true,tracking:true,private_bucket:true});
  await assert.rejects(()=>db.exec(sql));await db.exec('ROLLBACK');
  assert.equal((await db.query(`SELECT count(*)::int AS n FROM storage.buckets WHERE id='shipping-evidence'`)).rows[0].n,1);
  console.log(JSON.stringify({checks:3,engine:'in-memory PostgreSQL',productionWrites:0}));
 }finally{await db.close();}
})().catch(e=>{console.error(e.stack);process.exitCode=1;});
