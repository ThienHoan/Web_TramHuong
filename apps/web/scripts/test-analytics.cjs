// Compile only the pure analytics contract/state machine; never load Next/.env.
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const ts = require('typescript');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'tram-ga4-tests-'));
for (const name of ['contract', 'tracker', 'purchase', 'local-debug', 'local-funnel']) {
  const source = fs.readFileSync(path.join(__dirname, `../src/lib/ga4/${name}.ts`), 'utf8');
  fs.writeFileSync(path.join(scratch, `${name}.js`), ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText);
}
const { ecommerceParameters, cartAnalyticsItems, FUNNEL_EVENTS } = require(path.join(scratch, 'contract.js'));
const { AnalyticsTracker } = require(path.join(scratch, 'tracker.js'));
const { captureServerPurchase } = require(path.join(scratch, 'purchase.js'));
const item = { item_id: '00000000-0000-4000-8000-000000000001', price: 100000, quantity: 2 };
const params = { items: [item] };
function fixture() {
  const values = new Map(); let now = 1000000000;
  const storage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
  const tracker = new AnalyticsTracker(() => storage, () => now);
  return { tracker, storage, values, advance: ms => { now += ms; } };
}
for (const name of FUNNEL_EVENTS) test(`GA4 ${name}: VND and item subtotal`, () => {
  assert.deepEqual(ecommerceParameters(name, params), { currency: 'VND', value: 200000, items: [item] });
});
test('drops all unapproved PII and payment fields including nested objects', () => {
  const result = ecommerceParameters('add_to_cart', { ...params, email: 'private@example.invalid', user_id: 'private', page_location: '/?token=private', coupon: 'EMAIL_PRIVATE', shipping_info: { address: 'private' }, transaction_code: 'private', items: [{ ...item, item_name: 'private@example.invalid', phone: '0356176878', user: { name: 'private' } }] });
  assert.deepEqual(result, { currency: 'VND', value: 200000, items: [item] });
  assert.equal(JSON.stringify(result).includes('private'), false);
});
test('cart projection picks only product ID, price, quantity, variant ID', () => {
  assert.deepEqual(cartAnalyticsItems([{ id: 'SKU_A', price: 5, quantity: 2, variantId: 'VARIANT_A', title: 'private', key: 'servercartid', email: 'private' }]), [{ item_id: 'SKU_A', price: 5, quantity: 2, item_variant: 'VARIANT_A' }]);
});
for (const [label, input] of [
  ['empty', { items: [] }], ['too many', { items: Array(201).fill(item) }],
  ['currency', { ...params, currency: 'USD' }], ['wrong value', { ...params, value: 200001 }],
  ['email item ID', { items: [{ ...item, item_id: 'private@example.invalid' }] }],
  ['phone item ID', { items: [{ ...item, item_id: '0356176878' }] }],
  ['invalid variant', { items: [{ ...item, item_variant: 'name@example.invalid' }] }],
  ['negative', { items: [{ ...item, price: -1 }] }], ['NaN', { items: [{ ...item, price: NaN }] }],
  ['string price', { items: [{ ...item, price: '1000' }] }], ['zero quantity', { items: [{ ...item, quantity: 0 }] }],
  ['fraction quantity', { items: [{ ...item, quantity: 1.5 }] }], ['infinite', { items: [{ ...item, price: Infinity }] }],
]) test(`rejects ${label}`, () => assert.equal(ecommerceParameters('add_to_cart', input), null));
test('shipping/payment use enums, raw address and bank fields never pass', () => {
  assert.equal(ecommerceParameters('add_shipping_info', { ...params, shipping_tier: 'private address' }).shipping_tier, undefined);
  assert.equal(ecommerceParameters('add_payment_info', { ...params, payment_type: 'sepay' }).payment_type, 'sepay');
  assert.equal(ecommerceParameters('view_item', { ...params, payment_type: 'sepay' }).payment_type, undefined);
});
test('purchase/refund unsupported: URL success or client payment status cannot emit revenue', () => {
  for (const name of ['purchase', 'refund', 'page_view']) assert.equal(ecommerceParameters(name, { ...params, payment_status: 'paid', transaction_id: 'anything' }), null);
  const { tracker } = fixture(); tracker.configure('mock'); tracker.setConsent('granted');
  assert.equal(tracker.track('purchase', params), false); assert.equal(tracker.getSnapshot().events.length, 0);
});
test('default off, unavailable and privacy signals never collect', () => {
  const { tracker } = fixture();
  assert.equal(tracker.track('view_item', params), false);
  for (const mode of ['disabled','unavailable']) { tracker.configure(mode); assert.equal(tracker.setConsent('granted'), false); assert.equal(tracker.track('view_item', params), false); }
  tracker.configure('mock', true); assert.equal(tracker.setConsent('granted'), false); assert.equal(tracker.track('view_item', params), false);
});
test('no buffer before consent; accepting does not backfill prior actions', () => {
  const { tracker } = fixture(); tracker.configure('mock');
  tracker.track('add_to_cart', params); assert.equal(tracker.getSnapshot().events.length, 0);
  tracker.setConsent('granted'); assert.equal(tracker.getSnapshot().events.length, 0);
  assert.equal(tracker.track('add_to_cart', params), true);
  assert.equal(tracker.getSnapshot().events[0].source, 'mock');
});
test('revocation clears buffer and prevents subsequent collection', () => {
  const { tracker } = fixture(); tracker.configure('mock'); tracker.setConsent('granted'); tracker.track('view_item', params);
  tracker.setConsent('denied'); assert.equal(tracker.getSnapshot().events.length, 0); assert.equal(tracker.track('view_item', params), false);
});
test('only versioned preference persists; expires and corrupt preferences deny collection', () => {
  const { tracker, storage, values, advance } = fixture(); tracker.configure('mock'); tracker.setConsent('granted'); tracker.track('add_to_cart', params);
  assert.equal(values.size, 1); assert.deepEqual(Object.keys(JSON.parse([...values.values()][0])).sort(), ['choice','expiresAt','version']);
  const reloaded = new AnalyticsTracker(() => storage, () => 1000000000); reloaded.configure('mock'); assert.equal(reloaded.getSnapshot().consent, 'granted'); assert.equal(reloaded.getSnapshot().events.length, 0);
  advance(181 * 86400000); tracker.configure('mock'); assert.equal(tracker.getSnapshot().consent, 'unknown');
  storage.setItem('tram.analytics-consent.v1', '{bad'); tracker.configure('mock'); assert.equal(tracker.getSnapshot().consent, 'unknown');
});
test('storage unavailable fails closed without throwing', () => {
  const tracker = new AnalyticsTracker(() => { throw new Error('blocked'); }); tracker.configure('mock');
  assert.equal(tracker.setConsent('granted'), false); assert.equal(tracker.getSnapshot().consent, 'denied'); assert.equal(tracker.track('view_item', params), false);
});
test('revocation in another tab and preference removal clear this tab without affecting cart state', () => {
  const { tracker, storage, values } = fixture();
  tracker.configure('mock'); tracker.setConsent('granted'); tracker.track('view_item', params);
  const other = new AnalyticsTracker(() => storage, () => 1000000000); other.configure('mock'); other.setConsent('denied');
  tracker.syncConsent(); assert.equal(tracker.getSnapshot().consent, 'denied'); assert.equal(tracker.getSnapshot().events.length, 0);
  tracker.setConsent('granted'); values.clear(); tracker.syncConsent();
  assert.equal(tracker.getSnapshot().consent, 'unknown'); assert.equal(tracker.track('view_item', params), false);
});
test('consent expiration blocks further actions even without reloading the page', () => {
  const { tracker, advance } = fixture(); tracker.configure('mock'); tracker.setConsent('granted'); tracker.track('view_item', params);
  advance(181 * 86400000); assert.equal(tracker.track('add_to_cart', params), false);
  assert.equal(tracker.getSnapshot().consent, 'unknown'); assert.equal(tracker.getSnapshot().events.length, 0);
});
test('effect dedupe and immutable payloads cannot retain a mutable cart reference', () => {
  const { tracker } = fixture(); tracker.configure('mock'); tracker.setConsent('granted');
  const mutable = { items: [{ ...item }] }; assert.equal(tracker.track('view_item', mutable, 'pdp1'), true);
  assert.equal(tracker.track('view_item', mutable, 'pdp1'), false); mutable.items[0].price = 1;
  assert.equal(tracker.getSnapshot().events[0].parameters.items[0].price, 100000);
  assert.ok(Object.isFrozen(tracker.getSnapshot().events[0].parameters.items[0]));
});
test('mock rate limit and bounded RAM buffer', () => {
  const { tracker, advance } = fixture(); tracker.configure('mock'); tracker.setConsent('granted');
  for (let index = 0; index < 60; index++) assert.equal(tracker.track('view_item', params), true);
  assert.equal(tracker.track('view_item', params), false);
  for (let minute = 0; minute < 8; minute++) { advance(60000); for (let n = 0; n < 60; n++) tracker.track('view_item', params); }
  assert.equal(tracker.getSnapshot().events.length, 200); assert.equal(tracker.track('view_item', params), false);
  advance(86400000); assert.equal(tracker.track('view_item', params), true);
});
test('diagnostics failure cannot throw into business action', () => {
  const { tracker } = fixture(); tracker.subscribe(() => { throw new Error('viewer'); });
  tracker.configure('mock'); tracker.setConsent('granted'); assert.equal(tracker.track('add_to_cart', params), true);
});
const purchaseOrder='20000000-0000-4000-8000-000000000001';
const purchaseTransaction='gp_mock_v1_'+'a'.repeat(64);
test('server purchase sends only consent/reference with authorization, never money or PII',async()=>{
  const {tracker}=fixture();tracker.configure('mock',false,true);tracker.setConsent('granted');
  let calls=0;
  const result=await captureServerPurchase(tracker,purchaseOrder,'synthetic-token',{transport:async(url,options)=>{
    calls++;assert.equal(url,'/api/analytics/purchases/'+purchaseOrder);
    assert.deepEqual(JSON.parse(options.body),{consent:'granted'});
    assert.equal(options.headers.Authorization,'Bearer synthetic-token');
    assert.equal(url.includes('synthetic-token'),false);
    return new Response(JSON.stringify({source:'mock',status:'recorded',transactionId:purchaseTransaction,email:'PRIVATE'}));
  }});
  assert.deepEqual(result,{source:'mock',status:'recorded',transactionId:purchaseTransaction});
  assert.equal(calls,1);assert.equal(tracker.getSnapshot().events.length,0);
});
test('server purchase never requests without consent, auth, valid UUID or enabled mock',async()=>{
  const {tracker}=fixture();let calls=0;
  const transport=async()=>{calls++;throw new Error();};
  for(const mode of ['disabled','unavailable','mock']){
    tracker.configure(mode);await captureServerPurchase(tracker,purchaseOrder,'synthetic',{transport});
  }
  tracker.configure('mock',false,true);tracker.setConsent('granted');
  await captureServerPurchase(tracker,purchaseOrder,undefined,{transport});
  await captureServerPurchase(tracker,'success?paid=true','synthetic',{transport});
  const controller=new AbortController();controller.abort();
  await captureServerPurchase(tracker,purchaseOrder,'synthetic',{transport,signal:controller.signal});
  assert.equal(calls,0);
});
test('server duplicate is a receipt outcome, never a second frontend event',async()=>{
  const {tracker}=fixture();tracker.configure('mock',false,true);tracker.setConsent('granted');
  let calls=0;
  const transport=async()=>new Response(JSON.stringify({source:'mock',status:calls++?'duplicate':'recorded',transactionId:purchaseTransaction}));
  assert.equal((await captureServerPurchase(tracker,purchaseOrder,'synthetic',{transport})).status,'recorded');
  assert.equal((await captureServerPurchase(tracker,purchaseOrder,'synthetic',{transport})).status,'duplicate');
  assert.equal(tracker.getSnapshot().events.length,0);
  assert.equal(tracker.track('purchase',params),false);
});
test('revoked consent or cancelled page ignores an in-flight receipt',async()=>{
  for(const cancel of ['consent','page','flag']){
    const {tracker}=fixture();tracker.configure('mock',false,true);tracker.setConsent('granted');
    let resolve;const controller=new AbortController();
    const pending=captureServerPurchase(tracker,purchaseOrder,'synthetic',{signal:controller.signal,transport:()=>new Promise(done=>{resolve=done;})});
    if(cancel==='page')controller.abort();else if(cancel==='flag')tracker.configure('mock',false,false);else tracker.setConsent('denied');
    resolve(new Response(JSON.stringify({source:'mock',status:'recorded',transactionId:purchaseTransaction})));
    assert.equal((await pending).status,'suppressed');
  }
});
test('capture failure is nonblocking and mutation is never automatically retried',async()=>{
  const {tracker}=fixture();tracker.configure('mock',false,true);tracker.setConsent('granted');
  let calls=0;
  assert.equal((await captureServerPurchase(tracker,purchaseOrder,'synthetic',{transport:async()=>{calls++;throw new Error('PRIVATE');}})).status,'unavailable');
  assert.equal(calls,1);
});
test('server kill switch suppresses an attempt started with stale frontend policy',async()=>{
  const {tracker}=fixture();tracker.configure('mock',false,true);tracker.setConsent('granted');
  const result=await captureServerPurchase(tracker,purchaseOrder,'synthetic',{transport:async()=>new Response(JSON.stringify({source:'none',status:'disabled'}))});
  assert.equal(result.status,'suppressed');assert.equal(tracker.getSnapshot().events.length,0);
});
test('capture rejects malformed or nonmock response and sanitizes HTTP errors',async()=>{
  const {tracker}=fixture();tracker.configure('mock',false,true);tracker.setConsent('granted');
  for(const value of [{},{source:'production',status:'recorded',transactionId:purchaseTransaction},{source:'mock',status:'recorded',transactionId:'PRIVATE'}])
    assert.equal((await captureServerPurchase(tracker,purchaseOrder,'synthetic',{transport:async()=>new Response(JSON.stringify(value))})).status,'unavailable');
  for(const status of [400,401,404,409,422,429,503])
    assert.equal((await captureServerPurchase(tracker,purchaseOrder,'synthetic',{transport:async()=>new Response('PRIVATE',{status})})).status,'unavailable');
});

