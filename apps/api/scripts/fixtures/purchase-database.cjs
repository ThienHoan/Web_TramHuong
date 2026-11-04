// Synthetic schema/data only. Never imports dotenv, Supabase or AppModule.
const { PGlite } = require('@electric-sql/pglite');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const OWNER = '10000000-0000-4000-8000-000000000001';
const OTHER = '10000000-0000-4000-8000-000000000002';
const ORDER = '20000000-0000-4000-8000-000000000001';
const PRODUCT = '30000000-0000-4000-8000-000000000001';
async function createPurchaseDatabase(dataDir) {
  const db = new PGlite(dataDir);
  const installed = (await db.query("SELECT to_regclass('public.orders') AS r")).rows[0].r;
  if (!installed) {
    await db.exec('CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS; GRANT USAGE ON SCHEMA public TO anon,authenticated,service_role;');
    await db.exec('CREATE TABLE public.orders(id uuid PRIMARY KEY,user_id uuid,status text,payment_status text,payment_method text,transaction_code text,total numeric,voucher_discount_amount numeric,items jsonb,shipping_info jsonb); GRANT ALL ON public.orders TO service_role;');
    for (const file of ['integration-delivery-foundation.sql','integration-purchase-capture.sql'])
      await db.exec(readFileSync(join(__dirname,'../../migrations',file),'utf8'));
  }
  return db;
}
async function seedOrder(db, id = ORDER, overrides = {}) {
  const row = {id,user_id:OWNER,status:'PAID',payment_status:'paid',payment_method:'sepay',transaction_code:'fixture-payment-'+id,
    total:230000,voucher_discount_amount:10000,items:[{productId:PRODUCT,price:70000,quantity:3,title:'PRIVATE',email:'private@example.invalid'}],
    shipping_info:{shipping_fee:30000,name:'PRIVATE',phone:'0000000000',address:'PRIVATE'},...overrides};
  const keys=Object.keys(row), values=keys.map(key=>['items','shipping_info'].includes(key)?JSON.stringify(row[key]):row[key]);
  await db.query('INSERT INTO orders('+keys.join(',')+') VALUES('+keys.map((_,i)=>'$'+(i+1)).join(',')+')',values);
  return row;
}
async function capture(db, order = ORDER, actor = OWNER, consent = true) {
  return (await db.query('SELECT public.integration_record_purchase_mock($1,$2,$3) AS r',[order,actor,consent])).rows[0].r;
}
module.exports = {createPurchaseDatabase,seedOrder,capture,OWNER,OTHER,ORDER,PRODUCT};
