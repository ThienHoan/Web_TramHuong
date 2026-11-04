import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { SupabaseService } from '../supabase/supabase.service';
import {
  INTEGRATION_DEFINITIONS,
  loadIntegrationRegistry,
  requireMockIntegration,
  type IntegrationProvider,
} from './integrations.config';
import {
  INTEGRATION_REGISTRY,
  IntegrationsModule,
} from './integrations.module';

const providers = Object.keys(INTEGRATION_DEFINITIONS) as IntegrationProvider[];
const reader = (values: Record<string, unknown> = {}) => ({
  get: (key: string): unknown => values[key],
});

describe('new integrations policy', () => {
  it('defaults every new integration to disabled without reading credentials', () => {
    const get = jest.fn((key: string): unknown => {
      if (/SECRET|TOKEN|PASSWORD|API_KEY/.test(key)) {
        throw new Error('Credential read forbidden');
      }
      return undefined;
    });
    const registry = loadIntegrationRegistry({ get });
    expect(Object.keys(registry)).toHaveLength(10);
    expect(registry).not.toHaveProperty('ghn');
    for (const provider of providers) {
      expect(registry[provider]).toMatchObject({
        enabled: false,
        environment: 'mock',
        mode: 'disabled',
        estimated_monthly_spend: 0,
        quota_hard_limit: 0,
        owner_approval_id: null,
        last_checked_at: null,
      });
      expect(() => requireMockIntegration(registry, provider)).toThrow(
        'INTEGRATION_NOT_EXECUTABLE',
      );
    }
  });

  it.each(providers)('enables only the requested mock: %s', (provider) => {
    const registry = loadIntegrationRegistry(
      reader({ [INTEGRATION_DEFINITIONS[provider].flag]: 'true' }),
    );
    expect(registry[provider].mode).toBe('mock');
    expect(() => requireMockIntegration(registry, provider)).not.toThrow();
    for (const other of providers.filter((name) => name !== provider)) {
      expect(registry[other].mode).toBe('disabled');
    }
  });

  it.each(['staging', 'production'])(
    'blocks all new outbound paths in %s even with credentials/approval',
    (environment) => {
      const values: Record<string, unknown> = {
        INTEGRATIONS_ENV: environment,
        NODE_ENV: 'production',
        RESEND_API_KEY: 'synthetic-key',
        OWNER_APPROVAL_ID: 'synthetic-approval',
      };
      for (const provider of providers) {
        values[INTEGRATION_DEFINITIONS[provider].flag] = 'true';
      }
      const registry = loadIntegrationRegistry(reader(values));
      for (const provider of providers) {
        expect(registry[provider].mode).toBe('blocked');
        expect(() => requireMockIntegration(registry, provider)).toThrow();
      }
    },
  );

  it('global kill switch disables every enabled mock', () => {
    const values: Record<string, unknown> = {
      INTEGRATIONS_KILL_SWITCH: 'true',
    };
    for (const provider of providers) {
      values[INTEGRATION_DEFINITIONS[provider].flag] = 'true';
    }
    const registry = loadIntegrationRegistry(reader(values));
    expect(Object.values(registry).every((p) => p.mode === 'disabled')).toBe(
      true,
    );
  });

  it.each(['TRUE', '', '1', 'false ', null, 1, {}])(
    'rejects ambiguous flag input without leaking its value (%p)',
    (value) => {
      expect(() =>
        loadIntegrationRegistry(reader({ FEATURE_RESEND_ENABLED: value })),
      ).toThrow('FEATURE_RESEND_ENABLED must be true or false');
    },
  );

  it('validates the kill switch and environment, and does not echo values', () => {
    expect(() =>
      loadIntegrationRegistry(
        reader({ INTEGRATIONS_KILL_SWITCH: 'synthetic-secret' }),
      ),
    ).toThrow('INTEGRATIONS_KILL_SWITCH must be true or false');
    expect(() =>
      loadIntegrationRegistry(reader({ INTEGRATIONS_ENV: 'synthetic-secret' })),
    ).toThrow('INTEGRATIONS_ENV must be mock, staging or production');
  });

  it('supports typed booleans and freezes policies against mutation', () => {
    const registry = loadIntegrationRegistry(
      reader({ FEATURE_RESEND_ENABLED: true, FEATURE_GA4_ENABLED: false }),
    );
    expect(registry.resend.mode).toBe('mock');
    expect(Object.isFrozen(registry)).toBe(true);
    expect(Object.isFrozen(registry.resend)).toBe(true);
    expect(Reflect.set(registry.resend, 'mode', 'live')).toBe(false);
  });

  it('validates config on isolated module startup with mocked ConfigService', async () => {
    const module = await Test.createTestingModule({
      imports: [IntegrationsModule],
    })
      .overrideProvider(ConfigService)
      .useValue(reader())
      .overrideProvider(SupabaseService)
      .useValue({ getClient: jest.fn() })
      .compile();
    try {
      expect(module.get<unknown>(INTEGRATION_REGISTRY)).toMatchObject({
        turnstile: { mode: 'disabled' },
      });
    } finally {
      await module.close();
    }
  });
});
