// Offline test for hosted-write-smoke.cjs against a loopback fake PostgREST that emulates
// the allowlisted RPCs. Proves gating (no flag / non-mock env → zero requests), a full run
// PASSes, only allowlisted RPC POSTs are sent, and no sentinel URL/key is printed.
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {execFile} = require('node:child_process');

const KEY = 'SENTINEL_SERVICE_KEY_w7';
const ALLOWED = ['seo_search_read_mock', 'seo_search_begin_mock', 'seo_search_complete_mock', 'seo_search_fail_mock',
  'seo_pagespeed_read_mock', 'seo_pagespeed_begin_mock', 'seo_pagespeed_record_mock', 'seo_pagespeed_fail_mock',
  'integration_reserve_usage', 'integration_ops_metrics_mock'];
const providers = ['resend', 'gemini', 'pgvector', 'cloudinary', 'google', 'ga4', 'search_console', 'merchant', 'pagespeed', 'turnstile'];
const TOKEN = '6f1c2b8e-3a4d-4c5e-9f00-112233445566';

function fakeServer() {
  const seen = [], usage = {};
  let gsc = null, psi = [];
  const emptyGsc = () => ({source: 'mock', property: 'sc-domain:mock.example.invalid', version: 0, window: [], truncatedDates: [], days: [], lastSyncedAt: null, lastAttemptAt: null, lastError: null, syncing: false});
  const handlers = {
    seo_search_read_mock: () => gsc ?? emptyGsc(),
    seo_search_begin_mock: () => ({token: TOKEN, version: 1, startedAt: new Date().toISOString()}),
    seo_search_complete_mock: b => (gsc = {source: 'mock', property: 'sc-domain:mock.example.invalid', version: 1, window: b.p_window,
      truncatedDates: b.p_truncated, days: b.p_days, lastSyncedAt: new Date().toISOString(), lastAttemptAt: new Date().toISOString(), lastError: null, syncing: false}),
    seo_pagespeed_read_mock: () => ({source: 'mock', reports: psi}),
    seo_pagespeed_begin_mock: () => ({cached: false, token: TOKEN, version: 1, startedAt: new Date().toISOString(), latestMeasuredAt: null}),
    seo_pagespeed_record_mock: b => {
      const s = b.p_sample;
      psi = [{targetId: s.targetId, strategy: s.strategy, lastAttemptAt: new Date().toISOString(), lastError: null, running: false,
        samples: [{measuredAt: s.measuredAt, storedAt: new Date().toISOString(), lighthouseVersion: s.lighthouseVersion, ...s.lab}]}];
      return {source: 'mock', reports: psi};
    },
    integration_reserve_usage: b => ({used: (usage[b.p_provider] = (usage[b.p_provider] ?? 0) + 1), hardLimit: b.p_hard_limit, newlyCrossed: [], day: '2026-11-05', source: 'mock'}),
    integration_ops_metrics_mock: () => ({source: 'test_db_mock', observedAt: new Date().toISOString(), windowDays: 7, usageDay: '2026-11-05',
      providers: Object.fromEntries(providers.map(p => [p, {outbox: {queued: 0, working: 0, accepted: 0, unknown: 0, dead: 0, lastAcceptedAt: null, lastErrorCode: null},
        usage: usage[p] ? [{metric: 'requests', used: usage[p], hardLimit: 100}] : []}])),
      searchConsole: {lastSuccessAt: gsc?.lastSyncedAt ?? null, lastAttemptAt: gsc?.lastAttemptAt ?? null, lastErrorCode: null},
      pagespeed: {lastSuccessAt: psi[0]?.samples[0]?.storedAt ?? null, lastAttemptAt: psi[0]?.lastAttemptAt ?? null, lastErrorCode: null},
      merchantFence: {inflight: 0}}),
  };
  const server = http.createServer((req, res) => {
    let body = '';
    req.on('data', d => {body += d;}).on('end', () => {
      const fn = req.url.match(/^\/rest\/v1\/rpc\/([a-z_]+)/)?.[1];
      seen.push({method: req.method, fn: fn ?? req.url.split('?')[0], authorized: req.headers.apikey === KEY});
      if (req.method !== 'POST' || !fn || !handlers[fn] || req.headers.apikey !== KEY) {res.writeHead(404); return res.end('{}');}
      res.writeHead(200, {'content-type': 'application/json'});
      res.end(JSON.stringify(handlers[fn](body ? JSON.parse(body) : {})));
    });
  });
  return {server, seen};
}

async function run(envText, args) {
  const {server, seen} = fakeServer();
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hosted-write-'));
  fs.mkdirSync(path.join(dir, 'api'));
  fs.writeFileSync(path.join(dir, 'api/.env'), envText.replace('PORT', String(server.address().port)));
  const out = await new Promise(resolve => execFile(process.execPath, [path.join(__dirname, 'hosted-write-smoke.cjs'), ...args],
    {env: {...process.env, READINESS_ROOT: dir}, timeout: 120000}, (e, so, se) => resolve({code: e?.code ?? 0, text: so + se})));
  server.close(); fs.rmSync(dir, {recursive: true, force: true});
  return {...out, seen};
}

(async () => {
  let checks = 0;
  const env = `NODE_ENV=development\nINTEGRATIONS_ENV=mock\nSUPABASE_URL=http://127.0.0.1:PORT\nSUPABASE_SERVICE_ROLE_KEY=${KEY}\n`;
  const noFlag = await run(env, []);
  assert.equal(noFlag.code, 2); assert.equal(noFlag.seen.length, 0); checks += 2;
  const staging = await run(env.replace('INTEGRATIONS_ENV=mock', 'INTEGRATIONS_ENV=staging'), ['--allow-test-db-writes']);
  assert.equal(staging.code, 2); assert.equal(staging.seen.length, 0); checks += 2;
  const full = await run(env, ['--allow-test-db-writes']);
  assert.match(full.text, /"result":"PASS"/, full.text); checks++;
  assert.equal(full.code, 0); checks++;
  assert.ok(!/SENTINEL|127\.0\.0\.1/.test(full.text), 'leak'); checks++;
  assert.ok(full.seen.every(s => s.method === 'POST' && ALLOWED.includes(s.fn) && s.authorized), 'non-allowlisted request'); checks++;
  assert.ok(full.seen.length <= 40); checks++;
  assert.equal(full.seen.filter(s => s.fn === 'integration_reserve_usage').length, 15); checks++; // 14 GSC + 1 PSI
  console.log(JSON.stringify({result: 'PASS', checks, requestsInFullRun: full.seen.length, network: 'loopback_fake_only'}));
})().catch(e => {console.error('HOSTED_WRITE_SMOKE_TEST_FAILED', e?.message ?? ''); process.exitCode = 1;});
