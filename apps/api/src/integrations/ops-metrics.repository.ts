import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import {
  INTEGRATION_DEFINITIONS,
  type ConfigReader,
  type IntegrationProvider,
} from './integrations.config';
import { strictFlag } from './strict-flag';

export interface OpsOutboxCounts {
  queued: number;
  working: number;
  accepted: number;
  unknown: number;
  dead: number;
  lastAcceptedAt: string | null;
  lastErrorCode: string | null;
}
export interface OpsUsage {
  metric: 'requests' | 'tokens' | 'emails' | 'milli_credits';
  used: number;
  hardLimit: number;
}
export interface OpsStoreState {
  lastSuccessAt: string | null;
  lastAttemptAt: string | null;
  lastErrorCode: string | null;
}
/** Budget reserved for REAL provider calls (environment 'staging') today. */
export interface OpsLiveUsage {
  requests: { used: number; hardLimit: number } | null;
  tokens: { used: number; hardLimit: number } | null;
}
export interface OpsMetrics {
  observedAt: string;
  windowDays: number;
  usageDay: string;
  live: {
    source: 'test_db' | 'unavailable';
    providers: Partial<Record<IntegrationProvider, OpsLiveUsage>>;
  };
  providers: Record<
    IntegrationProvider,
    { outbox: OpsOutboxCounts; usage: OpsUsage[] }
  >;
  searchConsole: OpsStoreState | null;
  pagespeed: OpsStoreState | null;
  merchantFence: { inflight: number } | null;
}
export interface OpsMetricsStore {
  read(): Promise<OpsMetrics>;
}
export function opsMetricsEnabled(config: ConfigReader) {
  return strictFlag(config, 'FEATURE_INTEGRATION_OPS_METRICS_ENABLED');
}

const WINDOW_DAYS = 7;
// Providers with a durable live budget (integration_reserve_live_usage allowlist).
const LIVE_PROVIDERS = ['gemini'] as const;
const PROVIDERS = Object.keys(INTEGRATION_DEFINITIONS) as IntegrationProvider[];
const CODE = /^[A-Z][A-Z0-9_]{0,63}$/;
const METRICS = ['requests', 'tokens', 'emails', 'milli_credits'] as const;
function object(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('INVALID_OPS_METRICS');
  return value as Record<string, unknown>;
}
function count(value: unknown, max = 1e9) {
  if (
    typeof value !== 'number' ||
    !Number.isSafeInteger(value) ||
    value < 0 ||
    value > max
  )
    throw new Error('INVALID_OPS_COUNT');
  return value;
}
function time(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (
    typeof value !== 'string' ||
    value.length > 40 ||
    !Number.isFinite(Date.parse(value))
  )
    throw new Error('INVALID_OPS_TIME');
  return new Date(value).toISOString();
}
function code(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== 'string' || !CODE.test(value))
    throw new Error('INVALID_OPS_CODE');
  return value;
}
function storeState(value: unknown): OpsStoreState | null {
  if (value === null || value === undefined) return null;
  const d = object(value);
  return {
    lastSuccessAt: time(d.lastSuccessAt),
    lastAttemptAt: time(d.lastAttemptAt),
    lastErrorCode: code(d.lastErrorCode),
  };
}

