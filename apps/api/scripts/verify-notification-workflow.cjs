// Real TS mail hook/repository/consumer/templates/provider against exact memory SQL.
require('ts-node/register/transpile-only');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {ConfigService}=require('@nestjs/config');
const {createPurchaseDatabase,seedOrder,ORDER}=require('./fixtures/purchase-database.cjs');
const {loadIntegrationRegistry}=require('../src/integrations/integrations.config');
const {IntegrationRepository}=require('../src/integrations/integration.repository');
const {IntegrationExecutor}=require('../src/integrations/integration-executor');
const {MockDeliveryConsumer}=require('../src/integrations/mock-delivery.consumer');
const {NotificationRepository}=require('../src/mail/notification.repository');
const {NotificationDeliveryService}=require('../src/mail/notification-delivery.service');
const {MockResendEmailProvider}=require('../src/mail/mock-resend-email.provider');
const {MailService}=require('../src/mail/mail.service');
(async()=>{
 const db=await createPurchaseDatabase();let checks=0,simulations=0,smtp=0,uncertain=false;const rendered=[];
 const equal=(a,b)=>{assert.deepEqual(a,b);checks++;};
 try{
  await db.exec(fs.readFileSync(path.join(__dirname,'../migrations/integration-notifications.sql'),'utf8'));
  await seedOrder(db,ORDER,{shipping_info:{email:'customer@example.invalid'}});
  await db.exec('SET ROLE service_role');
  const client={rpc:async(name,a)=>{
   const definitions={
    integration_capture_notification_mock:['SELECT integration_capture_notification_mock($1,$2) AS r',[a.p_order_id,a.p_event]],
    integration_resolve_notification_mock:['SELECT integration_resolve_notification_mock($1,$2,$3) AS r',[a.p_id,a.p_lease_token,a.p_version]],
    integration_claim:['SELECT * FROM integration_claim($1,$2,$3,$4)',[a.p_provider,a.p_environment,a.p_limit,a.p_lease_seconds]],
    integration_reserve_usage:['SELECT integration_reserve_usage($1,$2,$3,$4,$5) AS r',[a.p_provider,a.p_environment,a.p_metric,a.p_amount,a.p_hard_limit]],
    integration_finish:['SELECT * FROM integration_finish($1,$2,$3,$4,$5,$6)',[a.p_id,a.p_lease_token,a.p_version,a.p_outcome,a.p_provider_message_id??null,a.p_error_code??null]],
   };if(!definitions[name])throw new Error('UNEXPECTED_RPC');
   try{const r=await db.query(...definitions[name]);return{data:name==='integration_claim'?r.rows:r.rows[0]?.r??r.rows[0],error:null};}
   catch(error){return{data:null,error:{code:error.code,message:'Fixture rejected'}};}
  }};
  const supabase={getClient:()=>client};
  const config=new ConfigService({NODE_ENV:'test',FEATURE_NOTIFICATION_OUTBOX_ENABLED:'true',FEATURE_RESEND_ENABLED:'true',INTEGRATIONS_KILL_SWITCH:'false',INTEGRATIONS_ENV:'mock'});
  const registry=loadIntegrationRegistry(config),usage=new IntegrationRepository(supabase),repo=new NotificationRepository(supabase);
  const make=()=>{
   const provider=new MockResendEmailProvider(registry,new IntegrationExecutor(registry),'test',async()=>{simulations++;if(uncertain)throw new Error('SYNTHETIC_UNKNOWN');});
   const send=provider.send.bind(provider);provider.send=(options,key)=>{rendered.push(options);return send(options,key);};
   return new NotificationDeliveryService(registry,config,repo,new MockDeliveryConsumer(registry,usage),provider,usage);
  };
  let service=make();const mail=new MailService({send:async()=>{smtp++;throw new Error('SMTP_FORBIDDEN');}},config,service);
  await mail.sendPaymentSuccess({id:ORDER,total:1,items:[],shipping_info:{email:'forged@example.invalid'},status:'PAID'});
  equal((await db.query("SELECT count(*)::int AS n FROM integration_outbox WHERE provider='resend'")).rows[0].n,1);
  equal((await service.capture(ORDER,'payment_success')).status,'duplicate');
  const first=await service.drain();equal(first.accepted,1);equal(first.delivered,false);equal(simulations,1);equal(smtp,0);
  equal(rendered[0].to,'customer@example.invalid');equal(rendered[0].html.includes('230.000'),true);equal(rendered[0].html.includes('forged@example.invalid'),false);
  equal((await db.query("SELECT state FROM integration_outbox WHERE provider='resend'")).rows[0].state,'ACCEPTED');
  equal((await db.query("SELECT metric,used::int FROM integration_usage_daily WHERE provider='resend' ORDER BY metric")).rows,[{metric:'emails',used:1},{metric:'requests',used:1}]);
  service=make();equal((await service.drain()).claimed,0);equal(simulations,1);
  const other='20000000-0000-4000-8000-000000000009';
  await seedOrder(db,other,{shipping_info:{email:'customer@example.invalid'}});await service.capture(other,'payment_success');
  uncertain=true;equal((await service.drain()).accepted,0);equal(simulations,2);
  equal((await db.query("SELECT state FROM integration_outbox WHERE payload->>'orderId'=$1",[other])).rows[0].state,'UNKNOWN');
  service=make();equal((await service.drain()).claimed,0);equal(simulations,2);equal(smtp,0);
  const report={batch:'P4-02b',checks,result:'PASS',exactSql:true,realTsServices:true,templateRendering:true,processRestartSimulation:true,unknownNotRetried:true,hostedWrites:0,realEmails:0,simulations,smtpCalls:smtp};
  if(process.argv[2])fs.writeFileSync(process.argv[2],JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
 }finally{await db.close();}
})().catch(error=>{console.error(error.message);process.exitCode=1;});
