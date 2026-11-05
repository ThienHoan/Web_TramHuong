// Owner-approved WRITE smoke on the Supabase TEST project (apps/api/.env): one Search
// Console MOCK sync and one PageSpeed MOCK audit through the real services/repositories,
// then read back via fresh instances and the ops-metrics RPC. Synthetic property/origin
// only; no Google call, no order/product/user row touched. RPCs outside the allowlist
// are refused before any request. Prints counts/statuses only — never URL, keys, rows.
//   node scripts/hosted-write-smoke.cjs --allow-test-db-writes
require('ts-node/register/transpile-only');
const fs = require('node:fs');
const path = require('node:path');
const dotenv = require('dotenv');
const {createClient} = require('@supabase/supabase-js');
const {ConfigService} = require('@nestjs/config');
const {Logger} = require('@nestjs/common');
const {loadIntegrationRegistry} = require('../src/integrations/integrations.config');
const {IntegrationExecutor} = require('../src/integrations/integration-executor');
const {IntegrationRepository} = require('../src/integrations/integration.repository');
const {IntegrationHealthService} = require('../src/integrations/integration-health.service');
const {OpsMetricsRepository} = require('../src/integrations/ops-metrics.repository');
const {SearchConsoleService} = require('../src/analytics/search-console.service');
const {SearchConsoleRepository} = require('../src/analytics/search-console.repository');
const {MockSearchConsoleAdapter} = require('../src/analytics/search-console.adapter');
const {PagespeedService} = require('../src/analytics/pagespeed.service');
const {PagespeedRepository} = require('../src/analytics/pagespeed.repository');
const {MockPagespeedAdapter} = require('../src/analytics/pagespeed.adapter');

Logger.overrideLogger(false);
const ALLOWED_RPCS = new Set(['seo_search_read_mock', 'seo_search_begin_mock', 'seo_search_complete_mock', 'seo_search_fail_mock',
  'seo_pagespeed_read_mock', 'seo_pagespeed_begin_mock', 'seo_pagespeed_record_mock', 'seo_pagespeed_fail_mock',
  'integration_reserve_usage', 'integration_ops_metrics_mock']);
const MAX_REQUESTS = 40;
const root = process.env.READINESS_ROOT ? path.resolve(process.env.READINESS_ROOT) : path.join(__dirname, '../..');
const api = (() => {const f = path.join(root, 'api/.env'); return fs.existsSync(f) ? dotenv.parse(fs.readFileSync(f)) : {};})();
const say = s => console.log(s);

