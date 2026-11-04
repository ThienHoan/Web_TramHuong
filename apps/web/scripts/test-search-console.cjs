// Runs the real TS schema/fetch adapter with an injected fetch. No env or server.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const code = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src/lib/search-console.ts'), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
function load(transport, timers = {}) {
  const exports = {};
  vm.runInNewContext(code, { exports, URL, AbortController, fetch: transport,
    setTimeout: timers.setTimeout ?? setTimeout, clearTimeout: timers.clearTimeout ?? clearTimeout,
    require: name => {
      if (name === 'zod') return require('zod');
      if (name === '@/services/base-http') return { API_URL: '/api' };
      throw new Error('UNEXPECTED_DEPENDENCY');
    },
  });
  return exports;
}
const report = {
  source: 'mock', mode: 'mock', property: 'sc-domain:mock.example.invalid', persistence: 'process_memory',
  schedulerEnabled: false, topRowsOnly: true, propertyTotals: false, window: null,
  lastSyncedAt: null, lastAttemptAt: null, lastError: null, syncing: false, freshness: 'never_synced', latestDataDate: null,
  missingDates: [], truncatedDates: [], comparisonComplete: false, queries: [], pages: [], opportunities: [],
};
test('validates mock source and fails closed for live/scheduled/unknown property contracts', () => {
  const { searchConsoleSchema: schema } = load();
  assert.equal(schema.safeParse(report).success, true);
  for (const patch of [{ source: 'live' }, { schedulerEnabled: true }, { property: 'sc-domain:real.example' }, { propertyTotals: true }]) {
    assert.equal(schema.safeParse({ ...report, ...patch }).success, false);
  }
});
test('rejects malformed, external and PII-bearing page URLs without throwing', () => {
  const { searchConsoleSchema: schema } = load();
  for (const key of ['broken', 'https://real.example/', 'https://mock.example.invalid/?email=secret', 'https://user:pass@mock.example.invalid/']) {
    assert.equal(schema.safeParse({ ...report, opportunities: [{ key, clicks: 1, impressions: 50, ctr: 0.02, position: 2 }] }).success, false);
  }
});
test('GET is read-only, fixed local path, no bearer token in URL/body', async () => {
  const calls = [];
  const { fetchSearchConsole } = load(async (...args) => { calls.push(args); return { ok: true, json: async () => report }; });
  const result = await fetchSearchConsole('private-fixture-token');
  assert.equal(result.freshness, 'never_synced');
  const [url, options] = calls[0];
  assert.equal(url, '/api/admin/seo/search-console/summary');
  assert.equal(options.method, 'GET'); assert.equal(options.cache, 'no-store'); assert.equal(options.body, undefined);
  assert.equal(options.headers.Authorization, 'Bearer private-fixture-token');
});
test('POST sends mock intent only, no browser URL/property/prices', async () => {
  const calls = [];
  const { fetchSearchConsole } = load(async (...args) => { calls.push(args); return { ok: true, json: async () => report }; });
  await fetchSearchConsole('fixture', true);
  assert.equal(calls[0][0], '/api/admin/seo/search-console/sync');
  assert.equal(calls[0][1].method, 'POST'); assert.deepEqual(JSON.parse(calls[0][1].body), { source: 'mock' });
});
test('quota/auth errors are safe and never retried', async () => {
  for (const [status, message] of [[429, 'LIMIT'], [401, 'AUTH'], [403, 'AUTH'], [503, 'UNAVAILABLE']]) {
    let calls = 0;
    const { fetchSearchConsole } = load(async () => { calls++; return { ok: false, status, json: async () => { throw new Error('SECRET_MUST_NOT_BE_READ'); } }; });
    await assert.rejects(fetchSearchConsole('fixture', true), error => error.message === message);
    assert.equal(calls, 1);
  }
});
test('timeout aborts transport and timer is always released', async () => {
  let callback, cleared = false;
  const { fetchSearchConsole } = load((_url, { signal }) => new Promise((_resolve, reject) => {
    signal.addEventListener('abort', () => reject(new Error('ABORTED')));
  }), { setTimeout: fn => { callback = fn; return 1; }, clearTimeout: () => { cleared = true; } });
  const result = fetchSearchConsole('fixture'); callback();
  await assert.rejects(result, /ABORTED/); assert.equal(cleared, true);
});
test('invalid response is rejected rather than displayed as zero metrics', async () => {
  const { fetchSearchConsole } = load(async () => ({ ok: true, json: async () => ({ mode: 'mock' }) }));
  await assert.rejects(fetchSearchConsole('fixture'));
});
