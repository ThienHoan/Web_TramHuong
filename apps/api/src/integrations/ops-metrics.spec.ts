import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import type { INestApplication } from '@nestjs/common';
import type { Server } from 'node:http';
import request from 'supertest';
import { IntegrationsModule } from './integrations.module';
import { SupabaseService } from '../supabase/supabase.service';
import {
  loadIntegrationRegistry,
  INTEGRATION_DEFINITIONS,
} from './integrations.config';
import { IntegrationHealthService } from './integration-health.service';
import {
  OpsMetricsRepository,
  opsMetricsEnabled,
  parseLiveUsageRows,
  parseOpsMetrics,
  type OpsMetricsStore,
} from './ops-metrics.repository';

const outbox = (over = {}) => ({
  queued: 0,
  working: 0,
  accepted: 0,
  unknown: 0,
  dead: 0,
  lastAcceptedAt: null,
  lastErrorCode: null,
  ...over,
});
function raw(over: Record<string, unknown> = {}) {
  type Entry = {
    outbox: ReturnType<typeof outbox>;
    usage: { metric: string; used: number; hardLimit: number }[];
  };
  const providers: Record<string, Entry> = Object.fromEntries(
    Object.keys(INTEGRATION_DEFINITIONS).map((p): [string, Entry] => [
      p,
      { outbox: outbox(), usage: [] },
    ]),
  );
  providers.resend = {
    outbox: outbox({
      accepted: 3,
      unknown: 1,
      lastAcceptedAt: '2026-11-05T08:00:00.123456+00:00',
      lastErrorCode: 'UNAVAILABLE',
    }),
    usage: [
      { metric: 'emails', used: 82, hardLimit: 100 },
      { metric: 'requests', used: 5, hardLimit: 100 },
    ],
  };
  providers.merchant = {
    outbox: outbox({ queued: 2, accepted: 1, dead: 1 }),
    usage: [{ metric: 'requests', used: 100, hardLimit: 100 }],
  };
  providers.search_console = {
    outbox: outbox(),
    usage: [{ metric: 'requests', used: 14, hardLimit: 100 }],
  };
  return {
    source: 'test_db_mock',
    observedAt: '2026-11-05T09:00:00+00:00',
    windowDays: 7,
    usageDay: '2026-11-05',
    providers,
    searchConsole: {
      lastSuccessAt: '2026-11-05T07:00:00+00:00',
      lastAttemptAt: '2026-11-05T07:00:00+00:00',
      lastErrorCode: null,
    },
    pagespeed: null,
    merchantFence: { inflight: 1 },
    ...over,
  };
}
const config = (values: Record<string, string> = {}) =>
  new ConfigService({ NODE_ENV: 'test', ...values });
function service(
  store: OpsMetricsStore | undefined,
  values: Record<string, string> = {},
) {
  const c = config(values);
  return new IntegrationHealthService(loadIntegrationRegistry(c), c, store);
}
const find = (
  r: Awaited<ReturnType<IntegrationHealthService['report']>>,
  p: string,
) => r.providers.find((x) => x.provider === p)!.metrics;

