import {
  BadRequestException,
  ConflictException,
  HttpException,
  ServiceUnavailableException,
} from '@nestjs/common';
import type {
  IntegrationRegistry,
  ConfigReader,
} from '../integrations/integrations.config';
import {
  IntegrationExecutor,
  IntegrationFailure,
} from '../integrations/integration-executor';
import {
  PAGESPEED_TARGETS,
  PAGESPEED_CATEGORIES,
  MockPagespeedAdapter,
  type AuditStrategy,
  type PagespeedMockAdapter,
} from './pagespeed.adapter';
import type {
  PagespeedHistoryStore,
  PagespeedLease,
  StoredPagespeedReport,
} from './pagespeed.repository';

const DAY = 86400000;
const THRESHOLD_KEYS = {
  performanceScore: ['PAGESPEED_SCORE_DROP', 10, 100],
  lcpMs: ['PAGESPEED_LCP_INCREASE_MS', 500, 60000],
  cls: ['PAGESPEED_CLS_INCREASE', 0.05, 10],
  tbtMs: ['PAGESPEED_TBT_INCREASE_MS', 200, 60000],
} as const;
export type RegressionThresholds = Record<keyof typeof THRESHOLD_KEYS, number>;
export function pagespeedThresholds(
  config: ConfigReader,
): RegressionThresholds {
  const result = {} as RegressionThresholds;
  for (const key of Object.keys(
    THRESHOLD_KEYS,
  ) as (keyof RegressionThresholds)[]) {
    const [name, fallback, max] = THRESHOLD_KEYS[key];
    const raw = config.get(name);
    const value =
      raw === undefined
        ? fallback
        : typeof raw === 'number' ||
            (typeof raw === 'string' && raw.trim() !== '')
          ? Number(raw)
          : NaN;
    if (!Number.isFinite(value) || value <= 0 || value > max)
      throw new Error(
        name + ' must be a positive number within its allowed range',
      );
    result[key] = value;
  }
  return Object.freeze(result);
}

type NullableMetrics = {
  performanceScore: number | null;
  lcpMs: number | null;
  cls: number | null;
  tbtMs: number | null;
};
export interface PerformanceSample {
  source: 'mock';
  targetId: string;
  strategy: AuditStrategy;
  measuredAt: string;
  storedAt: string;
  lighthouseVersion: string;
  lab: NullableMetrics & {
    accessibilityScore: number | null;
    bestPracticesScore: number | null;
    seoScore: number | null;
  };
  field: {
    status: 'unavailable';
    lcpMs: null;
    inpMs: null;
    cls: null;
    reason: 'MOCK_HAS_NO_FIELD_DATA';
  };
}
function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('INVALID_RESPONSE');
  return value as Record<string, unknown>;
}
function metric(value: unknown, max: number): number | null {
  if (value === null || value === undefined) return null;
  if (
    typeof value !== 'number' ||
    !Number.isFinite(value) ||
    value < 0 ||
    value > max
  )
    throw new Error('INVALID_METRIC');
  return value;
}
export function normalizePagespeedSample(
  raw: unknown,
  targetId: string,
  url: string,
  strategy: AuditStrategy,
  now: number,
): PerformanceSample {
  const response = object(raw);
  if (
    response.captchaResult !== undefined &&
    response.captchaResult !== 'CAPTCHA_NOT_NEEDED'
  )
    throw new Error('BLOCKED_DOCUMENT');
  const lhr = object(response.lighthouseResult);
  const runtime =
    lhr.runtimeError === undefined ? undefined : object(lhr.runtimeError);
  if (runtime && runtime.code !== 'NO_ERROR')
    throw new Error('FAILED_DOCUMENT');
  if (lhr.requestedUrl !== url || lhr.finalUrl !== url)
    throw new Error('UNEXPECTED_URL');
  const settings = object(lhr.configSettings);
  if (
    (settings.formFactor ?? settings.emulatedFormFactor) !== strategy ||
    (settings.emulatedFormFactor !== undefined &&
      settings.emulatedFormFactor !== strategy)
  )
    throw new Error('WRONG_STRATEGY');
  if (
    typeof lhr.lighthouseVersion !== 'string' ||
    !/^\d{1,3}\.\d{1,3}\.\d{1,3}(?:-mock)?$/.test(lhr.lighthouseVersion)
  )
    throw new Error('INVALID_VERSION');
  const time =
    typeof lhr.fetchTime === 'string' ? Date.parse(lhr.fetchTime) : NaN;
  if (!Number.isFinite(time) || time > now + 300000 || now - time > DAY)
    throw new Error('INVALID_TIMESTAMP');
  const categories = lhr.categories === undefined ? {} : object(lhr.categories);
  const audits = lhr.audits === undefined ? {} : object(lhr.audits);
  const score = (name: string) => {
    const value =
      categories[name] === undefined
        ? null
        : metric(object(categories[name]).score, 1);
    return value === null ? null : Math.round(value * 10000) / 100;
  };
  const numeric = (name: string, unit: string, max: number) => {
    if (audits[name] === undefined) return null;
    const audit = object(audits[name]);
    if (
      ['error', 'notApplicable', 'not_applicable', 'manual'].includes(
        String(audit.scoreDisplayMode),
      )
    )
      return null;
    const value = metric(audit.numericValue, max);
    if (value !== null && audit.numericUnit !== unit)
      throw new Error('WRONG_UNIT');
    return value;
  };
  return {
    source: 'mock',
    targetId,
    strategy,
    measuredAt: new Date(time).toISOString(),
    storedAt: new Date(now).toISOString(),
    lighthouseVersion: lhr.lighthouseVersion,
    lab: {
      performanceScore: score('performance'),
      accessibilityScore: score('accessibility'),
      bestPracticesScore: score('best-practices'),
      seoScore: score('seo'),
      lcpMs: numeric('largest-contentful-paint', 'millisecond', 600000),
      cls: numeric('cumulative-layout-shift', 'unitless', 100),
      tbtMs: numeric('total-blocking-time', 'millisecond', 600000),
    },
    // No fixture field population, conversion guess, origin fallback or CrUX call.
    field: {
      status: 'unavailable',
      lcpMs: null,
      inpMs: null,
      cls: null,
      reason: 'MOCK_HAS_NO_FIELD_DATA',
    },
  };
}

