// Owner-approved REAL Cloudflare siteverify acceptance using ONLY Cloudflare's public,
// documented TEST keys (hard-coded here; apps/api/.env is not read). Exactly two POSTs:
//   1) always-pass test secret + dummy token  → expect accepted by the real service path
//   2) always-fail test secret + dummy token  → expect 403 mapping
// No customer data, no real keys, no retries.
//   node scripts/check-turnstile-live.cjs --allow-cloudflare-test-call
require('ts-node/register/transpile-only');
const {Logger} = require('@nestjs/common');
const {loadIntegrationRegistry} = require('../src/integrations/integrations.config');
const {IntegrationExecutor} = require('../src/integrations/integration-executor');
const {ContactProtectionService, turnstileLiveConfig} = require('../src/integrations/contact-protection.service');
const {SiteverifyTurnstileAdapter} = require('../src/integrations/turnstile.adapter');

Logger.overrideLogger(false);
const SITEVERIFY = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
const DUMMY = 'XXXX.DUMMY.TOKEN.XXXX';
const CASES = [
  {name: 'always_pass_secret', site: '1x00000000000000000000AA', secret: '1x0000000000000000000000000000000AA', expect: 'accepted'},
  {name: 'always_fail_secret', site: '2x00000000000000000000AB', secret: '2x0000000000000000000000000000000AA', expect: 'rejected'},
];

(async () => {
  if (!process.argv.includes('--allow-cloudflare-test-call')) {
    console.log('REFUSED: pass --allow-cloudflare-test-call (owner approval required, 2 requests to Cloudflare)');
    process.exitCode = 2; return;
  }
  let requests = 0;
  const results = [];
  for (const c of CASES) {
    const observed = {};
    // Real fetch, fixed endpoint only; records public response fields from Cloudflare's test keys.
    const transport = async (url, init) => {
      if (url !== SITEVERIFY || requests >= CASES.length) throw new Error('REFUSED_TARGET');
      requests++;
      const started = Date.now();
      const response = await fetch(url, init);
      observed.httpStatus = response.status;
      observed.ms = Date.now() - started;
      const text = await response.clone().text();
      try {
        const body = JSON.parse(text);
        Object.assign(observed, {success: body.success, action: body.action ?? null, hostname: body.hostname ?? null,
          challengeTsPresent: typeof body.challenge_ts === 'string', errorCodes: Array.isArray(body['error-codes']) ? body['error-codes'] : null});
      } catch {observed.parse = 'non_json';}
      return response;
    };
    const values = {FEATURE_TURNSTILE_ENABLED: 'true', INTEGRATIONS_ENV: 'staging', TURNSTILE_SITE_KEY: c.site, TURNSTILE_SECRET_KEY: c.secret};
    const reader = {get: key => values[key]};
    const registry = loadIntegrationRegistry(reader), live = turnstileLiveConfig(reader);
    const service = new ContactProtectionService(registry, 'development', new IntegrationExecutor(registry), undefined, Date.now,
      {config: live, adapter: new SiteverifyTurnstileAdapter(live.secret, transport)});
    let outcome;
    try {await service.verify(DUMMY); outcome = 'accepted';}
    catch (e) {outcome = e?.getStatus?.() === 403 ? 'rejected' : e?.getStatus?.() === 503 ? 'unavailable' : 'error';}
    results.push({case: c.name, expected: c.expect, outcome, status: outcome === c.expect ? 'PASS' : 'FAIL', observed});
  }
  for (const r of results) console.log(`${r.status}  ${r.case}  outcome=${r.outcome}  ${JSON.stringify(r.observed)}`);
  const failed = results.filter(r => r.status !== 'PASS').length;
  console.log(JSON.stringify({result: failed ? 'FAIL' : 'PASS', requests, keys: 'cloudflare_documented_test_keys_only', envRead: false}));
  if (failed) process.exitCode = 1;
})().catch(() => {console.log('TURNSTILE_LIVE_CHECK_ERROR'); process.exitCode = 1;});
