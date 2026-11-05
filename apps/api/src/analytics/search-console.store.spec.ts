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
  MockSearchConsoleAdapter,
  type SearchConsoleMockAdapter,
} from './search-console.adapter';
import { SearchConsoleService } from './search-console.service';
import {
  SearchConsoleRepository,
  parseStoredSearchSnapshot,
  searchPersistenceEnabled,
  type SearchSnapshotStore,
  type SearchStoreData,
  type SearchSyncLease,
  type StoredSearchSnapshot,
} from './search-console.repository';
import type { SupabaseService } from '../supabase/supabase.service';
import type { IntegrationRepository } from '../integrations/integration.repository';

const NOW = Date.parse('2026-11-04T01:00:00Z');
const TOKEN = '6f1c2b8e-3a4d-4c5e-9f00-112233445566';

// Behaves like the SQL contract: one lease owner, CAS on token/version.
class MemoryStore implements SearchSnapshotStore {
  snapshot: StoredSearchSnapshot = {
    version: 0,
    window: [],
    truncatedDates: [],
    days: [],
    lastSyncedAt: null,
    lastAttemptAt: null,
    lastError: null,
    syncing: false,
  };
  lease: SearchSyncLease | null = null;
  reserves = 0;
  failures: string[] = [];
  reserveError: Error | null = null;
  completeError: Error | null = null;
  readError: Error | null = null;
  read() {
    if (this.readError) return Promise.reject(this.readError);
    return Promise.resolve(structuredClone(this.snapshot));
  }
  begin() {
    if (this.lease)
      return Promise.reject(
        new ConflictException('SEARCH_CONSOLE_SYNC_IN_PROGRESS'),
      );
    this.lease = {
      token: TOKEN,
      version: this.snapshot.version + 1,
      startedAt: new Date(NOW).toISOString(),
    };
    this.snapshot = {
      ...this.snapshot,
      version: this.lease.version,
      lastAttemptAt: this.lease.startedAt,
      lastError: null,
      syncing: true,
    };
    return Promise.resolve({ ...this.lease });
  }
  complete(lease: SearchSyncLease, data: SearchStoreData) {
    if (this.completeError) return Promise.reject(this.completeError);
    if (lease.token !== this.lease?.token)
      return Promise.reject(new ServiceUnavailableException('LEASE'));
    this.lease = null;
    this.snapshot = {
      ...this.snapshot,
      ...structuredClone(data),
      lastSyncedAt: new Date(NOW).toISOString(),
      lastError: null,
      syncing: false,
    };
    return this.read();
  }
  fail(lease: SearchSyncLease, code: string) {
    if (lease.token !== this.lease?.token)
      return Promise.reject(new ServiceUnavailableException('LEASE'));
    this.lease = null;
    this.failures.push(code);
    this.snapshot = { ...this.snapshot, lastError: code, syncing: false };
    return Promise.resolve();
  }
  reserve() {
    this.reserves++;
    if (this.reserveError) return Promise.reject(this.reserveError);
    return Promise.resolve({ used: this.reserves });
  }
}

function make(
  store: SearchSnapshotStore,
  adapter: SearchConsoleMockAdapter = new MockSearchConsoleAdapter(),
  flags: Record<string, string> = {},
) {
  const registry = loadIntegrationRegistry(
    new ConfigService({
      FEATURE_SEARCH_CONSOLE_SYNC_ENABLED: 'true',
      ...flags,
    }),
  );
  const executor = new IntegrationExecutor(
    registry,
    { requestsPerMinute: 1000, mockDailyLimit: 10000 },
    () => NOW,
    async () => {},
    () => 0,
  );
  return new SearchConsoleService(
    registry,
    'test',
    executor,
    adapter,
    () => NOW,
    store,
  );
}

