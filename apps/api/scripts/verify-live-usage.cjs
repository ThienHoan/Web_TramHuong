// Exact SQL for integration-live-usage.sql on PGlite (foundation from fixture). No network.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {createPurchaseDatabase} = require('./fixtures/purchase-database.cjs');
const read = f => fs.readFileSync(path.join(__dirname, f), 'utf8');
(async () => {
  const db = await createPurchaseDatabase();
  let checks = 0;
  const equal = (a, b) => {assert.deepEqual(a, b); checks++;};
  const rejects = async (p, code) => {await assert.rejects(p, e => e.code === code); checks++;};
  const checker = async () => (await db.query(read('../../../docs/integrations/verify-installed-live-usage.sql'))).rows[0].status;
  const reserve = (p, m, a, l) => db.query('SELECT public.integration_reserve_live_usage($1,$2,$3,$4) AS r', [p, m, a, l]).then(r => r.rows[0].r);
  try {
    equal(await checker(), 'CHUA_CAI');
    await db.exec(read('../migrations/integration-live-usage.sql'));
    equal(await checker(), 'PASS');
    await db.exec('SET ROLE service_role');
    equal((await reserve('gemini', 'requests', 1, 3)).used, 1);
    equal((await reserve('gemini', 'tokens', 900, 1000)).newlyCrossed, [60, 80]);
    await rejects(reserve('gemini', 'tokens', 101, 1000), 'PT429');            // hard limit, no partial
    equal((await reserve('gemini', 'tokens', 100, 1000)).used, 1000);
    await rejects(reserve('gemini', 'tokens', 1, 999), 'PT409');               // policy changed mid-day
    for (const bad of [['resend', 'requests', 1, 3], ['gemini', 'emails', 1, 3], ['gemini', 'requests', 0, 3], ['gemini', 'requests', 1, 0]])
      await rejects(reserve(...bad), '22023');
    equal((await db.query("SELECT environment, metric, used::int FROM integration_usage_daily WHERE provider='gemini' ORDER BY metric")).rows,
      [{environment: 'staging', metric: 'requests', used: 1}, {environment: 'staging', metric: 'tokens', used: 1000}]);
    // Mock budget is a separate row and untouched.
    equal(Number((await db.query("SELECT count(*) FROM integration_usage_daily WHERE provider='gemini' AND environment='mock'")).rows[0].count), 0);
    // Concurrency: 6 parallel single-request reservations against limit 3 → exactly 2 more succeed.
    const settled = await Promise.allSettled(Array.from({length: 6}, () => reserve('gemini', 'requests', 1, 3)));
    equal(settled.filter(s => s.status === 'fulfilled').length, 2);
    for (const role of ['anon', 'authenticated']) {
      await db.exec('RESET ROLE; SET ROLE ' + role);
      await rejects(reserve('gemini', 'requests', 1, 3), '42501');
    }
    await db.exec('RESET ROLE');
    await assert.rejects(db.exec(read('../migrations/integration-live-usage.sql'))); checks++;
    await db.exec('ROLLBACK').catch(() => {});
    await db.exec(read('../migrations/integration-live-usage.pause.sql'));
    equal(await checker(), 'FAIL');
    await db.exec('SET ROLE service_role');
    await rejects(reserve('gemini', 'requests', 1, 3), '42501');
    await db.exec('RESET ROLE');
    equal(Number((await db.query("SELECT sum(used) FROM integration_usage_daily WHERE provider='gemini'")).rows[0].sum), 1003);
    console.log(JSON.stringify({batch: 'P5-03a-sql', result: 'PASS', checks, hostedRequests: 0}));
  } finally {await db.close();}
})().catch(e => {console.error('LIVE_USAGE_SQL_FAILED', e?.message ?? ''); process.exitCode = 1;});
