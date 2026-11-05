const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const code = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src/lib/integration-health.ts'), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const ids = ['ghn', 'resend', 'gemini', 'pgvector', 'cloudinary', 'google', 'ga4', 'search_console', 'merchant', 'pagespeed', 'turnstile'];
const empty = () => ({ available: false, lastSuccessAt: null, lastErrorCode: null, failRate: null, quotaMetric: null,
  quotaUsed: null, quotaLimit: null, quotaAlert: null, backlog: null, inflight: null, liveUsage: null, estimatedMonthlySpend: null });
const live = () => ({ available: true, lastSuccessAt: '2026-11-05T08:00:00.000Z', lastErrorCode: 'UNAVAILABLE', failRate: 0.5,
  quotaMetric: 'emails', quotaUsed: 82, quotaLimit: 100, quotaAlert: 'warn_80',
  backlog: { queued: 0, working: 0, accepted: 1, unknown: 1, dead: 0 }, inflight: null, liveUsage: null, estimatedMonthlySpend: null });
const withMetrics = () => {
  const value = snapshot();
  Object.assign(value, { metricsSource: 'test_db_mock', metricsObservedAt: '2026-11-05T09:00:00.000Z', metricsWindowDays: 7, liveUsageSource: 'test_db' });
  value.providers[1].metrics = live();
  return value;
};
const snapshot = () => ({
  source: 'configuration_and_documented_evidence', observedAt: '2026-11-05T00:00:00.000Z',
  probesPerformed: false, releaseReady: false, policyScope: 'new_integration_paths_only',
  financialSource: 'internal_database', metricsSource: 'unavailable_no_runtime_probe',
  metricsObservedAt: null, metricsWindowDays: null, liveUsageSource: null,
  providers: ids.map(provider => ({
    provider, flag: 'FEATURE_FIXTURE_ENABLED', enabled: false, environment: 'mock', mode: 'disabled',
    fallback: 'disabled', implementation: 'mock', evidence: 'fixture', legacyPathOutsideRegistry: false,
    liveReadiness: 'not_certified', blockers: ['FIXTURE_BLOCKER'],
    metrics: empty(),
  })),
});
function load(fetch = () => { throw new Error('NETWORK_FORBIDDEN'); }, timers = {}) {
  const exports = {};
  vm.runInNewContext(code, {
    exports, URL, AbortController, fetch, setTimeout: timers.setTimeout ?? setTimeout, clearTimeout: timers.clearTimeout ?? clearTimeout,
    require: name => {
      if (name === 'zod') return require('zod');
      if (name === '@/services/base-http') return { API_URL: '/api' };
      throw new Error('UNEXPECTED_DEPENDENCY');
    },
  });
  return exports;
}
test('validates exactly eleven unique integrations with explicit unknown runtime data', () => {
  const { integrationHealthSchema: schema } = load();
  assert.equal(schema.safeParse(snapshot()).success, true);
  const duplicate = snapshot(); duplicate.providers[1].provider = 'ghn';
  assert.equal(schema.safeParse(duplicate).success, false);
  const missing = snapshot(); missing.providers.pop();
  assert.equal(schema.safeParse(missing).success, false);
});
test('rejects false live/readiness/financial claims and invented runtime numbers', () => {
  const { integrationHealthSchema: schema } = load();
  for (const patch of [{ releaseReady: true }, { probesPerformed: true }, { financialSource: 'ga4' }, { source: 'live' }])
    assert.equal(schema.safeParse({ ...snapshot(), ...patch }).success, false);
  const forged = snapshot(); forged.providers[0].metrics.quotaUsed = 0;
  assert.equal(schema.safeParse(forged).success, false);
});
test('manual read uses fixed internal GET/no-store and never places token in URL', async () => {
  const calls = [];
  const { fetchIntegrationHealth } = load(async (...args) => { calls.push(args); return { ok: true, json: async () => snapshot() }; });
  const result = await fetchIntegrationHealth('synthetic-private-token');
  assert.equal(result.providers.length, 11);
  assert.equal(calls.length, 1);
  assert.equal(calls[0][0], '/api/integrations/admin/health');
  assert.equal(calls[0][1].method, 'GET');
  assert.equal(calls[0][1].cache, 'no-store');
  assert.equal(calls[0][1].body, undefined);
  assert.equal(calls[0][1].headers.Authorization, 'Bearer synthetic-private-token');
});
test('missing auth prevents all requests', async () => {
  let calls = 0;
  const { fetchIntegrationHealth } = load(async () => { calls++; });
  await assert.rejects(fetchIntegrationHealth(''), /AUTH/);
  assert.equal(calls, 0);
});
test('HTTP failure never reads provider error body and is never retried', async () => {
  for (const [status, expected] of [[401, 'AUTH'], [403, 'AUTH'], [500, 'UNAVAILABLE']]) {
    let calls = 0;
    const { fetchIntegrationHealth } = load(async () => { calls++; return { ok: false, status, json: () => { throw new Error('SECRET_MUST_NOT_BE_READ'); } }; });
    await assert.rejects(fetchIntegrationHealth('fixture'), error => error.message === expected);
    assert.equal(calls, 1);
  }
});
test('malformed response is not presented as an empty healthy dashboard', async () => {
  const { fetchIntegrationHealth } = load(async () => ({ ok: true, json: async () => ({ secret: 'RAW_SENTINEL' }) }));
  await assert.rejects(fetchIntegrationHealth('fixture'), error => error.message === 'INVALID_RESPONSE');
});
test('timeout aborts and releases timer without retry', async () => {
  let timeout, cleared = false, calls = 0;
  const { fetchIntegrationHealth } = load((_url, { signal }) => {
    calls++; return new Promise((_resolve, reject) => signal.addEventListener('abort', () => reject(new Error('ABORTED'))));
  }, { setTimeout: callback => { timeout = callback; return 1; }, clearTimeout: () => { cleared = true; } });
  const pending = fetchIntegrationHealth('fixture'); timeout();
  await assert.rejects(pending, /ABORTED/);
  assert.equal(calls, 1); assert.equal(cleared, true);
});

