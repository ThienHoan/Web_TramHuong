import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import { loadIntegrationRegistry } from '../integrations/integrations.config';
import {
  IntegrationExecutor,
  IntegrationFailure,
} from '../integrations/integration-executor';
import {
  MockSearchConsoleAdapter,
  type SearchConsoleMockAdapter,
  type SearchQuery,
  type SearchRow,
} from './search-console.adapter';
import { SearchConsoleService, searchWindow } from './search-console.service';

const NOW = Date.parse('2026-11-04T01:00:00Z');
function fixture(
  adapter: SearchConsoleMockAdapter = new MockSearchConsoleAdapter(),
  flags: Record<string, string> = {},
  env = 'test',
  budget = 10000,
) {
  const registry = loadIntegrationRegistry(
    new ConfigService({
      FEATURE_SEARCH_CONSOLE_SYNC_ENABLED: 'true',
      ...flags,
    }),
  );
  const executor = new IntegrationExecutor(
    registry,
    { requestsPerMinute: 1000, mockDailyLimit: budget },
    () => NOW,
    async () => {},
    () => 0,
  );
  let now = NOW;
  return {
    service: new SearchConsoleService(
      registry,
      env,
      executor,
      adapter,
      () => now,
    ),
    executor,
    advance: (ms: number) => {
      now += ms;
    },
  };
}
function row(date: string, key = 'sample'): SearchRow {
  return {
    keys: [
      date,
      key,
      'https://mock.example.invalid/vi/products/sample',
      'MOBILE',
      'vnm',
    ],
    clicks: 2,
    impressions: 200,
    ctr: 0.01,
    position: 5,
  };
}

