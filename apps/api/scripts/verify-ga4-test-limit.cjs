// Only the disposable loopback fixture; refuses live or absent QA metadata.
const assert = require('node:assert/strict');
const {randomUUID} = require('node:crypto');
const base = 'http://127.0.0.1:4401/api';
(async()=>{
 const before=await (await fetch(base+'/__qa/ga4')).json();
 assert.equal(before.source,'fixture');assert.equal(before.googleRequests,0);assert.equal(before.requests,0,'Start a fresh capped fixture process');
 const send=async(body)=>{
  const response=await fetch(base+'/analytics/local-debug-event/funnel',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer seo-admin-fixture',Origin:'http://localhost:4400'},body:JSON.stringify(body)});
  assert.equal(response.status,201);return response.json();
 };
 const body=()=>({consent:'granted',eventId:randomUUID(),clientId:'123.456',sessionId:123,name:'add_to_cart',parameters:{currency:'VND',value:200000,items:[{item_id:'SKU_A',price:100000,quantity:2}]}});
 for(let i=0;i<20;i++)assert.equal((await send(body())).status,'accepted');
 const exhausted=body();assert.deepEqual(await send(exhausted),{source:'google_measurement_protocol',status:'blocked',reason:'test_limit',duplicate:false,ingestionVerified:false});
 assert.deepEqual(await send(exhausted),{source:'google_measurement_protocol',status:'blocked',reason:'test_limit',duplicate:true,ingestionVerified:false});
 const after=await (await fetch(base+'/__qa/ga4')).json();assert.equal(after.requests,20);assert.equal(after.googleRequests,0);
 console.log(JSON.stringify({acceptedFakeRequests:20,blockedNewIntent:1,blockedDuplicate:1,googleRequests:0}));
})().catch(error=>{console.error(error.message);process.exitCode=1;});
