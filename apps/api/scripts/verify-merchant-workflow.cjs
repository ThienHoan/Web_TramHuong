// Actual TS queue/repository/consumer + exact SQL. Synthetic source, no network.
require('ts-node/register/transpile-only');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {ConfigService} = require('@nestjs/config');
const {createPurchaseDatabase,PRODUCT} = require('./fixtures/purchase-database.cjs');
const {loadIntegrationRegistry} = require('../src/integrations/integrations.config');
const {IntegrationRepository} = require('../src/integrations/integration.repository');
const {MockDeliveryConsumer} = require('../src/integrations/mock-delivery.consumer');
const {MerchantDeliveryService} = require('../src/merchant/merchant-delivery.service');
(async () => {
  const db = await createPurchaseDatabase(); let checks=0, simulations=0, unknown=false;
  const equal=(a,b)=>{assert.deepEqual(a,b);checks++;};
  const sql=fs.readFileSync(path.join(__dirname,'../migrations/integration-merchant-queue.sql'),'utf8');
  try {
    await db.exec(sql);
    // P8-03: drain now requires the per-product send fence.
    await db.exec(fs.readFileSync(path.join(__dirname,'../migrations/integration-merchant-fence.sql'),'utf8'));
    const metadata=fs.readFileSync(path.join(__dirname,'../../../docs/integrations/verify-installed-delivery-features.sql'),'utf8');
    equal((await db.query(metadata)).rows.map(r=>r.status),['CHUA_CAI','PASS','PASS','CHUA_CAI','CHUA_CAI']);
    const product={id:PRODUCT,slug:'fixture',is_active:true,price:200000,quantity:3,
      images:['https://cdn.example.org/photo.webp'],variants:null,discount_percentage:0,
      discount_start_date:null,discount_end_date:null,
      translations:[{locale:'vi',title:'Vòng tay',description:'Sản phẩm mẫu'}]};
    let current=structuredClone(product);
    await db.exec('SET ROLE service_role');
    const client={rpc:async(name,a)=>{
      const defs={
        integration_enqueue_merchant_mock:['SELECT integration_enqueue_merchant_mock($1,$2,$3) AS r',[a.p_product_id,a.p_action,a.p_fingerprint]],
        integration_merchant_is_current_mock:['SELECT integration_merchant_is_current_mock($1,$2,$3) AS r',[a.p_product_id,a.p_generation,a.p_fingerprint]],
        integration_claim:['SELECT * FROM integration_claim($1,$2,$3,$4)',[a.p_provider,a.p_environment,a.p_limit,a.p_lease_seconds]],
        integration_reserve_usage:['SELECT integration_reserve_usage($1,$2,$3,$4,$5) AS r',[a.p_provider,a.p_environment,a.p_metric,a.p_amount,a.p_hard_limit]],
        integration_finish:['SELECT integration_finish($1,$2,$3,$4,$5,$6) AS r',[a.p_id,a.p_lease_token,a.p_version,a.p_outcome,null,a.p_error_code??null]],
        integration_merchant_fence_ready_mock:['SELECT integration_merchant_fence_ready_mock() AS r',[]],
        integration_merchant_begin_send_mock:['SELECT integration_merchant_begin_send_mock($1,$2,$3) AS r',[a.p_id,a.p_lease_token,a.p_version]],
        integration_merchant_end_send_mock:['SELECT integration_merchant_end_send_mock($1,$2) AS r',[a.p_fence_token,a.p_outcome]],
        integration_merchant_defer_mock:['SELECT integration_merchant_defer_mock($1,$2,$3) AS r',[a.p_id,a.p_lease_token,a.p_version]],
      };
      assert.ok(defs[name]);
      try {const r=await db.query(...defs[name]);return {data:name==='integration_claim'?r.rows:r.rows[0]?.r,error:null};}
      catch(e){return {data:null,error:{code:e.code,message:'Fixture rejected'}};}
    }};
    const config=new ConfigService({NODE_ENV:'test',FEATURE_MERCHANT_OUTBOX_ENABLED:'true',
      FEATURE_MERCHANT_SYNC_ENABLED:'true',FRONTEND_URL:'https://shop.example.org'});
    const registry=loadIntegrationRegistry(config),repo=new IntegrationRepository({getClient:()=>client});
    const make=()=>new MerchantDeliveryService(registry,config,
      {findById:async()=>structuredClone(current)},repo,new MockDeliveryConsumer(registry,repo),
      async()=>{simulations++;if(unknown)throw new Error('SYNTHETIC_UNKNOWN');});
    let service=make();
    await Promise.all(Array.from({length:6},()=>service.queue([PRODUCT])));
    equal((await db.query("SELECT count(*)::int AS n FROM integration_outbox WHERE provider='merchant'")).rows[0].n,1);
    equal((await service.drain()).accepted,1);equal(simulations,1);
    current.price=300000;await service.queue([PRODUCT]);
    current.price=200000;await service.queue([PRODUCT]);
    equal((await db.query("SELECT (payload->>'generation')::int AS g FROM integration_outbox WHERE provider='merchant' ORDER BY g")).rows,[{g:1},{g:2},{g:3}]);
    // New process, same DB: B stale, returned A must be a new accepted generation.
    service=make();equal((await service.drain()).accepted,1);equal(simulations,2);
    equal((await db.query("SELECT state FROM integration_outbox WHERE provider='merchant' ORDER BY (payload->>'generation')::int")).rows.map(r=>r.state),['ACCEPTED','DEAD','ACCEPTED']);
    await service.queue([PRODUCT]);equal((await service.drain()).claimed,0);equal(simulations,2);
    // An older matching-content A is also rejected if a newer generation exists.
    const fp=(await db.query("SELECT payload->>'fingerprint' AS f FROM integration_outbox WHERE payload->>'generation'='1'")).rows[0].f;
    equal(await repo.merchantIsCurrentMock(PRODUCT,1,fp),false);
    current.is_active=false;await service.queue([PRODUCT]);unknown=true;
    equal((await service.drain()).accepted,0);equal(simulations,3);
    equal((await db.query("SELECT state FROM integration_outbox WHERE payload->>'generation'='4'")).rows[0].state,'UNKNOWN');
    service=make();await service.queue([PRODUCT]);equal((await service.drain()).claimed,0);equal(simulations,3);
    equal((await db.query("SELECT used::int FROM integration_usage_daily WHERE provider='merchant' AND metric='requests'")).rows[0].used,4);
    for(const role of ['anon','authenticated']){
      await db.exec('RESET ROLE; SET ROLE '+role);
      for(const q of ["SELECT integration_enqueue_merchant_mock($1,'upsert',$2)","SELECT integration_merchant_is_current_mock($1,1,$2)"]){
        await assert.rejects(db.query(q,[PRODUCT,fp]),e=>e.code==='42501');checks++;
      }
    }
    await db.exec('RESET ROLE');
    await db.exec(fs.readFileSync(path.join(__dirname,'../migrations/integration-merchant-queue.pause.sql'),'utf8'));
    equal((await db.query(metadata)).rows.map(r=>r.status),['CHUA_CAI','FAIL','FAIL','CHUA_CAI','CHUA_CAI']);
    await db.exec('SET ROLE service_role');
    await assert.rejects(db.query("SELECT integration_enqueue_merchant_mock($1,'upsert',$2)",[PRODUCT,fp]),e=>e.code==='42501');checks++;
    equal((await db.query("SELECT count(*)::int AS n FROM integration_outbox WHERE provider='merchant'")).rows[0].n,4);
    const report={batch:'P8-02b',result:'PASS',checks,exactSql:true,realTsQueueRepositoryConsumer:true,
      source:'synthetic_products_service',abaGenerations:true,restartDeduplication:true,
      unknownNotRetried:true,enqueueSerialization:'postgres_advisory_lock_not_live_delivery_fencing',
      simulations,googleCalls:0,hostedWrites:0};
    if(process.env.MERCHANT_WORKFLOW_REPORT)fs.writeFileSync(process.env.MERCHANT_WORKFLOW_REPORT,JSON.stringify(report,null,2)+'\n');
    console.log(JSON.stringify(report));
  } finally {await db.close();}
})().catch(()=>{console.error('MERCHANT_WORKFLOW_FAILED');process.exitCode=1;});
