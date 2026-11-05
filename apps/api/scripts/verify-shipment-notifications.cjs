// Real shipping CAS/projection + exact bridge SQL + actual mock mail worker.
// Never loads dotenv/AppModule or creates a network client.
require('ts-node/register/transpile-only');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {ConfigService}=require('@nestjs/config');
const {createPurchaseDatabase,seedOrder,ORDER,OWNER}=require('./fixtures/purchase-database.cjs');
const {loadIntegrationRegistry}=require('../src/integrations/integrations.config');
const {IntegrationRepository}=require('../src/integrations/integration.repository');
const {IntegrationExecutor}=require('../src/integrations/integration-executor');
const {MockDeliveryConsumer}=require('../src/integrations/mock-delivery.consumer');
const {NotificationRepository}=require('../src/mail/notification.repository');
const {NotificationDeliveryService}=require('../src/mail/notification-delivery.service');
const {MockResendEmailProvider}=require('../src/mail/mock-resend-email.provider');
const file=name=>fs.readFileSync(path.join(__dirname,'../migrations',name),'utf8');
(async()=>{
 const db=await createPurchaseDatabase();let checks=0,simulations=0,uncertain=false;const messages=[];
 const eq=(a,b)=>{assert.deepEqual(a,b,'SQL/workflow check '+(checks+1));checks++;};
 const rejects=async(action,code)=>{await assert.rejects(action,e=>e.code===code);checks++;};
 const count=async()=>(await db.query("SELECT count(*)::int AS n FROM integration_outbox")).rows[0].n;
 const triggerState=async()=>(await db.query("SELECT tgenabled FROM pg_trigger WHERE tgname='integration_shipment_notification_mock_v1'")).rows[0].tgenabled;
 try {
  await db.exec("CREATE SCHEMA auth; CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT NULL::uuid $$; CREATE TABLE users(id uuid PRIMARY KEY); GRANT ALL ON users TO service_role;");
  await db.query('INSERT INTO users VALUES($1)',[OWNER]);
  await db.exec(file('smart-logistics.sql'));
  const original=(await db.query("SELECT pg_get_functiondef('shipping_write_record(text,text,text,jsonb,integer,uuid,uuid)'::regprocedure) AS d")).rows[0].d;
  await seedOrder(db,ORDER,{status:'PENDING',payment_method:'cod',payment_status:'pending',transaction_code:null,shipping_info:{email:'customer@example.invalid'}});
  const metadata=fs.readFileSync(path.join(__dirname,'../../../docs/integrations/verify-installed-shipment-notifications.sql'),'utf8');
  eq((await db.query(metadata)).rows.map(r=>r.status),Array(7).fill('CHUA_CAI'));
  await db.exec(file('integration-shipment-notifications.sql'));
  eq(await triggerState(),'D');eq((await db.query(metadata)).rows.filter(r=>r.status==='PASS').length,6);
  await rejects(()=>db.exec(file('integration-shipment-notifications.sql')),'42723');await db.exec('ROLLBACK');eq(await triggerState(),'D');
  const key='shipment:staging:'+ORDER;
  let ship;
  const write=async(state,data)=>{
   const r=await db.query('SELECT shipping_write_record($1,$2,$3,$4,$5,$6,$7) AS r',[
    key,'shipment',state,JSON.stringify(data??ship?.data??{trackingCode:'FIXTURE',codAmount:230000,shopId:123,eta:null}),ship?.version??0,OWNER,ORDER]);
   ship=r.rows[0].r;return ship;
  };
  await write('SHIPMENT_CREATED');eq(await count(),0);
  await db.exec(file('integration-shipment-notifications.enable.sql'));eq(await triggerState(),'O');
  await write('IN_TRANSIT');eq(await count(),1);
  eq((await db.query('SELECT integration_capture_shipment_notification_mock($1) AS r',[ship.id])).rows[0].r.status,'duplicate');
  const snapshot=structuredClone(ship);await db.exec('BEGIN');await write('OUT_FOR_DELIVERY');eq(await count(),2);await db.exec('ROLLBACK');ship=snapshot;
  eq(await count(),1);eq((await db.query('SELECT state FROM shipping_tracking WHERE id=$1',[ship.id])).rows[0].state,'IN_TRANSIT');
  // A failed outbox INSERT rolls back both aggregate CAS and public projection.
  await db.exec("ALTER TABLE integration_outbox ADD CONSTRAINT fixture_store_failure CHECK(event_type<>'shipment_status') NOT VALID");
  await rejects(()=>write('OUT_FOR_DELIVERY'),'23514');
  eq((await db.query('SELECT state,version FROM shipping_records WHERE id=$1',[ship.id])).rows[0],{state:'IN_TRANSIT',version:snapshot.version});
  eq((await db.query('SELECT state FROM shipping_tracking WHERE id=$1',[ship.id])).rows[0].state,'IN_TRANSIT');
  await db.exec('ALTER TABLE integration_outbox DROP CONSTRAINT fixture_store_failure');
  await db.query('UPDATE orders SET shipping_info=$2::jsonb WHERE id=$1',[ORDER,JSON.stringify({email:'bad recipient'})]);
  await write('DELIVERY_FAILED');eq(ship.state,'DELIVERY_FAILED');eq(await count(),2);
  eq((await db.query("SELECT state FROM integration_outbox WHERE event_type='shipment_source_review'")).rows[0].state,'DEAD');
  eq(JSON.stringify((await db.query('SELECT payload FROM integration_outbox')).rows).includes('bad recipient'),false);
  const client={rpc:async(name,a)=>{
   const defs={
    integration_reconcile_shipment_notifications_mock:['SELECT integration_reconcile_shipment_notifications_mock($1,$2) AS r',[a.p_after_id??null,a.p_limit]],
    integration_resolve_shipment_notification_mock:['SELECT integration_resolve_shipment_notification_mock($1,$2,$3) AS r',[a.p_id,a.p_lease_token,a.p_version]],
    integration_claim:['SELECT * FROM integration_claim($1,$2,$3,$4)',[a.p_provider,a.p_environment,a.p_limit,a.p_lease_seconds]],
    integration_reserve_usage:['SELECT integration_reserve_usage($1,$2,$3,$4,$5) AS r',[a.p_provider,a.p_environment,a.p_metric,a.p_amount,a.p_hard_limit]],
    integration_finish:['SELECT integration_finish($1,$2,$3,$4,$5,$6) AS r',[a.p_id,a.p_lease_token,a.p_version,a.p_outcome,null,a.p_error_code??null]],
   };assert.ok(defs[name]);
   try{const r=await db.query(...defs[name]);return{data:name==='integration_claim'?r.rows:r.rows[0]?.r,error:null};}
   catch(error){return{data:null,error:{code:error.code,message:'Fixture rejected'}};}
  }};
  const supabase={getClient:()=>client},usage=new IntegrationRepository(supabase),repo=new NotificationRepository(supabase);
  const config=new ConfigService({NODE_ENV:'test',FEATURE_RESEND_ENABLED:'true',FEATURE_NOTIFICATION_OUTBOX_ENABLED:'true'});
  const registry=loadIntegrationRegistry(config);
  const make=()=>{
   const provider=new MockResendEmailProvider(registry,new IntegrationExecutor(registry),'test',async()=>{simulations++;if(uncertain)throw new Error('SYNTHETIC_UNKNOWN');});
   const send=provider.send.bind(provider);provider.send=(options,k)=>{messages.push(options);return send(options,k);};
   return new NotificationDeliveryService(registry,config,repo,new MockDeliveryConsumer(registry,usage),provider,usage);
  };
  await db.exec('SET ROLE service_role');let service=make();
  eq((await service.drain()).accepted,0);eq(simulations,0); // Old IN_TRANSIT is stale.
  eq((await db.query("SELECT state FROM integration_outbox WHERE event_type='shipment_status'")).rows[0].state,'DEAD');
  await db.query('UPDATE orders SET shipping_info=$2::jsonb WHERE id=$1',[ORDER,JSON.stringify({email:'customer@example.invalid'})]);
  const recovered=await service.reconcileShipments();eq(recovered.processedShipments,1);eq(recovered.items[0].outcome.status,'recorded');
  eq((await service.drain()).accepted,1);eq(simulations,1);
  eq(messages[0].to,'customer@example.invalid');eq(messages[0].html.includes('Delivery attempt failed'),true);eq(messages[0].html.includes('Giao hàng chưa thành công'),true);
  eq(messages[0].html.includes('230000'),false);
  eq((await db.query('SELECT status,payment_status FROM orders WHERE id=$1',[ORDER])).rows[0],{status:'PENDING',payment_status:'pending'});
  service=make();eq((await service.drain()).claimed,0);eq((await service.reconcileShipments()).items[0].outcome.status,'duplicate');
  await write('RETURNING');uncertain=true;eq((await service.drain()).accepted,0);eq(simulations,2);
  service=make();eq((await service.drain()).claimed,0);eq((await service.reconcileShipments()).items[0].outcome.state,'UNKNOWN');eq(simulations,2);
  await write('RETURNED');
  const leases=await usage.claimMock('resend'),lease=leases[0];
  await rejects(()=>db.query('SELECT integration_resolve_shipment_notification_mock($1,$2,$3)',[lease.id,lease.lease_token,lease.version+1]),'PT409');
  await usage.finish(lease,'DEAD','REJECTED');
  await db.exec('RESET ROLE');await db.exec(file('integration-shipment-notifications.pause.sql'));eq(await triggerState(),'D');
  // Seed missed sources while disabled, then recover exactly one bounded page.
  for(let n=10;n<34;n++){
   const order='20000000-0000-4000-8000-'+String(n).padStart(12,'0');
   await seedOrder(db,order,{shipping_info:{email:'customer@example.invalid'}});
   await db.query('SELECT shipping_write_record($1,$2,$3,$4,0,$5,$6)',[
    'shipment:staging:'+order,'shipment','SHIPMENT_CREATED',JSON.stringify({trackingCode:'FIXTURE'+n,codAmount:0,shopId:123}),OWNER,order]);
  }
  await db.exec(file('integration-shipment-notifications.enable.sql'));await db.exec('SET ROLE service_role');
  const first=await service.reconcileShipments();eq(first.processedShipments,20);eq(first.hasMore,true);
  const second=await service.reconcileShipments(first.nextCursor);eq(second.processedShipments,5);eq(second.hasMore,false);
  const beforeRepeat=await count();await service.reconcileShipments();eq(await count(),beforeRepeat);
  for(const role of ['anon','authenticated']){
   await db.exec('RESET ROLE; SET ROLE '+role);
   await rejects(()=>db.query('SELECT integration_reconcile_shipment_notifications_mock(NULL,20)'),'42501');
   await rejects(()=>db.query('SELECT integration_shipment_notification_source_mock($1)',[ship.id]),'42501');
  }
  await db.exec('RESET ROLE');
  eq((await db.query("SELECT pg_get_functiondef('shipping_write_record(text,text,text,jsonb,integer,uuid,uuid)'::regprocedure) AS d")).rows[0].d,original);
  const beforePause=await count();await db.exec(file('integration-shipment-notifications.pause.sql'));
  eq((await db.query(metadata)).rows.filter(r=>r.status==='FAIL').length,6);eq(await triggerState(),'D');eq(await count(),beforePause);
  await db.exec('SET ROLE service_role');await assert.rejects(()=>service.reconcileShipments(),/NOTIFICATION_RECONCILIATION_UNAVAILABLE/);checks++;
  const report={batch:'P4-03b',result:'PASS',checks,exactSql:true,actualTsRepositoryWorkerTemplate:true,
   source:'synthetic_shipping_write_record_CAS',defaultTrigger:'DISABLED',sourceAndProjectionAndOutboxRollback:true,
   financialStateUnchanged:true,simulations,realEmails:0,ghnCalls:0,hostedWrites:0,remoteRequests:0};
  if(process.env.SHIPMENT_NOTIFICATION_REPORT)fs.writeFileSync(process.env.SHIPMENT_NOTIFICATION_REPORT,JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify(report));
 }finally{await db.close();}
})().catch(error=>{console.error('SHIPMENT_NOTIFICATION_FAILED',error.code||error.name,error.code==='ERR_ASSERTION'?error.message:'');process.exitCode=1;});
