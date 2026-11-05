// Owner-approved REAL Gemini acceptance: 1 Interactions API call by default (owner plan,
// max 3 with --calls=3) through the real
// CatalogAdvisorService live path, with a SYNTHETIC 6-product catalog and SYNTHETIC
// questions (no customer data). The durable daily budget is reserved in the TEST DB
// (integration-live-usage.sql must be installed). Never prints keys, URLs or raw output.
//   node scripts/check-gemini-live.cjs --allow-gemini-calls [--calls=1..3]
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
const {CatalogAdvisorService} = require('../src/chat/catalog-advisor.service');
const {GeminiInteractionsAdapter, GeminiLiveLimiter, GEMINI_INTERACTIONS_URL, geminiLiveConfig} = require('../src/chat/gemini-live');

const requested = Number((process.argv.find(a => a.startsWith('--calls=')) ?? '--calls=1').slice(8));
const MAX_CALLS = Number.isInteger(requested) && requested >= 1 && requested <= 3 ? requested : 1;
const QUESTIONS = ['vòng tay trầm hương cho nam', 'nhang trầm dưới 200k', 'quà tặng trầm hương cho bố'];
const CATALOG = [
  ['qa-vong-nam', 'Vòng tay trầm hương nam 12 ly', 890000],
  ['qa-vong-nu', 'Vòng tay trầm hương nữ charm bạc', 650000],
  ['qa-nhang-que', 'Nhang trầm hương không tăm 100 que', 180000],
  ['qa-nhang-vong', 'Nhang vòng trầm hương 24 giờ', 150000],
  ['qa-hop-qua', 'Hộp quà trầm hương cao cấp', 1500000],
  ['qa-tinh-dau', 'Tinh dầu trầm hương 10ml', 420000],
].map(([id, title, price]) => ({id, slug: id, is_active: true, quantity: 5, price, discount_percentage: 0,
  discount_start_date: null, discount_end_date: null, category_id: 'qa', variants: null, translation: {title, description: 'QA'}}));

(async () => {
  if (!process.argv.includes('--allow-gemini-calls')) {
    console.log(`REFUSED: pass --allow-gemini-calls (owner approval; ${MAX_CALLS} real Gemini call(s), max 3 via --calls=)`); process.exitCode = 2; return;
  }
  const file = path.join(__dirname, '../.env');
  const env = fs.existsSync(file) ? dotenv.parse(fs.readFileSync(file)) : {};
  const values = {...env, NODE_ENV: 'development', INTEGRATIONS_ENV: 'staging', FEATURE_GEMINI_ADVISOR_ENABLED: 'true'};
  const live = geminiLiveConfig(new ConfigService(values));
  if (live.state !== 'ready') {console.log('REFUSED: Gemini config ' + (live.state === 'invalid' ? live.reason : 'GEMINI_API_KEY_MISSING')); process.exitCode = 2; return;}
  if (!String(env.SUPABASE_URL ?? '').trim() || !String(env.SUPABASE_SERVICE_ROLE_KEY ?? '').trim()) {
    console.log('REFUSED: TEST DB config missing (durable budget required)'); process.exitCode = 2; return;
  }
  const logs = [];
  Logger.overrideLogger({log: m => logs.push(m), warn: m => logs.push(m), error: () => {}, debug: () => {}, verbose: () => {}});
  let geminiCalls = 0;
  const transport = (url, init) => {
    if (url !== GEMINI_INTERACTIONS_URL || geminiCalls >= MAX_CALLS) return Promise.reject(new Error('REFUSED_TARGET_OR_CAP'));
    geminiCalls++;
    return fetch(url, init);
  };
  const db = createClient(env.SUPABASE_URL.trim(), env.SUPABASE_SERVICE_ROLE_KEY.trim(), {auth: {persistSession: false, autoRefreshToken: false}});
  const usage = new IntegrationRepository({getClient: () => db});
  const config = new ConfigService(values);
  const registry = loadIntegrationRegistry(config);
  const titles = Object.fromEntries(CATALOG.map(p => [p.id, p.translation.title]));
  const advisor = new CatalogAdvisorService({findAll: async () => ({data: structuredClone(CATALOG)})}, registry,
    new IntegrationExecutor(registry), 'development', undefined, undefined,
    {config: live, selector: new GeminiInteractionsAdapter(live.apiKey, live.model, transport), limiter: new GeminiLiveLimiter(), usage});
  console.log(`model=${live.model} billingTier=${live.billingTier} payloadPolicy=${live.payloadPolicy} store=false calls<=${MAX_CALLS} catalog=synthetic questions=synthetic`);
  const results = [];
  for (const query of QUESTIONS.slice(0, MAX_CALLS)) {
    const before = logs.length;
    const r = await advisor.advise({query, locale: 'vi'});
    const event = logs.slice(before).find(m => m && typeof m === 'object' && m.event === 'gemini_live') ?? {};
    results.push({query, source: r.source, fallbackReason: r.fallbackReason, picks: r.recommendations.map(p => titles[p.id] ?? p.id),
      totalTokens: event.totalTokens ?? null, reserved: event.reserved ?? null, ms: event.ms ?? null, code: event.code ?? null});
  }
  for (const r of results) console.log(JSON.stringify(r));
  const ok = results.filter(r => r.source === 'gemini').length;
  console.log(JSON.stringify({result: ok === results.length ? 'PASS' : ok ? 'PARTIAL' : 'FAIL', geminiCalls, liveSelections: ok,
    customerData: false, keyPrinted: false}));
  if (!ok) process.exitCode = 1;
})().catch(() => {console.log('GEMINI_LIVE_CHECK_ERROR (details hidden)'); process.exitCode = 1;});
