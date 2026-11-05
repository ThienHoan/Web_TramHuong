// P2-03b: exact SQL + actual TS repository/service, synthetic allowlisted targets only.
// In-memory PostgreSQL (PGlite). No dotenv, Supabase, Google/PSI or AppModule.
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
const {MockPagespeedAdapter} = require('../src/analytics/pagespeed.adapter');
const {PagespeedService} = require('../src/analytics/pagespeed.service');
const {PagespeedRepository} = require('../src/analytics/pagespeed.repository');

Logger.overrideLogger(false);
const read = file => fs.readFileSync(path.join(__dirname, file), 'utf8');
const MIGRATION = read('../migrations/pagespeed-durable-mock.sql');
const PAUSE = read('../migrations/pagespeed-durable-mock.pause.sql');
const METADATA = read('../../../docs/integrations/verify-installed-pagespeed-store.sql');
const RECORD = 'SELECT public.seo_pagespeed_record_mock($1,$2,$3::jsonb) AS r';
const lab = (over = {}) => ({performanceScore: 86, accessibilityScore: 95, bestPracticesScore: 96, seoScore: 98,
  lcpMs: 2200, cls: 0.04, tbtMs: 160, ...over});
const sample = (targetId, strategy, measuredAt, over = {}) => JSON.stringify({source: 'mock', targetId, strategy,
  measuredAt, lighthouseVersion: '13.0.0-mock', lab: lab(over.lab), ...over.top});

