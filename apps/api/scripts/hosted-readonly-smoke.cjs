// READ-ONLY smoke test against the Supabase TEST project configured in apps/api/.env.
// Calls only four read RPCs with the backend key and checks the browser (anon) key is
// refused. Never writes, never prints the project URL, keys or raw error messages.
//   pnpm --dir apps/api run smoke:hosted-readonly
require('ts-node/register/transpile-only');
const fs = require('node:fs');
const path = require('node:path');
const dotenv = require('dotenv');
const {createClient} = require('@supabase/supabase-js');
const {parseOpsMetrics} = require('../src/integrations/ops-metrics.repository');
const {parseStoredSearchSnapshot} = require('../src/analytics/search-console.repository');
const {parseStoredPagespeed} = require('../src/analytics/pagespeed.repository');

// READINESS_ROOT lets the offline test point at a synthetic apps/ folder.
const root = process.env.READINESS_ROOT ? path.resolve(process.env.READINESS_ROOT) : path.join(__dirname, '../..');
const env = file => {
  const full = path.join(root, file);
  return fs.existsSync(full) ? dotenv.parse(fs.readFileSync(full)) : {};
};
const api = env('api/.env'), web = env('web/.env');
const code = error => {
  const c = String(error?.code ?? '');
  return /^[A-Z0-9]{1,10}$/.test(c) ? c : 'ERR';
};
const READS = [
  ['integration_ops_metrics_mock', {p_window_days: 7}, data => {
    const m = parseOpsMetrics(data);
    const outbox = Object.fromEntries(Object.entries(m.providers)
      .map(([p, v]) => [p, v.outbox.queued + v.outbox.working + v.outbox.accepted + v.outbox.unknown + v.outbox.dead])
      .filter(([, n]) => n > 0));
    return {providers: Object.keys(m.providers).length, windowDays: m.windowDays, outboxRowsByProvider: outbox,
      usageRowsToday: Object.values(m.providers).reduce((n, v) => n + v.usage.length, 0),
      searchConsoleStore: m.searchConsole ? 'installed' : 'absent', pagespeedStore: m.pagespeed ? 'installed' : 'absent',
      merchantFence: m.merchantFence ? 'installed' : 'absent'};
  }],
  ['seo_search_read_mock', {}, data => {
    const s = parseStoredSearchSnapshot(data);
    return {days: s.window.length, synced: s.lastSyncedAt !== null, syncing: s.syncing};
  }],
  ['seo_pagespeed_read_mock', {}, data => ({pairsWithState: parseStoredPagespeed(data).length})],
  ['integration_merchant_fence_ready_mock', {}, data => {
    if (data !== true) throw new Error('NOT_READY');
    return {ready: true};
  }],
];

(async () => {
  for (const [file, name, vars] of [['api/.env', 'backend', ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY']], ['web/.env', 'browser', ['NEXT_PUBLIC_SUPABASE_ANON_KEY']]]) {
    const source = file === 'api/.env' ? api : web;
    const missing = vars.filter(v => !String(source[v] ?? '').trim());
    if (missing.length) {console.log(`REFUSED: ${name} config missing ${missing.join(',')} (${file})`); process.exitCode = 2; return;}
  }
  const url = api.SUPABASE_URL.trim();
  const options = {auth: {persistSession: false, autoRefreshToken: false, detectSessionInUrl: false}};
  const backend = createClient(url, api.SUPABASE_SERVICE_ROLE_KEY.trim(), options);
  const browser = createClient(url, web.NEXT_PUBLIC_SUPABASE_ANON_KEY.trim(), options);
  const results = [];
  let requests = 0;
  const call = (client, name, args) => {requests++; return client.rpc(name, args).abortSignal(AbortSignal.timeout(8000));};

  for (const [name, args, summarize] of READS) {
    try {
      const {data, error} = await call(backend, name, args);
      if (error) {results.push({check: 'backend_read ' + name, status: 'FAIL', code: code(error)}); continue;}
      results.push({check: 'backend_read ' + name, status: 'PASS', summary: summarize(data)});
    } catch (e) {
      results.push({check: 'backend_read ' + name, status: 'FAIL', code: e?.name === 'TimeoutError' ? 'TIMEOUT' : 'INVALID_RESPONSE'});
    }
  }
  // The browser key must not reach the private RPCs or tables.
  for (const name of ['integration_ops_metrics_mock', 'seo_search_read_mock']) {
    try {
      const {error} = await call(browser, name, name === 'integration_ops_metrics_mock' ? {p_window_days: 7} : {});
      results.push({check: 'anon_denied ' + name, status: error ? 'PASS' : 'FAIL', code: error ? code(error) : 'ALLOWED'});
    } catch {results.push({check: 'anon_denied ' + name, status: 'FAIL', code: 'NETWORK'});}
  }
  try {
    requests++;
    const {data, error} = await browser.from('integration_outbox').select('id').limit(1).abortSignal(AbortSignal.timeout(8000));
    results.push({check: 'anon_denied table integration_outbox', status: error ? 'PASS' : 'FAIL',
      code: error ? code(error) : 'READABLE_' + (Array.isArray(data) ? data.length : 0)});
  } catch {results.push({check: 'anon_denied table integration_outbox', status: 'FAIL', code: 'NETWORK'});}

  for (const r of results) console.log(`${r.status}  ${r.check}${r.code ? '  code=' + r.code : ''}${r.summary ? '  ' + JSON.stringify(r.summary) : ''}`);
  const failed = results.filter(r => r.status !== 'PASS').length;
  console.log(JSON.stringify({result: failed ? 'FAIL' : 'PASS', checks: results.length, failed, requests, writes: 0, project: '(hidden)'}));
  if (failed) process.exitCode = 1;
})().catch(() => {console.log('HOSTED_SMOKE_ERROR (details hidden)'); process.exitCode = 1;});
