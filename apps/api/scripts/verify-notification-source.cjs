// Exact SQL + original transition/stock guard. Synthetic memory only, no env.
require('ts-node/register/transpile-only');
const {NotificationRepository}=require('../src/mail/notification.repository');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {createPurchaseDatabase,seedOrder,PRODUCT} = require('./fixtures/purchase-database.cjs');
const file = name => fs.readFileSync(path.join(__dirname,'../migrations',name),'utf8');
const id = n => '20000000-0000-4000-8000-'+String(n).padStart(12,'0');
(async()=>{
 const db=await createPurchaseDatabase();let checks=0;
 const eq=(actual,expected)=>{assert.deepEqual(actual,expected,'SQL check '+(checks+1));checks++;};
 const rejects=async(action,code)=>{await assert.rejects(action,e=>e.code===code);checks++;};
 const count=async(where='true')=>(await db.query('SELECT count(*)::int AS n FROM integration_outbox WHERE '+where)).rows[0].n;
 const state=async(n)=>(await db.query('SELECT status,payment_status FROM orders WHERE id=$1',[id(n)])).rows[0];
 const seed=async(n,overrides={})=>seedOrder(db,id(n),{status:'AWAITING_PAYMENT',payment_status:'pending',transaction_code:null,shipping_info:{email:'customer@example.invalid'},...overrides});
 try {
  await db.exec('CREATE TABLE products(id uuid PRIMARY KEY,quantity integer); GRANT ALL ON products TO service_role;');
  await db.query('INSERT INTO products VALUES($1,10)',[PRODUCT]);
  await db.exec("CREATE TYPE order_state_fixture AS ENUM('PENDING','AWAITING_PAYMENT','PAID','SHIPPED','COMPLETED','CANCELED','EXPIRED'); ALTER TABLE orders ALTER COLUMN status TYPE order_state_fixture USING status::order_state_fixture;");
  await db.exec(file('admin-order-integrity.sql'));
  const original=(await db.query("SELECT pg_get_triggerdef(oid) AS d FROM pg_trigger WHERE tgname='enforce_order_transition'")).rows[0].d;
  await db.exec(file('integration-notifications.sql'));
  const metadata=fs.readFileSync(path.join(__dirname,'../../../docs/integrations/verify-installed-notification-source.sql'),'utf8');
  eq((await db.query(metadata)).rows.map(r=>r.status),Array(4).fill('CHUA_CAI'));
  await db.exec(file('integration-notification-source.sql'));
  eq((await db.query(metadata)).rows.map(r=>r.status),['DISABLED','PASS','PASS','PASS']);
  await seed(1);eq(await count(),0);
  await rejects(()=>db.exec(file('integration-notification-source.sql')),'42723');await db.exec('ROLLBACK');
  eq((await db.query(metadata)).rows.map(r=>r.status),['DISABLED','PASS','PASS','PASS']);
  await db.exec(file('integration-notification-source.enable.sql'));
  eq((await db.query(metadata)).rows.map(r=>r.status),['ENABLED','PASS','PASS','PASS']);
  await db.exec('BEGIN');await seed(2);eq(await count(),1);await db.exec('ROLLBACK');
  eq(await count(),0);eq(await state(2),undefined);
  await seed(3);eq(await count(),1);
  // No MailService hook: source statement itself publishes the payment event.
  await db.query("UPDATE orders SET payment_status='paid',status='PAID',transaction_code='fixture-3' WHERE id=$1",[id(3)]);
  eq(await count("event_type='payment_success'"),1);eq(await count("event_type='order_status'"),0);
  eq((await db.query('SELECT integration_capture_notification_mock($1,$2) AS r',[id(3),'payment_success'])).rows[0].r.status,'duplicate');
  const beforeNoop=await count();await db.query('UPDATE orders SET total=total WHERE id=$1',[id(3)]);eq(await count(),beforeNoop);
  await db.query("SELECT transition_order($1,'SHIPPED','PAID')",[id(3)]);eq(await count("event_type='order_status'"),1);
  const beforeRollback=await count();await db.exec('BEGIN');await db.query("SELECT transition_order($1,'COMPLETED','SHIPPED')",[id(3)]);
  eq(await count(),beforeRollback+1);await db.exec('ROLLBACK');eq((await state(3)).status,'SHIPPED');eq(await count(),beforeRollback);
  await rejects(()=>db.query("SELECT transition_order($1,'PENDING','SHIPPED')",[id(3)]),'23514');
  await db.query("SELECT transition_order($1,'CANCELED','AWAITING_PAYMENT')",[id(1)]);
  eq((await db.query('SELECT quantity FROM products WHERE id=$1',[PRODUCT])).rows[0].quantity,13);
  await seed(4,{shipping_info:{email:'invalid recipient'}});
  await db.query("UPDATE orders SET payment_status='paid',status='PAID',transaction_code='fixture-4' WHERE id=$1",[id(4)]);
  eq(await state(4),{status:'PAID',payment_status:'paid'});eq(await count("event_type='notification_source_review' AND payload->>'orderId'='"+id(4)+"'"),2);
  const privateRows=(await db.query("SELECT payload::text,last_error_code,state FROM integration_outbox WHERE event_type='notification_source_review'")).rows;
  eq(privateRows.every(r=>r.state==='DEAD'&&r.last_error_code==='NOTIFICATION_SNAPSHOT_INVALID'),true);
  eq(JSON.stringify((await db.query('SELECT payload FROM integration_outbox')).rows).includes('customer@example.invalid'),false);
  eq(JSON.stringify(privateRows).includes('invalid recipient'),false);
  // Real storage failures must roll back the opted-in order write, not vanish.
  await seed(5);await db.exec('REVOKE INSERT ON integration_outbox FROM service_role; SET ROLE service_role');
  await rejects(()=>db.query("UPDATE orders SET payment_status='paid',status='PAID',transaction_code='fixture-5' WHERE id=$1",[id(5)]),'42501');
  eq(await state(5),{status:'AWAITING_PAYMENT',payment_status:'pending'});
  eq(await count("event_type='payment_success' AND payload->>'orderId'='"+id(5)+"'"),0);
  await db.exec('RESET ROLE; GRANT INSERT ON integration_outbox TO service_role');
  await db.exec(file('integration-notification-source.pause.sql'));
  for(let n=10;n<35;n++)await seed(n);
  await db.query("UPDATE integration_outbox SET state='UNKNOWN' WHERE event_type='payment_success' AND payload->>'orderId'=$1",[id(3)]);
  await db.exec(file('integration-notification-source.enable.sql'));await db.exec('SET ROLE service_role');
  const page=async(cursor=null,limit=20)=>(await db.query('SELECT integration_reconcile_notifications_mock($1,$2) AS r',[cursor,limit])).rows[0].r;
  const first=await page();eq(first.processedOrders,20);eq(first.hasMore,true);eq(first.nextCursor,id(25));
  const second=await page(first.nextCursor);eq(second.processedOrders,9);eq(second.hasMore,false);eq(second.nextCursor,null);
  eq((await db.query("SELECT state FROM integration_outbox WHERE event_type='payment_success' AND payload->>'orderId'=$1",[id(3)])).rows[0].state,'UNKNOWN');
  const countBefore=await count();const repeat=await page();eq(repeat.items.every(r=>['duplicate','requires_review'].includes(r.outcome.status)),true);eq(await count(),countBefore);
  await rejects(()=>page(null,21),'22023');
  await db.query('UPDATE orders SET shipping_info=$2::jsonb WHERE id=$1',[id(3),JSON.stringify({email:'changed@example.invalid'})]);
  const changed=await page();eq(changed.items.some(r=>r.orderId===id(3)&&r.outcome.errorCode==='NOTIFICATION_SOURCE_CONFLICT'),true);
  eq((await db.query("SELECT state FROM integration_outbox WHERE event_type='payment_success' AND payload->>'orderId'=$1",[id(3)])).rows[0].state,'UNKNOWN');
  const client={rpc:async(name,a)=>{
    assert.equal(name,'integration_reconcile_notifications_mock');
    try {return {data:(await db.query('SELECT integration_reconcile_notifications_mock($1,$2) AS r',[a.p_after_id??null,a.p_limit])).rows[0].r,error:null};}
    catch(e){return {data:null,error:{code:e.code,message:'Fixture rejected'}};}
  }};
  const repo=new NotificationRepository({getClient:()=>client});
  const projected=await repo.reconcile();eq(projected.processedOrders,20);
  eq(JSON.stringify(projected).includes('changed@example.invalid'),false);
  for(const role of ['anon','authenticated']){
   await db.exec('RESET ROLE; SET ROLE '+role);
   await rejects(()=>db.query('SELECT integration_reconcile_notifications_mock(NULL,20)'),'42501');
   await rejects(()=>db.query('SELECT integration_publish_notification_mock($1,$2)',[id(3),'payment_success']),'42501');
  }
  await db.exec('RESET ROLE');
  eq((await db.query("SELECT pg_get_triggerdef(oid) AS d FROM pg_trigger WHERE tgname='enforce_order_transition'")).rows[0].d,original);
  const outboxBeforePause=await count();await db.exec(file('integration-notification-source.pause.sql'));
  eq((await db.query(metadata)).rows.map(r=>r.status),['DISABLED','FAIL','FAIL','FAIL']);
  await seed(40);eq(await count(),outboxBeforePause);
  await db.exec('SET ROLE service_role');await rejects(()=>page(),'42501');await db.exec('RESET ROLE');
  await db.exec(file('integration-notifications.pause.sql'));
  await rejects(()=>db.exec(file('integration-notification-source.enable.sql')),'P0001');await db.exec('ROLLBACK');
  eq((await db.query(metadata)).rows[0].status,'DISABLED');
  const report={batch:'P4-03a',result:'PASS',checks,exactSql:true,source:'synthetic_memory_orders_enum',
   existingTransitionAndStockRestorationPreserved:true,orderRowAndOutboxAtomic:true,
   entireCheckoutAtomic:false,defaultTrigger:'DISABLED',realEmails:0,hostedWrites:0,remoteRequests:0};
  if(process.env.NOTIFICATION_SOURCE_REPORT)fs.writeFileSync(process.env.NOTIFICATION_SOURCE_REPORT,JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify(report));
 }finally{await db.close();}
})().catch(error=>{console.error('NOTIFICATION_SOURCE_FAILED',error.code||error.name,error.code==='ERR_ASSERTION'?error.message:'');process.exitCode=1;});
