// P9-02 integrated + rollback test. ONE in-memory PostgreSQL with every mock migration,
// real TS services for GA4 purchase, notifications, Merchant, Search Console, PageSpeed,
// then the real health service reads the ops metrics RPC. Finally every pause script
// runs and each feature must fail closed with zero rows lost. No network, no env file.
require('ts-node/register/transpile-only');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {ConfigService} = require('@nestjs/config');
const {Logger} = require('@nestjs/common');
const {createPurchaseDatabase, seedOrder, capture, ORDER, PRODUCT} = require('./fixtures/purchase-database.cjs');
const {pgFrom} = require('./fixtures/pg-from.cjs');
const {loadIntegrationRegistry} = require('../src/integrations/integrations.config');
const {IntegrationExecutor} = require('../src/integrations/integration-executor');
const {IntegrationRepository} = require('../src/integrations/integration.repository');
const {MockDeliveryConsumer} = require('../src/integrations/mock-delivery.consumer');
const {IntegrationHealthService} = require('../src/integrations/integration-health.service');
const {OpsMetricsRepository} = require('../src/integrations/ops-metrics.repository');
const {NotificationRepository} = require('../src/mail/notification.repository');
const {NotificationDeliveryService} = require('../src/mail/notification-delivery.service');
const {MockResendEmailProvider} = require('../src/mail/mock-resend-email.provider');
const {MerchantDeliveryService} = require('../src/merchant/merchant-delivery.service');
const {SearchConsoleService} = require('../src/analytics/search-console.service');
const {SearchConsoleRepository} = require('../src/analytics/search-console.repository');
const {MockSearchConsoleAdapter} = require('../src/analytics/search-console.adapter');
const {PagespeedService} = require('../src/analytics/pagespeed.service');
const {PagespeedRepository} = require('../src/analytics/pagespeed.repository');
const {MockPagespeedAdapter} = require('../src/analytics/pagespeed.adapter');

Logger.overrideLogger(false);
const migration = name => fs.readFileSync(path.join(__dirname, '../migrations', name), 'utf8');
const NOTIFY_ORDER = '20000000-0000-4000-8000-000000000011';
const NOTIFY_ORDER_2 = '20000000-0000-4000-8000-000000000012';
// Foundation + purchase come from the fixture; the rest in documented install order.
const INSTALL = ['integration-notifications.sql', 'integration-merchant-queue.sql', 'integration-merchant-fence.sql',
  'search-console-durable-mock.sql', 'pagespeed-durable-mock.sql', 'integration-ops-metrics.sql', 'integration-live-usage.sql'];
// Rollback order: read-only metrics first, then features, foundation last.
const PAUSE = ['integration-ops-metrics.pause.sql', 'integration-live-usage.pause.sql', 'search-console-durable-mock.pause.sql', 'pagespeed-durable-mock.pause.sql',
  'integration-merchant-fence.pause.sql', 'integration-merchant-queue.pause.sql', 'integration-notifications.pause.sql',
  'integration-purchase-capture.pause.sql', 'integration-delivery-foundation.pause.sql'];