describe('Search Console durable mock snapshot (P2-02b)', () => {
  beforeAll(() => {
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
  });
  afterAll(() => jest.restoreAllMocks());

  it.each([
    [undefined, false],
    [false, false],
    ['false', false],
    [true, true],
    ['true', true],
  ])('persistence flag %p → %p', (value, expected) => {
    expect(
      searchPersistenceEnabled(
        new ConfigService(
          value === undefined
            ? {}
            : { FEATURE_SEARCH_CONSOLE_PERSISTENCE_ENABLED: value },
        ),
      ),
    ).toBe(expected);
  });
  it('rejects an invalid persistence flag without echoing its value', () => {
    expect(() =>
      searchPersistenceEnabled(
        new ConfigService({
          FEATURE_SEARCH_CONSOLE_PERSISTENCE_ENABLED: 'secret-yes',
        }),
      ),
    ).toThrow(
      /^FEATURE_SEARCH_CONSOLE_PERSISTENCE_ENABLED must be true or false$/,
    );
  });

  it('a new service instance reads the last durable success with zero provider calls', async () => {
    const store = new MemoryStore();
    const first = await make(store).sync();
    expect(first).toMatchObject({ persistence: 'database', lastError: null });
    expect(first.blockers).toEqual(['VERIFIED_PROPERTY_OAUTH_MISSING']);
    const query = jest.fn();
    const restarted = make(store, { query });
    const report = await restarted.report();
    expect(query).not.toHaveBeenCalled();
    expect(report.daily).toEqual(first.daily);
    expect(report.queries).toEqual(first.queries);
    expect(report.lastSyncedAt).toBe(first.lastSyncedAt);
  });

  it('reserves the durable budget once per actual attempt, including read retries', async () => {
    const store = new MemoryStore();
    const adapter = new MockSearchConsoleAdapter();
    const query = jest.spyOn(adapter, 'query');
    query.mockRejectedValueOnce(new IntegrationFailure('UNAVAILABLE', true));
    await make(store, adapter).sync();
    expect(query).toHaveBeenCalledTimes(15);
    expect(store.reserves).toBe(15);
  });

  it('another lease owner gets 409 before any budget or provider read', async () => {
    const store = new MemoryStore();
    store.lease = {
      token: TOKEN,
      version: 9,
      startedAt: new Date(NOW).toISOString(),
    };
    const query = jest.fn();
    await expect(make(store, { query }).sync()).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(query).not.toHaveBeenCalled();
    expect(store.reserves).toBe(0);
  });

  it('durable quota exhaustion is 429, recorded, and preserves the previous snapshot', async () => {
    const store = new MemoryStore();
    const before = await make(store).sync();
    store.reserveError = new IntegrationFailure('QUOTA_EXCEEDED');
    const query = jest.fn();
    await expect(make(store, { query }).sync()).rejects.toMatchObject({
      status: 429,
    });
    expect(query).not.toHaveBeenCalled();
    expect(store.failures).toEqual(['QUOTA_EXCEEDED']);
    const after = await make(store).report();
    expect(after).toMatchObject({
      lastSyncedAt: before.lastSyncedAt,
      lastError: 'QUOTA_EXCEEDED',
      syncing: false,
    });
    expect(after.daily).toEqual(before.daily);
  });

  it('a budget-store outage is STORAGE_UNAVAILABLE: no retry, no provider call, circuit stays closed', async () => {
    const store = new MemoryStore();
    store.reserveError = new Error('INTEGRATION_STORE_UNAVAILABLE');
    const adapter = new MockSearchConsoleAdapter();
    const query = jest.spyOn(adapter, 'query');
    const service = make(store, adapter);
    for (let i = 0; i < 4; i++)
      await expect(service.sync()).rejects.toMatchObject({
        status: 503,
        message: 'SEARCH_CONSOLE_STORAGE_UNAVAILABLE',
      });
    expect(store.reserves).toBe(4);
    expect(query).not.toHaveBeenCalled();
    expect(store.failures).toEqual(Array(4).fill('STORAGE_UNAVAILABLE'));
    store.reserveError = null;
    await expect(service.sync()).resolves.toMatchObject({ lastError: null });
  });

  it('failed publication records the failure and keeps the previous durable rows', async () => {
    const store = new MemoryStore();
    const before = await make(store).sync();
    store.completeError = new ServiceUnavailableException(
      'SEARCH_CONSOLE_STORAGE_UNAVAILABLE',
    );
    await expect(make(store).sync()).rejects.toMatchObject({ status: 503 });
    expect(store.failures).toEqual(['STORAGE_UNAVAILABLE']);
    expect((await make(store).report()).daily).toEqual(before.daily);
  });

  it('invalid provider data never reaches the store', async () => {
    const store = new MemoryStore();
    const complete = jest.spyOn(store, 'complete');
    await expect(
      make(store, { query: () => Promise.resolve(null) }).sync(),
    ).rejects.toThrow('SEARCH_CONSOLE_INVALID_RESPONSE');
    expect(complete).not.toHaveBeenCalled();
    expect(store.failures).toEqual(['INVALID_RESPONSE']);
  });

  it('a missing/paused store is 503 on GET, never a silent RAM fallback', async () => {
    const store = new MemoryStore();
    store.readError = new ServiceUnavailableException(
      'SEARCH_CONSOLE_STORAGE_UNAVAILABLE',
    );
    await expect(make(store).report()).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });

  it('disabled/blocked modes never touch the store', async () => {
    const store = new MemoryStore();
    const read = jest.spyOn(store, 'read');
    for (const flags of [
      { FEATURE_SEARCH_CONSOLE_SYNC_ENABLED: 'false' },
      { INTEGRATIONS_KILL_SWITCH: 'true' },
      { INTEGRATIONS_ENV: 'staging' },
    ] as Record<string, string>[]) {
      const service = make(store, undefined, flags);
      expect(await service.report()).toMatchObject({
        lastSyncedAt: null,
        daily: [],
      });
      await expect(service.sync()).rejects.toThrow(
        'SEARCH_CONSOLE_NOT_EXECUTABLE',
      );
    }
    expect(read).not.toHaveBeenCalled();
    expect(store.reserves).toBe(0);
  });

  it('shows another instance’s live lease as syncing', async () => {
    const store = new MemoryStore();
    store.snapshot.syncing = true;
    expect(await make(store).report()).toHaveProperty('syncing', true);
  });
});

