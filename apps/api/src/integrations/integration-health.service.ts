import { ConfigService } from '@nestjs/config';
import {
  INTEGRATION_DEFINITIONS,
  type IntegrationProvider,
  type IntegrationRegistry,
} from './integrations.config';
import type { OpsMetrics, OpsMetricsStore } from './ops-metrics.repository';
import { strictFlag } from './strict-flag';

type HealthProvider = IntegrationProvider | 'ghn';
// Durable TEST DB sources per provider; everything else has no store yet.
const OUTBOX_PROVIDERS: Partial<Record<HealthProvider, 'emails' | 'requests'>> =
  { resend: 'emails', ga4: 'requests', merchant: 'requests' };
const STORE_PROVIDERS: Partial<
  Record<HealthProvider, 'searchConsole' | 'pagespeed'>
> = { search_console: 'searchConsole', pagespeed: 'pagespeed' };

function emptyMetrics() {
  return {
    available: false,
    lastSuccessAt: null as string | null,
    lastErrorCode: null as string | null,
    failRate: null as number | null,
    quotaMetric: null as 'emails' | 'requests' | null,
    quotaUsed: null as number | null,
    quotaLimit: null as number | null,
    quotaAlert: null as
      'ok' | 'warn_60' | 'warn_80' | 'warn_95' | 'exhausted' | null,
    backlog: null as {
      queued: number;
      working: number;
      accepted: number;
      unknown: number;
      dead: number;
    } | null,
    inflight: null as number | null,
    // Budget reserved for REAL provider calls today (TEST DB, environment staging).
    liveUsage: null as {
      requestsUsed: number;
      requestsLimit: number;
      tokensUsed: number;
      tokensLimit: number;
      alert: 'ok' | 'warn_60' | 'warn_80' | 'warn_95' | 'exhausted';
    } | null,
    // No billing source exists for mock work; never estimated.
    estimatedMonthlySpend: null,
  };
}
export type ProviderMetrics = ReturnType<typeof emptyMetrics>;

export function providerMetrics(
  provider: HealthProvider,
  ops: OpsMetrics,
  // GSC/PSI only count when their own persistence flag is on AND the store is
  // installed; otherwise those modules run from RAM and DB numbers would mislead.
  durable: { searchConsole: boolean; pagespeed: boolean } = {
    searchConsole: false,
    pagespeed: false,
  },
): ProviderMetrics {
  const metrics = emptyMetrics();
  const live = provider === 'ghn' ? undefined : ops.live.providers[provider];
  if (live?.requests && live.tokens) {
    const ratio = Math.max(
      live.requests.used / live.requests.hardLimit,
      live.tokens.used / live.tokens.hardLimit,
    );
    metrics.liveUsage = {
      requestsUsed: live.requests.used,
      requestsLimit: live.requests.hardLimit,
      tokensUsed: live.tokens.used,
      tokensLimit: live.tokens.hardLimit,
      alert:
        ratio >= 1
          ? 'exhausted'
          : ratio >= 0.95
            ? 'warn_95'
            : ratio >= 0.8
              ? 'warn_80'
              : ratio >= 0.6
                ? 'warn_60'
                : 'ok',
    };
  }
  const outboxMetric = OUTBOX_PROVIDERS[provider];
  const storeKey = STORE_PROVIDERS[provider];
  if (provider === 'ghn' || (!outboxMetric && !storeKey)) return metrics;
  if (storeKey && (!durable[storeKey] || ops[storeKey] === null))
    return metrics;
  const entry = ops.providers[provider];
  const quotaMetric = outboxMetric ?? 'requests';
  const usage = entry.usage.find((u) => u.metric === quotaMetric);
  metrics.available = true;
  metrics.quotaMetric = quotaMetric;
  metrics.quotaUsed = usage?.used ?? 0;
  metrics.quotaLimit = usage?.hardLimit ?? null;
  if (usage && usage.hardLimit > 0) {
    const ratio = usage.used / usage.hardLimit;
    metrics.quotaAlert =
      ratio >= 1
        ? 'exhausted'
        : ratio >= 0.95
          ? 'warn_95'
          : ratio >= 0.8
            ? 'warn_80'
            : ratio >= 0.6
              ? 'warn_60'
              : 'ok';
  }
  if (outboxMetric) {
    const o = entry.outbox;
    const terminal = o.accepted + o.unknown + o.dead;
    metrics.lastSuccessAt = o.lastAcceptedAt;
    metrics.lastErrorCode = o.lastErrorCode;
    metrics.failRate = terminal
      ? Math.round(((o.unknown + o.dead) / terminal) * 10000) / 10000
      : null;
    metrics.backlog = {
      queued: o.queued,
      working: o.working,
      accepted: o.accepted,
      unknown: o.unknown,
      dead: o.dead,
    };
    if (provider === 'merchant')
      metrics.inflight = ops.merchantFence?.inflight ?? null;
  } else if (storeKey) {
    const state = ops[storeKey];
    metrics.lastSuccessAt = state?.lastSuccessAt ?? null;
    metrics.lastErrorCode = state?.lastErrorCode ?? null;
  }
  return metrics;
}

