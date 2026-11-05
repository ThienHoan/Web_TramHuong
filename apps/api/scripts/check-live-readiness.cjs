// Live-readiness report from apps/api/.env and apps/web/.env WITHOUT printing any value.
// Prints variable NAMES with present/empty/missing, format verdicts (ok/invalid) and
// what code exists per provider. No network, no database, no provider call, no writes.
//   node scripts/check-live-readiness.cjs            human report
//   node scripts/check-live-readiness.cjs --json     machine report (still names only)
require('ts-node/register/transpile-only');
const fs = require('node:fs');
const path = require('node:path');
const dotenv = require('dotenv');
const {loadIntegrationRegistry} = require('../src/integrations/integrations.config');
const {GoogleDiagnosticsService} = require('../src/analytics/google-diagnostics.service');

// READINESS_ROOT lets tests point at a synthetic apps/ folder; default is this repo.
const root = process.env.READINESS_ROOT ? path.resolve(process.env.READINESS_ROOT) : path.join(__dirname, '../..');
function load(file) {
  const full = path.join(root, file);
  return fs.existsSync(full) ? dotenv.parse(fs.readFileSync(full)) : null;
}
const apiEnv = load('api/.env'), webEnv = load('web/.env');
const api = apiEnv ?? {}, web = webEnv ?? {};
const state = (env, name) => !Object.hasOwn(env, name) ? 'missing' : String(env[name]).trim() ? 'present' : 'empty';
const httpsPublic = value => {
  try {
    const u = new URL(String(value ?? ''));
    return u.protocol === 'https:' && !/^(localhost|127\.|0\.0\.0\.0|\[::1\])/.test(u.hostname) &&
      !/\.(localhost|local|internal|invalid|test|example)$/.test(u.hostname) ? 'ok' : 'invalid';
  } catch {return 'invalid';}
};