describe('Search Console bounded mock sync', () => {
  beforeAll(() => {
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
  });
  afterAll(() => jest.restoreAllMocks());
  it.each([
    [{ FEATURE_SEARCH_CONSOLE_SYNC_ENABLED: 'false' }, 'test', 'disabled'],
    [{ INTEGRATIONS_KILL_SWITCH: 'true' }, 'test', 'disabled'],
    [{ INTEGRATIONS_ENV: 'staging' }, 'test', 'blocked'],
    [{ INTEGRATIONS_ENV: 'production' }, 'test', 'blocked'],
    [{}, 'production', 'blocked'],
    [{}, '', 'blocked'],
  ])(
    'fails closed %j %s without touching an adapter',
    async (flags, env, mode) => {
      const query = jest.fn();
      const { service } = fixture({ query }, flags, env);
      expect(service.summary()).toMatchObject({
        mode,
        schedulerEnabled: false,
        queries: [],
        lastSyncedAt: null,
      });
      await expect(service.sync()).rejects.toThrow(
        'SEARCH_CONSOLE_NOT_EXECUTABLE',
      );
      expect(query).not.toHaveBeenCalled();
    },
  );
  it('uses Pacific dates across UTC midnight and daylight saving', () => {
    expect(searchWindow(NOW).at(-1)).toBe('2026-10-31');
    expect(searchWindow(Date.parse('2026-11-04T09:00:00Z')).at(-1)).toBe(
      '2026-11-01',
    );
    expect(searchWindow(Date.parse('2026-03-09T06:00:00Z'))).toHaveLength(14);
  });
  it('starts empty and GET never syncs', () => {
    const query = jest.fn();
    const { service } = fixture({ query });
    expect(service.summary()).toMatchObject({
      source: 'mock',
      freshness: 'never_synced',
      daily: [],
      window: null,
    });
    expect(query).not.toHaveBeenCalled();
  });
  it('reports missing dates as null and disables misleading click comparisons', async () => {
    const { service } = fixture();
    const result = await service.sync();
    expect(result.daily).toHaveLength(14);
    expect(result.missingDates).toHaveLength(2);
    expect(result.daily.filter((r) => r.clicks === null)).toHaveLength(2);
    expect(result.queries.every((r) => r.clickChange === null)).toBe(true);
    expect(result).toMatchObject({
      source: 'mock',
      persistence: 'process_memory',
      topRowsOnly: true,
      propertyTotals: false,
      comparisonComplete: false,
      themeSegmentation: 'unmapped',
    });
    expect(result.opportunities.length).toBeGreaterThan(0);
    expect(result.lastSyncedAt).toBe(new Date(NOW).toISOString());
  });
  it('replaces dates on repeat rather than adding duplicate rows', async () => {
    const { service } = fixture();
    const first = await service.sync();
    expect(await service.sync()).toEqual(first);
    expect(fixture().service.summary().daily).toEqual([]); // process restart has no durable claim
  });
  it('shows stale success and preserves successful rows/timestamp after failure', async () => {
    const adapter = new MockSearchConsoleAdapter();
    const query = jest.spyOn(adapter, 'query');
    const { service, advance } = fixture(adapter);
    const before = await service.sync();
    advance(27 * 3600000);
    expect(service.summary().freshness).toBe('stale');
    query.mockRejectedValue(new IntegrationFailure('REJECTED'));
    await expect(service.sync()).rejects.toThrow('SEARCH_CONSOLE_REJECTED');
    expect(service.summary()).toMatchObject({
      lastSyncedAt: before.lastSyncedAt,
      queries: before.queries,
      lastError: 'REJECTED',
      syncing: false,
    });
  });
  it('allows only one overlapping sync and releases the lock after completion', async () => {
    let release!: (data: unknown) => void;
    const query = jest.fn((): Promise<unknown> => Promise.resolve({}));
    query.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          release = resolve;
        }),
    );
    const { service } = fixture({ query });
    const first = service.sync();
    expect(service.summary().syncing).toBe(true);
    await expect(service.sync()).rejects.toThrow(
      'SEARCH_CONSOLE_SYNC_IN_PROGRESS',
    );
    release({});
    await first;
    await expect(service.sync()).resolves.toHaveProperty('syncing', false);
  });
  it('caps pagination at 200/day and marks a full final page as truncated', async () => {
    const query = jest.fn((q: SearchQuery) =>
      Promise.resolve({
        rows: Array.from({ length: 100 }, (_, i) =>
          row(q.startDate, 'q' + (i + q.startRow)),
        ),
      }),
    );
    const { service } = fixture({ query });
    const result = await service.sync();
    expect(query).toHaveBeenCalledTimes(28);
    expect(result.truncatedDates).toHaveLength(14);
    expect(result.daily.every((d) => d.rowCount === 200)).toBe(true);
    expect(query.mock.calls[1][0]).toMatchObject({
      rowLimit: 100,
      startRow: 100,
      type: 'web',
      dataState: 'final',
      dimensions: ['date', 'query', 'page', 'device', 'country'],
    });
  });
  it('computes CTR from sums and position weighted by impressions, not averages of averages', async () => {
    const query = (q: SearchQuery) =>
      Promise.resolve({
        rows: [
          row(q.startDate),
          {
            ...row(q.startDate),
            keys: [
              q.startDate,
              'sample',
              'https://mock.example.invalid/vi/products/second',
              'DESKTOP',
              'vnm',
            ],
            clicks: 90,
            impressions: 100,
            ctr: 0.9,
            position: 11,
          },
        ],
      });
    const result = await fixture({ query }).service.sync();
    expect(result.queries[0]).toMatchObject({
      clicks: 92 * 7,
      impressions: 300 * 7,
      ctr: 92 / 300,
      position: 7,
      previousClicks: 92 * 7,
      clickChange: 0,
    });
  });
  it('retries a transient readonly failure through the shared executor', async () => {
    const query = jest.fn((): Promise<unknown> => Promise.resolve({}));
    query.mockRejectedValueOnce(new IntegrationFailure('UNAVAILABLE', true));
    await fixture({ query }).service.sync();
    expect(query).toHaveBeenCalledTimes(15);
  });
  it('enforces a hard attempt budget and leaves no partial snapshot', async () => {
    const query = jest.fn(() => Promise.resolve({}));
    const { service } = fixture({ query }, {}, 'test', 3);
    await expect(service.sync()).rejects.toMatchObject({ status: 429 });
    expect(query).toHaveBeenCalledTimes(3);
    expect(service.summary()).toMatchObject({
      daily: [],
      lastSyncedAt: null,
      lastError: 'QUOTA_EXCEEDED',
    });
  });
  it.each([
    'wrong_date',
    'external_page',
    'pii_url',
    'bad_metrics',
    'bad_ctr',
    'duplicate',
    'oversized',
    'wrong_shape',
  ])('rejects %s and does not publish partial data', async (kind) => {
    const query = (q: SearchQuery) => {
      const r = row(q.startDate);
      if (kind === 'wrong_date') r.keys[0] = '2020-01-01';
      if (kind === 'external_page') r.keys[2] = 'https://private.example/';
      if (kind === 'pii_url') r.keys[2] += '?email=secret';
      if (kind === 'bad_metrics') r.clicks = -1;
      if (kind === 'bad_ctr') r.ctr = 0.5;
      return Promise.resolve(
        kind === 'wrong_shape'
          ? null
          : {
              rows:
                kind === 'duplicate'
                  ? [r, r]
                  : kind === 'oversized'
                    ? Array(101).fill(r)
                    : [r],
            },
      );
    };
    const { service } = fixture({ query });
    await expect(service.sync()).rejects.toThrow(
      'SEARCH_CONSOLE_INVALID_RESPONSE',
    );
    expect(service.summary().daily).toEqual([]);
    expect(JSON.stringify(service.summary())).not.toContain('email=secret');
  });
});
