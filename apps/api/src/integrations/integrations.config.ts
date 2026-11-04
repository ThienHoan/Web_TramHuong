// Policy for new integration paths only. GHN keeps its existing configuration.
export const INTEGRATION_DEFINITIONS = {
  resend: { flag: 'FEATURE_RESEND_ENABLED', fallback: 'smtp' },
  gemini: { flag: 'FEATURE_GEMINI_ADVISOR_ENABLED', fallback: 'catalog' },
  pgvector: { flag: 'FEATURE_VECTOR_SEARCH_ENABLED', fallback: 'keyword' },
  cloudinary: {
    flag: 'FEATURE_CLOUDINARY_ENABLED',
    fallback: 'original_media',
  },
  google: { flag: 'FEATURE_GOOGLE_LOGIN_ENABLED', fallback: 'existing_auth' },
  ga4: { flag: 'FEATURE_GA4_ENABLED', fallback: 'disabled' },
  search_console: {
    flag: 'FEATURE_SEARCH_CONSOLE_SYNC_ENABLED',
    fallback: 'unavailable',
  },
  merchant: { flag: 'FEATURE_MERCHANT_SYNC_ENABLED', fallback: 'disabled' },
  pagespeed: {
    flag: 'FEATURE_PAGESPEED_AUDIT_ENABLED',
    fallback: 'unavailable',
  },
  turnstile: { flag: 'FEATURE_TURNSTILE_ENABLED', fallback: 'route_policy' },
} as const;

export type IntegrationProvider = keyof typeof INTEGRATION_DEFINITIONS;
export type IntegrationEnvironment = 'mock' | 'staging' | 'production';
export type IntegrationMode = 'disabled' | 'mock' | 'blocked';
export interface ConfigReader {
  get(key: string): unknown;
}

export interface IntegrationPolicy {
  readonly enabled: boolean;
  readonly environment: IntegrationEnvironment;
  readonly mode: IntegrationMode;
  readonly quota_soft_limit: 0;
  readonly quota_hard_limit: 0;
  readonly estimated_monthly_spend: 0;
  readonly owner_approval_id: null;
  readonly last_checked_at: null;
  readonly fallback_mode: string;
}

export type IntegrationRegistry = Readonly<
  Record<IntegrationProvider, Readonly<IntegrationPolicy>>
>;

const providers = Object.keys(INTEGRATION_DEFINITIONS) as IntegrationProvider[];

function readFlag(config: ConfigReader, key: string): boolean {
  const value = config.get(key);
  if (value === undefined || value === 'false' || value === false) return false;
  if (value === 'true' || value === true) return true;
  // Name only: do not echo invalid values which might contain a pasted secret.
  throw new Error(`${key} must be true or false`);
}

export function loadIntegrationRegistry(
  config: ConfigReader,
): IntegrationRegistry {
  const rawEnvironment = config.get('INTEGRATIONS_ENV') ?? 'mock';
  if (
    rawEnvironment !== 'mock' &&
    rawEnvironment !== 'staging' &&
    rawEnvironment !== 'production'
  ) {
    throw new Error('INTEGRATIONS_ENV must be mock, staging or production');
  }
  const killSwitch = readFlag(config, 'INTEGRATIONS_KILL_SWITCH');
  const registry = {} as Record<IntegrationProvider, IntegrationPolicy>;
  for (const provider of providers) {
    const definition = INTEGRATION_DEFINITIONS[provider];
    const enabled = readFlag(config, definition.flag);
    // No live transports are released in this batch. Flags or credentials alone
    // must never grant outbound authority, even when NODE_ENV is production.
    const mode: IntegrationMode =
      !enabled || killSwitch
        ? 'disabled'
        : rawEnvironment === 'mock'
          ? 'mock'
          : 'blocked';
    registry[provider] = Object.freeze({
      enabled,
      environment: rawEnvironment,
      mode,
      quota_soft_limit: 0,
      quota_hard_limit: 0,
      estimated_monthly_spend: 0,
      owner_approval_id: null,
      last_checked_at: null,
      fallback_mode: definition.fallback,
    });
  }
  return Object.freeze(registry);
}

export function requireMockIntegration(
  registry: IntegrationRegistry,
  provider: IntegrationProvider,
): void {
  if (registry[provider].mode !== 'mock') {
    throw new Error(`INTEGRATION_NOT_EXECUTABLE:${provider}`);
  }
}
