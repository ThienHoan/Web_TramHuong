// Only targets the disposable localhost fixture; never reads project .env.
const assert=require('node:assert/strict');
const base='http://127.0.0.1:4401';
let checks=0;
async function request(path,body,token,headers={}){
  const response=await fetch(base+path,{method:body===undefined?'GET':'POST',
    headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{}),...headers},
    ...(body===undefined?{}:{body:JSON.stringify(body)}),signal:AbortSignal.timeout(10000)});
  return{status:response.status,value:await response.json()};
}
async function source(body){
  const result=await request('/api/__qa/purchase',body,undefined,{'x-fixture-control':'1'});
  assert.equal(result.status,200);assert.equal(result.value.source,'fixture');
  assert.equal(result.value.remoteRequests,0);assert.equal(result.value.externalDatabaseWrites,0);return result.value;
}
async function expect(path,body,token,status){
  const result=await request(path,body,token);assert.equal(result.status,status,JSON.stringify(result.value));checks++;return result.value;
}
(async()=>{
  const fresh=await source({fresh:true,state:'pending'});
  const endpoint='/api/analytics/purchases/'+fresh.orderId;
  await expect(endpoint,{consent:'granted'},undefined,401);
  await expect(endpoint,{consent:'granted'},'purchase-other-fixture',404);
  await expect(endpoint,{consent:'granted',payment_status:'paid',total:1},'purchase-owner-fixture',400);
  assert.equal((await expect(endpoint,{consent:'granted'},'purchase-owner-fixture',201)).status,'not_eligible');checks++;
  assert.equal((await source()).events.length,0);checks++;
  await source({state:'paid'});
  const results=await Promise.all(Array.from({length:6},()=>expect(endpoint,{consent:'granted'},'purchase-owner-fixture',201)));
  assert.equal(results.filter(r=>r.status==='recorded').length,1);checks++;
  assert.equal(results.filter(r=>r.status==='duplicate').length,5);checks++;
  const recorded=await source();
  assert.equal(recorded.events.length,1);checks++;
  assert.equal(recorded.used-fresh.used,1);checks++;
  assert.equal(recorded.events[0].value,200000);checks++;
  assert.equal(recorded.events[0].shipping,30000);checks++;
  assert.equal(recorded.events[0].items.reduce((s,i)=>s+Math.round(i.price*100)*i.quantity,0),20000000);checks++;
  assert.equal(JSON.stringify(recorded.events).includes('PRIVATE'),false);checks++;
  await source({state:'paid'}); // replayed source confirmation
  assert.equal((await expect(endpoint,{consent:'granted'},'purchase-owner-fixture',201)).status,'duplicate');checks++;
  assert.equal((await source()).events.length,1);checks++;
  await source({state:'refunded'});
  assert.equal((await expect(endpoint,{consent:'granted'},'purchase-owner-fixture',201)).status,'not_eligible');checks++;
  assert.equal((await source()).events.length,1);checks++;
  console.log(JSON.stringify({batch:'P2-01b',checks,purchaseRows:1,concurrentCaptures:6,quotaDelta:1,remoteRequests:0,externalDatabaseWrites:0}));
})().catch(error=>{console.error(error.message);process.exitCode=1;});
