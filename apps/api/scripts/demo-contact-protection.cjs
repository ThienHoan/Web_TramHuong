// Local demo: exact contact UI/controller/protection with fake contact storage.
// No AppModule, SMTP or real database. Fixture modes never read real .env.
// Explicit GA4 live flags read only two GA4 values and cap outbound attempts.
// Next runs from a disposable copy with an explicit synthetic environment.
require('ts-node/register');
const { Test } = require('@nestjs/testing');
const { ConfigService } = require('@nestjs/config');
const { ValidationPipe, ServiceUnavailableException } = require('@nestjs/common');
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { ContactsModule } = require('../src/contacts/contacts.module');
const { ContactsService } = require('../src/contacts/contacts.service');
const { SupabaseService } = require('../src/supabase/supabase.service');
const { ContactProtectionService } = require('../src/integrations/contact-protection.service');
const { MockTurnstileAdapter } = require('../src/integrations/turnstile.adapter');
const { loadIntegrationRegistry } = require('../src/integrations/integrations.config');
const { IntegrationExecutor } = require('../src/integrations/integration-executor');
const { AnalyticsModule } = require('../src/analytics/analytics.module');
const { AnalyticsService } = require('../src/analytics/analytics.service');
const { CollectionPolicyService } = require('../src/analytics/collection-policy.service');
const { LocalDebugEventService, LocalGa4TestLimitError } = require('../src/analytics/local-debug-event.service');
const { PagespeedService } = require('../src/analytics/pagespeed.service');
const { MockPagespeedAdapter } = require('../src/analytics/pagespeed.adapter');
const { createPurchaseDatabase, seedOrder, capture, OWNER, OTHER, ORDER } = require('./fixtures/purchase-database.cjs');
const { randomUUID, createHash } = require('node:crypto');