test('purchase subflag off sends no request while pre-purchase tracking remains available',async()=>{
  const {tracker}=fixture();tracker.configure('mock');tracker.setConsent('granted');
  let calls=0;
  assert.equal(tracker.track('add_to_cart',params),true);
  const result=await captureServerPurchase(tracker,purchaseOrder,'synthetic',{transport:async()=>{calls++;throw new Error();}});
  assert.equal(result.status,'suppressed');assert.equal(calls,0);
});

const {sendLocalDebugEvent}=require(path.join(scratch,'local-debug.js'));
test('local reporting test never calls backend before consent or with privacy signals',async()=>{
 const {tracker}=fixture();tracker.configure('mock');let calls=0;const transport=async()=>{calls++;throw new Error();};
 assert.equal(await sendLocalDebugEvent(tracker,'fixture',undefined,transport),'blocked');tracker.setConsent('denied');assert.equal(await sendLocalDebugEvent(tracker,'fixture',undefined,transport),'blocked');assert.equal(calls,0);
});
test('local reporting sends only ephemeral identity, fixed action and explicit consent',async()=>{
 const {tracker}=fixture();tracker.configure('mock');tracker.setConsent('granted');let calls=0;
 const result=await sendLocalDebugEvent(tracker,'private-token',undefined,async(url,options)=>{calls++;assert.equal(url,'/api/analytics/local-debug-event');const body=JSON.parse(options.body);assert.deepEqual(Object.keys(body).sort(),['action','clientId','consent','eventId','sessionId']);assert.equal(body.action,'manual_test');assert.match(body.clientId,/^[1-9]\d*\.[1-9]\d*$/);assert.equal(options.headers.Authorization,'Bearer private-token');return {ok:true,json:async()=>({source:'google_measurement_protocol',status:'accepted'})};});assert.equal(result,'accepted');assert.equal(calls,1);
});
test('local reporting ignores response after revocation and never retries network failure',async()=>{
 const {tracker}=fixture();tracker.configure('mock');tracker.setConsent('granted');let calls=0;
 const result=await sendLocalDebugEvent(tracker,'fixture',undefined,async()=>{calls++;tracker.setConsent('denied');return {ok:true,json:async()=>({source:'google_measurement_protocol',status:'accepted'})};});assert.equal(result,'blocked');assert.equal(calls,1);
 tracker.setConsent('granted');calls=0;assert.equal(await sendLocalDebugEvent(tracker,'fixture',undefined,async()=>{calls++;throw new Error();}),'unknown');assert.equal(calls,1);
});