(async () => {
  const db = await createPurchaseDatabase();
  let checks = 0;
  const equal = (a, b) => {assert.deepEqual(a, b); checks++;};
  const ok = v => {assert.ok(v); checks++;};
  const status = async (p, code) => {await assert.rejects(p, e => (e.getStatus?.() ?? 0) === code); checks++;};
  const scalar = async (q, p = []) => Object.values((await db.query(q, p)).rows[0])[0];
  try {
    for (const file of INSTALL) await db.exec(migration(file));
    await seedOrder(db, ORDER);
    await seedOrder(db, NOTIFY_ORDER, {shipping_info: {email: 'customer@example.invalid'}});
    await seedOrder(db, NOTIFY_ORDER_2, {shipping_info: {email: 'customer@example.invalid'}});
    await db.exec('SET ROLE service_role');

    // supabase-like client: every RPC the services call, executed as service_role.
    const sql = (q, args) => [q, args];
    const defs = {
      integration_claim: a => sql('SELECT * FROM integration_claim($1,$2,$3,$4)', [a.p_provider, a.p_environment, a.p_limit, a.p_lease_seconds]),
      integration_reserve_usage: a => sql('SELECT integration_reserve_usage($1,$2,$3,$4,$5) AS r', [a.p_provider, a.p_environment, a.p_metric, a.p_amount, a.p_hard_limit]),
      integration_finish: a => sql('SELECT * FROM integration_finish($1,$2,$3,$4,$5,$6)', [a.p_id, a.p_lease_token, a.p_version, a.p_outcome, a.p_provider_message_id ?? null, a.p_error_code ?? null]),
      integration_capture_notification_mock: a => sql('SELECT integration_capture_notification_mock($1,$2) AS r', [a.p_order_id, a.p_event]),
      integration_resolve_notification_mock: a => sql('SELECT integration_resolve_notification_mock($1,$2,$3) AS r', [a.p_id, a.p_lease_token, a.p_version]),
      integration_enqueue_merchant_mock: a => sql('SELECT integration_enqueue_merchant_mock($1,$2,$3) AS r', [a.p_product_id, a.p_action, a.p_fingerprint]),
      integration_merchant_fence_ready_mock: () => sql('SELECT integration_merchant_fence_ready_mock() AS r', []),
      integration_merchant_begin_send_mock: a => sql('SELECT integration_merchant_begin_send_mock($1,$2,$3) AS r', [a.p_id, a.p_lease_token, a.p_version]),
      integration_merchant_end_send_mock: a => sql('SELECT integration_merchant_end_send_mock($1,$2) AS r', [a.p_fence_token, a.p_outcome]),
      integration_merchant_defer_mock: a => sql('SELECT integration_merchant_defer_mock($1,$2,$3) AS r', [a.p_id, a.p_lease_token, a.p_version]),
      seo_search_read_mock: () => sql('SELECT seo_search_read_mock() AS r', []),
      seo_search_begin_mock: () => sql('SELECT seo_search_begin_mock() AS r', []),
      seo_search_complete_mock: a => sql('SELECT seo_search_complete_mock($1,$2,$3::date[],$4::jsonb,$5::date[]) AS r', [a.p_token, a.p_version, a.p_window, JSON.stringify(a.p_days), a.p_truncated]),
      seo_search_fail_mock: a => sql('SELECT seo_search_fail_mock($1,$2,$3) AS r', [a.p_token, a.p_version, a.p_code]),
      seo_pagespeed_read_mock: () => sql('SELECT seo_pagespeed_read_mock() AS r', []),
      seo_pagespeed_begin_mock: a => sql('SELECT seo_pagespeed_begin_mock($1,$2) AS r', [a.p_target, a.p_strategy]),
      seo_pagespeed_record_mock: a => sql('SELECT seo_pagespeed_record_mock($1,$2,$3::jsonb) AS r', [a.p_token, a.p_version, JSON.stringify(a.p_sample)]),
      seo_pagespeed_fail_mock: a => sql('SELECT seo_pagespeed_fail_mock($1,$2,$3) AS r', [a.p_token, a.p_version, a.p_code]),
      integration_ops_metrics_mock: a => sql('SELECT integration_ops_metrics_mock($1) AS r', [a.p_window_days]),
      integration_reserve_live_usage: a => sql('SELECT integration_reserve_live_usage($1,$2,$3,$4) AS r', [a.p_provider, a.p_metric, a.p_amount, a.p_hard_limit]),
    };
    const rpc = (name, args) => {
      assert.ok(defs[name], 'unexpected rpc ' + name);
      const p = db.query(...defs[name](args)).then(
        r => ({data: name === 'integration_claim' ? r.rows : (r.rows[0]?.r !== undefined ? r.rows[0].r : r.rows[0] ?? null), error: null}),
        e => ({data: null, error: {code: e.code, message: 'Fixture rejected'}}));
      p.abortSignal = () => p;
      return p;
    };
    const from = pgFrom(db, {integration_usage_daily: ['provider', 'environment', 'day', 'metric', 'used', 'hard_limit']});
    const supabase = {getClient: () => ({rpc, from})};
    const config = new ConfigService({NODE_ENV: 'test', INTEGRATIONS_ENV: 'mock',
      FEATURE_RESEND_ENABLED: 'true', FEATURE_NOTIFICATION_OUTBOX_ENABLED: 'true',
      FEATURE_MERCHANT_SYNC_ENABLED: 'true', FEATURE_MERCHANT_OUTBOX_ENABLED: 'true', FRONTEND_URL: 'https://shop.example.org',
      FEATURE_SEARCH_CONSOLE_SYNC_ENABLED: 'true', FEATURE_PAGESPEED_AUDIT_ENABLED: 'true',
      FEATURE_GA4_ENABLED: 'true', FEATURE_INTEGRATION_OPS_METRICS_ENABLED: 'true',
      FEATURE_SEARCH_CONSOLE_PERSISTENCE_ENABLED: 'true', FEATURE_PAGESPEED_PERSISTENCE_ENABLED: 'true'});
    const registry = loadIntegrationRegistry(config);
    const usage = new IntegrationRepository(supabase);
    const executor = () => new IntegrationExecutor(registry, {requestsPerMinute: 1000, mockDailyLimit: 10000}, Date.now, async () => {}, () => 0);

    // GA4: server-side purchase capture (existing SQL path) → ga4 outbox ACCEPTED + usage.
    equal((await capture(db)).status, 'recorded');

    // Notifications: one accepted, one ambiguous (UNKNOWN), never retried.
    let uncertain = false;
    const notifications = new NotificationDeliveryService(registry, config, new NotificationRepository(supabase),
      new MockDeliveryConsumer(registry, usage),
      new MockResendEmailProvider(registry, new IntegrationExecutor(registry), 'test', async () => {if (uncertain) throw new Error('SYNTHETIC_UNKNOWN');}),
      usage);
    await notifications.capture(NOTIFY_ORDER, 'payment_success');
    equal((await notifications.drain()).accepted, 1);
    await notifications.capture(NOTIFY_ORDER_2, 'payment_success');
    uncertain = true;
    equal((await notifications.drain()).accepted, 0);

    // Merchant: accepted generation, then an ambiguous one.
    let product = {id: PRODUCT, slug: 'fixture', is_active: true, price: 200000, quantity: 3,
      images: ['https://cdn.example.org/photo.webp'], variants: null, discount_percentage: 0,
      discount_start_date: null, discount_end_date: null, translations: [{locale: 'vi', title: 'Vòng tay', description: 'Mẫu'}]};
    let merchantFails = false;
    const merchant = new MerchantDeliveryService(registry, config, {findById: async () => structuredClone(product)}, usage,
      new MockDeliveryConsumer(registry, usage), async () => {if (merchantFails) throw new Error('SYNTHETIC_UNKNOWN');});
    await merchant.queue([PRODUCT]);
    equal((await merchant.drain()).accepted, 1);
    product = {...product, price: 300000}; merchantFails = true;
    await merchant.queue([PRODUCT]);
    equal((await merchant.drain()).accepted, 0);

    // Search Console + PageSpeed durable mock stores.
    const gsc = () => new SearchConsoleService(registry, 'test', executor(), new MockSearchConsoleAdapter(), Date.now, new SearchConsoleRepository(supabase, usage));
    const psi = () => new PagespeedService(registry, 'test', executor(), new MockPagespeedAdapter(), Date.now, undefined, new PagespeedRepository(supabase, usage));
    equal((await gsc().sync()).lastError, null);
    equal((await psi().audit('home_vi', 'mobile')).result, 'recorded');

    // Real-call budget (as the Gemini path reserves it) shows up as live usage.
    await usage.reserveLiveUsage('gemini', 'requests', 1, 200);
    await usage.reserveLiveUsage('gemini', 'tokens', 749, 300000);

    // Dashboard numbers must match what the stores actually hold.
    const health = new IntegrationHealthService(registry, config, new OpsMetricsRepository(supabase));
    const report = await health.report();
    const m = p => report.providers.find(x => x.provider === p).metrics;
    const used = async (p, metric) => Number(await scalar("SELECT coalesce(sum(used),0) FROM integration_usage_daily WHERE provider=$1 AND metric=$2", [p, metric]));
    equal([report.metricsSource, report.metricsWindowDays, report.providers.length, report.releaseReady], ['test_db_mock', 7, 11, false]);
    equal([m('resend').backlog.accepted, m('resend').backlog.unknown, m('resend').failRate, m('resend').quotaMetric, m('resend').quotaUsed],
      [1, 1, 0.5, 'emails', await used('resend', 'emails')]);
    equal([m('ga4').backlog.accepted, m('ga4').failRate, m('ga4').quotaUsed, m('ga4').quotaLimit], [1, 0, 1, 100]);
    equal([m('merchant').backlog.accepted, m('merchant').backlog.unknown, m('merchant').failRate, m('merchant').inflight, m('merchant').quotaUsed],
      [1, 1, 0.5, 0, await used('merchant', 'requests')]);
    equal([m('search_console').quotaUsed, m('search_console').quotaAlert, m('search_console').lastErrorCode, m('search_console').backlog], [14, 'ok', null, null]);
    ok(m('search_console').lastSuccessAt && m('pagespeed').lastSuccessAt && m('resend').lastSuccessAt && m('merchant').lastSuccessAt);
    equal([m('pagespeed').quotaUsed, m('pagespeed').failRate], [1, null]);
    for (const p of ['ghn', 'gemini', 'pgvector', 'cloudinary', 'google', 'turnstile']) equal(m(p).available, false);
    equal(report.liveUsageSource, 'test_db');
    equal(m('gemini').liveUsage, {requestsUsed: 1, requestsLimit: 200, tokensUsed: 749, tokensLimit: 300000, alert: 'ok'});
    for (const p of ['resend', 'merchant', 'search_console']) equal(m(p).liveUsage, null);
    for (const p of report.providers) equal(p.metrics.estimatedMonthlySpend, null);
    ok(!JSON.stringify(report).includes('customer@example.invalid') && !JSON.stringify(report).includes('trầm'));
    // Flag off / no store: configuration only, no DB read.
    equal((await new IntegrationHealthService(registry, config).report()).metricsSource, 'unavailable_no_runtime_probe');

    // Browser-facing roles cannot read the aggregates; metadata checker agrees.
    const CHECKER = fs.readFileSync(path.join(__dirname, '../../../docs/integrations/verify-installed-ops-metrics.sql'), 'utf8');
    for (const role of ['anon', 'authenticated']) {
      await db.exec('RESET ROLE; SET ROLE ' + role);
      await assert.rejects(db.query('SELECT integration_ops_metrics_mock(7)'), e => e.code === '42501'); checks++;
    }
    await db.exec('RESET ROLE');
    equal((await db.query(CHECKER)).rows[0].status, 'PASS');
    await db.exec('SET ROLE service_role');

    // Rollback: pause everything in order; nothing is deleted.
    const tables = ['integration_outbox', 'integration_usage_daily', 'seo_search_metrics_daily', 'seo_search_sync_state',
      'seo_pagespeed_samples', 'seo_pagespeed_audit_state', 'integration_merchant_send_fence', 'orders'];
    const snapshot = async () => {
      const out = {};
      for (const t of tables) out[t] = Number(await scalar('SELECT count(*) FROM ' + t));
      out.outboxStates = (await db.query("SELECT provider,state,count(*)::int AS n FROM integration_outbox GROUP BY 1,2 ORDER BY 1,2")).rows;
      return out;
    };
    const before = await snapshot();
    await db.exec('RESET ROLE');
    for (const file of PAUSE) await db.exec(migration(file));
    await db.exec('SET ROLE service_role');
    const paused = await health.report();
    equal([paused.metricsSource, paused.providers.length, paused.liveUsageSource], ['store_unavailable', 11, null]);
    await assert.rejects(usage.reserveLiveUsage('gemini', 'requests', 1, 200)); checks++;
    for (const p of paused.providers) equal(p.metrics.available, false);
    await status(gsc().report(), 503);
    await status(gsc().sync(), 503);
    await status(psi().report(), 503);
    await status(psi().audit('home_en', 'desktop'), 503);
    await status(merchant.drain(), 503);
    await assert.rejects(notifications.drain()); checks++;
    await assert.rejects(notifications.capture(NOTIFY_ORDER, 'payment_success')); checks++;
    await assert.rejects(capture(db, ORDER)); checks++;
    await status(merchant.queue([PRODUCT]), 503);
    await db.exec('RESET ROLE');
    equal((await db.query(CHECKER)).rows[0].status, 'FAIL');
    equal(await snapshot(), before);

    const result = {batch: 'P9-02', result: 'PASS', checks, exactSql: true, migrationsInstalled: ['integration-delivery-foundation.sql', 'integration-purchase-capture.sql', ...INSTALL],
      realServices: ['purchase_capture_sql', 'notifications', 'merchant_fence', 'search_console_store', 'pagespeed_store', 'integration_health'],
      metricsSource: report.metricsSource, pauseScripts: PAUSE.length, rowsPreservedAfterRollback: true,
      healthReadableAfterRollback: true, googleCalls: 0, realEmails: 0, hostedWrites: 0};
    if (process.env.OPS_INTEGRATION_REPORT) fs.writeFileSync(process.env.OPS_INTEGRATION_REPORT, JSON.stringify(result, null, 2) + '\n');
    console.log(JSON.stringify(result));
  } finally {await db.close();}
})().catch(e => {console.error('OPS_INTEGRATION_FAILED', e?.message ?? ''); process.exitCode = 1;});
