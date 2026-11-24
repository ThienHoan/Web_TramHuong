const { test } = require('node:test');
const assert = require('node:assert/strict');
const { PGlite } = require('@electric-sql/pglite');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const user='00000000-0000-4000-8000-000000000001', product='00000000-0000-4000-8000-000000000002', order='00000000-0000-4000-8000-000000000003';
async function database() {
 const db=new PGlite();
 await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
 CREATE TABLE users(id uuid PRIMARY KEY,email text);
 CREATE TABLE products(id uuid PRIMARY KEY,slug text,is_active boolean);
 CREATE TABLE product_translations(product_id uuid,locale text,title text);
 CREATE TABLE orders(id uuid PRIMARY KEY,user_id uuid,status text,items jsonb,shipping_info jsonb);
 CREATE TABLE reviews(user_id uuid,product_id uuid);
 INSERT INTO users VALUES('${user}','buyer@example.invalid');
 INSERT INTO products VALUES('${product}','incense',true);
 INSERT INTO product_translations VALUES('${product}','vi','Nụ trầm');
 INSERT INTO orders VALUES('${order}','${user}','SHIPPED','[{"productId":"${product}","quantity":1}]','{}');`);
 await db.exec(readFileSync(join(__dirname,'../../migrations/review-reminders.sql'),'utf8'));
 return db;
}
async function due(db) {
 await db.exec(`UPDATE orders SET status='COMPLETED' WHERE id='${order}'; UPDATE order_review_reminders SET due_at=now()-interval '1 minute';`);
 return (await db.query('SELECT * FROM review_reminder_claim(20)')).rows[0];
}
test('schedules once after completion, waits three days, and excludes guest orders',async()=>{
 const db=await database();try{
  await db.exec(`UPDATE orders SET status='COMPLETED' WHERE id='${order}';`);
  assert.equal((await db.query('SELECT * FROM review_reminder_claim(20)')).rows.length,0);
  assert.equal((await db.query("SELECT round(extract(epoch from (due_at-now()))/86400) AS days FROM order_review_reminders")).rows[0].days,'3');
  await db.exec(`UPDATE orders SET status='SHIPPED' WHERE id='${order}'; UPDATE orders SET status='COMPLETED' WHERE id='${order}';`);
  assert.equal((await db.query('SELECT * FROM order_review_reminders')).rows.length,1);
  await db.exec(`INSERT INTO orders VALUES('00000000-0000-4000-8000-000000000004',NULL,'SHIPPED','[]','{}'); UPDATE orders SET status='COMPLETED' WHERE user_id IS NULL;`);
  assert.equal((await db.query('SELECT * FROM order_review_reminders')).rows.length,1);
 }finally{await db.close();}
});
test('claims are exclusive, prepare is single-use, acceptance is token-bound',async()=>{
 const db=await database();try{
  const row=await due(db);assert(row);
  assert.equal((await db.query('SELECT * FROM review_reminder_claim(20)')).rows.length,0);
  const args=[row.order_id,row.lease_token];
  const first=(await db.query('SELECT review_reminder_prepare($1,$2) AS mail',args)).rows[0].mail;
  assert.equal(first.to,'buyer@example.invalid');assert.deepEqual(first.items,[{slug:'incense',title:'Nụ trầm'}]);
  assert.equal((await db.query('SELECT review_reminder_prepare($1,$2) AS mail',args)).rows[0].mail,null);
  assert.equal((await db.query("SELECT review_reminder_finish($1,$2,'ACCEPTED') AS ok",[order,product])).rows[0].ok,false);
  assert.equal((await db.query("SELECT review_reminder_finish($1,$2,'ACCEPTED') AS ok",args)).rows[0].ok,true);
 }finally{await db.close();}
});
test('canceling before dispatch or reviewing all purchased products skips mail',async()=>{
 for(const action of [`UPDATE orders SET status='CANCELED' WHERE id='${order}'`,`INSERT INTO reviews VALUES('${user}','${product}')`]){
  const db=await database();try{const row=await due(db);await db.exec(action);assert.equal((await db.query('SELECT review_reminder_prepare($1,$2) AS mail',[order,row.lease_token])).rows[0].mail,null);}finally{await db.close();}
 }
});
test('only abandoned claims retry; uncertain SMTP sends never auto-retry',async()=>{
 const db=await database();try{
  const old=await due(db);
  await db.exec("UPDATE order_review_reminders SET attempted_at=now()-interval '11 minutes'");
  const row=(await db.query('SELECT * FROM review_reminder_claim(20)')).rows[0];assert.notEqual(row.lease_token,old.lease_token);
  assert.equal((await db.query('SELECT review_reminder_prepare($1,$2) AS mail',[order,old.lease_token])).rows[0].mail,null);
  await db.query('SELECT review_reminder_prepare($1,$2)',[order,row.lease_token]);
  await db.exec("UPDATE order_review_reminders SET attempted_at=now()-interval '11 minutes'");
  assert.equal((await db.query('SELECT * FROM review_reminder_claim(20)')).rows.length,0);
  assert.equal((await db.query('SELECT state FROM order_review_reminders')).rows[0].state,'UNKNOWN');
 }finally{await db.close();}
});
test('browser roles cannot read queue or authorize SMTP',async()=>{
 const db=await database();try{
  for(const role of ['anon','authenticated']){
   await db.exec(`SET ROLE ${role}`);
   await assert.rejects(db.query('SELECT * FROM order_review_reminders'),/permission denied/);
   await assert.rejects(db.query('SELECT * FROM review_reminder_claim(20)'),/permission denied/);
   await db.exec('RESET ROLE');
  }
 }finally{await db.close();}
});