const {LocalFunnelSession}=require(path.join(scratch,'local-funnel.js'));
const settle=()=>new Promise(resolve=>setImmediate(resolve));
const accepted=()=>new Response(JSON.stringify({source:'google_measurement_protocol',status:'accepted',ingestionVerified:false}));
function funnelFixture(transport=async()=>accepted()) {
 const f=fixture();f.tracker.configure('mock');f.tracker.setConsent('granted');let clock=1000000000;
 const session=new LocalFunnelSession(f.tracker,transport,()=>clock);
 return {...f,session,tick:ms=>{clock+=ms;}};
}
test('funnel requires separate flag, token, consent and no privacy signal',()=>{
 const f=funnelFixture();assert.equal(f.session.start('admin'),false);f.session.setEnabled(true);assert.equal(f.session.start(''),false);f.tracker.setConsent('denied');assert.equal(f.session.start('admin'),false);f.tracker.configure('mock',true);assert.equal(f.session.start('admin'),false);f.session.stop();
});
test('new tracker subscription never replays history and shares identity across event names',async()=>{
 const bodies=[];const f=funnelFixture(async(_url,options)=>{bodies.push(JSON.parse(options.body));return accepted();});
 f.tracker.track('view_item',params,'old');f.session.setEnabled(true);assert.equal(f.session.start('admin'),true);assert.equal(bodies.length,0);
 f.tracker.track('add_to_cart',params);f.tracker.track('begin_checkout',params);await settle();await settle();
 assert.equal(bodies.length,2);assert.equal(bodies[0].clientId,bodies[1].clientId);assert.equal(bodies[0].sessionId,bodies[1].sessionId);assert.notEqual(bodies[0].eventId,bodies[1].eventId);assert.deepEqual(bodies.map(b=>b.name),['add_to_cart','begin_checkout']);assert.deepEqual(Object.keys(bodies[0]).sort(),['clientId','consent','eventId','name','parameters','sessionId']);assert.equal(f.session.getSnapshot().accepted,2);assert.equal(f.tracker.getSnapshot().events[0].source,'mock');f.session.stop();
});
test('consent revoke clears pending queue, aborts transport, ignores late response and cannot restart automatically',async()=>{
 let resolve,signal,calls=0;const f=funnelFixture(async(_url,options)=>{calls++;signal=options.signal;return new Promise(done=>{resolve=done;});});f.session.setEnabled(true);f.session.start('admin');f.tracker.track('view_item',params);f.tracker.track('add_to_cart',params);f.tracker.setConsent('denied');assert.equal(signal.aborted,true);assert.equal(f.session.getSnapshot().active,false);assert.equal(f.session.getSnapshot().dropped,1);resolve(accepted());await settle();assert.equal(calls,1);assert.equal(f.session.getSnapshot().accepted,0);f.tracker.setConsent('granted');f.tracker.track('view_item',params);await settle();assert.equal(calls,1);f.session.stop();
});
test('serial queue is bounded, expires stale events and never blocks cart',async()=>{
 let resolve,calls=0;const f=funnelFixture(async()=>{calls++;if(calls===1)return new Promise(done=>{resolve=done;});return accepted();});f.session.setEnabled(true);f.session.start('admin');
 for(let i=0;i<15;i++)assert.equal(f.tracker.track('add_to_cart',params),true);
 assert.equal(calls,1);assert.equal(f.session.getSnapshot().dropped,4);f.tick(31000);resolve(accepted());await settle();assert.equal(calls,1);assert.equal(f.session.getSnapshot().dropped,14);f.session.stop();
});
test('expiry, auth changes, disabled flag and tracker mode stop a session',async()=>{
 for(const reason of ['expiry','auth','flag','mode']){let calls=0;const f=funnelFixture(async()=>{calls++;return accepted();});f.session.setEnabled(true);f.session.start('admin');if(reason==='expiry')f.tick(15*60000);else if(reason==='auth')f.session.authChanged('');else if(reason==='flag')f.session.setEnabled(false);else f.tracker.configure('disabled');f.tracker.track('view_item',params);await settle();assert.equal(calls,0);assert.equal(f.session.getSnapshot().active,false);f.session.stop();}
});
test('unknown or rejected HTTP closes session without replay, retry or leaking payload into status',async()=>{
 for(const transport of [async()=>{throw new Error('PRIVATE');},async()=>new Response('PRIVATE',{status:429}),async()=>new Response(JSON.stringify({source:'fixture',status:'accepted'}))]){const f=funnelFixture(transport);f.session.setEnabled(true);f.session.start('admin');f.tracker.track('view_item',params);f.tracker.track('add_to_cart',params);await settle();assert.equal(f.session.getSnapshot().active,false);assert.equal(f.session.getSnapshot().attempted,1);assert.equal(f.session.getSnapshot().unknown+f.session.getSnapshot().blocked,1);assert.equal(JSON.stringify(f.session.getSnapshot()).includes('PRIVATE'),false);f.session.stop();}
});
test('session caps twenty attempts, restarts with fresh identity and never sends purchase',async()=>{
 const ids=[];const f=funnelFixture(async(_url,options)=>{ids.push(JSON.parse(options.body).clientId);return accepted();});f.session.setEnabled(true);f.session.start('admin');
 for(let i=0;i<21;i++){f.tracker.track('add_to_cart',params);await settle();}
 assert.equal(ids.length,20);assert.equal(f.session.getSnapshot().active,false);assert.equal(f.tracker.track('purchase',params),false);assert.equal(f.session.start('admin'),true);f.tracker.track('view_item',params);await settle();assert.notEqual(ids[0],ids[20]);f.session.stop();
});
fs.writeFileSync(path.join(scratch,'server-contract.js'),ts.transpileModule(fs.readFileSync(path.join(__dirname,'../../api/src/analytics/local-funnel.contract.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText);
const {localFunnelParameters,LOCAL_FUNNEL_EVENTS}=require(path.join(scratch,'server-contract.js'));
test('browser/server eight-event schema parity; selection contains exactly one item',()=>{
 assert.deepEqual(FUNNEL_EVENTS,LOCAL_FUNNEL_EVENTS);
 for(const name of FUNNEL_EVENTS){const raw={...params,item_list_id:'catalog',shipping_tier:'delivery',payment_type:'sepay'};const clean=ecommerceParameters(name,raw);assert.deepEqual(localFunnelParameters(name,clean),clean);}
 assert.equal(ecommerceParameters('select_item',{items:[item,item]}),null);assert.equal(localFunnelParameters('select_item',{currency:'VND',value:400000,items:[item,item]}),null);
});

test('native browser transport is called without a session object receiver',async()=>{
 let calls=0;const f=funnelFixture(function(){assert.notEqual(this,f.session);calls++;return Promise.resolve(accepted());});f.session.setEnabled(true);f.session.start('admin');f.tracker.track('view_item',params);await settle();assert.equal(calls,1);assert.equal(f.session.getSnapshot().accepted,1);f.session.stop();
});

test('trusted server test cap stops with a clear reason, no uncertain outcome, no retry or rearm',async()=>{
 let calls=0;const f=funnelFixture(async()=>{calls++;return new Response(JSON.stringify({source:'google_measurement_protocol',status:'blocked',reason:'test_limit'}));});f.session.setEnabled(true);f.session.start('admin');f.tracker.track('view_item',params);f.tracker.track('add_to_cart',params);await settle();const s=f.session.getSnapshot();assert.equal(s.active,false);assert.equal(s.stopReason,'server_limit');assert.equal(s.blocked,1);assert.equal(s.unknown,0);assert.equal(s.accepted,0);assert.equal(s.dropped,1);assert.equal(f.session.start('admin'),false);assert.equal(calls,1);f.session.stop();assert.equal(f.session.getSnapshot().stopReason,'server_limit');
});
test('HTTP quota/auth/disabled/busy/body rejection reasons are distinct and sanitized',async()=>{
 for(const [status,reason] of [[429,'quota'],[401,'auth'],[403,'auth'],[503,'disabled'],[409,'busy'],[400,'rejected']]){const f=funnelFixture(async()=>new Response('PRIVATE',{status}));f.session.setEnabled(true);f.session.start('admin');f.tracker.track('view_item',params);await settle();assert.equal(f.session.getSnapshot().stopReason,reason);assert.equal(f.session.getSnapshot().blocked,1);assert.equal(f.session.getSnapshot().unknown,0);f.session.stop();}
});
test('session ID is RAM-only, matches requests, and survives stop for DebugView comparison',async()=>{
 let sent;const f=funnelFixture(async(_url,options)=>{sent=JSON.parse(options.body);return accepted();});f.session.setEnabled(true);f.session.start('admin');const id=f.session.getSnapshot().sessionId;assert.ok(Number.isSafeInteger(id));f.tracker.track('view_item',params);await settle();assert.equal(sent.sessionId,id);f.session.stop();assert.equal(f.session.getSnapshot().sessionId,id);assert.equal(f.session.getSnapshot().stopReason,'manual');for(const value of f.values.values())assert.equal(value.includes(String(id)),false);
});
test('consent, expiry, auth, policy and frontend cap report why session stopped',async()=>{
 for(const reason of ['consent','expired','auth','disabled','session_limit']){const f=funnelFixture();f.session.setEnabled(true);f.session.start('admin');if(reason==='consent')f.tracker.setConsent('denied');else if(reason==='expired'){f.tick(15*60000);f.tracker.track('view_item',params);}else if(reason==='auth')f.session.authChanged('other');else if(reason==='disabled')f.session.setEnabled(false);else for(let i=0;i<20;i++){f.tracker.track('add_to_cart',params);await settle();}assert.equal(f.session.getSnapshot().active,false);assert.equal(f.session.getSnapshot().stopReason,reason);f.session.stop();}
});