describe('P9-02 operational metrics from TEST DB stores', () => {
  it.each([
    [{}, false],
    [{ FEATURE_INTEGRATION_OPS_METRICS_ENABLED: 'true' }, true],
  ])('flag %j → %p, invalid value stops startup', (values, expected) => {
    expect(opsMetricsEnabled(config(values))).toBe(expected);
    expect(() =>
      opsMetricsEnabled(
        config({ FEATURE_INTEGRATION_OPS_METRICS_ENABLED: 'on' }),
      ),
    ).toThrow('FEATURE_INTEGRATION_OPS_METRICS_ENABLED must be true or false');
  });

  it('maps outbox/usage/store aggregates into labelled per-provider metrics', async () => {
    const report = await service(
      { read: () => Promise.resolve(parseOpsMetrics(raw())) },
      {
        FEATURE_SEARCH_CONSOLE_PERSISTENCE_ENABLED: 'true',
        FEATURE_PAGESPEED_PERSISTENCE_ENABLED: 'true',
      },
    ).report();
    expect(report).toMatchObject({
      metricsSource: 'test_db_mock',
      metricsWindowDays: 7,
      metricsObservedAt: '2026-11-05T09:00:00.000Z',
      releaseReady: false,
      probesPerformed: false,
    });
    expect(find(report, 'resend')).toEqual({
      available: true,
      lastSuccessAt: '2026-11-05T08:00:00.123Z',
      lastErrorCode: 'UNAVAILABLE',
      failRate: 0.25,
      quotaMetric: 'emails',
      quotaUsed: 82,
      quotaLimit: 100,
      quotaAlert: 'warn_80',
      backlog: { queued: 0, working: 0, accepted: 3, unknown: 1, dead: 0 },
      inflight: null,
      liveUsage: null,
      estimatedMonthlySpend: null,
    });
    expect(find(report, 'merchant')).toMatchObject({
      failRate: 0.5,
      quotaAlert: 'exhausted',
      inflight: 1,
      backlog: { queued: 2 },
    });
    expect(find(report, 'search_console')).toMatchObject({
      available: true,
      lastSuccessAt: '2026-11-05T07:00:00.000Z',
      failRate: null,
      backlog: null,
      quotaUsed: 14,
      quotaAlert: 'ok',
    });
    // Installed store with no row today: zero used, unknown limit, no alert.
    expect(find(report, 'ga4')).toMatchObject({
      available: true,
      quotaUsed: 0,
      quotaLimit: null,
      quotaAlert: null,
      failRate: null,
    });
    // Flag on but PageSpeed store not installed (null): no numbers shown.
    expect(find(report, 'pagespeed')).toMatchObject({
      available: false,
      quotaUsed: null,
    });
    for (const p of [
      'ghn',
      'gemini',
      'pgvector',
      'cloudinary',
      'google',
      'turnstile',
    ])
      expect(find(report, p)).toMatchObject({
        available: false,
        quotaUsed: null,
        failRate: null,
      });
    for (const p of report.providers)
      expect(p.metrics.estimatedMonthlySpend).toBeNull();
  });

  it('GSC/PSI running from RAM (persistence flag off) never show DB numbers', async () => {
    const report = await service({
      read: () => Promise.resolve(parseOpsMetrics(raw())),
    }).report();
    expect(find(report, 'search_console')).toMatchObject({
      available: false,
      quotaUsed: null,
      lastSuccessAt: null,
    });
    expect(find(report, 'resend').available).toBe(true);
  });

  it('a store failure is labelled store_unavailable; configuration stays readable', async () => {
    const report = await service({
      read: () => Promise.reject(new Error('down')),
    }).report();
    expect(report.metricsSource).toBe('store_unavailable');
    expect(report.providers).toHaveLength(11);
    for (const p of report.providers) expect(p.metrics.available).toBe(false);
  });

  it('never reads the store in production or without the flag', async () => {
    const read = jest.fn();
    expect(
      (await service({ read }, { INTEGRATIONS_ENV: 'production' }).report())
        .metricsSource,
    ).toBe('unavailable_no_runtime_probe');
    expect((await service(undefined).report()).metricsSource).toBe(
      'unavailable_no_runtime_probe',
    );
    expect(read).not.toHaveBeenCalled();
  });

  it.each([
    ['live source', { source: 'google' }],
    ['other window', { windowDays: 30 }],
    ['missing provider', { providers: { resend: raw().providers.resend } }],
    [
      'negative count',
      {
        providers: {
          ...raw().providers,
          ga4: { outbox: outbox({ dead: -1 }), usage: [] },
        },
      },
    ],
    [
      'fractional count',
      {
        providers: {
          ...raw().providers,
          ga4: { outbox: outbox({ queued: 1.5 }), usage: [] },
        },
      },
    ],
    [
      'raw error text',
      {
        providers: {
          ...raw().providers,
          ga4: {
            outbox: outbox({ lastErrorCode: 'connect ECONNREFUSED 10.0.0.1' }),
            usage: [],
          },
        },
      },
    ],
    [
      'used above limit',
      {
        providers: {
          ...raw().providers,
          ga4: {
            outbox: outbox(),
            usage: [{ metric: 'requests', used: 101, hardLimit: 100 }],
          },
        },
      },
    ],
    [
      'unknown metric',
      {
        providers: {
          ...raw().providers,
          ga4: {
            outbox: outbox(),
            usage: [{ metric: 'dollars', used: 1, hardLimit: 2 }],
          },
        },
      },
    ],
    ['bad time', { observedAt: 'yesterday' }],
  ])('parser rejects %s', (_name, patch) => {
    expect(() => parseOpsMetrics(raw(patch))).toThrow();
  });
});