export class PagespeedService {
  private readonly history = new Map<string, PerformanceSample[]>();
  private readonly attempts = new Map<
    string,
    { at: string; error: string | null }
  >();
  private running = false;
  private storeRunning = false;
  private readonly thresholds: RegressionThresholds;
  constructor(
    private readonly registry: IntegrationRegistry,
    private readonly nodeEnv: string,
    private readonly executor: IntegrationExecutor,
    private readonly adapter: PagespeedMockAdapter = new MockPagespeedAdapter(),
    private readonly now: () => number = Date.now,
    thresholds: RegressionThresholds = pagespeedThresholds({
      get: () => undefined,
    }),
    // Opt-in TEST DB history (FEATURE_PAGESPEED_PERSISTENCE_ENABLED); else RAM.
    private readonly store?: PagespeedHistoryStore,
  ) {
    // Validate injected config too; do not let NaN disable regression warnings.
    this.thresholds = pagespeedThresholds({
      get: (name) => {
        const key = (
          Object.keys(THRESHOLD_KEYS) as (keyof RegressionThresholds)[]
        ).find((key) => THRESHOLD_KEYS[key][0] === name)!;
        return thresholds[key];
      },
    });
  }
  private restore(reports: StoredPagespeedReport[]) {
    this.history.clear();
    this.attempts.clear();
    for (const report of reports) {
      const key = report.targetId + ':' + report.strategy;
      this.history.set(key, report.samples);
      if (report.lastAttemptAt)
        this.attempts.set(key, {
          at: report.lastAttemptAt,
          error: report.lastError,
        });
    }
    this.storeRunning = reports.some((report) => report.running);
  }
  async report() {
    if (this.mode() === 'mock' && this.store)
      this.restore(await this.store.read());
    return this.summary();
  }
  private mode(): 'disabled' | 'mock' | 'blocked' {
    const mode = this.registry.pagespeed.mode;
    return mode === 'disabled'
      ? mode
      : mode === 'mock' && ['test', 'development'].includes(this.nodeEnv)
        ? 'mock'
        : 'blocked';
  }
  private comparison(samples: PerformanceSample[]) {
    const current = samples.at(-1),
      previous = samples.at(-2);
    const alerts: {
      metric: keyof NullableMetrics;
      previous: number;
      current: number;
      deterioration: number;
      threshold: number;
    }[] = [];
    if (!current || !previous) return { status: 'no_baseline', alerts };
    if (current.lighthouseVersion !== previous.lighthouseVersion)
      return { status: 'version_changed', alerts };
    if (
      Date.parse(current.measuredAt) - Date.parse(previous.measuredAt) >
      7 * DAY
    )
      return { status: 'baseline_too_old', alerts };
    let missing = false;
    for (const key of Object.keys(
      this.thresholds,
    ) as (keyof NullableMetrics)[]) {
      const before = previous.lab[key],
        after = current.lab[key];
      if (before === null || after === null) {
        missing = true;
        continue;
      }
      const deterioration =
        Math.round(
          (key === 'performanceScore' ? before - after : after - before) *
            10000,
        ) / 10000;
      if (deterioration >= this.thresholds[key])
        alerts.push({
          metric: key,
          previous: before,
          current: after,
          deterioration,
          threshold: this.thresholds[key],
        });
    }
    return { status: missing ? 'partial' : 'comparable', alerts };
  }
  summary() {
    const mode = this.mode();
    const visible = mode === 'mock';
    return {
      source: 'mock' as const,
      mode,
      persistence: this.store
        ? ('database' as const)
        : ('process_memory' as const),
      schedulerEnabled: false,
      blockers: [
        'APPROVED_PUBLIC_URLS_AND_PROJECT_QUOTA_PENDING',
        ...(this.store ? [] : ['DURABLE_HISTORY_PENDING']),
        'REAL_FIELD_CONTRACT_PENDING',
      ],
      cacheHours: 24,
      historyPerPair: 30,
      thresholds: { ...this.thresholds },
      running: visible && (this.running || this.storeRunning),
      excluded: [
        { path: 'cart', reason: 'SESSION_DRAWER' },
        { path: '/checkout', reason: 'SESSION_DEPENDENT' },
        {
          path: '/account,/admin,/order-confirmation,/checkout/payment,/checkout/success',
          reason: 'PRIVATE_OR_TRANSACTIONAL',
        },
      ],
      targets: PAGESPEED_TARGETS.map((target) => ({ ...target })),
      reports: PAGESPEED_TARGETS.flatMap((target) =>
        (['mobile', 'desktop'] as const).map((strategy) => {
          const key = target.id + ':' + strategy;
          const samples = visible ? (this.history.get(key) ?? []) : [];
          const latest = samples.at(-1) ?? null;
          return {
            targetId: target.id,
            strategy,
            latest,
            history: structuredClone(samples),
            freshness: latest
              ? this.now() - Date.parse(latest.storedAt) >= DAY
                ? 'stale'
                : 'fresh'
              : 'never_audited',
            lastAttemptAt: visible
              ? (this.attempts.get(key)?.at ?? null)
              : null,
            lastError: visible ? (this.attempts.get(key)?.error ?? null) : null,
            comparison: this.comparison(samples),
          };
        }),
      ),
    };
  }
  async audit(targetId: string, strategy: AuditStrategy) {
    if (this.mode() !== 'mock')
      throw new ServiceUnavailableException('PAGESPEED_NOT_EXECUTABLE');
    const target = PAGESPEED_TARGETS.find((target) => target.id === targetId);
    if (!target || !['mobile', 'desktop'].includes(strategy))
      throw new BadRequestException('PAGESPEED_TARGET_NOT_ALLOWED');
    const key = targetId + ':' + strategy;
    if (this.running)
      throw new ConflictException('PAGESPEED_AUDIT_IN_PROGRESS');
    if (!this.store) {
      const latest = this.history.get(key)?.at(-1);
      if (latest && this.now() - Date.parse(latest.storedAt) < DAY)
        return { ...this.summary(), result: 'cached' as const };
    }
    this.running = true;
    const at = new Date(this.now()).toISOString();
    let lease: PagespeedLease | undefined;
    let storageFailed = false;
    try {
      let latestMeasuredAt: string | null;
      if (this.store) {
        // DB decides cache (24h) and the per-pair lease across instances.
        const begun = await this.store.begin(targetId, strategy);
        if (begun.cached) {
          this.restore(await this.store.read());
          return { ...this.summary(), result: 'cached' as const };
        }
        lease = begun;
        latestMeasuredAt = begun.latestMeasuredAt;
      } else {
        this.attempts.set(key, { at, error: null });
        latestMeasuredAt = this.history.get(key)?.at(-1)?.measuredAt ?? null;
      }
      const result = await this.executor.runMock(
        'pagespeed',
        'lighthouse_audit',
        'read',
        async (signal) => {
          // Durable budget per attempt (incl. retry). A store outage is not a
          // provider outage: no retry, no provider call, no circuit count.
          if (this.store) {
            try {
              await this.store.reserve();
            } catch (error) {
              if (error instanceof IntegrationFailure) throw error;
              storageFailed = true;
              throw new IntegrationFailure('REJECTED');
            }
          }
          signal.throwIfAborted();
          return this.adapter.audit(
            { url: target.url, strategy, categories: PAGESPEED_CATEGORIES },
            signal,
          );
        },
      );
      const sample = normalizePagespeedSample(
        result.data,
        targetId,
        target.url,
        strategy,
        this.now(),
      );
      if (
        latestMeasuredAt &&
        Date.parse(sample.measuredAt) <= Date.parse(latestMeasuredAt)
      )
        throw new Error('NON_INCREMENTAL_SAMPLE');
      if (this.store && lease)
        this.restore(await this.store.record(lease, sample));
      else
        this.history.set(key, [
          ...(this.history.get(key) ?? []).slice(-29),
          sample,
        ]);
    } catch (error: unknown) {
      if (error instanceof ConflictException) throw error;
      const code =
        storageFailed || error instanceof ServiceUnavailableException
          ? 'STORAGE_UNAVAILABLE'
          : error instanceof IntegrationFailure
            ? error.code
            : 'INVALID_RESPONSE';
      this.attempts.set(key, { at, error: code });
      if (this.store && lease) {
        try {
          await this.store.fail(lease, code);
        } catch {
          // Lease expires on its own; previous samples are untouched.
        }
      }
      throw new HttpException(
        'PAGESPEED_' + code,
        ['RATE_LIMITED', 'QUOTA_EXCEEDED'].includes(code) ? 429 : 503,
      );
    } finally {
      this.running = false;
    }
    return { ...this.summary(), result: 'recorded' as const };
  }
}