(async () => {
  const db = await createPurchaseDatabase();
  let checks = 0, adapterCalls = 0;
  const equal = (a, b) => {assert.deepEqual(a, b); checks++;};
  const rejects = async (p, code) => {await assert.rejects(p, e => e.code === code); checks++;};
  const status = async (p, code) => {await assert.rejects(p, e => e.getStatus?.() === code); checks++;};
  const scalar = async (q, p = []) => Object.values((await db.query(q, p)).rows[0])[0];
  const metadata = async () => Object.fromEntries((await db.query(METADATA)).rows.map(r => [r.check_name, r.status]));
  const statuses = async () => [...new Set(Object.values(await metadata()))].sort();
  const owner = async sql => db.exec('RESET ROLE; ' + sql + '; SET ROLE service_role');
  try {
    equal(await statuses(), ['CHUA_CAI']);
    await db.exec(MIGRATION);
    equal(await statuses(), ['PASS']);

    const defs = {
      seo_pagespeed_read_mock: () => ['SELECT public.seo_pagespeed_read_mock() AS r', []],
      seo_pagespeed_begin_mock: a => ['SELECT public.seo_pagespeed_begin_mock($1,$2) AS r', [a.p_target, a.p_strategy]],
      seo_pagespeed_record_mock: a => [RECORD, [a.p_token, a.p_version, JSON.stringify(a.p_sample)]],
      seo_pagespeed_fail_mock: a => ['SELECT public.seo_pagespeed_fail_mock($1,$2,$3) AS r', [a.p_token, a.p_version, a.p_code]],
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
    const store = new PagespeedRepository(supabase, new IntegrationRepository(supabase));
    const registry = loadIntegrationRegistry(new ConfigService({FEATURE_PAGESPEED_AUDIT_ENABLED: 'true'}));
    const adapter = new MockPagespeedAdapter();
    const counted = {audit: (q, s) => {adapterCalls++; return adapter.audit(q, s);}};
    const make = (a = counted) => new PagespeedService(registry, 'test',
      new IntegrationExecutor(registry, {requestsPerMinute: 1000, mockDailyLimit: 10000}, Date.now, async () => {}, () => 0),
      a, Date.now, undefined, store);
    const pair = (r, t = 'home_vi', s = 'mobile') => r.reports.find(x => x.targetId === t && x.strategy === s);
    await db.exec('SET ROLE service_role');
    const samples = (t, s) => scalar('SELECT count(*)::int FROM seo_pagespeed_samples WHERE target_id=$1 AND strategy=$2', [t, s]);
    const used = () => scalar("SELECT coalesce(sum(used),0)::int FROM integration_usage_daily WHERE provider='pagespeed'");
    const age = (t, s) => owner(`UPDATE seo_pagespeed_samples SET stored_at=stored_at-interval '25 hours' WHERE target_id='${t}' AND strategy='${s}'`);

    const empty = await make().report();
    equal([empty.persistence, pair(empty).history.length, empty.running, adapterCalls], ['database', 0, false, 0]);

    const first = await make().audit('home_vi', 'mobile');
    equal([first.result, pair(first).history.length, pair(first).latest.field.status, await used(), adapterCalls],
      ['recorded', 1, 'unavailable', 1, 1]);

    // Restart reads history; a cache hit (DB clock) spends no budget and adds no row.
    const restarted = await make().report();
    equal([pair(restarted).history, adapterCalls], [pair(first).history, 1]);
    const cached = await make().audit('home_vi', 'mobile');
    equal([cached.result, await samples('home_vi', 'mobile'), await used(), adapterCalls], ['cached', 1, 1, 1]);

    // Older than 24h → new sample; history grows, comparison available.
    await age('home_vi', 'mobile');
    const second = await make().audit('home_vi', 'mobile');
    equal([second.result, pair(second).history.length, await used()], ['recorded', 2, 2]);
    equal(pair(second).comparison.status, 'comparable');

    // Lease on one pair blocks only that pair; other pairs proceed.
    const held = await scalar("SELECT public.seo_pagespeed_begin_mock('home_vi','desktop') AS r");
    const callsBefore = adapterCalls;
    await status(make().audit('home_vi', 'desktop'), 409);
    equal([adapterCalls, await used()], [callsBefore, 2]);
    equal((await make().report()).running, true);
    equal((await make().audit('catalog_vi', 'mobile')).result, 'recorded');

    // Expired lease → new generation; stale owner can neither record nor fail.
    await owner("UPDATE seo_pagespeed_audit_state SET lease_until=clock_timestamp()-interval '1 second' WHERE target_id='home_vi' AND strategy='desktop'");
    const fresh = await scalar("SELECT public.seo_pagespeed_begin_mock('home_vi','desktop') AS r");
    equal(fresh.version, held.version + 1);
    const now = Date.now(), iso = ms => new Date(ms).toISOString();
    await rejects(db.query(RECORD, [held.token, held.version, sample('home_vi', 'desktop', iso(now))]), 'PT409');
    await rejects(db.query("SELECT public.seo_pagespeed_fail_mock($1,$2,'TIMEOUT')", [held.token, held.version]), 'PT409');

    // Invalid/cross-pair/non-incremental samples roll back with no row change.
    const bad = [
      [sample('home_en', 'desktop', iso(now)), '22023'],
      [sample('home_vi', 'mobile', iso(now)), '22023'],
      [sample('home_vi', 'desktop', iso(now + 3600000)), '22023'],
      [sample('home_vi', 'desktop', iso(now - 2 * 86400000)), '22023'],
      [sample('home_vi', 'desktop', iso(now), {top: {source: 'google'}}), '22023'],
      [JSON.stringify({...JSON.parse(sample('home_vi', 'desktop', iso(now))), lab: {performanceScore: 1}}), '22023'],
      [sample('home_vi', 'desktop', iso(now), {lab: {performanceScore: '86'}}), '22023'],
      [sample('home_vi', 'desktop', iso(now), {lab: {performanceScore: 101}}), '23514'],
      [sample('home_vi', 'desktop', iso(now), {top: {lighthouseVersion: 'latest'}}), '23514'],
    ];
    for (const [payload, code] of bad) await rejects(db.query(RECORD, [fresh.token, fresh.version, payload]), code);
    equal([await samples('home_vi', 'desktop'), await samples('home_en', 'desktop')], [0, 0]);
    await db.query(RECORD, [fresh.token, fresh.version, sample('home_vi', 'desktop', iso(now - 60000))]);
    equal(await samples('home_vi', 'desktop'), 1);
    await rejects(db.query(RECORD, [fresh.token, fresh.version, sample('home_vi', 'desktop', iso(now))]), 'PT409');

    // Lease owner whose lease expired mid-run cannot publish; can only record its failure.
    await age('home_vi', 'desktop');
    const late = await scalar("SELECT public.seo_pagespeed_begin_mock('home_vi','desktop') AS r");
    equal(late.latestMeasuredAt !== null, true);
    await owner("UPDATE seo_pagespeed_audit_state SET lease_until=clock_timestamp()-interval '1 second' WHERE target_id='home_vi' AND strategy='desktop'");
    await rejects(db.query(RECORD, [late.token, late.version, sample('home_vi', 'desktop', iso(now))]), 'PT409');
    await rejects(db.query("SELECT public.seo_pagespeed_fail_mock($1,$2,'raw provider message')", [late.token, late.version]), '22023');
    await db.query("SELECT public.seo_pagespeed_fail_mock($1,$2,'TIMEOUT')", [late.token, late.version]);
    equal([pair(await make().report(), 'home_vi', 'desktop').lastError, await samples('home_vi', 'desktop')], ['TIMEOUT', 1]);

    // Service-level invalid provider data: recorded, history kept.
    await status(make({audit: async () => {adapterCalls++; return null;}}).audit('home_vi', 'desktop'), 503);
    equal([pair(await make().report(), 'home_vi', 'desktop').lastError, await samples('home_vi', 'desktop')], ['INVALID_RESPONSE', 1]);

    // Bounded history: newest 30 per pair survive 32 records.
    const base = now - 23 * 3600000;
    for (let i = 0; i < 32; i++) {
      const lease = await scalar("SELECT public.seo_pagespeed_begin_mock('product_vi','mobile') AS r");
      await db.query(RECORD, [lease.token, lease.version, sample('product_vi', 'mobile', iso(base + i * 60000))]);
      await age('product_vi', 'mobile');
    }
    equal(await samples('product_vi', 'mobile'), 30);
    equal(new Date(await scalar("SELECT min(measured_at) FROM seo_pagespeed_samples WHERE target_id='product_vi' AND strategy='mobile'")).toISOString(), iso(base + 2 * 60000));
    equal(pair(await make().report(), 'product_vi', 'mobile').history.length, 30);

    // Durable hard budget 100/day survives restarts: exhausted → 429 before provider.
    await owner("UPDATE integration_usage_daily SET used=100 WHERE provider='pagespeed'");
    const callsBeforeQuota = adapterCalls;
    await status(make().audit('product_en', 'mobile'), 429);
    equal([adapterCalls - callsBeforeQuota, await used(), await samples('product_en', 'mobile')], [0, 100, 0]);
    equal(pair(await make().report(), 'product_en', 'mobile').lastError, 'QUOTA_EXCEEDED');

    // Browser-facing roles have no table or RPC access.
    const fns = ["seo_pagespeed_read_mock()", "seo_pagespeed_begin_mock('home_vi','mobile')",
      "seo_pagespeed_record_mock($1::uuid,1,'{}'::jsonb)", "seo_pagespeed_fail_mock($1::uuid,1,'TIMEOUT')"];
    for (const role of ['anon', 'authenticated']) {
      await db.exec('RESET ROLE; SET ROLE ' + role);
      for (const fn of fns) await rejects(db.query('SELECT public.' + fn, fn.includes('$1') ? [late.token] : []), '42501');
      for (const table of ['seo_pagespeed_audit_state', 'seo_pagespeed_samples'])
        await rejects(db.query('SELECT 1 FROM public.' + table + ' LIMIT 1'), '42501');
    }
    await db.exec('RESET ROLE');

    // Repeat install refuses and preserves data.
    const totalRows = () => scalar('SELECT count(*)::int FROM seo_pagespeed_samples');
    const rowsBefore = await totalRows();
    await assert.rejects(db.exec(MIGRATION)); checks++;
    await db.exec('ROLLBACK').catch(() => {});
    equal(await totalRows(), rowsBefore);

    // Pause revokes RPCs only; rows/usage stay; service fails closed with 503.
    await db.exec(PAUSE);
    const paused = await metadata();
    equal(Object.entries(paused).filter(([, s]) => s === 'FAIL').map(([n]) => n).sort(),
      Object.keys(paused).filter(n => n.includes('(')).sort());
    equal([paused['public.seo_pagespeed_samples'], paused['public.seo_pagespeed_audit_state']], ['PASS', 'PASS']);
    await db.exec('SET ROLE service_role');
    await status(make().report(), 503);
    await status(make().audit('home_en', 'mobile'), 503);
    await db.exec('RESET ROLE');
    equal([await totalRows(), await used()], [rowsBefore, 100]);

    const report = {batch: 'P2-03b', result: 'PASS', checks, exactSql: true, realTsServiceRepository: true,
      origin: 'https://mock.example.invalid', source: 'mock', adapterCalls, psiCalls: 0, hostedWrites: 0,
      restartReadsWithoutProvider: true, dbClockCache24h: true, perPairLeaseCas: true, crossPairRefused: true,
      historyCap30: true, durableBudgetHard100: true, pausePreservesRows: true};
    if (process.env.PAGESPEED_STORE_REPORT) fs.writeFileSync(process.env.PAGESPEED_STORE_REPORT, JSON.stringify(report, null, 2) + '\n');
    console.log(JSON.stringify(report));
  } finally {await db.close();}
})().catch(e => {console.error('PAGESPEED_STORE_FAILED', e?.message ?? ''); process.exitCode = 1;});