describe('P9-02 health over HTTP with real DI', () => {
  let app: INestApplication | undefined;
  afterEach(async () => {
    await app?.close();
    app = undefined;
  });
  async function boot(
    values: Record<string, string>,
    rpcResult: { data: unknown; error: unknown },
  ) {
    const rpc = jest.fn(() => ({
      abortSignal: () => Promise.resolve(rpcResult),
    }));
    const module = await Test.createTestingModule({
      imports: [IntegrationsModule],
    })
      .overrideProvider(ConfigService)
      .useValue(config(values))
      .overrideProvider(SupabaseService)
      .useValue({
        getClient: () => ({
          rpc,
          auth: {
            getUser: (t: string) =>
              Promise.resolve({
                data: { user: t === 'ADMIN' ? { id: t } : null },
                error: null,
              }),
          },
          from: () => ({
            select: () => ({
              eq: () => ({
                single: () =>
                  Promise.resolve({
                    data: { role: 'ADMIN', is_banned: false },
                    error: null,
                  }),
              }),
            }),
          }),
        }),
      })
      .compile();
    app = module.createNestApplication({ logger: false });
    await app.listen(0, '127.0.0.1');
    return { server: app.getHttpServer() as Server, rpc };
  }
  it('flag on: reads one aggregate RPC with the fixed 7-day window', async () => {
    const { server, rpc } = await boot(
      { FEATURE_INTEGRATION_OPS_METRICS_ENABLED: 'true' },
      { data: raw(), error: null },
    );
    const res = await request(server)
      .get('/integrations/admin/health')
      .set('Authorization', 'Bearer ADMIN')
      .expect(200);
    expect(res.headers['cache-control']).toBe('no-store');
    expect(res.body).toMatchObject({
      metricsSource: 'test_db_mock',
      metricsWindowDays: 7,
    });
    expect(rpc.mock.calls).toEqual([
      ['integration_ops_metrics_mock', { p_window_days: 7 }],
    ]);
  });
  it('flag on + paused RPC: still 200 with store_unavailable and no private detail', async () => {
    const { server } = await boot(
      { FEATURE_INTEGRATION_OPS_METRICS_ENABLED: 'true' },
      {
        data: null,
        error: { code: '42501', message: 'permission denied private' },
      },
    );
    const res = await request(server)
      .get('/integrations/admin/health')
      .set('Authorization', 'Bearer ADMIN')
      .expect(200);
    expect(res.body).toMatchObject({ metricsSource: 'store_unavailable' });
    expect(JSON.stringify(res.body)).not.toContain('private');
  });
  it('flag off: no RPC at all', async () => {
    const { server, rpc } = await boot({}, { data: raw(), error: null });
    await request(server)
      .get('/integrations/admin/health')
      .set('Authorization', 'Bearer ADMIN')
      .expect(200);
    expect(rpc).not.toHaveBeenCalled();
  });
  it('repository rejects a malformed RPC body', async () => {
    const repo = new OpsMetricsRepository({
      getClient: () => ({
        rpc: () => ({
          abortSignal: () =>
            Promise.resolve({ data: { source: 'test_db_mock' }, error: null }),
        }),
      }),
    } as unknown as SupabaseService);
    await expect(repo.read()).rejects.toThrow();
  });
});

