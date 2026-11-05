// P8-03: exact SQL + actual MerchantDeliveryService/IntegrationRepository/consumer,
// two independent workers sharing one PGlite DB. Synthetic catalog, no Google call.
require('ts-node/register/transpile-only');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {ConfigService} = require('@nestjs/config');
const {Logger} = require('@nestjs/common');
const {createPurchaseDatabase, PRODUCT} = require('./fixtures/purchase-database.cjs');
const {loadIntegrationRegistry} = require('../src/integrations/integrations.config');
const {IntegrationRepository} = require('../src/integrations/integration.repository');
const {MockDeliveryConsumer} = require('../src/integrations/mock-delivery.consumer');
const {MerchantDeliveryService} = require('../src/merchant/merchant-delivery.service');

Logger.overrideLogger(false);
const read = file => fs.readFileSync(path.join(__dirname, file), 'utf8');
const FENCE = read('../migrations/integration-merchant-fence.sql');
const PAUSE = read('../migrations/integration-merchant-fence.pause.sql');
const METADATA = read('../../../docs/integrations/verify-installed-merchant-fence.sql');
const OTHER_ID = '30000000-0000-4000-8000-000000000099';

(async () => {
  const db = await createPurchaseDatabase();
  let checks = 0;
  const equal = (a, b) => {assert.deepEqual(a, b); checks++;};
  const rejects = async (p, code) => {await assert.rejects(p, e => e.code === code); checks++;};
  const scalar = async (q, p = []) => Object.values((await db.query(q, p)).rows[0])[0];
  const owner = sql => db.exec('RESET ROLE; ' + sql + '; SET ROLE service_role');
  const statuses = async () => [...new Set((await db.query(METADATA)).rows.map(r => r.status))].sort();
  try {
    await db.exec(read('../migrations/integration-merchant-queue.sql'));
    equal(await statuses(), ['CHUA_CAI']);
    await db.exec(FENCE);
    equal(await statuses(), ['PASS']);

    const defs = {
      integration_enqueue_merchant_mock: a => ['SELECT integration_enqueue_merchant_mock($1,$2,$3) AS r', [a.p_product_id, a.p_action, a.p_fingerprint]],
      integration_claim: a => ['SELECT * FROM integration_claim($1,$2,$3,$4)', [a.p_provider, a.p_environment, a.p_limit, a.p_lease_seconds]],
      integration_reserve_usage: a => ['SELECT integration_reserve_usage($1,$2,$3,$4,$5) AS r', [a.p_provider, a.p_environment, a.p_metric, a.p_amount, a.p_hard_limit]],
      integration_finish: a => ['SELECT integration_finish($1,$2,$3,$4,$5,$6) AS r', [a.p_id, a.p_lease_token, a.p_version, a.p_outcome, null, a.p_error_code ?? null]],
      integration_merchant_fence_ready_mock: () => ['SELECT integration_merchant_fence_ready_mock() AS r', []],
      integration_merchant_begin_send_mock: a => ['SELECT integration_merchant_begin_send_mock($1,$2,$3) AS r', [a.p_id, a.p_lease_token, a.p_version]],
      integration_merchant_end_send_mock: a => ['SELECT integration_merchant_end_send_mock($1,$2) AS r', [a.p_fence_token, a.p_outcome]],
      integration_merchant_defer_mock: a => ['SELECT integration_merchant_defer_mock($1,$2,$3) AS r', [a.p_id, a.p_lease_token, a.p_version]],
    };
    const client = {rpc: async (name, a) => {
      assert.ok(defs[name], 'unexpected rpc ' + name);
      try {const r = await db.query(...defs[name](a)); return {data: name === 'integration_claim' ? r.rows : r.rows[0]?.r, error: null};}
      catch (e) {return {data: null, error: {code: e.code, message: 'Fixture rejected'}};}
    }};
    const config = new ConfigService({NODE_ENV: 'test', FEATURE_MERCHANT_OUTBOX_ENABLED: 'true',
      FEATURE_MERCHANT_SYNC_ENABLED: 'true', FRONTEND_URL: 'https://shop.example.org'});
    const registry = loadIntegrationRegistry(config);
    const repo = new IntegrationRepository({getClient: () => client});
    let current = {id: PRODUCT, slug: 'fixture', is_active: true, price: 200000, quantity: 3,
      images: ['https://cdn.example.org/photo.webp'], variants: null, discount_percentage: 0,
      discount_start_date: null, discount_end_date: null,
      translations: [{locale: 'vi', title: 'Vòng tay', description: 'Sản phẩm mẫu'}]};
    const sent = [];
    // Each worker = its own service + consumer (separate in-process locks), like two instances.
    const worker = (simulate = async content => {sent.push(content.productAttributes.price.amountMicros);}) =>
      new MerchantDeliveryService(registry, config, {findById: async () => structuredClone(current)}, repo,
        new MockDeliveryConsumer(registry, repo), simulate);
    const row = async gen => (await db.query("SELECT * FROM integration_outbox WHERE provider='merchant' AND payload->>'generation'=$1", [String(gen)])).rows[0];
    const fence = async () => (await db.query('SELECT started_generation::int AS s, accepted_generation::int AS a, inflight_generation::int AS i, last_outcome AS o FROM integration_merchant_send_fence WHERE product_id=$1', [PRODUCT])).rows[0];
    const claimSql = async () => (await db.query("SELECT * FROM integration_claim('merchant','mock',20,120)")).rows;
    const begin = r => scalar('SELECT integration_merchant_begin_send_mock($1,$2,$3) AS r', [r.id, r.lease_token, r.version]);
    await db.exec('SET ROLE service_role');

    // 1. Worker A sends gen1 slowly; gen2 appears; worker B is fenced out and defers.
    let entered, release;
    const inFlight = new Promise(r => {entered = r;});
    const slowA = worker(async content => {entered(); await new Promise(r => {release = r;}); sent.push(content.productAttributes.price.amountMicros);});
    await slowA.queue([PRODUCT]);
    const drainA = slowA.drain();
    await inFlight;
    equal(await fence(), {s: 1, a: null, i: 1, o: null});
    current.price = 300000;
    const workerB = worker();
    await workerB.queue([PRODUCT]);
    equal(await workerB.drain(), {source: 'mock', persistence: 'database', synced: false, googleApproval: null,
      busy: false, claimed: 1, accepted: 0, failed: 0, conflicts: 0, deferred: 1});
    const deferred = await row(2);
    equal([deferred.state, deferred.attempts, deferred.last_error_code, deferred.lease_token, sent.length],
      ['QUEUED', 0, 'SEND_FENCE_BUSY', null, 0]);
    ok(Date.parse(deferred.next_at) > Date.now() + 20000);
    equal((await workerB.drain()).claimed, 0); // not due yet: no busy loop
    release();
    equal((await drainA).accepted, 1);
    equal(await fence(), {s: 1, a: 1, i: null, o: 'ACCEPTED'});
    await owner("UPDATE integration_outbox SET next_at=clock_timestamp() WHERE provider='merchant' AND state='QUEUED'");
    equal((await workerB.drain()).accepted, 1);
    equal(sent, ['200000000000', '300000000000']); // old content first, newest last
    equal(await fence(), {s: 2, a: 2, i: null, o: 'ACCEPTED'});

    // 2. Older generation claimed before a newer one started: stale, never sent.
    current.price = 400000; await workerB.queue([PRODUCT]);
    const [row3] = await claimSql();
    current.price = 500000; await workerB.queue([PRODUCT]);
    const [row4] = await claimSql();
    const b4 = await begin(row4);
    equal(b4.status, 'acquired');
    equal((await begin(row3)).status, 'stale');
    equal((await begin(row4)).status, 'stale'); // duplicate begin on same lease
    await db.query("SELECT integration_merchant_end_send_mock($1,'ACCEPTED')", [b4.fenceToken]);
    await rejects(db.query("SELECT integration_merchant_end_send_mock($1,'ACCEPTED')", [b4.fenceToken]), 'PT409');
    await rejects(db.query('SELECT integration_merchant_defer_mock($1,$2,$3)', [row4.id, row4.lease_token, row4.version]), 'PT409');
    await db.query("SELECT integration_finish($1,$2,$3,'DEAD',NULL,'REJECTED')", [row3.id, row3.lease_token, row3.version]);
    await db.query("SELECT integration_finish($1,$2,$3,'ACCEPTED',NULL,NULL)", [row4.id, row4.lease_token, row4.version]);
    equal(await fence(), {s: 4, a: 4, i: null, o: 'ACCEPTED'});

    // 3. Crash while in flight: newer waits; after fence expiry newer proceeds; old token superseded.
    current.price = 600000; await workerB.queue([PRODUCT]);
    const [row5] = await claimSql();
    const b5 = await begin(row5); equal(b5.status, 'acquired');
    current.price = 700000; await workerB.queue([PRODUCT]);
    let [row6] = await claimSql();
    equal((await begin(row6)).status, 'busy');
    await rejects(db.query('SELECT integration_merchant_defer_mock($1,$2,$3)', [row5.id, row5.lease_token, row5.version]), 'PT409');
    await db.query('SELECT integration_merchant_defer_mock($1,$2,$3)', [row6.id, row6.lease_token, row6.version]);
    await owner(`UPDATE integration_merchant_send_fence SET inflight_until=clock_timestamp()-interval '1 second';
      UPDATE integration_outbox SET next_at=clock_timestamp() WHERE id='${row6.id}'`);
    [row6] = await claimSql();
    equal(row6.payload.generation, 6);
    const b6 = await begin(row6); equal(b6.status, 'acquired');
    await rejects(db.query("SELECT integration_merchant_end_send_mock($1,'ACCEPTED')", [b5.fenceToken]), 'PT409');
    await db.query("SELECT integration_merchant_end_send_mock($1,'ACCEPTED')", [b6.fenceToken]);
    await db.query("SELECT integration_finish($1,$2,$3,'ACCEPTED',NULL,NULL)", [row6.id, row6.lease_token, row6.version]);
    await owner(`UPDATE integration_outbox SET lease_until=clock_timestamp()-interval '1 second' WHERE id='${row5.id}'`);
    await claimSql(); // recovery: lost mutation lease → UNKNOWN, never requeued
    equal((await row(5)).state, 'UNKNOWN');
    equal(await fence(), {s: 6, a: 6, i: null, o: 'ACCEPTED'});

    // 4. Ownership and input checks.
    current.price = 800000; await workerB.queue([PRODUCT]);
    const [row7] = await claimSql();
    await rejects(db.query('SELECT integration_merchant_begin_send_mock($1,$2,$3)', [row7.id, OTHER_ID, row7.version]), 'PT409');
    await rejects(db.query('SELECT integration_merchant_begin_send_mock($1,$2,$3)', [row7.id, row7.lease_token, row7.version + 1]), 'PT409');
    await owner(`UPDATE integration_outbox SET lease_until=clock_timestamp()-interval '1 second' WHERE id='${row7.id}'`);
    await rejects(db.query('SELECT integration_merchant_begin_send_mock($1,$2,$3)', [row7.id, row7.lease_token, row7.version]), 'PT409');
    await owner(`INSERT INTO integration_outbox(provider,environment,dedupe_key,event_type,operation_kind,payload) VALUES
      ('resend','mock','fence-other','email','mutation','{"productId":"${PRODUCT}","generation":99,"fingerprint":"${'a'.repeat(64)}"}'),
      ('merchant','mock','fence-missing-key','catalog_upsert','mutation','{"productId":"${OTHER_ID}","generation":1}')`);
    const others = [...(await db.query("SELECT * FROM integration_claim('resend','mock',20,120)")).rows, ...(await claimSql())];
    for (const r of others.filter(r => ['fence-other', 'fence-missing-key'].includes(r.dedupe_key)))
      await rejects(begin(r), 'PT409');
    equal(others.filter(r => ['fence-other', 'fence-missing-key'].includes(r.dedupe_key)).length, 2);
    await rejects(db.query("SELECT integration_merchant_end_send_mock($1,'SENT')", [OTHER_ID]), '22023');
    await rejects(db.query("SELECT integration_merchant_end_send_mock(NULL,'ACCEPTED')"), 'PT409');

    // 5. Browser-facing roles cannot touch the fence.
    const fns = ['integration_merchant_fence_ready_mock()', 'integration_merchant_owned_row_mock($1,$1,1)',
      'integration_merchant_begin_send_mock($1,$1,1)', "integration_merchant_end_send_mock($1,'ACCEPTED')",
      'integration_merchant_defer_mock($1,$1,1)'];
    for (const role of ['anon', 'authenticated']) {
      await db.exec('RESET ROLE; SET ROLE ' + role);
      for (const fn of fns) await rejects(db.query('SELECT public.' + fn, fn.includes('$1') ? [OTHER_ID] : []), '42501');
      await rejects(db.query('SELECT 1 FROM public.integration_merchant_send_fence'), '42501');
    }
    await db.exec('RESET ROLE');

    // 6. Repeat install refused, data kept.
    await assert.rejects(db.exec(FENCE)); checks++;
    await db.exec('ROLLBACK').catch(() => {});
    equal((await fence()).s, 6);

    // 7. Pause: drain answers 503 before claiming; queued work untouched.
    await db.exec(PAUSE);
    const paused = (await db.query(METADATA)).rows;
    equal(paused.filter(r => r.status === 'FAIL').length, 5);
    equal(paused.find(r => r.check_name === 'public.integration_merchant_send_fence').status, 'PASS');
    await db.exec('SET ROLE service_role');
    current.price = 900000; await workerB.queue([PRODUCT]);
    const before = await row(8);
    await assert.rejects(workerB.drain(), e => e.getStatus?.() === 503); checks++;
    const after = await row(8);
    equal([after.state, after.attempts, after.version], [before.state, before.attempts, before.version]);
    await db.exec('RESET ROLE');

    const report = {batch: 'P8-03', result: 'PASS', checks, exactSql: true, realTsServiceRepositoryConsumer: true,
      workers: 2, sendOrder: sent, oneInFlightPerProduct: true, generationOrderedStarts: true, deferredNotSent: true,
      crashedInflightExpires: true, staleOwnerRejected: true, pausePreflight503: true, googleCalls: 0, hostedWrites: 0,
      limitation: 'fence lease 60s must exceed transport deadline; no provider-side conditional write'};
    if (process.env.MERCHANT_FENCE_REPORT) fs.writeFileSync(process.env.MERCHANT_FENCE_REPORT, JSON.stringify(report, null, 2) + '\n');
    console.log(JSON.stringify(report));
  } finally {await db.close();}
  function ok(v) {assert.ok(v); checks++;}
})().catch(e => {console.error('MERCHANT_FENCE_FAILED', e?.message ?? ''); process.exitCode = 1;});
