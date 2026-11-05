// P2-02b: exact SQL + actual TS repository/service, synthetic mock property only.
// In-memory PostgreSQL (PGlite). No dotenv, Supabase, Google or AppModule.
require('ts-node/register/transpile-only');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {ConfigService} = require('@nestjs/config');
const {Logger} = require('@nestjs/common');
const {createPurchaseDatabase} = require('./fixtures/purchase-database.cjs');
const {loadIntegrationRegistry} = require('../src/integrations/integrations.config');
const {IntegrationExecutor} = require('../src/integrations/integration-executor');
const {IntegrationRepository} = require('../src/integrations/integration.repository');
const {MockSearchConsoleAdapter} = require('../src/analytics/search-console.adapter');
const {SearchConsoleService} = require('../src/analytics/search-console.service');
const {SearchConsoleRepository} = require('../src/analytics/search-console.repository');

Logger.overrideLogger(false);
const read = file => fs.readFileSync(path.join(__dirname, file), 'utf8');
const MIGRATION = read('../migrations/search-console-durable-mock.sql');
const PAUSE = read('../migrations/search-console-durable-mock.pause.sql');
const METADATA = read('../../../docs/integrations/verify-installed-search-console-store.sql');
const FUNCTIONS = ['seo_search_read_mock()','seo_search_begin_mock()',
  'seo_search_complete_mock($1::uuid,1,ARRAY[]::date[],\'[]\'::jsonb,ARRAY[]::date[])','seo_search_fail_mock($1::uuid,1,\'TIMEOUT\')'];