type Readiness = {
  implementation: 'mock' | 'reused' | 'conditional_deferred';
  evidence: string;
  legacyPathOutsideRegistry: boolean;
  blockers: readonly string[];
};

// Repository/owner evidence, not runtime probes or account certification.
const READINESS: Record<IntegrationProvider, Readiness> = {
  resend: {
    implementation: 'mock',
    evidence: 'durable_source_capture_and_mock_delivery_sql_ts_tests',
    legacyPathOutsideRegistry: false,
    blockers: [
      'DOMAIN_AND_PROVIDER_RIGHTS',
      'ATOMIC_ORIGINAL_TRANSACTION_SOURCE_HOOKS',
      'HOSTED_NOTIFICATION_INSTALL_AND_LIVE_TRANSPORT',
      'LIVE_DELIVERY_AND_BOUNCE_ACCEPTANCE',
    ],
  },
  gemini: {
    implementation: 'mock',
    evidence: 'grounded_chat_and_fts_local_tests',
    legacyPathOutsideRegistry: false,
    blockers: [
      'LIVE_MODEL_TRANSPORT_NOT_RELEASED',
      'DURABLE_TOKEN_BUDGET_AND_DATA_POLICY',
    ],
  },
  pgvector: {
    implementation: 'conditional_deferred',
    evidence: 'postgres_fts_synthetic_benchmark_vector_still_conditional',
    legacyPathOutsideRegistry: false,
    blockers: [
      'HOSTED_FTS_INSTALL_AND_OWNER_CATALOG_BENCHMARK',
      'VECTOR_BENEFIT_AND_EMBEDDING_BUDGET_NOT_VALIDATED',
    ],
  },
  cloudinary: {
    implementation: 'conditional_deferred',
    evidence: 'twelve_image_offline_codec_baseline_source_unchanged',
    legacyPathOutsideRegistry: true,
    blockers: [
      'AUTHORIZED_CDN_AND_REAL_CWV_BENCHMARK',
      'CLOUDINARY_BENEFIT_NOT_ESTABLISHED',
    ],
  },
  google: {
    implementation: 'reused',
    evidence: 'supabase_pkce_callback_local_tests',
    legacyPathOutsideRegistry: true,
    blockers: [
      'HOSTED_OAUTH_AND_ACCOUNT_LINKING_POLICY',
      'COLLISION_AND_SESSION_ACCEPTANCE',
      'LEGACY_OAUTH_NOT_GATED_BY_REGISTRY',
    ],
  },
  ga4: {
    implementation: 'mock',
    evidence: 'owner_reported_test_stream_eight_event_ingestion',
    legacyPathOutsideRegistry: false,
    blockers: [
      'TEST_STREAM_ONLY',
      'VISITOR_ATTRIBUTION_AND_DURABLE_QUOTA',
      'FINANCIAL_PURCHASE_SOURCE_AND_GUEST_ACCEPTANCE',
      'ITEM_PARAMETER_ACCEPTANCE',
    ],
  },
  search_console: {
    implementation: 'mock',
    evidence: 'admin_mock_report_tests',
    legacyPathOutsideRegistry: false,
    blockers: [
      'VERIFIED_PROPERTY_AND_READONLY_OAUTH',
      'ENCRYPTED_TOKEN_ROTATION',
      'DURABLE_SYNC_AND_SCHEDULER',
    ],
  },
  merchant: {
    implementation: 'mock',
    evidence: 'products_v1_preview_and_durable_mock_delta_queue_sql_tests',
    legacyPathOutsideRegistry: false,
    blockers: [
      'ACCOUNT_AND_API_DATA_SOURCE',
      'OAUTH_AND_CATALOG_ELIGIBILITY',
      'LIVE_TRANSPORT_AND_DISTRIBUTED_DELIVERY_FENCING',
      'ATOMIC_SOURCE_HOOKS_FULL_RECONCILIATION_AND_SCHEDULER',
    ],
  },
  pagespeed: {
    implementation: 'mock',
    evidence: 'whitelisted_mock_audit_tests',
    legacyPathOutsideRegistry: false,
    blockers: [
      'APPROVED_PUBLIC_URLS_AND_PROJECT_QUOTA',
      'DURABLE_AUDIT_HISTORY_AND_SCHEDULER',
      'LIVE_FIELD_AND_LAB_ACCEPTANCE',
    ],
  },
  turnstile: {
    implementation: 'mock',
    evidence: 'contact_form_mock_http_and_browser_tests',
    legacyPathOutsideRegistry: false,
    blockers: [
      'WIDGET_HOSTNAME_AND_KEYS',
      'LIVE_SITEVERIFY_AND_ROUTE_ACCEPTANCE',
    ],
  },
};