// code: existing | diagnostics_only | test_stream_only | authored_not_wired | missing | deferred
const PROVIDERS = [
  {id: 'database_test', code: 'existing', api: ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'],
    web: ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY'], owner: 'SQL packages via SQL Editor (verify-installed-all.sql)'},
  {id: 'smtp', code: 'existing', api: ['MAIL_HOST', 'MAIL_USER', 'MAIL_PASSWORD', 'MAIL_FROM']},
  {id: 'ghn', code: 'existing', api: ['GHN_ENABLED', 'GHN_ENV', 'GHN_TOKEN', 'GHN_SHOP_ID', 'GHN_WEBHOOK_SECRET'], owner: 'staging acceptance (docs/shipping)'},
  {id: 'google_sign_in', code: 'existing', web: ['NEXT_PUBLIC_SITE_URL'], owner: 'Supabase dashboard: Google provider + redirect allowlist'},
  {id: 'ga4', code: 'test_stream_only', api: ['GA4_MEASUREMENT_ID', 'GA4_API_SECRET']},
  {id: 'pagespeed', code: 'diagnostics_only', api: ['GOOGLE_APPROVED_PUBLIC_ORIGIN', 'PAGESPEED_API_KEY']},
  {id: 'search_console', code: 'diagnostics_only', api: ['GOOGLE_APPROVED_PUBLIC_ORIGIN', 'GOOGLE_SEARCH_CONSOLE_SITE_URL', 'GOOGLE_OAUTH_CLIENT_ID',
    'GOOGLE_OAUTH_CLIENT_SECRET', 'GOOGLE_TOKEN_KEY_ID', 'GOOGLE_TOKEN_ENCRYPTION_KEY', 'GOOGLE_SEARCH_CONSOLE_REFRESH_TOKEN_ENCRYPTED']},
  {id: 'turnstile', code: 'wired_needs_staging_gate', api: ['TURNSTILE_SITE_KEY', 'TURNSTILE_SECRET_KEY'], proposed: ['TURNSTILE_ALLOWED_HOSTNAMES']},
  {id: 'resend', code: 'missing', proposed: ['RESEND_API_KEY', 'RESEND_FROM']},
  {id: 'gemini', code: 'wired_needs_staging_gate', api: ['GEMINI_API_KEY', 'GEMINI_BILLING_TIER'], proposed: ['GEMINI_MODEL', 'GEMINI_PAYLOAD_POLICY', 'GEMINI_DAILY_REQUEST_LIMIT', 'GEMINI_DAILY_TOKEN_LIMIT'], owner: 'install integration-live-usage.sql; choose free/paid (data use)'},
  {id: 'merchant', code: 'missing', api: ['FRONTEND_URL'], proposed: ['MERCHANT_ACCOUNT_ID', 'MERCHANT_DATA_SOURCE']},
  {id: 'cloudinary', code: 'deferred'},
  {id: 'pgvector', code: 'deferred'},
];
// Names old code read; the current code ignores them (kept only so the owner can clean up).
const LEGACY_UNUSED = ['GOOGLE_MERCHANT_ID', 'GOOGLE_CLIENT_EMAIL', 'GOOGLE_PRIVATE_KEY'];

const config = {get: name => api[name]};
let registryError = null, registry = null;
try {registry = loadIntegrationRegistry(config);} catch (e) {registryError = String(e.message).replace(/[^A-Z0-9_ a-z.]/g, '').slice(0, 120);}
const diagnostics = registry ? new GoogleDiagnosticsService(config, registry).status().providers.map(p => ({
  provider: p.provider, reason: p.reason, missing: p.missing, configValid: p.configValid})) : [];

const report = {
  files: {apiEnv: apiEnv ? 'found' : 'missing', webEnv: webEnv ? 'found' : 'missing'},
  safety: {
    NODE_ENV: ['development', 'test', 'production'].includes(api.NODE_ENV) ? api.NODE_ENV : state(api, 'NODE_ENV'),
    INTEGRATIONS_ENV: ['mock', 'staging', 'production'].includes(api.INTEGRATIONS_ENV) ? api.INTEGRATIONS_ENV : state(api, 'INTEGRATIONS_ENV'),
    INTEGRATIONS_KILL_SWITCH: api.INTEGRATIONS_KILL_SWITCH === 'true' ? 'true' : 'false',
    GOOGLE_DIAGNOSTICS_ENABLED: api.GOOGLE_DIAGNOSTICS_ENABLED === 'true' ? 'true' : 'false',
    flagsOn: Object.keys(api).filter(k => /^(FEATURE_|CATALOG_FTS_)/.test(k) && api[k] === 'true').sort(),
    registry: registryError ? 'INVALID: ' + registryError : 'valid',
  },
  formats: {
    FRONTEND_URL: state(api, 'FRONTEND_URL') === 'present' ? httpsPublic(api.FRONTEND_URL) : state(api, 'FRONTEND_URL'),
    GOOGLE_APPROVED_PUBLIC_ORIGIN: state(api, 'GOOGLE_APPROVED_PUBLIC_ORIGIN') === 'present' ? httpsPublic(api.GOOGLE_APPROVED_PUBLIC_ORIGIN) : state(api, 'GOOGLE_APPROVED_PUBLIC_ORIGIN'),
    NEXT_PUBLIC_SITE_URL: state(web, 'NEXT_PUBLIC_SITE_URL') === 'present' ? httpsPublic(web.NEXT_PUBLIC_SITE_URL) : state(web, 'NEXT_PUBLIC_SITE_URL'),
    GA4_MEASUREMENT_ID: state(api, 'GA4_MEASUREMENT_ID') === 'present' ? (/^G-[A-Z0-9]{4,20}$/.test(api.GA4_MEASUREMENT_ID.trim()) ? 'ok' : 'invalid') : state(api, 'GA4_MEASUREMENT_ID'),
  },
  googleDiagnostics: diagnostics,
  providers: PROVIDERS.map(p => ({
    id: p.id, code: p.code,
    api: Object.fromEntries((p.api ?? []).map(n => [n, state(api, n)])),
    web: Object.fromEntries((p.web ?? []).map(n => [n, state(web, n)])),
    proposedNotYetRead: Object.fromEntries((p.proposed ?? []).map(n => [n, state(n.startsWith('NEXT_PUBLIC_') ? web : api, n)])),
    ownerOutsideEnv: p.owner ?? null,
  })),
  legacyUnusedPresent: LEGACY_UNUSED.filter(n => state(api, n) === 'present'),
};

if (process.argv.includes('--json')) {console.log(JSON.stringify(report, null, 2)); return;}
const line = s => console.log(s);
line('LIVE READINESS (names only, no values) — ' + new Date().toISOString());
line(`files: api/.env ${report.files.apiEnv}, web/.env ${report.files.webEnv}`);
line(`safety: NODE_ENV=${report.safety.NODE_ENV} INTEGRATIONS_ENV=${report.safety.INTEGRATIONS_ENV} KILL_SWITCH=${report.safety.INTEGRATIONS_KILL_SWITCH} GOOGLE_DIAGNOSTICS=${report.safety.GOOGLE_DIAGNOSTICS_ENABLED} registry=${report.safety.registry}`);
line('flags ON: ' + (report.safety.flagsOn.join(', ') || '(none)'));
line('formats: ' + Object.entries(report.formats).map(([k, v]) => `${k}=${v}`).join(' '));
for (const d of report.googleDiagnostics) line(`google diagnostic ${d.provider}: ${d.reason}${d.missing.length ? ' missing=' + d.missing.join(',') : ''}${d.configValid ? '' : ' configInvalid'}`);
for (const p of report.providers) {
  const parts = [...Object.entries(p.api), ...Object.entries(p.web)].map(([n, s]) => `${n}:${s}`);
  const proposed = Object.entries(p.proposedNotYetRead).map(([n, s]) => `${n}:${s}`);
  line(`- ${p.id} [code ${p.code}] ${parts.join(' ')}${proposed.length ? ' | proposed ' + proposed.join(' ') : ''}${p.ownerOutsideEnv ? ' | owner: ' + p.ownerOutsideEnv : ''}`);
}
if (report.legacyUnusedPresent.length) line('legacy names present but unused by current code: ' + report.legacyUnusedPresent.join(', '));
