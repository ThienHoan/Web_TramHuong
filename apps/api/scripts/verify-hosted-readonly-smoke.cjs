// Offline test for hosted-readonly-smoke.cjs: a local fake PostgREST on 127.0.0.1 with
// sentinel keys. Proves PASS on a healthy store, FAIL when anon can read or a response is
// malformed, that only reads are sent, and that no sentinel (URL/key/message) is printed.
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {execFile} = require('node:child_process');

const SERVICE = 'SENTINEL_SERVICE_KEY_x9', ANON = 'SENTINEL_ANON_KEY_y8';
const providers = ['resend', 'gemini', 'pgvector', 'cloudinary', 'google', 'ga4', 'search_console', 'merchant', 'pagespeed', 'turnstile'];
const ops = () => ({source: 'test_db_mock', observedAt: new Date().toISOString(), windowDays: 7, usageDay: '2026-11-05',
  providers: Object.fromEntries(providers.map(p => [p, {outbox: {queued: 0, working: 0, accepted: 0, unknown: 0, dead: 0, lastAcceptedAt: null, lastErrorCode: null}, usage: []}])),
  searchConsole: {lastSuccessAt: null, lastAttemptAt: null, lastErrorCode: null},
  pagespeed: {lastSuccessAt: null, lastAttemptAt: null, lastErrorCode: null}, merchantFence: {inflight: 0}});
const reads = {
  integration_ops_metrics_mock: ops,
  seo_search_read_mock: () => ({source: 'mock', property: 'sc-domain:mock.example.invalid', version: 0, window: [], truncatedDates: [], days: [], lastSyncedAt: null, lastAttemptAt: null, lastError: null, syncing: false}),
  seo_pagespeed_read_mock: () => ({source: 'mock', reports: []}),
  integration_merchant_fence_ready_mock: () => true,
};

async function scenario(mode) {
  const seen = [];
  const server = http.createServer((req, res) => {
    let body = '';
    req.on('data', d => {body += d;}).on('end', () => {
      const key = req.headers.apikey;
      seen.push({method: req.method, path: req.url.split('?')[0], role: key === SERVICE ? 'service' : key === ANON ? 'anon' : 'other'});
      const deny = () => {res.writeHead(401, {'content-type': 'application/json'}); res.end(JSON.stringify({code: '42501', message: 'permission denied SENTINEL_MESSAGE_LEAK'}));};
      const send = data => {res.writeHead(200, {'content-type': 'application/json'}); res.end(JSON.stringify(data));};
      const rpc = req.url.match(/^\/rest\/v1\/rpc\/([a-z_]+)/)?.[1];
      if (key === ANON && mode !== 'anon_allowed') return deny();
      if (rpc && reads[rpc]) return send(mode === 'malformed' && rpc === 'integration_ops_metrics_mock' ? {source: 'google'} : reads[rpc]());
      if (req.url.startsWith('/rest/v1/integration_outbox')) return send([]);
      res.writeHead(404); res.end('{}');
    });
  });
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hosted-smoke-'));
  fs.mkdirSync(path.join(dir, 'api')); fs.mkdirSync(path.join(dir, 'web'));
  fs.writeFileSync(path.join(dir, 'api/.env'), `SUPABASE_URL=http://127.0.0.1:${server.address().port}\nSUPABASE_SERVICE_ROLE_KEY=${SERVICE}\n`);
  fs.writeFileSync(path.join(dir, 'web/.env'), `NEXT_PUBLIC_SUPABASE_ANON_KEY=${ANON}\n`);
  const out = await new Promise(resolve => execFile(process.execPath, [path.join(__dirname, 'hosted-readonly-smoke.cjs')],
    {env: {...process.env, READINESS_ROOT: dir}, timeout: 60000}, (error, stdout, stderr) => resolve({code: error?.code ?? 0, text: stdout + stderr})));
  server.close(); fs.rmSync(dir, {recursive: true, force: true});
  return {...out, seen, port: String(server.address()?.port ?? '')};
}

(async () => {
  let checks = 0;
  const healthy = await scenario('healthy');
  assert.match(healthy.text, /"result":"PASS"/); checks++;
  assert.equal(healthy.code, 0); checks++;
  for (const r of [await scenario('anon_allowed'), await scenario('malformed')]) {
    assert.match(r.text, /"result":"FAIL"/); checks++;
    assert.equal(r.code, 1); checks++;
  }
  for (const r of [healthy]) {
    assert.ok(!/SENTINEL|127\.0\.0\.1/.test(r.text), 'leaked sentinel or URL'); checks++;
    // Only reads: RPC POSTs to the four allowlisted functions and one GET on the outbox.
    const rpcs = [...new Set(r.seen.filter(s => s.method === 'POST').map(s => s.path))].sort();
    assert.deepEqual(rpcs, ['/rest/v1/rpc/integration_merchant_fence_ready_mock', '/rest/v1/rpc/integration_ops_metrics_mock',
      '/rest/v1/rpc/seo_pagespeed_read_mock', '/rest/v1/rpc/seo_search_read_mock']); checks++;
    assert.ok(r.seen.every(s => s.method === 'POST' || s.method === 'GET')); checks++;
    assert.equal(r.seen.length, 7); checks++;
  }
  console.log(JSON.stringify({result: 'PASS', checks, network: 'loopback_fake_only'}));
})().catch(e => {console.error('HOSTED_SMOKE_TEST_FAILED', e?.message ?? ''); process.exitCode = 1;});
