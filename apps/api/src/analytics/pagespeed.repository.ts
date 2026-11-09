import {
  ConflictException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { IntegrationRepository } from '../integrations/integration.repository';
import type { ConfigReader } from '../integrations/integrations.config';
import { PAGESPEED_TARGETS, type AuditStrategy } from './pagespeed.adapter';
import type { PerformanceSample } from './pagespeed.service';
import {
  STORE_ERROR_CODES,
  STORE_UUID,
  storeObject,
  storeTimestamp,
  strictFlag,
} from './mock-store.util';

export interface PagespeedLease {
  token: string;
  version: number;
  startedAt: string;
  latestMeasuredAt: string | null;
}
export type PagespeedBegin =
  { cached: true } | ({ cached: false } & PagespeedLease);
export interface StoredPagespeedReport {
  targetId: string;
  strategy: AuditStrategy;
  samples: PerformanceSample[];
  lastAttemptAt: string | null;
  lastError: string | null;
  running: boolean;
}
export interface PagespeedHistoryStore {
  read(): Promise<StoredPagespeedReport[]>;
  begin(targetId: string, strategy: AuditStrategy): Promise<PagespeedBegin>;
  record(
    lease: PagespeedLease,
    sample: PerformanceSample,
  ): Promise<StoredPagespeedReport[]>;
  fail(lease: PagespeedLease, code: string): Promise<void>;
  reserve(): Promise<unknown>;
}
export function pagespeedPersistenceEnabled(config: ConfigReader) {
  return strictFlag(config, 'FEATURE_PAGESPEED_PERSISTENCE_ENABLED');
}

const TARGET_IDS = PAGESPEED_TARGETS.map((target) => target.id);
const VERSION = /^\d{1,3}\.\d{1,3}\.\d{1,3}(?:-mock)?$/;
const object = (value: unknown) =>
  storeObject(value, 'INVALID_PAGESPEED_STORE');
function bounded(value: unknown, max: number): number | null {
  if (value === null) return null;
  if (
    typeof value !== 'number' ||
    !Number.isFinite(value) ||
    value < 0 ||
    value > max
  )
    throw new Error('INVALID_PAGESPEED_STORE_METRIC');
  return value;
}
function requiredTime(value: unknown) {
  const time = storeTimestamp(value);
  if (!time) throw new Error('INVALID_PAGESPEED_STORE_TIME');
  return time;
}

export function parseStoredPagespeed(value: unknown): StoredPagespeedReport[] {
  const d = object(value);
  if (
    d.source !== 'mock' ||
    !Array.isArray(d.reports) ||
    d.reports.length > TARGET_IDS.length * 2
  )
    throw new Error('INVALID_PAGESPEED_STORE');
  const seen = new Set<string>();
  return d.reports.map((raw: unknown): StoredPagespeedReport => {
    const r = object(raw);
    const targetId = r.targetId;
    const strategy = r.strategy;
    if (
      typeof targetId !== 'string' ||
      !TARGET_IDS.includes(targetId) ||
      (strategy !== 'mobile' && strategy !== 'desktop') ||
      seen.has(targetId + ':' + strategy) ||
      typeof r.running !== 'boolean' ||
      (r.lastError !== null &&
        (typeof r.lastError !== 'string' ||
          !STORE_ERROR_CODES.includes(r.lastError))) ||
      !Array.isArray(r.samples) ||
      r.samples.length > 30
    )
      throw new Error('INVALID_PAGESPEED_STORE_REPORT');
    seen.add(targetId + ':' + strategy);
    let previous = -Infinity;
    const samples = r.samples.map((rawSample: unknown): PerformanceSample => {
      const s = object(rawSample);
      const measuredAt = requiredTime(s.measuredAt);
      if (Date.parse(measuredAt) <= previous)
        throw new Error('INVALID_PAGESPEED_STORE_ORDER');
      previous = Date.parse(measuredAt);
      if (
        typeof s.lighthouseVersion !== 'string' ||
        !VERSION.test(s.lighthouseVersion)
      )
        throw new Error('INVALID_PAGESPEED_STORE_VERSION');
      return {
        source: 'mock',
        targetId,
        strategy,
        measuredAt,
        storedAt: requiredTime(s.storedAt),
        lighthouseVersion: s.lighthouseVersion,
        lab: {
          performanceScore: bounded(s.performanceScore, 100),
          accessibilityScore: bounded(s.accessibilityScore, 100),
          bestPracticesScore: bounded(s.bestPracticesScore, 100),
          seoScore: bounded(s.seoScore, 100),
          lcpMs: bounded(s.lcpMs, 600000),
          cls: bounded(s.cls, 100),
          tbtMs: bounded(s.tbtMs, 600000),
        },
        field: {
          status: 'unavailable',
          lcpMs: null,
          inpMs: null,
          cls: null,
          reason: 'MOCK_HAS_NO_FIELD_DATA',
        },
      };
    });
    return {
      targetId,
      strategy,
      samples,
      lastAttemptAt: storeTimestamp(r.lastAttemptAt),
      lastError: r.lastError,
      running: r.running,
    };
  });
}

const unavailable = () =>
  new ServiceUnavailableException('PAGESPEED_STORAGE_UNAVAILABLE');

@Injectable()
export class PagespeedRepository implements PagespeedHistoryStore {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly usage: IntegrationRepository,
  ) {}
  private get client() {
    return this.supabase.getClient();
  }
  async read() {
    try {
      const { data, error } = await this.client
        .rpc('seo_pagespeed_read_mock', {})
        .abortSignal(AbortSignal.timeout(5000));
      if (error) throw new Error('PAGESPEED_STORE_FAILED');
      return parseStoredPagespeed(data);
    } catch {
      throw unavailable();
    }
  }
  async begin(
    targetId: string,
    strategy: AuditStrategy,
  ): Promise<PagespeedBegin> {
    try {
      const { data, error } = await this.client
        .rpc('seo_pagespeed_begin_mock', {
          p_target: targetId,
          p_strategy: strategy,
        })
        .abortSignal(AbortSignal.timeout(5000));
      if (error?.code === 'PT409')
        throw new ConflictException('PAGESPEED_AUDIT_IN_PROGRESS');
      if (error) throw new Error('PAGESPEED_STORE_FAILED');
      const d = object(data);
      if (d.cached === true) return { cached: true };
      if (
        d.cached !== false ||
        typeof d.token !== 'string' ||
        !STORE_UUID.test(d.token) ||
        typeof d.version !== 'number' ||
        !Number.isSafeInteger(d.version) ||
        d.version < 1
      )
        throw new Error('INVALID_PAGESPEED_LEASE');
      return {
        cached: false,
        token: d.token,
        version: d.version,
        startedAt: requiredTime(d.startedAt),
        latestMeasuredAt: storeTimestamp(d.latestMeasuredAt ?? null),
      };
    } catch (error) {
      if (error instanceof ConflictException) throw error;
      throw unavailable();
    }
  }
  async record(lease: PagespeedLease, sample: PerformanceSample) {
    try {
      // Allowlisted numeric fields only; field data never leaves as non-null.
      const { data, error } = await this.client
        .rpc('seo_pagespeed_record_mock', {
          p_token: lease.token,
          p_version: lease.version,
          p_sample: {
            source: 'mock',
            targetId: sample.targetId,
            strategy: sample.strategy,
            measuredAt: sample.measuredAt,
            lighthouseVersion: sample.lighthouseVersion,
            lab: { ...sample.lab },
          },
        })
        .abortSignal(AbortSignal.timeout(5000));
      if (error) throw new Error('PAGESPEED_STORE_FAILED');
      return parseStoredPagespeed(data);
    } catch {
      throw unavailable();
    }
  }
  async fail(lease: PagespeedLease, code: string) {
    try {
      if (!STORE_ERROR_CODES.includes(code))
        throw new Error('INVALID_PAGESPEED_ERROR');
      const { error } = await this.client
        .rpc('seo_pagespeed_fail_mock', {
          p_token: lease.token,
          p_version: lease.version,
          p_code: code,
        })
        .abortSignal(AbortSignal.timeout(5000));
      if (error) throw new Error('PAGESPEED_STORE_FAILED');
    } catch {
      throw unavailable();
    }
  }
  reserve() {
    return this.usage.reserveMockUsage('pagespeed', 100);
  }
}