export class IntegrationHealthService {
  constructor(
    private readonly registry: IntegrationRegistry,
    private readonly config: ConfigService,
    // Opt-in (FEATURE_INTEGRATION_OPS_METRICS_ENABLED): TEST DB aggregates.
    private readonly metricsStore?: OpsMetricsStore,
  ) {}

  /** Configuration only; never reads a store. */
  snapshot() {
    const metrics = emptyMetrics;
    const providers = (
      Object.keys(INTEGRATION_DEFINITIONS) as IntegrationProvider[]
    ).map((provider) => {
      const policy = this.registry[provider],
        readiness = READINESS[provider];
      return {
        provider,
        flag: INTEGRATION_DEFINITIONS[provider].flag,
        enabled: policy.enabled,
        environment: policy.environment,
        mode: policy.mode,
        fallback: policy.fallback_mode,
        implementation: readiness.implementation,
        evidence: readiness.evidence,
        legacyPathOutsideRegistry: readiness.legacyPathOutsideRegistry,
        liveReadiness: 'not_certified',
        blockers: [...readiness.blockers],
        metrics: metrics(),
      };
    });
    const ghnEnabled = this.config.get<string>('GHN_ENABLED') === 'true';
    return {
      source: 'configuration_and_documented_evidence',
      observedAt: new Date().toISOString(),
      probesPerformed: false,
      releaseReady: false,
      policyScope: 'new_integration_paths_only',
      financialSource: 'internal_database',
      metricsSource: 'unavailable_no_runtime_probe' as
        'unavailable_no_runtime_probe' | 'test_db_mock' | 'store_unavailable',
      metricsObservedAt: null as string | null,
      metricsWindowDays: null as number | null,
      liveUsageSource: null as 'test_db' | 'unavailable' | null,
      providers: [
        {
          provider: 'ghn',
          flag: 'GHN_ENABLED',
          enabled: ghnEnabled,
          environment:
            this.config.get<string>('GHN_ENV') === 'production'
              ? 'production'
              : 'staging',
          mode: ghnEnabled ? 'existing_shipping_policy' : 'disabled',
          fallback: 'existing_shipping_policy',
          implementation: 'reused',
          evidence: 'previous_operator_staging_province_read',
          legacyPathOutsideRegistry: true,
          liveReadiness: 'not_certified',
          blockers: [
            'HOSTED_SHIPPING_SETUP_ACCEPTANCE',
            'STAGING_QUOTE_FULFILLMENT_CALLBACK_AND_COD_ACCEPTANCE',
          ],
          metrics: metrics(),
        },
        ...providers,
      ],
    };
  }

  /**
   * Configuration plus, when enabled, real counts from the TEST DB stores. Both
   * mock and staging (local real-call testing) use the TEST DB; production does
   * not read these. A store failure is labelled, never hidden or zeroed.
   */
  async report() {
    const base = this.snapshot();
    const environment = this.config.get<string>('INTEGRATIONS_ENV') ?? 'mock';
    if (
      !this.metricsStore ||
      (environment !== 'mock' && environment !== 'staging')
    )
      return base;
    let ops: OpsMetrics;
    try {
      ops = await this.metricsStore.read();
    } catch {
      return { ...base, metricsSource: 'store_unavailable' as const };
    }
    const durable = {
      searchConsole: strictFlag(
        this.config,
        'FEATURE_SEARCH_CONSOLE_PERSISTENCE_ENABLED',
      ),
      pagespeed: strictFlag(
        this.config,
        'FEATURE_PAGESPEED_PERSISTENCE_ENABLED',
      ),
    };
    return {
      ...base,
      metricsSource: 'test_db_mock' as const,
      metricsObservedAt: ops.observedAt,
      metricsWindowDays: ops.windowDays,
      liveUsageSource: ops.live.source,
      providers: base.providers.map((p) => ({
        ...p,
        metrics: providerMetrics(p.provider as HealthProvider, ops, durable),
      })),
    };
  }
}
