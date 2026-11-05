import {
  ConflictException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { IntegrationRepository } from '../integrations/integration.repository';
import type { ConfigReader } from '../integrations/integrations.config';
import { MOCK_SEARCH_PROPERTY, type SearchRow } from './search-console.adapter';
import { validateSearchRows } from './search-console.service';
import {
  STORE_ERROR_CODES,
  STORE_UUID,
  storeObject,
  storeTimestamp,
  strictFlag,
} from './mock-store.util';

export interface SearchStoreData {
  window: string[];
  truncatedDates: string[];
  days: { date: string; rows: SearchRow[] }[];
}
export interface StoredSearchSnapshot extends SearchStoreData {
  version: number;
  lastSyncedAt: string | null;
  lastAttemptAt: string | null;
  lastError: string | null;
  syncing: boolean;
}
export interface SearchSyncLease {
  token: string;
  version: number;
  startedAt: string;
}
export interface SearchSnapshotStore {
  read(): Promise<StoredSearchSnapshot>;
  begin(): Promise<SearchSyncLease>;
  complete(
    lease: SearchSyncLease,
    data: SearchStoreData,
  ): Promise<StoredSearchSnapshot>;
  fail(lease: SearchSyncLease, code: string): Promise<void>;
  reserve(): Promise<unknown>;
}
export function searchPersistenceEnabled(config: ConfigReader) {
  return strictFlag(config, 'FEATURE_SEARCH_CONSOLE_PERSISTENCE_ENABLED');
}
const ERRORS = STORE_ERROR_CODES;
const uuid = STORE_UUID;
const object = (value: unknown) => storeObject(value, 'INVALID_SEARCH_STORE');
const timestamp = storeTimestamp;
export function parseStoredSearchSnapshot(
  value: unknown,
): StoredSearchSnapshot {
  const d = object(value);
  if (
    d.source !== 'mock' ||
    d.property !== MOCK_SEARCH_PROPERTY ||
    typeof d.version !== 'number' ||
    !Number.isSafeInteger(d.version) ||
    d.version < 0 ||
    d.version > 2147483647 ||
    typeof d.syncing !== 'boolean' ||
    !Array.isArray(d.window) ||
    ![0, 14].includes(d.window.length) ||
    !Array.isArray(d.days) ||
    d.days.length !== d.window.length ||
    !Array.isArray(d.truncatedDates) ||
    d.truncatedDates.length > 14 ||
    (d.lastError !== null &&
      (typeof d.lastError !== 'string' || !ERRORS.includes(d.lastError)))
  )
    throw new Error('INVALID_SEARCH_STORE');
  const rawWindow = d.window as unknown[];
  const window = rawWindow.map((date: unknown, i: number) => {
    if (
      typeof date !== 'string' ||
      !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
      !Number.isFinite(Date.parse(date)) ||
      new Date(date).toISOString().slice(0, 10) !== date ||
      (i > 0 &&
        Date.parse(date) - Date.parse(String(rawWindow[i - 1])) !== 86400000)
    )
      throw new Error('INVALID_SEARCH_STORE_WINDOW');
    return date;
  });
  const truncatedDates = d.truncatedDates.map((date: unknown) => {
    if (typeof date !== 'string' || !window.includes(date))
      throw new Error('INVALID_SEARCH_STORE_WINDOW');
    return date;
  });
  if (new Set(truncatedDates).size !== truncatedDates.length)
    throw new Error('INVALID_SEARCH_STORE_WINDOW');
  const days = d.days.map((day: unknown, i: number) => {
    const item = object(day);
    if (item.date !== window[i]) throw new Error('INVALID_SEARCH_STORE_DAY');
    const rows = validateSearchRows({ rows: item.rows }, window[i], 200);
    if (new Set(rows.map((r) => JSON.stringify(r.keys))).size !== rows.length)
      throw new Error('INVALID_SEARCH_STORE_ROW');
    return { date: window[i], rows };
  });
  const lastSyncedAt = timestamp(d.lastSyncedAt),
    lastAttemptAt = timestamp(d.lastAttemptAt);
  if (
    (lastSyncedAt === null) !== (window.length === 0) ||
    (lastSyncedAt !== null && lastAttemptAt === null)
  )
    throw new Error('INVALID_SEARCH_STORE_TIME');
  return {
    version: d.version,
    window,
    truncatedDates,
    days,
    lastSyncedAt,
    lastAttemptAt,
    lastError: d.lastError,
    syncing: d.syncing,
  };
}
@Injectable()
export class SearchConsoleRepository implements SearchSnapshotStore {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly usage: IntegrationRepository,
  ) {}
  async read() {
    try {
      const { data, error } = await this.supabase
        .getClient()
        .rpc('seo_search_read_mock', {})
        .abortSignal(AbortSignal.timeout(5000));
      if (error) throw new Error('SEARCH_STORE_FAILED');
      return parseStoredSearchSnapshot(data);
    } catch {
      throw new ServiceUnavailableException(
        'SEARCH_CONSOLE_STORAGE_UNAVAILABLE',
      );
    }
  }
  async begin(): Promise<SearchSyncLease> {
    try {
      const { data, error } = await this.supabase
        .getClient()
        .rpc('seo_search_begin_mock', {})
        .abortSignal(AbortSignal.timeout(5000));
      if (error?.code === 'PT409')
        throw new ConflictException('SEARCH_CONSOLE_SYNC_IN_PROGRESS');
      if (error) throw new Error('SEARCH_STORE_FAILED');
      const d = object(data);
      if (
        typeof d.token !== 'string' ||
        !uuid.test(d.token) ||
        typeof d.version !== 'number' ||
        !Number.isSafeInteger(d.version) ||
        d.version < 1
      )
        throw new Error('INVALID_SEARCH_LEASE');
      const startedAt = timestamp(d.startedAt);
      if (!startedAt) throw new Error('INVALID_SEARCH_LEASE');
      return { token: d.token, version: d.version, startedAt };
    } catch (error) {
      if (error instanceof ConflictException) throw error;
      throw new ServiceUnavailableException(
        'SEARCH_CONSOLE_STORAGE_UNAVAILABLE',
      );
    }
  }
  async complete(lease: SearchSyncLease, snapshot: SearchStoreData) {
    try {
      const days = snapshot.days.map((day) => ({
        date: day.date,
        rows: day.rows.map((r) => ({
          keys: [...r.keys],
          clicks: r.clicks,
          impressions: r.impressions,
          ctr: r.ctr,
          position: r.position,
        })),
      }));
      const { data, error } = await this.supabase
        .getClient()
        .rpc('seo_search_complete_mock', {
          p_token: lease.token,
          p_version: lease.version,
          p_window: snapshot.window,
          p_days: days,
          p_truncated: snapshot.truncatedDates,
        })
        .abortSignal(AbortSignal.timeout(5000));
      if (error) throw new Error('SEARCH_STORE_FAILED');
      return parseStoredSearchSnapshot(data);
    } catch {
      throw new ServiceUnavailableException(
        'SEARCH_CONSOLE_STORAGE_UNAVAILABLE',
      );
    }
  }
  async fail(lease: SearchSyncLease, code: string) {
    try {
      if (!ERRORS.includes(code)) throw new Error('INVALID_SEARCH_ERROR');
      const { error } = await this.supabase
        .getClient()
        .rpc('seo_search_fail_mock', {
          p_token: lease.token,
          p_version: lease.version,
          p_code: code,
        })
        .abortSignal(AbortSignal.timeout(5000));
      if (error) throw new Error('SEARCH_STORE_FAILED');
    } catch {
      throw new ServiceUnavailableException(
        'SEARCH_CONSOLE_STORAGE_UNAVAILABLE',
      );
    }
  }
  reserve() {
    return this.usage.reserveMockUsage('search_console', 100);
  }
}