describe('stored snapshot parser', () => {
  const window = Array.from({ length: 14 }, (_, i) =>
    new Date(Date.parse('2026-10-18') + i * 86400000)
      .toISOString()
      .slice(0, 10),
  );
  const row = (date: string, query = 'trầm hương') => ({
    keys: [
      date,
      query,
      'https://mock.example.invalid/vi/products/a',
      'MOBILE',
      'vnm',
    ],
    clicks: 7,
    impressions: 300,
    ctr: 7 / 300,
    position: 4.5,
  });
  const valid = () => ({
    source: 'mock',
    property: 'sc-domain:mock.example.invalid',
    version: 3,
    window,
    truncatedDates: [window[2]],
    days: window.map((date) => ({ date, rows: [row(date)] })),
    lastSyncedAt: '2026-11-05T08:44:38.123456+00:00',
    lastAttemptAt: '2026-11-05T08:44:37.5+00:00',
    lastError: null,
    syncing: false,
  });
  it('accepts PostgreSQL timestamptz JSON and normalizes to ISO', () => {
    const parsed = parseStoredSearchSnapshot(valid());
    expect(parsed.lastSyncedAt).toBe('2026-11-05T08:44:38.123Z');
    expect(parsed.days[0].rows[0].ctr).toBeCloseTo(7 / 300, 12);
  });
  it('accepts the empty never-synced state', () => {
    expect(
      parseStoredSearchSnapshot({
        ...valid(),
        version: 0,
        window: [],
        truncatedDates: [],
        days: [],
        lastSyncedAt: null,
        lastAttemptAt: null,
      }).window,
    ).toEqual([]);
  });
  it.each([
    ['real property', { property: 'sc-domain:real.example' }],
    ['live source', { source: 'google' }],
    ['gap in window', { window: [...window.slice(0, 13), '2026-12-31'] }],
    ['truncated outside window', { truncatedDates: ['2020-01-01'] }],
    ['duplicate truncated', { truncatedDates: [window[1], window[1]] }],
    ['days/window mismatch', { days: [] }],
    ['unknown error code', { lastError: 'raw provider stack' }],
    ['success without attempt', { lastAttemptAt: null }],
    ['window without success time', { lastSyncedAt: null }],
    ['bad version', { version: -1 }],
  ])('rejects %s', (_name, patch) => {
    expect(() => parseStoredSearchSnapshot({ ...valid(), ...patch })).toThrow();
  });
  it('rejects duplicate dimension rows and external/PII page URLs', () => {
    const dup = valid();
    dup.days[0].rows.push(row(window[0]));
    expect(() => parseStoredSearchSnapshot(dup)).toThrow();
    const pii = valid();
    pii.days[0].rows[0].keys[2] += '?email=private';
    expect(() => parseStoredSearchSnapshot(pii)).toThrow();
  });
});

describe('SearchConsoleRepository error mapping', () => {
  function repo(result: { data: unknown; error: { code?: string } | null }) {
    const rpc = jest.fn(() => ({ abortSignal: () => Promise.resolve(result) }));
    const usage = { reserveMockUsage: jest.fn(() => Promise.resolve(1)) };
    return {
      rpc,
      usage,
      repo: new SearchConsoleRepository(
        { getClient: () => ({ rpc }) } as unknown as SupabaseService,
        usage as unknown as IntegrationRepository,
      ),
    };
  }
  it('maps a held lease (PT409) to 409 and other store errors to 503', async () => {
    await expect(
      repo({ data: null, error: { code: 'PT409' } }).repo.begin(),
    ).rejects.toBeInstanceOf(ConflictException);
    await expect(
      repo({ data: null, error: { code: '42501' } }).repo.begin(),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
    await expect(
      repo({
        data: {
          token: 'not-a-uuid',
          version: 1,
          startedAt: new Date().toISOString(),
        },
        error: null,
      }).repo.begin(),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
    await expect(
      repo({ data: { lastError: 'x' }, error: null }).repo.read(),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
  it('returns a validated lease and refuses unknown error codes before any RPC', async () => {
    const ok = repo({
      data: {
        token: TOKEN,
        version: 2,
        startedAt: '2026-11-05T08:00:00+00:00',
      },
      error: null,
    });
    await expect(ok.repo.begin()).resolves.toEqual({
      token: TOKEN,
      version: 2,
      startedAt: '2026-11-05T08:00:00.000Z',
    });
    const bad = repo({ data: null, error: null });
    await expect(
      bad.repo.fail(
        { token: TOKEN, version: 2, startedAt: '' },
        'raw provider message',
      ),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(bad.rpc).not.toHaveBeenCalled();
  });
  it('reserves the shared durable budget as search_console requests, hard 100/day', async () => {
    const { repo: r, usage } = repo({ data: null, error: null });
    await r.reserve();
    expect(usage.reserveMockUsage).toHaveBeenCalledWith('search_console', 100);
  });
});
