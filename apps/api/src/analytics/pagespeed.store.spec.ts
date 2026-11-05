import { ConfigService } from '@nestjs/config';
import {
  ConflictException,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { loadIntegrationRegistry } from '../integrations/integrations.config';
import {
  IntegrationExecutor,
  IntegrationFailure,
} from '../integrations/integration-executor';
import {
  MockPagespeedAdapter,
  type AuditStrategy,
  type PagespeedMockAdapter,
} from './pagespeed.adapter';
import { PagespeedService, type PerformanceSample } from './pagespeed.service';
import {
  PagespeedRepository,
  parseStoredPagespeed,
  pagespeedPersistenceEnabled,
  type PagespeedBegin,
  type PagespeedHistoryStore,
  type PagespeedLease,
  type StoredPagespeedReport,
} from './pagespeed.repository';
import type { SupabaseService } from '../supabase/supabase.service';
import type { IntegrationRepository } from '../integrations/integration.repository';

const DAY = 86400000;
const NOW = Date.parse('2026-11-05T00:00:00Z');
const TOKEN = '6f1c2b8e-3a4d-4c5e-9f00-112233445566';

// Mirrors the SQL contract: per-pair lease, DB-clock 24h cache, CAS, 30 cap.
class MemoryStore implements PagespeedHistoryStore {
  reports = new Map<string, StoredPagespeedReport>();
  leases = new Map<string, PagespeedLease & { key: string }>();
  reserves = 0;
  failures: string[] = [];
  reserveError: Error | null = null;
  recordError: Error | null = null;
  readError: Error | null = null;
  constructor(readonly clock: () => number) {}
  private pair(targetId: string, strategy: AuditStrategy) {
    const key = targetId + ':' + strategy;
    let report = this.reports.get(key);
    if (!report) {
      report = {
        targetId,
        strategy,
        samples: [],
        lastAttemptAt: null,
        lastError: null,
        running: false,
      };
      this.reports.set(key, report);
    }
    return { key, report };
  }
  read() {
    if (this.readError) return Promise.reject(this.readError);
    return Promise.resolve(structuredClone([...this.reports.values()]));
  }
  begin(targetId: string, strategy: AuditStrategy): Promise<PagespeedBegin> {
    const { key, report } = this.pair(targetId, strategy);
    const latest = report.samples.at(-1);
    if (latest && this.clock() - Date.parse(latest.storedAt) < DAY)
      return Promise.resolve({ cached: true });
    if (report.running)
      return Promise.reject(
        new ConflictException('PAGESPEED_AUDIT_IN_PROGRESS'),
      );
    const lease = {
      token: TOKEN,
      version: this.leases.size + 1,
      startedAt: new Date(this.clock()).toISOString(),
      latestMeasuredAt: latest?.measuredAt ?? null,
    };
    this.leases.set(TOKEN, { ...lease, key });
    Object.assign(report, {
      running: true,
      lastAttemptAt: lease.startedAt,
      lastError: null,
    });
    return Promise.resolve({ cached: false, ...lease });
  }
  record(lease: PagespeedLease, sample: PerformanceSample) {
    if (this.recordError) return Promise.reject(this.recordError);
    const held = this.leases.get(lease.token);
    if (!held) return Promise.reject(new ServiceUnavailableException('LEASE'));
    const report = this.reports.get(held.key)!;
    report.samples = [
      ...report.samples,
      { ...sample, storedAt: new Date(this.clock()).toISOString() },
    ].slice(-30);
    Object.assign(report, { running: false, lastError: null });
    this.leases.delete(lease.token);
    return this.read();
  }
  fail(lease: PagespeedLease, code: string) {
    const held = this.leases.get(lease.token);
    if (!held) return Promise.reject(new ServiceUnavailableException('LEASE'));
    Object.assign(this.reports.get(held.key)!, {
      running: false,
      lastError: code,
    });
    this.leases.delete(lease.token);
    this.failures.push(code);
    return Promise.resolve();
  }
  reserve() {
    this.reserves++;
    if (this.reserveError) return Promise.reject(this.reserveError);
    return Promise.resolve({ used: this.reserves });
  }
}

function make(
  store: PagespeedHistoryStore,
  clock: { now: number },
  adapter: PagespeedMockAdapter = new MockPagespeedAdapter(() => clock.now),
  flags: Record<string, string> = {},
) {
  const registry = loadIntegrationRegistry(
    new ConfigService({ FEATURE_PAGESPEED_AUDIT_ENABLED: 'true', ...flags }),
  );
  return new PagespeedService(
    registry,
    'test',
    new IntegrationExecutor(
      registry,
      { requestsPerMinute: 1000, mockDailyLimit: 10000 },
      () => clock.now,
      async () => {},
      () => 0,
    ),
    adapter,
    () => clock.now,
    undefined,
    store,
  );
}
const home = (
  r: Awaited<ReturnType<PagespeedService['report']>>,
  s = 'mobile',
) => r.reports.find((x) => x.targetId === 'home_vi' && x.strategy === s)!;

describe('PageSpeed durable mock history (P2-03b)', () => {
  beforeAll(() => {
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
  });
  afterAll(() => jest.restoreAllMocks());

  it.each([
    [undefined, false],
    ['false', false],
    [true, true],
    ['true', true],
  ])('persistence flag %p → %p', (value, expected) => {
    expect(
      pagespeedPersistenceEnabled(
        new ConfigService(
          value === undefined
            ? {}
            : { FEATURE_PAGESPEED_PERSISTENCE_ENABLED: value },
        ),
      ),
    ).toBe(expected);
  });
  it('rejects an invalid flag without echoing it', () => {
    expect(() =>
      pagespeedPersistenceEnabled(
        new ConfigService({
          FEATURE_PAGESPEED_PERSISTENCE_ENABLED: 'secret-yes',
        }),
      ),
    ).toThrow(/^FEATURE_PAGESPEED_PERSISTENCE_ENABLED must be true or false$/);
  });

  it('a restarted instance shows durable history and regressions with zero provider calls', async () => {
    const clock = { now: NOW };
    const store = new MemoryStore(() => clock.now);
    const first = await make(store, clock).audit('home_vi', 'mobile');
    expect(first).toMatchObject({
      result: 'recorded',
      persistence: 'database',
    });
    expect(first.blockers).not.toContain('DURABLE_HISTORY_PENDING');
    clock.now += DAY;
    await make(store, clock).audit('home_vi', 'mobile');
    const audit = jest.fn();
    const report = await make(store, clock, { audit }).report();
    expect(audit).not.toHaveBeenCalled();
    expect(home(report).history).toHaveLength(2);
    expect(home(report).comparison.status).toBe('comparable');
    expect(home(report).comparison.alerts.length).toBeGreaterThan(0);
    expect(home(report).latest?.field).toMatchObject({
      status: 'unavailable',
      inpMs: null,
    });
  });

  it('a cache hit from another instance consumes no budget and adds no history', async () => {
    const clock = { now: NOW };
    const store = new MemoryStore(() => clock.now);
    await make(store, clock).audit('home_vi', 'mobile');
    const audit = jest.fn();
    const cached = await make(store, clock, { audit }).audit(
      'home_vi',
      'mobile',
    );
    expect(cached.result).toBe('cached');
    expect(audit).not.toHaveBeenCalled();
    expect(store.reserves).toBe(1);
    expect(home(cached).history).toHaveLength(1);
  });

  it('reserves the durable budget per attempt, including the executor retry', async () => {
    const clock = { now: NOW };
    const store = new MemoryStore(() => clock.now);
    const adapter = new MockPagespeedAdapter(() => clock.now);
    const audit = jest.spyOn(adapter, 'audit');
    audit.mockRejectedValueOnce(new IntegrationFailure('UNAVAILABLE', true));
    await make(store, clock, adapter).audit('home_vi', 'desktop');
    expect(audit).toHaveBeenCalledTimes(2);
    expect(store.reserves).toBe(2);
  });

  it('a lease held elsewhere on the same pair is 409 before budget/provider; other pairs proceed', async () => {
    const clock = { now: NOW };
    const store = new MemoryStore(() => clock.now);
    await store.begin('home_vi', 'mobile');
    const audit = jest.fn();
    await expect(
      make(store, clock, { audit }).audit('home_vi', 'mobile'),
    ).rejects.toBeInstanceOf(ConflictException);
    expect([audit.mock.calls.length, store.reserves]).toEqual([0, 0]);
    expect((await make(store, clock).report()).running).toBe(true);
  });

  it('durable quota exhaustion is 429, recorded, previous samples kept', async () => {
    const clock = { now: NOW };
    const store = new MemoryStore(() => clock.now);
    await make(store, clock).audit('home_vi', 'mobile');
    clock.now += DAY;
    store.reserveError = new IntegrationFailure('QUOTA_EXCEEDED');
    const audit = jest.fn();
    await expect(
      make(store, clock, { audit }).audit('home_vi', 'mobile'),
    ).rejects.toMatchObject({ status: 429 });
    expect(audit).not.toHaveBeenCalled();
    const after = home(await make(store, clock).report());
    expect([after.history.length, after.lastError]).toEqual([
      1,
      'QUOTA_EXCEEDED',
    ]);
  });

  it('budget-store outage is STORAGE_UNAVAILABLE without retry, provider call or circuit', async () => {
    const clock = { now: NOW };
    const store = new MemoryStore(() => clock.now);
    store.reserveError = new Error('INTEGRATION_STORE_UNAVAILABLE');
    const adapter = new MockPagespeedAdapter(() => clock.now);
    const audit = jest.spyOn(adapter, 'audit');
    const service = make(store, clock, adapter);
    for (let i = 0; i < 4; i++)
      await expect(service.audit('home_vi', 'mobile')).rejects.toMatchObject({
        status: 503,
        message: 'PAGESPEED_STORAGE_UNAVAILABLE',
      });
    expect([store.reserves, audit.mock.calls.length]).toEqual([4, 0]);
    expect(store.failures).toEqual(Array(4).fill('STORAGE_UNAVAILABLE'));
    store.reserveError = null;
    await expect(service.audit('home_vi', 'mobile')).resolves.toMatchObject({
      result: 'recorded',
    });
  });

  it('non-incremental or invalid samples never reach the store', async () => {
    const clock = { now: NOW };
    const store = new MemoryStore(() => clock.now);
    await make(store, clock).audit('home_vi', 'mobile');
    clock.now += DAY;
    const record = jest.spyOn(store, 'record');
    // Provider returns a sample timed at the previous measurement.
    const stale = new MockPagespeedAdapter(() => NOW);
    await expect(
      make(store, clock, stale).audit('home_vi', 'mobile'),
    ).rejects.toThrow('PAGESPEED_INVALID_RESPONSE');
    await expect(
      make(store, clock, { audit: () => Promise.resolve(null) }).audit(
        'home_vi',
        'mobile',
      ),
    ).rejects.toThrow('PAGESPEED_INVALID_RESPONSE');
    expect(record).not.toHaveBeenCalled();
    expect(store.failures).toEqual(['INVALID_RESPONSE', 'INVALID_RESPONSE']);
  });

  it('failed publication keeps prior samples and records the failure', async () => {
    const clock = { now: NOW };
    const store = new MemoryStore(() => clock.now);
    await make(store, clock).audit('home_vi', 'mobile');
    clock.now += DAY;
    store.recordError = new ServiceUnavailableException(
      'PAGESPEED_STORAGE_UNAVAILABLE',
    );
    await expect(
      make(store, clock).audit('home_vi', 'mobile'),
    ).rejects.toMatchObject({ status: 503 });
    expect(store.failures).toEqual(['STORAGE_UNAVAILABLE']);
    expect(home(await make(store, clock).report()).history).toHaveLength(1);
  });

  it('missing/paused store is 503 on GET and audit, never RAM fallback', async () => {
    const clock = { now: NOW };
    const store = new MemoryStore(() => clock.now);
    store.readError = new ServiceUnavailableException(
      'PAGESPEED_STORAGE_UNAVAILABLE',
    );
    await expect(make(store, clock).report()).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
    jest
      .spyOn(store, 'begin')
      .mockRejectedValueOnce(new ServiceUnavailableException('x'));
    await expect(
      make(store, clock).audit('home_vi', 'mobile'),
    ).rejects.toMatchObject({ status: 503 });
    expect(store.failures).toEqual([]);
  });

  it('disabled/blocked modes never touch the store', async () => {
    const clock = { now: NOW };
    const store = new MemoryStore(() => clock.now);
    const read = jest.spyOn(store, 'read');
    for (const flags of [
      { FEATURE_PAGESPEED_AUDIT_ENABLED: 'false' },
      { INTEGRATIONS_KILL_SWITCH: 'true' },
      { INTEGRATIONS_ENV: 'staging' },
    ] as Record<string, string>[]) {
      const service = make(store, clock, undefined, flags);
      expect(home(await service.report()).history).toEqual([]);
      await expect(service.audit('home_vi', 'mobile')).rejects.toThrow(
        'PAGESPEED_NOT_EXECUTABLE',
      );
    }
    expect([read.mock.calls.length, store.reserves]).toEqual([0, 0]);
  });
});

describe('stored PageSpeed parser', () => {
  const sample = (measuredAt: string) => ({
    measuredAt,
    storedAt: '2026-11-05T00:00:01.123456+00:00',
    lighthouseVersion: '13.0.0-mock',
    performanceScore: 86,
    accessibilityScore: 95,
    bestPracticesScore: 96,
    seoScore: 98,
    lcpMs: 2200,
    cls: 0.04,
    tbtMs: null,
  });
  const valid = () => ({
    source: 'mock',
    reports: [
      {
        targetId: 'home_vi',
        strategy: 'mobile',
        lastAttemptAt: '2026-11-05T00:00:00+00:00',
        lastError: null,
        running: false,
        samples: [
          sample('2026-11-04T00:00:00+00:00'),
          sample('2026-11-05T00:00:00+00:00'),
        ],
      },
    ],
  });
  it('accepts PostgreSQL JSON, keeps null metrics null and field unavailable', () => {
    const [report] = parseStoredPagespeed(valid());
    expect(report.samples[1]).toMatchObject({
      source: 'mock',
      targetId: 'home_vi',
      measuredAt: '2026-11-05T00:00:00.000Z',
      storedAt: '2026-11-05T00:00:01.123Z',
      lab: { tbtMs: null, cls: 0.04 },
      field: { status: 'unavailable', lcpMs: null, inpMs: null, cls: null },
    });
  });
  it.each([
    [
      'live source',
      (v: ReturnType<typeof valid>) => {
        v.source = 'google';
      },
    ],
    [
      'unknown target',
      (v: ReturnType<typeof valid>) => {
        v.reports[0].targetId = 'checkout_vi';
      },
    ],
    [
      'bad strategy',
      (v: ReturnType<typeof valid>) => {
        v.reports[0].strategy = 'tablet';
      },
    ],
    [
      'duplicate pair',
      (v: ReturnType<typeof valid>) => {
        v.reports.push(structuredClone(v.reports[0]));
      },
    ],
    [
      'raw error text',
      (v: ReturnType<typeof valid>) => {
        (v.reports[0] as { lastError: unknown }).lastError = 'stack trace';
      },
    ],
    [
      'unordered samples',
      (v: ReturnType<typeof valid>) => {
        v.reports[0].samples.reverse();
      },
    ],
    [
      'score above 100',
      (v: ReturnType<typeof valid>) => {
        v.reports[0].samples[0].performanceScore = 101;
      },
    ],
    [
      'negative LCP',
      (v: ReturnType<typeof valid>) => {
        v.reports[0].samples[0].lcpMs = -1;
      },
    ],
    [
      'bad version',
      (v: ReturnType<typeof valid>) => {
        v.reports[0].samples[0].lighthouseVersion = 'latest';
      },
    ],
    [
      'over 30 samples',
      (v: ReturnType<typeof valid>) => {
        v.reports[0].samples = Array.from({ length: 31 }, (_, i) =>
          sample(new Date(NOW - (31 - i) * 60000).toISOString()),
        );
      },
    ],
  ])('rejects %s', (_name, mutate) => {
    const value = valid();
    mutate(value);
    expect(() => parseStoredPagespeed(value)).toThrow();
  });
});

describe('PagespeedRepository error mapping', () => {
  function repo(result: { data: unknown; error: { code?: string } | null }) {
    const rpc = jest.fn(() => ({ abortSignal: () => Promise.resolve(result) }));
    const usage = { reserveMockUsage: jest.fn(() => Promise.resolve(1)) };
    return {
      rpc,
      usage,
      repo: new PagespeedRepository(
        { getClient: () => ({ rpc }) } as unknown as SupabaseService,
        usage as unknown as IntegrationRepository,
      ),
    };
  }
  it('maps PT409 to 409, other errors/bad leases to 503, cache to cached', async () => {
    await expect(
      repo({ data: null, error: { code: 'PT409' } }).repo.begin(
        'home_vi',
        'mobile',
      ),
    ).rejects.toBeInstanceOf(ConflictException);
    await expect(
      repo({ data: null, error: { code: '42501' } }).repo.begin(
        'home_vi',
        'mobile',
      ),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
    await expect(
      repo({
        data: {
          cached: false,
          token: 'x',
          version: 1,
          startedAt: '2026-11-05T00:00:00Z',
        },
        error: null,
      }).repo.begin('home_vi', 'mobile'),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
    await expect(
      repo({ data: { cached: true }, error: null }).repo.begin(
        'home_vi',
        'mobile',
      ),
    ).resolves.toEqual({ cached: true });
    const ok = repo({
      data: {
        cached: false,
        token: TOKEN,
        version: 3,
        startedAt: '2026-11-05T00:00:00+00:00',
        latestMeasuredAt: null,
      },
      error: null,
    });
    await expect(ok.repo.begin('home_vi', 'mobile')).resolves.toEqual({
      cached: false,
      token: TOKEN,
      version: 3,
      startedAt: '2026-11-05T00:00:00.000Z',
      latestMeasuredAt: null,
    });
    expect(ok.rpc).toHaveBeenCalledWith('seo_pagespeed_begin_mock', {
      p_target: 'home_vi',
      p_strategy: 'mobile',
    });
  });
  it('sends allowlisted lab fields only and refuses unknown error codes before RPC', async () => {
    const { repo: r, rpc } = repo({
      data: { source: 'mock', reports: [] },
      error: null,
    });
    const lease = {
      token: TOKEN,
      version: 1,
      startedAt: '',
      latestMeasuredAt: null,
    };
    await r.record(lease, {
      source: 'mock',
      targetId: 'home_vi',
      strategy: 'mobile',
      measuredAt: '2026-11-05T00:00:00.000Z',
      storedAt: '2026-11-05T00:00:00.000Z',
      lighthouseVersion: '13.0.0-mock',
      lab: {
        performanceScore: 1,
        accessibilityScore: 1,
        bestPracticesScore: 1,
        seoScore: 1,
        lcpMs: 1,
        cls: 0,
        tbtMs: 1,
      },
      field: {
        status: 'unavailable',
        lcpMs: null,
        inpMs: null,
        cls: null,
        reason: 'MOCK_HAS_NO_FIELD_DATA',
      },
    });
    const sent = (rpc.mock.calls[0] as unknown[])[1] as {
      p_sample: Record<string, unknown>;
    };
    expect(Object.keys(sent.p_sample).sort()).toEqual([
      'lab',
      'lighthouseVersion',
      'measuredAt',
      'source',
      'strategy',
      'targetId',
    ]);
    rpc.mockClear();
    await expect(r.fail(lease, 'raw provider message')).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
    expect(rpc).not.toHaveBeenCalled();
  });
  it('reserves the shared durable budget as pagespeed requests, hard 100/day', async () => {
    const { repo: r, usage } = repo({ data: null, error: null });
    await r.reserve();
    expect(usage.reserveMockUsage).toHaveBeenCalledWith('pagespeed', 100);
  });
});