(async () => {
  if (!process.argv.includes('--allow-test-db-writes')) {say('REFUSED: pass --allow-test-db-writes (owner-approved TEST DB only)'); process.exitCode = 2; return;}
  if (api.INTEGRATIONS_ENV !== 'mock' || !['development', 'test'].includes(api.NODE_ENV)) {
    say('REFUSED: apps/api/.env must have INTEGRATIONS_ENV=mock and NODE_ENV=development|test'); process.exitCode = 2; return;
  }
  if (!String(api.SUPABASE_URL ?? '').trim() || !String(api.SUPABASE_SERVICE_ROLE_KEY ?? '').trim()) {
    say('REFUSED: SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY missing'); process.exitCode = 2; return;
  }
  const real = createClient(api.SUPABASE_URL.trim(), api.SUPABASE_SERVICE_ROLE_KEY.trim(),
    {auth: {persistSession: false, autoRefreshToken: false, detectSessionInUrl: false}});
  const counts = {};
  let requests = 0;
  // Allowlisted RPC only; same call shape the repositories use (.rpc(...)[.abortSignal]).
  const client = {rpc: (name, args) => {
    if (!ALLOWED_RPCS.has(name) || requests >= MAX_REQUESTS) {
      const refused = Promise.resolve({data: null, error: {code: 'REFUSED'}});
      refused.abortSignal = () => refused; return refused;
    }
    requests++; counts[name] = (counts[name] ?? 0) + 1;
    const q = real.rpc(name, args);
    const p = q.abortSignal(AbortSignal.timeout(10000));
    p.abortSignal = () => p;
    return p;
  }};
  const supabase = {getClient: () => client};
  // In-process flags only; .env is not modified.
  const config = new ConfigService({...api, FEATURE_SEARCH_CONSOLE_SYNC_ENABLED: 'true', FEATURE_PAGESPEED_AUDIT_ENABLED: 'true',
    FEATURE_SEARCH_CONSOLE_PERSISTENCE_ENABLED: 'true', FEATURE_PAGESPEED_PERSISTENCE_ENABLED: 'true',
    FEATURE_INTEGRATION_OPS_METRICS_ENABLED: 'true'});
  const registry = loadIntegrationRegistry(config);
  const usage = new IntegrationRepository(supabase);
  const executor = () => new IntegrationExecutor(registry);
  const gsc = () => new SearchConsoleService(registry, api.NODE_ENV, executor(), new MockSearchConsoleAdapter(), Date.now,
    new SearchConsoleRepository(supabase, usage));
  const psi = () => new PagespeedService(registry, api.NODE_ENV, executor(), new MockPagespeedAdapter(), Date.now, undefined,
    new PagespeedRepository(supabase, usage));
  const result = {steps: []};
  const step = async (name, fn) => {
    try {const summary = await fn(); result.steps.push({step: name, status: 'PASS', summary});}
    catch (e) {result.steps.push({step: name, status: 'FAIL', code: /^[A-Z_]{1,60}$/.test(String(e?.message)) ? e.message : (e?.getStatus?.() ?? 'ERROR')});}
  };

  await step('search_console_mock_sync', async () => {
    const r = await gsc().sync();
    if (r.persistence !== 'database' || r.lastError !== null) throw new Error('UNEXPECTED_SYNC_STATE');
    return {days: r.daily.length, missingDays: r.missingDates.length, rows: r.daily.reduce((n, d) => n + d.rowCount, 0), property: r.property};
  });
  await step('pagespeed_mock_audit', async () => {
    const r = await psi().audit('home_vi', 'mobile');
    const pair = r.reports.find(x => x.targetId === 'home_vi' && x.strategy === 'mobile');
    return {result: r.result, persistence: r.persistence, history: pair.history.length};
  });
  await step('readback_fresh_instances', async () => {
    const g = await gsc().report(), p = await psi().report();
    const pair = p.reports.find(x => x.targetId === 'home_vi' && x.strategy === 'mobile');
    if (!g.lastSyncedAt || !pair.latest) throw new Error('READBACK_EMPTY');
    return {gscFreshness: g.freshness, gscDays: g.daily.length, psiHistory: pair.history.length, psiFieldData: pair.latest.field.status};
  });
  await step('dashboard_ops_metrics', async () => {
    const report = await new IntegrationHealthService(registry, config, new OpsMetricsRepository(supabase)).report();
    if (report.metricsSource !== 'test_db_mock') throw new Error('METRICS_' + String(report.metricsSource).toUpperCase());
    const m = id => report.providers.find(x => x.provider === id).metrics;
    return {metricsSource: report.metricsSource,
      search_console: {available: m('search_console').available, quotaUsed: m('search_console').quotaUsed, quotaLimit: m('search_console').quotaLimit, lastSuccess: !!m('search_console').lastSuccessAt},
      pagespeed: {available: m('pagespeed').available, quotaUsed: m('pagespeed').quotaUsed, lastSuccess: !!m('pagespeed').lastSuccessAt}};
  });

  for (const s of result.steps) say(`${s.status}  ${s.step}  ${s.summary ? JSON.stringify(s.summary) : 'code=' + s.code}`);
  const failed = result.steps.filter(s => s.status !== 'PASS').length;
  say(JSON.stringify({result: failed ? 'FAIL' : 'PASS', failed, requests, rpcCounts: counts, googleCalls: 0, project: '(hidden)'}));
  if (failed) process.exitCode = 1;
})().catch(() => {say('HOSTED_WRITE_SMOKE_ERROR (details hidden)'); process.exitCode = 1;});
