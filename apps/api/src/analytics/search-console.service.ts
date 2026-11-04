import {
  ConflictException,
  HttpException,
  ServiceUnavailableException,
} from '@nestjs/common';
import type { IntegrationRegistry } from '../integrations/integrations.config';
import {
  IntegrationExecutor,
  IntegrationFailure,
} from '../integrations/integration-executor';
import {
  MOCK_SEARCH_PROPERTY,
  SEARCH_DIMENSIONS,
  MockSearchConsoleAdapter,
  type SearchConsoleMockAdapter,
  type SearchRow,
} from './search-console.adapter';

const DAY = 86400000;
export function searchWindow(now: number): string[] {
  const today = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Los_Angeles',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
  const end = Date.parse(today) - 3 * DAY;
  return Array.from({ length: 14 }, (_, i) =>
    new Date(end - (13 - i) * DAY).toISOString().slice(0, 10),
  );
}

function validateRows(value: unknown, date: string): SearchRow[] {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('INVALID_RESPONSE');
  const input = (value as { rows?: unknown }).rows;
  if (input === undefined) return [];
  if (!Array.isArray(input) || input.length > 100)
    throw new Error('INVALID_RESPONSE');
  return input.map((value: unknown): SearchRow => {
    if (!value || typeof value !== 'object' || Array.isArray(value))
      throw new Error('INVALID_ROW');
    const row = value as SearchRow;
    if (
      !Array.isArray(row.keys) ||
      row.keys.length !== 5 ||
      row.keys.some((k) => typeof k !== 'string') ||
      row.keys[0] !== date ||
      row.keys[1].length < 1 ||
      row.keys[1].length > 100 ||
      [...row.keys[1]].some((char) => char.charCodeAt(0) < 32) ||
      !['MOBILE', 'DESKTOP', 'TABLET'].includes(row.keys[3]) ||
      !/^[a-z]{3}$/.test(row.keys[4])
    )
      throw new Error('INVALID_KEYS');
    const url = new URL(row.keys[2]);
    if (
      url.origin !== 'https://mock.example.invalid' ||
      url.search ||
      url.hash ||
      url.username ||
      url.password ||
      url.pathname.length > 250
    )
      throw new Error('INVALID_PAGE');
    if (
      !Number.isSafeInteger(row.clicks) ||
      !Number.isSafeInteger(row.impressions) ||
      row.clicks < 0 ||
      row.impressions < row.clicks ||
      row.impressions > 1e9 ||
      !Number.isFinite(row.ctr) ||
      row.ctr < 0 ||
      row.ctr > 1 ||
      Math.abs(row.ctr - (row.impressions ? row.clicks / row.impressions : 0)) >
        1e-6 ||
      !Number.isFinite(row.position) ||
      row.position < 0 ||
      row.position > 1000 ||
      (row.impressions > 0 && row.position < 1)
    )
      throw new Error('INVALID_METRICS');
    return {
      keys: [...row.keys],
      clicks: row.clicks,
      impressions: row.impressions,
      ctr: row.ctr,
      position: row.position,
    };
  });
}

function aggregate(rows: SearchRow[], keyIndex: 1 | 2) {
  const grouped = new Map<
    string,
    { key: string; clicks: number; impressions: number; weighted: number }
  >();
  for (const row of rows) {
    const key = row.keys[keyIndex];
    const item = grouped.get(key) ?? {
      key,
      clicks: 0,
      impressions: 0,
      weighted: 0,
    };
    item.clicks += row.clicks;
    item.impressions += row.impressions;
    item.weighted += row.position * row.impressions;
    grouped.set(key, item);
  }
  return [...grouped.values()]
    .map(({ weighted, ...r }) => ({
      ...r,
      ctr: r.impressions ? r.clicks / r.impressions : 0,
      position: r.impressions ? weighted / r.impressions : null,
    }))
    .sort(
      (a, b) => b.impressions - a.impressions || a.key.localeCompare(b.key),
    );
}

// Process-local mock snapshot. There is deliberately no production transport/job.
export class SearchConsoleService {
  private days = new Map<string, SearchRow[]>();
  private window: string[] = [];
  private truncatedDays: string[] = [];
  private running = false;
  private lastSyncedAt: string | null = null;
  private lastAttemptAt: string | null = null;
  private lastError: string | null = null;
  constructor(
    private readonly registry: IntegrationRegistry,
    private readonly nodeEnv: string,
    private readonly executor: IntegrationExecutor,
    private readonly adapter: SearchConsoleMockAdapter = new MockSearchConsoleAdapter(),
    private readonly now: () => number = Date.now,
  ) {}

  private mode(): 'disabled' | 'blocked' | 'mock' {
    const mode = this.registry.search_console.mode;
    if (mode === 'disabled') return mode;
    return mode === 'mock' && ['test', 'development'].includes(this.nodeEnv)
      ? 'mock'
      : 'blocked';
  }

