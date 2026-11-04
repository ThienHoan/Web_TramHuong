// Real TS schema/fetch adapter, injected local transport. No env/server/API.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const code = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src/lib/pagespeed.ts'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
function load(fetch, timers = {}) {
  const exports = {};
  vm.runInNewContext(code, { exports, URL, AbortController, fetch,
    setTimeout: timers.setTimeout ?? setTimeout, clearTimeout: timers.clearTimeout ?? clearTimeout,
    require: name => { if (name === 'zod') return require('zod'); if (name === '@/services/base-http') return { API_URL: '/api' }; throw new Error('UNEXPECTED_DEPENDENCY'); },
  }); return exports;
}
function fixture() {
  const targets = ['home', 'catalog', 'product'].flatMap(kind => ['vi', 'en'].map(locale => {
    const path = '/' + locale + (kind === 'home' ? '' : '/products' + (kind === 'product' ? '/analytics-fixture' : ''));
    return { id: kind + '_' + locale, kind, locale, path, url: 'https://mock.example.invalid' + path };
  }));
  return { source: 'mock', mode: 'mock', persistence: 'process_memory', schedulerEnabled: false, cacheHours: 24, historyPerPair: 30, running: false,
    thresholds: { performanceScore: 10, lcpMs: 500, cls: 0.05, tbtMs: 200 }, targets,
    reports: targets.flatMap(target => ['mobile', 'desktop'].map(strategy => ({ targetId: target.id, strategy, latest: null, history: [], freshness: 'never_audited', lastAttemptAt: null, lastError: null, comparison: { status: 'no_baseline', alerts: [] } }))),
  };
}
function sample() { return { source: 'mock', targetId: 'home_vi', strategy: 'mobile', measuredAt: '2026-11-05T00:00:00Z', storedAt: '2026-11-05T00:00:00Z', lighthouseVersion: '13.0.0-mock', lab: { performanceScore: null, accessibilityScore: 95, bestPracticesScore: 96, seoScore: 98, lcpMs: null, cls: 0.04, tbtMs: 160 }, field: { status: 'unavailable', reason: 'MOCK_HAS_NO_FIELD_DATA', lcpMs: null, inpMs: null, cls: null } }; }
test('accepts empty mock summary, rejects live/scheduled/unbounded policy', () => {
  const { pagespeedSchema: schema } = load(); assert.equal(schema.safeParse(fixture()).success, true);
  for (const patch of [{ source: 'live' }, { schedulerEnabled: true }, { historyPerPair: 31 }, { cacheHours: 0 }]) assert.equal(schema.safeParse({ ...fixture(), ...patch }).success, false);
});
test('rejects malformed/external/PII URLs and unexpected target paths', () => {
  const { pagespeedSchema: schema } = load();
  for (const url of ['bad', 'https://real.example/vi', 'https://mock.example.invalid/vi?email=secret', 'https://user:pass@mock.example.invalid/vi']) {
    const report = fixture(); report.targets[0].url = url; assert.equal(schema.safeParse(report).success, false);
  }
  const report = fixture(); report.targets[0].path = '/checkout'; assert.equal(schema.safeParse(report).success, false);
});
test('rejects duplicate target/pair and excessive history or cross-strategy samples', () => {
  const { pagespeedSchema: schema } = load();
  let report = fixture(); report.targets[1] = report.targets[0]; assert.equal(schema.safeParse(report).success, false);
  report = fixture(); report.reports[1] = report.reports[0]; assert.equal(schema.safeParse(report).success, false);
  report = fixture(); report.reports[0].history = Array(31).fill(sample()); assert.equal(schema.safeParse(report).success, false);
  report = fixture(); report.reports[0].latest = { ...sample(), strategy: 'desktop' }; assert.equal(schema.safeParse(report).success, false);
});
test('preserves nullable lab metrics and never fills field INP from TBT', () => {
  const { pagespeedSchema: schema } = load(); const report = fixture(); report.reports[0].latest = sample(); report.reports[0].history = [sample()];
  const parsed = schema.parse(report); assert.equal(parsed.reports[0].latest.lab.performanceScore, null); assert.equal(parsed.reports[0].latest.field.inpMs, null);
  report.reports[0].latest.field.inpMs = 160; assert.equal(schema.safeParse(report).success, false);
});
test('rejects invalid score or numeric units instead of rendering misleading values', () => {
  const { pagespeedSchema: schema } = load();
  for (const patch of [{ performanceScore: 101 }, { lcpMs: '2200' }, { tbtMs: -1 }, { cls: Infinity }]) {
    const report = fixture(); report.reports[0].latest = sample(); Object.assign(report.reports[0].latest.lab, patch); assert.equal(schema.safeParse(report).success, false);
  }
});
test('GET reads fixed local path and never submits an audit', async () => {
  const calls = []; const { fetchPagespeed } = load(async (...args) => { calls.push(args); return { ok: true, json: async () => fixture() }; });
  await fetchPagespeed('private-fixture-token'); const [url, options] = calls[0];
  assert.equal(url, '/api/admin/seo/pagespeed/summary'); assert.equal(options.method, 'GET'); assert.equal(options.body, undefined); assert.equal(options.cache, 'no-store'); assert.equal(options.headers.Authorization, 'Bearer private-fixture-token');
});
test('POST sends only source/whitelist ID/strategy, never a URL, key or cookie', async () => {
  const calls = []; const { fetchPagespeed } = load(async (...args) => { calls.push(args); return { ok: true, json: async () => ({ ...fixture(), result: 'recorded' }) }; });
  await fetchPagespeed('fixture', { targetId: 'home_vi', strategy: 'mobile' });
  assert.equal(calls[0][0], '/api/admin/seo/pagespeed/audits'); assert.equal(calls[0][1].method, 'POST'); assert.deepEqual(JSON.parse(calls[0][1].body), { source: 'mock', targetId: 'home_vi', strategy: 'mobile' });
});
test('invalid intent fails before transport, including force cache bypass', async () => {
  let calls = 0; const { fetchPagespeed } = load(async () => { calls++; throw new Error('NETWORK_FORBIDDEN'); });
  for (const input of [{ targetId: 'http://localhost', strategy: 'mobile' }, { targetId: 'home_vi', strategy: 'tablet' }, { targetId: 'home_vi', strategy: 'mobile', force: true }]) await assert.rejects(fetchPagespeed('fixture', input));
  assert.equal(calls, 0);
});
test('quota/auth/busy errors are safe and never automatically retried', async () => {
  for (const [status, message] of [[429, 'LIMIT'], [401, 'AUTH'], [403, 'AUTH'], [409, 'BUSY'], [503, 'UNAVAILABLE']]) {
    let calls = 0; const { fetchPagespeed } = load(async () => { calls++; return { ok: false, status, json: async () => { throw new Error('RAW_ERROR_SENTINEL'); } }; });
    await assert.rejects(fetchPagespeed('fixture'), error => error.message === message); assert.equal(calls, 1);
  }
});
test('timeout aborts transport and clears timer', async () => {
  let callback, cleared = false;
  const { fetchPagespeed } = load((_url, { signal }) => new Promise((_resolve, reject) => signal.addEventListener('abort', () => reject(new Error('ABORTED')))), { setTimeout: fn => { callback = fn; return 1; }, clearTimeout: () => { cleared = true; } });
  const result = fetchPagespeed('fixture'); callback(); await assert.rejects(result, /ABORTED/); assert.equal(cleared, true);
});