/** Strict: aggregates only, all ten registry providers, bounded numbers. */
export function parseOpsMetrics(value: unknown): OpsMetrics {
  const d = object(value);
  if (d.source !== 'test_db_mock' || d.windowDays !== WINDOW_DAYS)
    throw new Error('INVALID_OPS_METRICS');
  const observedAt = time(d.observedAt);
  if (!observedAt) throw new Error('INVALID_OPS_TIME');
  if (
    typeof d.usageDay !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}$/.test(d.usageDay) ||
    new Date(d.usageDay + 'T00:00:00Z').toISOString().slice(0, 10) !==
      d.usageDay
  )
    throw new Error('INVALID_OPS_DAY');
  const raw = object(d.providers);
  if (
    Object.keys(raw).length !== PROVIDERS.length ||
    PROVIDERS.some((p) => !Object.hasOwn(raw, p))
  )
    throw new Error('INVALID_OPS_PROVIDERS');
  const providers = {} as OpsMetrics['providers'];
  for (const provider of PROVIDERS) {
    const entry = object(raw[provider]);
    const o = object(entry.outbox);
    if (!Array.isArray(entry.usage) || entry.usage.length > METRICS.length)
      throw new Error('INVALID_OPS_USAGE');
    const usage = entry.usage.map((item: unknown): OpsUsage => {
      const u = object(item);
      if (!METRICS.includes(u.metric as OpsUsage['metric']))
        throw new Error('INVALID_OPS_USAGE');
      const used = count(u.used, 1e12),
        hardLimit = count(u.hardLimit, 1e12);
      if (used > hardLimit) throw new Error('INVALID_OPS_USAGE');
      return { metric: u.metric as OpsUsage['metric'], used, hardLimit };
    });
    if (new Set(usage.map((u) => u.metric)).size !== usage.length)
      throw new Error('INVALID_OPS_USAGE');
    providers[provider] = {
      outbox: {
        queued: count(o.queued),
        working: count(o.working),
        accepted: count(o.accepted),
        unknown: count(o.unknown),
        dead: count(o.dead),
        lastAcceptedAt: time(o.lastAcceptedAt),
        lastErrorCode: code(o.lastErrorCode),
      },
      usage,
    };
  }
  const fence =
    d.merchantFence === null || d.merchantFence === undefined
      ? null
      : { inflight: count(object(d.merchantFence).inflight) };
  return {
    observedAt,
    windowDays: WINDOW_DAYS,
    usageDay: d.usageDay,
    live: { source: 'unavailable', providers: {} },
    providers,
    searchConsole: storeState(d.searchConsole),
    pagespeed: storeState(d.pagespeed),
    merchantFence: fence,
  };
}

/** Strict parse of today's staging usage rows; anything unexpected throws. */
export function parseLiveUsageRows(
  value: unknown,
  usageDay: string,
): Partial<Record<IntegrationProvider, OpsLiveUsage>> {
  if (!Array.isArray(value) || value.length > 20)
    throw new Error('INVALID_LIVE_USAGE');
  const out: Partial<Record<IntegrationProvider, OpsLiveUsage>> = {};
  for (const raw of value) {
    const row = object(raw);
    const provider = row.provider as (typeof LIVE_PROVIDERS)[number];
    if (
      !LIVE_PROVIDERS.includes(provider) ||
      row.environment !== 'staging' ||
      row.day !== usageDay ||
      (row.metric !== 'requests' && row.metric !== 'tokens')
    )
      throw new Error('INVALID_LIVE_USAGE');
    const used = count(row.used, 1e12),
      hardLimit = count(row.hard_limit, 1e12);
    if (used > hardLimit) throw new Error('INVALID_LIVE_USAGE');
    const entry = (out[provider] ??= { requests: null, tokens: null });
    if (entry[row.metric]) throw new Error('INVALID_LIVE_USAGE');
    entry[row.metric] = { used, hardLimit };
  }
  return out;
}

@Injectable()
export class OpsMetricsRepository implements OpsMetricsStore {
  constructor(private readonly supabase: SupabaseService) {}
  async read() {
    const { data, error } = await this.supabase
      .getClient()
      .rpc('integration_ops_metrics_mock', { p_window_days: WINDOW_DAYS })
      .abortSignal(AbortSignal.timeout(5000));
    if (error) throw new Error('OPS_METRICS_STORE_UNAVAILABLE');
    const metrics = parseOpsMetrics(data);
    // Secondary read-only lookup; a failure is labelled, never hides mock metrics.
    try {
      const live = await this.supabase
        .getClient()
        .from('integration_usage_daily')
        .select('provider,environment,day,metric,used,hard_limit')
        .eq('environment', 'staging')
        .eq('day', metrics.usageDay)
        .in('provider', [...LIVE_PROVIDERS])
        .limit(20)
        .abortSignal(AbortSignal.timeout(5000));
      if (live.error) throw new Error('LIVE_USAGE_UNAVAILABLE');
      metrics.live = {
        source: 'test_db',
        providers: parseLiveUsageRows(live.data, metrics.usageDay),
      };
    } catch {
      metrics.live = { source: 'unavailable', providers: {} };
    }
    return metrics;
  }
}