  summary() {
    const mode = this.mode();
    const visible = mode === 'mock';
    const window = visible ? [...this.window] : [];
    const rows = window.flatMap((date) => this.days.get(date) ?? []);
    const currentDays = window.slice(7);
    const current = rows.filter((row) => currentDays.includes(row.keys[0]));
    const previous = rows.filter((row) => !currentDays.includes(row.keys[0]));
    const missingDates = window.filter((date) => !this.days.get(date)?.length);
    const comparisonComplete =
      window.length === 14 &&
      missingDates.length === 0 &&
      this.truncatedDays.length === 0;
    const prior = new Map(aggregate(previous, 1).map((row) => [row.key, row]));
    const queries = aggregate(current, 1).map((row) => ({
      ...row,
      previousClicks: prior.get(row.key)?.clicks ?? null,
      // A missing top query is unknown rather than an invented zero baseline.
      clickChange:
        comparisonComplete && prior.has(row.key)
          ? row.clicks - prior.get(row.key)!.clicks
          : null,
    }));
    const pages = aggregate(current, 2);
    const lastSyncedAt = visible ? this.lastSyncedAt : null;
    return {
      source: 'mock' as const,
      mode,
      property: MOCK_SEARCH_PROPERTY,
      persistence: 'process_memory' as const,
      schedulerEnabled: false,
      blockers: ['VERIFIED_PROPERTY_OAUTH_MISSING', 'DURABLE_STORAGE_PENDING'],
      scope: 'webmasters.readonly',
      timezone: 'America/Los_Angeles',
      dataState: 'final',
      lagDays: 3,
      topRowsOnly: true,
      propertyTotals: false,
      themeSegmentation: 'unmapped',
      window: window.length
        ? {
            startDate: window[0],
            endDate: window.at(-1)!,
            currentStartDate: window[7],
          }
        : null,
      lastSyncedAt,
      lastAttemptAt: visible ? this.lastAttemptAt : null,
      lastError: visible ? this.lastError : null,
      syncing: visible && this.running,
      freshness: !lastSyncedAt
        ? 'never_synced'
        : this.now() - Date.parse(lastSyncedAt) > 26 * 3600000
          ? 'stale'
          : 'fresh',
      latestDataDate:
        window.filter((date) => this.days.get(date)?.length).at(-1) ?? null,
      missingDates,
      truncatedDates: visible ? [...this.truncatedDays] : [],
      comparisonComplete,
      daily: window.map((date) => {
        const values = this.days.get(date) ?? [];
        return {
          date,
          rowCount: values.length,
          clicks: values.length
            ? values.reduce((n, r) => n + r.clicks, 0)
            : null,
          impressions: values.length
            ? values.reduce((n, r) => n + r.impressions, 0)
            : null,
        };
      }),
      queries: queries.slice(0, 20),
      pages: pages.slice(0, 20),
      opportunities: pages
        .filter(
          (p) =>
            p.impressions >= 500 && p.ctr < 0.02 && /\/products\//.test(p.key),
        )
        .slice(0, 10),
      limits: {
        days: 14,
        rowsPerDay: 200,
        pageReadsPerSync: 28,
        mockAttemptsPerMinute: 30,
        mockAttemptsPerDay: 100,
      },
    };
  }

  async sync() {
    if (this.mode() !== 'mock')
      throw new ServiceUnavailableException('SEARCH_CONSOLE_NOT_EXECUTABLE');
    if (this.running)
      throw new ConflictException('SEARCH_CONSOLE_SYNC_IN_PROGRESS');
    this.running = true;
    this.lastAttemptAt = new Date(this.now()).toISOString();
    try {
      const window = searchWindow(this.now());
      const staged = new Map<string, SearchRow[]>();
      const truncated: string[] = [];
      for (const date of window) {
        const rows: SearchRow[] = [];
        const keys = new Set<string>();
        for (let page = 0; page < 2; page++) {
          const result = await this.executor.runMock(
            'search_console',
            'search_analytics_query',
            'read',
            (signal) =>
              this.adapter.query(
                {
                  startDate: date,
                  endDate: date,
                  dimensions: SEARCH_DIMENSIONS,
                  type: 'web',
                  dataState: 'final',
                  rowLimit: 100,
                  startRow: page * 100,
                },
                signal,
              ),
          );
          const batch = validateRows(result.data, date);
          for (const row of batch) {
            const key = JSON.stringify(row.keys);
            if (keys.has(key)) throw new Error('DUPLICATE_ROW');
            keys.add(key);
            rows.push(row);
          }
          if (batch.length < 100) break;
          if (page === 1) truncated.push(date);
        }
        staged.set(date, rows);
      }
      // Atomic replacement; a failed page never advances the previous snapshot.
      this.days = staged;
      this.window = window;
      this.truncatedDays = truncated;
      this.lastSyncedAt = new Date(this.now()).toISOString();
      this.lastError = null;
    } catch (error: unknown) {
      this.lastError =
        error instanceof IntegrationFailure ? error.code : 'INVALID_RESPONSE';
      throw new HttpException(
        'SEARCH_CONSOLE_' + this.lastError,
        ['RATE_LIMITED', 'QUOTA_EXCEEDED'].includes(this.lastError) ? 429 : 503,
      );
    } finally {
      this.running = false;
    }
    return this.summary();
  }
}
