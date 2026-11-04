// Explicit operator-only Google debug validation. Never starts AppModule/cron.
require('ts-node/register');
const fs = require('node:fs');
const path = require('node:path');
const dotenv = require('dotenv');
const { GoogleDiagnosticsService } = require('../src/analytics/google-diagnostics.service');
const { loadIntegrationRegistry } = require('../src/integrations/integrations.config');

async function main() {
  if (!process.argv.includes('--allow-google-debug')) throw new Error('EXPLICIT_DEBUG_OPT_IN_REQUIRED');
  const index = process.argv.indexOf('--measurement-id');
  const expected = index < 0 ? '' : process.argv[index + 1];
  if (!/^G-[A-Z0-9]{4,20}$/.test(expected ?? '')) throw new Error('EXPECTED_MEASUREMENT_ID_REQUIRED');
  const text = fs.readFileSync(path.resolve(__dirname, '../.env'), 'utf8');
  for (const key of ['GA4_MEASUREMENT_ID', 'GA4_API_SECRET']) {
    if (text.split(/\r?\n/).filter(line => new RegExp('^\\s*(?:export\\s+)?' + key + '\\s*=').test(line)).length !== 1)
      throw new Error('MISSING_OR_DUPLICATE_' + key);
  }
  const parsed = dotenv.parse(text);
  if (parsed.INTEGRATIONS_KILL_SWITCH === 'true') throw new Error('INTEGRATION_KILL_SWITCH_ACTIVE');
  if (parsed.GA4_MEASUREMENT_ID !== expected) throw new Error('MEASUREMENT_ID_MISMATCH');
  if (!parsed.GA4_API_SECRET || /THAY_BANG|YOUR_|PLACEHOLDER/.test(parsed.GA4_API_SECRET)) throw new Error('GA4_API_SECRET_NOT_CONFIGURED');
  // Isolated config only: no SMTP/DB/SePay/GHN/other provider secret is forwarded.
  const values = { NODE_ENV: 'test', INTEGRATIONS_ENV: 'staging', GOOGLE_DIAGNOSTICS_ENABLED: 'true', FEATURE_GA4_ENABLED: 'true',
    GA4_MEASUREMENT_ID: parsed.GA4_MEASUREMENT_ID, GA4_API_SECRET: parsed.GA4_API_SECRET };
  const config = { get: name => values[name] };
  let requests = 0, status = null;
  const transport = async (url, options) => {
    const target = new URL(String(url));
    if (requests !== 0 || target.origin !== 'https://www.google-analytics.com' || target.pathname !== '/debug/mp/collect' || options.method !== 'POST')
      throw new Error('UNEXPECTED_DEBUG_REQUEST');
    requests++;
    const response = await fetch(url, options); status = response.status; return response;
  };
  const service = new GoogleDiagnosticsService(config, loadIntegrationRegistry(config), transport);
  const result = await service.diagnose('ga4');
  process.stdout.write(JSON.stringify({ ...result, measurementId: expected, requests, httpStatus: status, envChanged: false }) + '\n');
  if (!result.payloadValid) process.exitCode = 2;
}
main().catch(error => {
  const message = error instanceof Error && /^(EXPLICIT_DEBUG_OPT_IN_REQUIRED|EXPECTED_MEASUREMENT_ID_REQUIRED|MISSING_OR_DUPLICATE_GA4_(MEASUREMENT_ID|API_SECRET)|INTEGRATION_KILL_SWITCH_ACTIVE|MEASUREMENT_ID_MISMATCH|GA4_API_SECRET_NOT_CONFIGURED)$/.test(error.message)
    ? error.message : 'GA4_DEBUG_CHECK_FAILED';
  process.stderr.write(JSON.stringify({ error: message, reportsIngested: false }) + '\n'); process.exitCode = 1;
});
