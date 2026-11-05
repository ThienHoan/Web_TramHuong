const {PGlite}=require('@electric-sql/pglite');
const fs=require('node:fs/promises'),path=require('node:path');
const id=n=>'20000000-0000-4000-8000-'+String(n).padStart(12,'0');
const file=name=>fs.readFile(path.join(__dirname,'../../migrations',name),'utf8');
const SCHEMA=`
CREATE ROLE anon;CREATE ROLE authenticated;CREATE ROLE service_role BYPASSRLS;
CREATE TYPE order_state AS ENUM('PENDING','AWAITING_PAYMENT','PAID','SHIPPED','COMPLETED','CANCELED','EXPIRED');
CREATE TABLE products(id uuid PRIMARY KEY,price numeric(12,2) NOT NULL,quantity integer NOT NULL,is_active boolean DEFAULT true,
  variants jsonb DEFAULT '[]',discount_percentage integer DEFAULT 0,discount_start_date timestamptz,discount_end_date timestamptz);
CREATE TABLE vouchers(id uuid PRIMARY KEY,code text UNIQUE,usage_count integer DEFAULT 0,usage_limit integer,
  discount_type text DEFAULT 'FIXED_AMOUNT',discount_amount numeric,min_order_value numeric DEFAULT 0,max_discount_amount numeric,
  is_active boolean DEFAULT true,start_date timestamptz DEFAULT now()-interval '1 day',end_date timestamptz DEFAULT now()+interval '1 day');
CREATE TABLE orders(id uuid PRIMARY KEY,user_id uuid,status order_state,payment_status text,payment_method text,
  payment_deadline timestamptz,total numeric(12,2),items jsonb,shipping_info jsonb,voucher_code text,voucher_discount_amount numeric,
  created_at timestamptz DEFAULT now(),CHECK(payment_method IN('cod','sepay')));
CREATE TABLE contacts(id uuid PRIMARY KEY);
CREATE TABLE shipping_records(key text PRIMARY KEY,kind text,state text,owner_id uuid,data jsonb);
GRANT ALL ON products,vouchers,orders,contacts,shipping_records TO service_role;
`;
async function createDB() {
  const db=new PGlite();await db.exec(SCHEMA);
  await db.exec(await file('admin-order-integrity.sql'));
  await db.exec(await file('checkout-atomic.sql'));
  return db;
}
const line=(product=id(1),quantity=1,price=200000,variantId)=>({productId:product,quantity,price,original_price:price,discount_amount:0,...(variantId?{variantId}: {})});
const args=(key=id(100),overrides={})=>({p_key:key,p_user_id:null,p_fingerprint:'a'.repeat(64),p_items:[line()],
  p_shipping_info:{name:'Synthetic',phone:'+84000000000',address:'Synthetic',city:'Synthetic'},p_payment_method:'cod',
  p_voucher_code:null,p_expected_subtotal:200000,p_expected_discount:0,p_shipping_fee:30000,p_quote:null,...overrides});
const names=['p_key','p_user_id','p_fingerprint','p_items','p_shipping_info','p_payment_method','p_voucher_code','p_expected_subtotal','p_expected_discount','p_shipping_fee','p_quote'];
async function call(db,a) {return (await db.query('SELECT checkout_create_order('+names.map((_,i)=>'$'+(i+1)).join(',')+') r',names.map(n=>['p_items','p_shipping_info','p_quote'].includes(n)&&a[n]!==null?JSON.stringify(a[n]):a[n]))).rows[0].r;}
const lookup=async(db,a)=>(await db.query('SELECT checkout_lookup_request($1,$2,$3) r',[a.p_key,a.p_user_id,a.p_fingerprint])).rows[0].r;
module.exports={id,file,SCHEMA,createDB,line,args,call,lookup};