const apiPort=4401,webPort=4400;
const analyticsDemo=process.argv.includes('--analytics');
const liveFunnel=process.argv.includes('--ga4-funnel-live-test');
const liveGa4=process.argv.includes('--ga4-live-test')||liveFunnel;
const limitedFunnelFixture=process.argv.includes('--ga4-funnel-limit-fixture');
const funnelFixture=process.argv.includes('--ga4-funnel-fixture')||limitedFunnelFixture;
const fixtureGa4=process.argv.includes('--ga4-local-test-fixture')||funnelFixture;
if(liveGa4&&fixtureGa4)throw new Error('CHOOSE_LIVE_OR_FIXTURE_NOT_BOTH');
if((liveGa4||fixtureGa4)&&!analyticsDemo)throw new Error('ANALYTICS_DEMO_REQUIRED');
let ga4Values={};
if(liveGa4){
 const parsed=require('dotenv').parse(fs.readFileSync(path.resolve(__dirname,'../.env'),'utf8'));
 if(parsed.GA4_MEASUREMENT_ID!=='G-XJNSBPN8HN'||!parsed.GA4_API_SECRET||parsed.INTEGRATIONS_KILL_SWITCH==='true')throw new Error('GA4_LOCAL_TEST_CONFIG_NOT_READY');
 ga4Values={GA4_MEASUREMENT_ID:parsed.GA4_MEASUREMENT_ID,GA4_API_SECRET:parsed.GA4_API_SECRET};
}else if(fixtureGa4)ga4Values={GA4_MEASUREMENT_ID:'G-XJNSBPN8HN',GA4_API_SECRET:'fixture-secret'};
let analyticsMode=analyticsDemo?'mock':'disabled';
let purchaseDb,purchaseOrderId=ORDER;
let mode='mock',saved=0,failSave=false,shortExpiry=false,app,child;
const config={get:(key)=>Object.hasOwn(ga4Values,key)?ga4Values[key]:key==='FEATURE_GA4_ENABLED'||key==='FEATURE_GA4_LOCAL_BROWSER_TEST_ENABLED'?String(liveGa4||fixtureGa4):key==='FEATURE_GA4_LOCAL_FUNNEL_ENABLED'?String(funnelFixture||liveFunnel):key==='GA4_LOCAL_TEST_ORIGIN'?'http://localhost:4400':key==='NODE_ENV'?'test':key==='FEATURE_TURNSTILE_ENABLED'?'true':['FEATURE_SEARCH_CONSOLE_SYNC_ENABLED','FEATURE_PAGESPEED_AUDIT_ENABLED'].includes(key)?String(analyticsDemo):undefined};
let ga4HttpCount=0;const ga4EventNames=[];
const localGa4Service=new LocalDebugEventService(config,loadIntegrationRegistry(config),async(url,options)=>{
 const parsed=new URL(String(url));
 if(parsed.origin!=='https://www.google-analytics.com'||parsed.pathname!=='/mp/collect'||parsed.searchParams.get('measurement_id')!=='G-XJNSBPN8HN')throw new Error('UNEXPECTED_GA4_TARGET');
 if((liveGa4||limitedFunnelFixture)&&ga4HttpCount>=(liveFunnel||limitedFunnelFixture?20:1))throw new LocalGa4TestLimitError();
 ga4HttpCount++;
 ga4EventNames.push(JSON.parse(options.body).events[0].name);
 const response=liveGa4?await fetch(url,options):new Response(null,{status:204});
 console.log(JSON.stringify({event:'ga4_local_test_http',source:liveGa4?'google':'fixture',eventName:ga4EventNames.at(-1),at:new Date().toISOString(),httpStatus:response.status,requests:ga4HttpCount}));
 return response;
});
// Separate synthetic clock for history/cache/regression QA; never changes OS time.
let performanceNow=Date.parse('2026-11-05T00:00:00Z');
const performanceRegistry=loadIntegrationRegistry(config);
const performanceService=new PagespeedService(performanceRegistry,'test',new IntegrationExecutor(performanceRegistry,{},()=>performanceNow),new MockPagespeedAdapter(()=>performanceNow),()=>performanceNow);
let protection;
function resetProtection(){
 const registry=loadIntegrationRegistry({get:(key)=>key==='FEATURE_TURNSTILE_ENABLED'?String(mode!=='disabled'):undefined});
 protection=new ContactProtectionService(registry,'test',new IntegrationExecutor(registry),new MockTurnstileAdapter());
}
resetProtection();
const facade={
 status:()=>mode==='unavailable'?{mode:'unavailable'}:protection.status(),
 issue:(origin)=>{
  if(mode==='unavailable')throw new ServiceUnavailableException('Fixture verification outage');
  const value=protection.issue(origin);
  return shortExpiry?{...value,expiresAt:new Date(Date.now()+1200).toISOString()}:value;
 },
 verify:(token,origin)=>{
  if(mode==='unavailable')throw new ServiceUnavailableException('Fixture verification outage');
  return protection.verify(token,origin);
 },
};
async function stop(){if(child)child.kill('SIGTERM');if(app)await app.close();if(purchaseDb){const db=purchaseDb;purchaseDb=undefined;await db.close();}}
process.once('SIGINT',()=>{void stop().then(()=>process.exit(0));});
process.once('SIGTERM',()=>{void stop().then(()=>process.exit(0));});
(async()=>{
 if(analyticsDemo){
  purchaseDb=await createPurchaseDatabase();
  await seedOrder(purchaseDb,ORDER,{status:'AWAITING_PAYMENT',payment_status:'pending',transaction_code:null});
  await purchaseDb.exec('SET ROLE service_role');
 }
 const purchaseClient={
  auth:{getUser:async token=>({data:{user:token==='seo-admin-fixture'?{id:'seo-admin-fixture'}:token==='purchase-owner-fixture'?{id:OWNER}:token==='purchase-other-fixture'?{id:OTHER}:null},error:null})},
  from:table=>{
   if(table!=='users')throw new Error('REAL_DATABASE_FORBIDDEN');
   return{select:()=>({eq:(_key,id)=>({single:async()=>({data:{role:id==='seo-admin-fixture'?'ADMIN':'CUSTOMER',is_banned:false},error:null})})})};
  },
  rpc:async(name,args)=>{
   if(!purchaseDb||name!=='integration_record_purchase_mock')throw new Error('REAL_DATABASE_FORBIDDEN');
   try{return{data:await capture(purchaseDb,args.p_order_id,args.p_actor_id,args.p_consent),error:null};}
   catch(error){return{data:null,error:{code:error.code,message:'Fixture SQL rejected'}};}
  },
 };
 const module=await Test.createTestingModule({imports:[ContactsModule,AnalyticsModule]})
  .overrideProvider(ConfigService).useValue(config)
  .overrideProvider(SupabaseService).useValue({getClient:()=>{if(analyticsDemo)return purchaseClient;throw new Error('REAL_DATABASE_FORBIDDEN');}})
  .overrideProvider(ContactProtectionService).useValue(facade)
  .overrideProvider(LocalDebugEventService).useValue(localGa4Service)
  .overrideProvider(PagespeedService).useValue(performanceService)
  .overrideProvider(CollectionPolicyService).useValue({isPurchaseEnabled:()=>analyticsDemo,getPolicy:()=>{
   const registry=loadIntegrationRegistry({get:key=>key==='FEATURE_GA4_ENABLED'?String(analyticsMode!=='disabled'):key==='INTEGRATIONS_ENV'&&analyticsMode==='unavailable'?'staging':undefined});
   const policy=new CollectionPolicyService(registry,{get:key=>key==='NODE_ENV'?'test':key==='FEATURE_GA4_PURCHASE_ENABLED'?analyticsDemo:undefined},localGa4Service).getPolicy();if(fixtureGa4&&policy.localDebug)policy.localDebug.fixture=true;return policy;
  }})
  .overrideProvider(AnalyticsService).useValue({getDashboardData:()=>{throw new Error('REAL_DATABASE_FORBIDDEN');}})
  .overrideProvider(ContactsService).useValue({create:async(dto)=>{
   if(failSave){failSave=false;throw new ServiceUnavailableException('Lưu thử nghiệm thất bại. Vui lòng thử lại.');}
   if(Object.hasOwn(dto,'turnstileToken'))throw new Error('TOKEN_MUST_NOT_PERSIST');
   saved++;return{success:true,message:'Fixture saved in memory only'};
  }}).compile();
 app=module.createNestApplication({logger:false});
 app.useBodyParser('json',{limit:'8kb'});
 if(funnelFixture)app.use('/api/__qa/ga4',(_req,res)=>res.json({source:'fixture',requests:ga4HttpCount,names:ga4EventNames,googleRequests:0}));
 if(analyticsDemo)app.use('/api/__qa/pagespeed',(req,res)=>{
  if(req.method==='POST'){
   if(req.headers['x-fixture-control']!=='1')return res.status(403).json({error:'FIXTURE_ONLY'});
   if(req.body?.advanceDay!==true||Object.keys(req.body).length!==1)return res.status(400).json({error:'INVALID_FIXTURE_CONTROL'});
   performanceNow+=86400000;
  }
  res.json({source:'fixture',now:new Date(performanceNow).toISOString(),remoteRequests:0,externalDatabaseWrites:0});
 });
 if(analyticsDemo)app.use('/api/__qa/purchase',async(req,res)=>{
  try{
   if(req.method==='POST'){
    if(req.headers['x-fixture-control']!=='1')return res.status(403).json({error:'FIXTURE_ONLY'});
    if(req.body?.fresh===true){
     purchaseOrderId=randomUUID();
     await seedOrder(purchaseDb,purchaseOrderId,{status:'AWAITING_PAYMENT',payment_status:'pending',transaction_code:null});
    }
    const state=req.body?.state;
    const mapping={pending:['AWAITING_PAYMENT','pending',null],paid:['PAID','paid','synthetic-payment-'+purchaseOrderId],
      refunded:['PAID','refunded','synthetic-payment-'+purchaseOrderId],cancelled:['CANCELED','paid','synthetic-payment-'+purchaseOrderId]};
    if(state!==undefined&&!Object.hasOwn(mapping,state))return res.status(400).json({error:'INVALID_FIXTURE_STATE'});
    if(state)await purchaseDb.query('UPDATE orders SET status=$2,payment_status=$3,transaction_code=$4 WHERE id=$1',[purchaseOrderId,...mapping[state]]);
   }
   const source=(await purchaseDb.query('SELECT status,payment_status FROM orders WHERE id=$1',[purchaseOrderId])).rows[0];
   const tx='gp_mock_v1_'+createHash('sha256').update('ga4:purchase:v1:'+purchaseOrderId).digest('hex');
   const events=(await purchaseDb.query("SELECT payload FROM integration_outbox WHERE provider='ga4' AND payload->>'transaction_id'=$1",[tx])).rows.map(row=>row.payload);
   const used=Number((await purchaseDb.query("SELECT coalesce(sum(used),0) AS n FROM integration_usage_daily WHERE provider='ga4'")).rows[0].n);
   res.json({source:'fixture',orderId:purchaseOrderId,...source,events,used,remoteRequests:0,externalDatabaseWrites:0});
  }catch{res.status(503).json({error:'FIXTURE_UNAVAILABLE'});}
 });
 app.use('/__qa',(req,res)=>{
  if(req.method==='POST'){
   if(req.headers['x-fixture-control']!=='1')return res.status(403).json({error:'FIXTURE_ONLY'});
   if(['mock','disabled','unavailable'].includes(req.body?.mode)){mode=req.body.mode;resetProtection();}
   if(typeof req.body?.failSave==='boolean')failSave=req.body.failSave;
   if(typeof req.body?.shortExpiry==='boolean')shortExpiry=req.body.shortExpiry;
   if(['mock','disabled','unavailable'].includes(req.body?.analyticsMode))analyticsMode=req.body.analyticsMode;
  }
  res.json({mode,saved,failSave,shortExpiry,analyticsMode,remoteRequests:0,databaseWrites:0});
 });
 app.use((req,res,next)=>{
  if(req.path.startsWith('/api/categories'))return res.json([]);
  if(analyticsDemo&&req.path.startsWith('/api/products')){
   const product={id:'00000000-0000-4000-8000-000000000001',slug:'analytics-fixture',price:100000,
    images:['/brand/mark.svg'],quantity:100,stock:100,is_active:true,translation:{title:'Sản phẩm mẫu / Sample item',description:'Dữ liệu thử nghiệm tại máy.'},
    variants:[],created_at:'2026-11-01T00:00:00Z',updated_at:'2026-11-01T00:00:00Z'};
   return res.json(req.path==='/api/products'?{data:[product],meta:{total:1,page:1,limit:12,last_page:1}}:product);
  }
  if(analyticsDemo&&req.path.startsWith('/api/reviews/'))return res.json({data:[],meta:{total:0,average:0,distribution:{}}});
  if(analyticsDemo&&req.path==='/api/shipping/status')return res.json({checkoutEnabled:false});
  if(analyticsDemo&&req.path.startsWith('/api/fixture-addresses')){
   if(req.path.includes('/p/'))return res.json({districts:[{code:10,name:'Quận mẫu'}]});
   if(req.path.includes('/d/'))return res.json({wards:[{code:100,name:'Phường mẫu'}]});
   return res.json([{code:1,name:'Tỉnh mẫu'}]);
  }
  if(req.path.startsWith('/auth/'))return res.status(401).json({error:'Fixture auth disabled'});
  next();
 });
 app.useGlobalPipes(new ValidationPipe({whitelist:true,forbidNonWhitelisted:true,transform:true}));
 app.setGlobalPrefix('api');
 await app.listen(apiPort,'127.0.0.1');
 const webRoot=path.resolve(__dirname,'../../web');
 const scratch=fs.mkdtempSync(path.join(os.tmpdir(),'tram-contact-qa-'));
 for(const name of ['src','package.json','tsconfig.json','next.config.ts','postcss.config.mjs','tailwind.config.ts']){
  if(fs.existsSync(path.join(webRoot,name)))fs.cpSync(path.join(webRoot,name),path.join(scratch,name),{recursive:true});
 }
 fs.symlinkSync(path.join(webRoot,'node_modules'),path.join(scratch,'node_modules'),'dir');
 fs.symlinkSync(path.join(webRoot,'public'),path.join(scratch,'public'),'dir');
 if(analyticsDemo){
  for(const relative of ['src/components/zen/ZenCheckout.tsx','src/components/traditional/checkout/TraditionalLocationSelector.tsx','src/components/checkout/LocationSelector.tsx']){
   const target=path.join(scratch,relative);
   fs.writeFileSync(target,fs.readFileSync(target,'utf8').replaceAll('https://provinces.open-api.vn/api/','/api/fixture-addresses/'));
  }
  const lab=path.join(scratch,'src/app/[locale]/integration-lab/analytics');
  fs.mkdirSync(lab,{recursive:true});
  fs.copyFileSync(path.join(webRoot,'scripts/fixtures/analytics-lab.tsx'),path.join(lab,'page.tsx'));
 }
 const fonts=path.join(scratch,'font-fixtures.cjs');
 fs.writeFileSync(fonts,`module.exports = new Proxy({}, {get: () => '@font-face{font-family:"Fixture";src:local("Arial");font-style:normal;font-weight:100 900;}'});\n`);
 child=spawn(process.execPath,[path.join(webRoot,'node_modules/next/dist/bin/next'),'dev','--webpack','--hostname','127.0.0.1','--port',String(webPort)],{
  cwd:scratch,stdio:'inherit',env:{PATH:process.env.PATH,NODE_ENV:'development',NEXT_TELEMETRY_DISABLED:'1',
   NEXT_PUBLIC_API_URL:`http://127.0.0.1:${apiPort}`,NEXT_PUBLIC_BASE_URL:`http://localhost:${webPort}`,
   NEXT_PUBLIC_SUPABASE_URL:`http://127.0.0.1:${apiPort}`,NEXT_PUBLIC_SUPABASE_ANON_KEY:'fixture-anon-key',
   NEXT_FONT_GOOGLE_MOCKED_RESPONSES:fonts},
 });
 child.once('exit',()=>{void app.close();});
 console.log(`CONTACT_QA http://localhost:${webPort}/vi/contact API_FIXTURE http://127.0.0.1:${apiPort}/__qa`);
 if(analyticsDemo)console.log(`ANALYTICS_QA http://localhost:${webPort}/vi/integration-lab/analytics`);
})().catch(async(error)=>{console.error(error.message);await stop();process.exitCode=1;});