describe('live (staging) usage on the dashboard', () => {
  const row = (
    metric: string,
    used: number,
    hard_limit: number,
    over: Record<string, unknown> = {},
  ) => ({
    provider: 'gemini',
    environment: 'staging',
    day: '2026-11-05',
    metric,
    used,
    hard_limit,
    ...over,
  });
  it('parses today rows for allowlisted live providers only', () => {
    expect(
      parseLiveUsageRows(
        [row('requests', 1, 200), row('tokens', 749, 300000)],
        '2026-11-05',
      ),
    ).toEqual({
      gemini: {
        requests: { used: 1, hardLimit: 200 },
        tokens: { used: 749, hardLimit: 300000 },
      },
    });
  });
  it.each([
    ['other provider', [row('requests', 1, 2, { provider: 'resend' })]],
    ['mock environment', [row('requests', 1, 2, { environment: 'mock' })]],
    ['other day', [row('requests', 1, 2, { day: '2026-11-04' })]],
    ['unknown metric', [row('emails', 1, 2)]],
    ['used above limit', [row('requests', 3, 2)]],
    ['duplicate metric', [row('requests', 1, 2), row('requests', 1, 2)]],
    ['too many rows', Array.from({ length: 21 }, () => row('requests', 1, 2))],
    ['not an array', { gemini: 1 }],
  ])('rejects %s', (_n, rows) => {
    expect(() => parseLiveUsageRows(rows, '2026-11-05')).toThrow();
  });

  function repo(fromResult: { data: unknown; error: unknown } | 'throw') {
    const chain: Record<string, unknown> = {};
    for (const m of ['select', 'eq', 'in', 'limit'])
      chain[m] = jest.fn(() => chain);
    chain.abortSignal = () =>
      fromResult === 'throw'
        ? Promise.reject(new Error('x'))
        : Promise.resolve(fromResult);
    const from = jest.fn(() => chain);
    const client = {
      rpc: () => ({
        abortSignal: () => Promise.resolve({ data: raw(), error: null }),
      }),
      from,
    };
    return {
      repo: new OpsMetricsRepository({
        getClient: () => client,
      } as unknown as SupabaseService),
      from,
      chain,
    };
  }
  it('reads staging rows for the RPC usage day and maps gemini live usage with an alert', async () => {
    const {
      repo: r,
      from,
      chain,
    } = repo({
      data: [row('requests', 170, 200), row('tokens', 749, 300000)],
      error: null,
    });
    const report = await service(r).report();
    expect(from).toHaveBeenCalledWith('integration_usage_daily');
    expect(chain.eq).toHaveBeenCalledWith('environment', 'staging');
    expect(chain.eq).toHaveBeenCalledWith('day', '2026-11-05');
    expect(chain.in).toHaveBeenCalledWith('provider', ['gemini']);
    expect(report.liveUsageSource).toBe('test_db');
    expect(find(report, 'gemini').liveUsage).toEqual({
      requestsUsed: 170,
      requestsLimit: 200,
      tokensUsed: 749,
      tokensLimit: 300000,
      alert: 'warn_80',
    });
    expect(find(report, 'resend').liveUsage).toBeNull();
  });
  it.each([
    ['store error', { data: null, error: { code: '42501' } }],
    ['malformed rows', { data: [row('requests', 9, 1)], error: null }],
    ['network failure', 'throw' as const],
  ])(
    '%s → live labelled unavailable, mock metrics still shown',
    async (_n, result) => {
      const report = await service(repo(result).repo).report();
      expect(report).toMatchObject({
        metricsSource: 'test_db_mock',
        liveUsageSource: 'unavailable',
      });
      expect(find(report, 'resend').available).toBe(true);
      expect(find(report, 'gemini').liveUsage).toBeNull();
    },
  );
  it('configuration-only snapshot keeps liveUsageSource null', () => {
    expect(service(undefined).snapshot().liveUsageSource).toBeNull();
  });
});

describe('staging (local real-call testing) still shows TEST DB metrics', () => {
  it('reads the store under INTEGRATIONS_ENV=staging', async () => {
    const read = jest.fn(() => Promise.resolve(parseOpsMetrics(raw())));
    const report = await service(
      { read },
      { INTEGRATIONS_ENV: 'staging' },
    ).report();
    expect(report.metricsSource).toBe('test_db_mock');
    expect(read).toHaveBeenCalledTimes(1);
  });
});
