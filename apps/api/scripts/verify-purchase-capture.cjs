const assert = require('node:assert/strict');
const { mkdtempSync, readFileSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join } = require('node:path');
const { createHash } = require('node:crypto');
const { createPurchaseDatabase, seedOrder, capture, OWNER, OTHER, ORDER, PRODUCT } = require('./fixtures/purchase-database.cjs');
const id = n => '20000000-0000-4000-8000-'+String(n).padStart(12,'0');
(async () => {
  const directory=mkdtempSync(join(tmpdir(),'tram-purchase-sql-'));
  let db=await createPurchaseDatabase(directory), checks=0, roundingCases=0;
  const eq=(a,b)=>{assert.deepEqual(a,b);checks++;};
  const rejects=async(fn,code)=>{await assert.rejects(fn,e=>e.code===code);checks++;};
  const count=async()=>Number((await db.query("SELECT count(*) AS n FROM integration_outbox WHERE event_type='purchase'")).rows[0].n);
  const usage=async()=>Number((await db.query("SELECT coalesce(sum(used),0) AS n FROM integration_usage_daily WHERE provider='ga4'")).rows[0].n);
  try {
    await seedOrder(db);
    const metadata=readFileSync(join(__dirname,'../../../docs/integrations/verify-installed-purchase.sql'),'utf8');
    eq((await db.query(metadata)).rows.map(row=>row.status),['PASS','PASS','PASS']);
    const original=(await db.query('SELECT row_to_json(o) AS r FROM orders o WHERE id=$1',[ORDER])).rows[0].r;
    eq((await db.query("SELECT has_function_privilege('anon','integration_record_purchase_mock(uuid,uuid,boolean)','EXECUTE') AS a,has_function_privilege('authenticated','integration_record_purchase_mock(uuid,uuid,boolean)','EXECUTE') AS b,has_function_privilege('service_role','integration_record_purchase_mock(uuid,uuid,boolean)','EXECUTE') AS c")).rows[0],{a:false,b:false,c:true});
    for(const role of ['anon','authenticated']) {
      await db.exec('SET ROLE '+role); await rejects(()=>capture(db),'42501'); await db.exec('RESET ROLE');
    }
    await db.exec('SET ROLE service_role');
    await rejects(()=>capture(db,ORDER,OTHER),'PT404');
    await rejects(()=>capture(db,ORDER,OWNER,false),'22023');
    await rejects(()=>capture(db,ORDER,null),'22023');
    const first=await capture(db);
    eq(first.status,'recorded');eq(first.source,'mock');
    eq(first.transactionId,'gp_mock_v1_'+createHash('sha256').update('ga4:purchase:v1:'+ORDER).digest('hex'));
    eq((await capture(db)).status,'duplicate'); eq(await count(),1); eq(await usage(),1);
    const event=(await db.query("SELECT * FROM integration_outbox WHERE event_type='purchase'")).rows[0];
    eq(event.state,'ACCEPTED');eq(event.attempts,1);eq(event.environment,'mock');
    eq(event.payload.value,200000);eq(event.payload.shipping,30000);eq(event.payload.tax,0);eq(event.payload.currency,'VND');
    eq(event.payload.items.reduce((s,i)=>s+Math.round(i.price*100)*i.quantity,0),20000000);
    eq(event.payload.items.length,2);
    eq(JSON.stringify(event.payload).includes('PRIVATE'),false);
    eq(JSON.stringify(event.payload).includes('private@example.invalid'),false);
    eq(JSON.stringify(event.payload).includes('fixture-payment'),false);
    eq(first.transactionId.includes(ORDER),false);
    eq((await db.query('SELECT row_to_json(o) AS r FROM orders o WHERE id=$1',[ORDER])).rows[0].r,original);
    const repeated=await Promise.all(Array.from({length:12},()=>capture(db)));
    eq(repeated.every(r=>r.status==='duplicate'),true);eq(await count(),1);eq(await usage(),1);
    // Outbox must never enqueue this accepted mock receipt for a later worker.
    eq((await db.query("SELECT count(*)::int AS n FROM integration_claim('ga4','mock',10,5)")).rows[0].n,0);
    await db.exec('RESET ROLE');
    let sequence=2;
    for(const patch of [
      {payment_status:'pending'},{payment_status:'refunded'},{status:'CANCELED'},{status:'EXPIRED'},
      {payment_method:'cod'},{transaction_code:null},{transaction_code:' '},{status:'PENDING'},
    ]) {
      const key=id(sequence++);await seedOrder(db,key,patch);eq((await capture(db,key)).status,'not_eligible');
    }
    eq(await count(),1);
    for(const patch of [
      {total:1},{total:null},{total:-1},{voucher_discount_amount:-1},{voucher_discount_amount:300000},
      {shipping_info:{}},{shipping_info:{shipping_fee:'30000'}},{items:[]},{items:{}},
      {items:[{productId:PRODUCT,quantity:1,price:-1}]},
      {items:[{productId:PRODUCT,quantity:1.5,price:100}]},
      {items:[{productId:'private@example.invalid',quantity:1,price:100}]},
      {items:[{productId:PRODUCT,quantity:0,price:100}]},
      {items:Array(101).fill({productId:PRODUCT,quantity:1,price:100})},
    ]) {
      const key=id(sequence++);await seedOrder(db,key,patch);await rejects(()=>capture(db,key),'PT422');
    }
    const shared=id(sequence++);await seedOrder(db,shared,{transaction_code:'fixture-payment-'+ORDER});
    await rejects(()=>capture(db,shared),'PT409');eq(await count(),1);eq(await usage(),1);
    await db.query('UPDATE orders SET total=total+1 WHERE id=$1',[ORDER]);
    await rejects(()=>capture(db),'PT422');
    await db.query('UPDATE orders SET total=total-1,transaction_code=$2 WHERE id=$1',[ORDER,'changed-payment']);
    await rejects(()=>capture(db),'PT409');
    await db.query('UPDATE orders SET transaction_code=$2 WHERE id=$1',[ORDER,'fixture-payment-'+ORDER]);
    const limited=id(sequence++);await seedOrder(db,limited);
    await db.query("UPDATE integration_usage_daily SET used=100 WHERE provider='ga4'");
    await rejects(()=>capture(db,limited),'PT429');eq(await count(),1);eq(await usage(),100);
    eq((await capture(db)).status,'duplicate');eq(await usage(),100);
    await db.query("UPDATE integration_usage_daily SET used=1 WHERE provider='ga4'");
    for(let i=0;i<40;i++){
      await db.exec('BEGIN');
      const key=id(sequence++), a=(i%8)*13, b=(i%3)*71, qa=i%7+1,qb=i%5+1;
      const subtotal=a*qa+b*qb, discount=subtotal?i%(subtotal+1):0, shipping=i%4;
      await seedOrder(db,key,{total:(subtotal-discount+shipping)/100,voucher_discount_amount:discount/100,
        shipping_info:{shipping_fee:shipping/100},items:[{productId:PRODUCT,price:a/100,quantity:qa},{product_id:'SKU_B',price:b/100,quantity:qb}]});
      const result=await capture(db,key);
      assert.equal(result.status,'recorded');
      const payload=(await db.query('SELECT payload FROM integration_outbox WHERE payload->>\'transaction_id\'=$1',[result.transactionId])).rows[0].payload;
      assert.equal(Math.round(payload.value*100),subtotal-discount);
      assert.equal(payload.items.reduce((s,x)=>s+Math.round(x.price*100)*x.quantity,0),subtotal-discount);
      assert.equal(payload.items.every(x=>x.price>=0&&Number.isInteger(x.quantity)&&x.quantity>0),true);
      assert.ok(payload.items.length<=4); roundingCases++;
      await db.exec('ROLLBACK');
    }
    eq(await count(),1);
    // Exact SQL is first-install only, repeat refusal leaves existing state intact.
    await rejects(()=>db.exec(readFileSync(join(__dirname,'../migrations/integration-purchase-capture.sql'),'utf8')),'42P07');
    await db.exec('ROLLBACK');eq(await count(),1);
    await db.close();db=await createPurchaseDatabase(directory);
    eq((await capture(db)).status,'duplicate');eq(await count(),1);eq(await usage(),1);
    await db.exec(readFileSync(join(__dirname,'../migrations/integration-purchase-capture.pause.sql'),'utf8'));
    await db.exec('SET ROLE service_role');await rejects(()=>capture(db),'42501');eq(await count(),1);
    eq((await db.query(metadata)).rows.map(row=>row.status),['FAIL','PASS','PASS']);
    console.log(JSON.stringify({batch:'P2-01b',engine:'PostgreSQL local fixture',checks,roundingCases,persistence:'PASS',pause:'PASS',remoteRequests:0,productionWrites:0}));
  } finally { await db.close(); }
})().catch(e=>{console.error(e);process.exitCode=1;});