test('accepts labelled test-DB metrics and rejects numbers under any other source', () => {
  const { integrationHealthSchema: schema } = load();
  assert.equal(schema.safeParse(withMetrics()).success, true);
  for (const source of ['unavailable_no_runtime_probe', 'store_unavailable']) {
    const forged = withMetrics(); forged.metricsSource = source;
    assert.equal(schema.safeParse(forged).success, false);
    const cleared = withMetrics(); cleared.metricsSource = source; cleared.metricsObservedAt = null; cleared.metricsWindowDays = null; cleared.liveUsageSource = null;
    cleared.providers[1].metrics = empty();
    assert.equal(schema.safeParse(cleared).success, true);
  }
  const noTime = withMetrics(); noTime.metricsObservedAt = null;
  assert.equal(schema.safeParse(noTime).success, false);
});
test('rejects invented spend, impossible rates and raw error text', () => {
  const { integrationHealthSchema: schema } = load();
  for (const patch of [{ estimatedMonthlySpend: 12 }, { failRate: 1.5 }, { quotaUsed: -1 }, { lastErrorCode: 'connect ECONNREFUSED 10.0.0.1' },
    { quotaAlert: 'fine' }, { backlog: { queued: 1.5, working: 0, accepted: 0, unknown: 0, dead: 0 } }]) {
    const value = withMetrics(); Object.assign(value.providers[1].metrics, patch);
    assert.equal(schema.safeParse(value).success, false, JSON.stringify(patch));
  }
  const otherWindow = withMetrics(); otherWindow.metricsWindowDays = 30;
  assert.equal(schema.safeParse(otherWindow).success, false);
});

test('accepts real-call budget only from the test DB and never above its limit', () => {
  const { integrationHealthSchema: schema } = load();
  const value = withMetrics();
  value.providers[2].metrics = { ...empty(), liveUsage: { requestsUsed: 1, requestsLimit: 200, tokensUsed: 749, tokensLimit: 300000, alert: 'ok' } };
  assert.equal(schema.safeParse(value).success, true);
  const over = structuredClone(value); over.providers[2].metrics.liveUsage.tokensUsed = 300001;
  assert.equal(schema.safeParse(over).success, false);
  const unavailable = structuredClone(value); unavailable.liveUsageSource = 'unavailable';
  assert.equal(schema.safeParse(unavailable).success, false);
  const noSource = structuredClone(value); noSource.metricsSource = 'unavailable_no_runtime_probe';
  assert.equal(schema.safeParse(noSource).success, false);
});