(async () => {
  const db = await createPurchaseDatabase();
  let checks = 0, adapterCalls = 0;
  const equal = (a, b) => {assert.deepEqual(a, b); checks++;};
  const ok = v => {assert.ok(v); checks++;};
  const rejects = async (p, code) => {await assert.rejects(p, e => e.code === code); checks++;};
  const scalar = async (q, p = []) => Object.values((await db.query(q, p)).rows[0])[0];
  const metadata = async () => Object.fromEntries((await db.query(METADATA)).rows.map(r => [r.check_name, r.status]));
  const statuses = async () => [...new Set(Object.values(await metadata()))].sort();
  try {
    equal(await statuses(), ['CHUA_CAI']);
    await db.exec(MIGRATION);
    equal(await statuses(), ['PASS']);

    // Real repository → supabase-like rpc → exact SQL functions as service_role.
    const defs = {
      seo_search_read_mock: () => ['SELECT public.seo_search_read_mock() AS r', []],
      seo_search_begin_mock: () => ['SELECT public.seo_search_begin_mock() AS r', []],
      seo_search_complete_mock: a => ['SELECT public.seo_search_complete_mock($1,$2,$3::date[],$4::jsonb,$5::date[]) AS r',
        [a.p_token, a.p_version, a.p_window, JSON.stringify(a.p_days), a.p_truncated]],
      seo_search_fail_mock: a => ['SELECT public.seo_search_fail_mock($1,$2,$3) AS r', [a.p_token, a.p_version, a.p_code]],
      integration_reserve_usage: a => ['SELECT public.integration_reserve_usage($1,$2,$3,$4,$5) AS r',
        [a.p_provider, a.p_environment, a.p_metric, a.p_amount, a.p_hard_limit]],
    };
    const rpc = (name, args) => {
      assert.ok(defs[name], 'unexpected rpc ' + name);
      const p = db.query(...defs[name](args)).then(r => ({data: r.rows[0]?.r ?? null, error: null}),
        e => ({data: null, error: {code: e.code, message: 'Fixture rejected'}}));
      p.abortSignal = () => p;
      return p;
    };
    const supabase = {getClient: () => ({rpc})};
    const store = new SearchConsoleRepository(supabase, new IntegrationRepository(supabase));
    const registry = loadIntegrationRegistry(new ConfigService({FEATURE_SEARCH_CONSOLE_SYNC_ENABLED: 'true'}));
    const adapter = new MockSearchConsoleAdapter();
    const counted = {query: (q, s) => {adapterCalls++; return adapter.query(q, s);}};
    const make = (a = counted) => new SearchConsoleService(registry, 'test',
      new IntegrationExecutor(registry, {requestsPerMinute: 1000, mockDailyLimit: 10000}, Date.now, async () => {}, () => 0),
      a, Date.now, store);
    await db.exec('SET ROLE service_role');
    const rows = () => scalar('SELECT count(*)::int FROM seo_search_metrics_daily');
    const used = () => scalar("SELECT coalesce(sum(used),0)::int FROM integration_usage_daily WHERE provider='search_console'");

    const empty = await make().report();
    equal([empty.freshness, empty.persistence, empty.daily.length, adapterCalls], ['never_synced', 'database', 0, 0]);

    const first = await make().sync();
    equal([first.daily.length, first.missingDates.length, first.lastError, first.syncing], [14, 2, null, false]);
    equal([await rows(), await used(), adapterCalls], [48, 14, 14]);

    // Restart: a new instance serves the durable snapshot without provider reads.
    const before = adapterCalls;
    const restarted = await make().report();
    equal([restarted.daily, restarted.queries, restarted.lastSyncedAt, adapterCalls],
      [first.daily, first.queries, first.lastSyncedAt, before]);

    // Repeat replaces window rows, never accumulates.
    const second = await make().sync();
    equal([await rows(), await used(), await scalar('SELECT version FROM seo_search_sync_state')], [48, 28, 2]);
    equal(second.queries, first.queries);

    // Another live lease owner → 409 before budget/provider.
    const held = await scalar('SELECT public.seo_search_begin_mock() AS r');
    const callsBeforeConflict = adapterCalls;
    await assert.rejects(make().sync(), e => e.getStatus?.() === 409); checks++;
    equal([adapterCalls, await used()], [callsBeforeConflict, 28]);
    equal((await make().report()).syncing, true);

    // Expired lease: new owner gets a new generation; the stale owner cannot publish/fail.
    await db.exec("RESET ROLE; UPDATE seo_search_sync_state SET lease_until=clock_timestamp()-interval '1 second'; SET ROLE service_role");
    equal((await make().report()).syncing, false);
    const fresh = await scalar('SELECT public.seo_search_begin_mock() AS r');
    equal(fresh.version, held.version + 1);
    const win = (await make().report()).daily.map(d => d.date);
    await rejects(db.query('SELECT public.seo_search_complete_mock($1,$2,$3::date[],$4::jsonb,$5::date[])',
      [held.token, held.version, win, JSON.stringify(win.map(date => ({date, rows: []}))), []]), 'PT409');
    await rejects(db.query("SELECT public.seo_search_fail_mock($1,$2,'TIMEOUT')", [held.token, held.version]), 'PT409');
    equal(await rows(), 48);

    // Lease owner whose lease expired mid-run cannot publish either.
    await db.exec("RESET ROLE; UPDATE seo_search_sync_state SET lease_until=clock_timestamp()-interval '1 second'; SET ROLE service_role");
    await rejects(db.query('SELECT public.seo_search_complete_mock($1,$2,$3::date[],$4::jsonb,$5::date[])',
      [fresh.token, fresh.version, win, JSON.stringify(win.map(date => ({date, rows: []}))), []]), 'PT409');
    await db.query("SELECT public.seo_search_fail_mock($1,$2,'TIMEOUT')", [fresh.token, fresh.version]);
    equal([await rows(), (await make().report()).lastError], [48, 'TIMEOUT']);

    // Invalid publication rolls back the DELETE: previous rows survive.
    const owner = await scalar('SELECT public.seo_search_begin_mock() AS r');
    const days = win.map(date => ({date, rows: []}));
    days[5].rows.push({keys: [win[5], 'q', 'https://private.example/', 'MOBILE', 'vnm'], clicks: 1, impressions: 2, ctr: 0.5, position: 3});
    await assert.rejects(db.query('SELECT public.seo_search_complete_mock($1,$2,$3::date[],$4::jsonb,$5::date[])',
      [owner.token, owner.version, win, JSON.stringify(days), []])); checks++;
    for (const bad of [[win.slice(0, 13), days.slice(0, 13)], [[...win.slice(1), win[0]], days], [win, days.map(d => ({...d, rows: []})), [win[0], win[0]]]]) {
      await rejects(db.query('SELECT public.seo_search_complete_mock($1,$2,$3::date[],$4::jsonb,$5::date[])',
        [owner.token, owner.version, bad[0], JSON.stringify(bad[1]), bad[2] ?? []]), '22023');
    }
    equal(await rows(), 48);
    await rejects(db.query("SELECT public.seo_search_fail_mock($1,$2,'raw provider message')", [owner.token, owner.version]), '22023');
    await db.query("SELECT public.seo_search_fail_mock($1,$2,'INVALID_RESPONSE')", [owner.token, owner.version]);

    // Service-level invalid provider data: recorded, previous success retained.
    await assert.rejects(make({query: async () => {adapterCalls++; return null;}}).sync(), e => e.getStatus?.() === 503); checks++;
    const afterInvalid = await make().report();
    equal([afterInvalid.lastError, afterInvalid.lastSyncedAt, afterInvalid.daily, await rows()],
      ['INVALID_RESPONSE', second.lastSyncedAt, second.daily, 48]);

    // Durable hard budget 100/day survives restarts: exhausted mid-sync → 429, no partial publish.
    await db.exec("RESET ROLE; UPDATE integration_usage_daily SET used=99 WHERE provider='search_console'; SET ROLE service_role");
    const callsBeforeQuota = adapterCalls;
    await assert.rejects(make().sync(), e => e.getStatus?.() === 429); checks++;
    equal([adapterCalls - callsBeforeQuota, await used(), await rows()], [1, 100, 48]);
    equal((await make().report()).lastError, 'QUOTA_EXCEEDED');
    await assert.rejects(make().sync(), e => e.getStatus?.() === 429); checks++;
    equal(adapterCalls - callsBeforeQuota, 1);

    // Browser-facing roles have no table or RPC access.
    for (const role of ['anon', 'authenticated']) {
      await db.exec('RESET ROLE; SET ROLE ' + role);
      for (const fn of FUNCTIONS) await rejects(db.query('SELECT public.' + fn, fn.includes('$1') ? [owner.token] : []), '42501');
      for (const table of ['seo_search_sync_state', 'seo_search_metrics_daily'])
        await rejects(db.query('SELECT 1 FROM public.' + table + ' LIMIT 1'), '42501');
    }
    await db.exec('RESET ROLE');

    // Repeat install refuses and preserves data.
    await assert.rejects(db.exec(MIGRATION)); checks++;
    await db.exec('ROLLBACK').catch(() => {});
    equal([await rows(), await scalar('SELECT count(*)::int FROM seo_search_sync_state')], [48, 1]);

    // Pause revokes RPCs only; rows/usage stay; service fails closed with 503.
    await db.exec(PAUSE);
    const paused = await metadata();
    equal(Object.entries(paused).filter(([, s]) => s === 'FAIL').map(([n]) => n).sort(),
      Object.keys(paused).filter(n => n.includes('(')).sort());
    equal(paused['public.seo_search_metrics_daily'], 'PASS');
    await db.exec('SET ROLE service_role');
    await assert.rejects(make().report(), e => e.getStatus?.() === 503); checks++;
    await assert.rejects(make().sync(), e => e.getStatus?.() === 503); checks++;
    await db.exec('RESET ROLE');
    equal([await rows(), await used()], [48, 100]);

    const report = {batch: 'P2-02b', result: 'PASS', checks, exactSql: true, realTsServiceRepository: true,
      property: 'sc-domain:mock.example.invalid', source: 'mock', adapterCalls, googleCalls: 0, hostedWrites: 0,
      restartReadsWithoutProvider: true, leaseCas: true, durableBudgetPerAttempt: true, pausePreservesRows: true};
    if (process.env.SEARCH_STORE_REPORT) fs.writeFileSync(process.env.SEARCH_STORE_REPORT, JSON.stringify(report, null, 2) + '\n');
    console.log(JSON.stringify(report));
  } finally {await db.close();}
})().catch(e => {console.error('SEARCH_CONSOLE_STORE_FAILED', e?.message ?? ''); process.exitCode = 1;});
