import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { loadIntegrationRegistry } from './integrations.config';
import type { IntegrationRegistry } from './integrations.config';
import { IntegrationExecutor } from './integration-executor';
import { SupabaseModule } from '../supabase/supabase.module';
import { IntegrationRepository } from './integration.repository';
import { MockDeliveryConsumer } from './mock-delivery.consumer';
import {
  ContactProtectionService,
  turnstileLiveConfig,
} from './contact-protection.service';
import { SiteverifyTurnstileAdapter } from './turnstile.adapter';
import { IntegrationHealthService } from './integration-health.service';
import { IntegrationHealthController } from './integration-health.controller';
import {
  OpsMetricsRepository,
  opsMetricsEnabled,
} from './ops-metrics.repository';

export const INTEGRATION_REGISTRY = Symbol('INTEGRATION_REGISTRY');
// Outbound transport for Cloudflare siteverify; tests override with a fake.
export const TURNSTILE_TRANSPORT = Symbol('TURNSTILE_TRANSPORT');

@Module({
  imports: [ConfigModule, SupabaseModule],
  controllers: [IntegrationHealthController],
  providers: [
    IntegrationRepository,
    OpsMetricsRepository,
    {
      provide: TURNSTILE_TRANSPORT,
      useFactory: (): typeof fetch => (input, init) => fetch(input, init),
    },
    {
      provide: IntegrationHealthService,
      inject: [INTEGRATION_REGISTRY, ConfigService, OpsMetricsRepository],
      useFactory: (
        registry: IntegrationRegistry,
        config: ConfigService,
        ops: OpsMetricsRepository,
      ) =>
        new IntegrationHealthService(
          registry,
          config,
          // Default OFF: health reads configuration only, no DB access.
          opsMetricsEnabled(config) ? ops : undefined,
        ),
    },
    {
      provide: INTEGRATION_REGISTRY,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => loadIntegrationRegistry(config),
    },
    {
      provide: IntegrationExecutor,
      inject: [INTEGRATION_REGISTRY],
      useFactory: (registry: IntegrationRegistry) =>
        new IntegrationExecutor(registry),
    },
    {
      provide: MockDeliveryConsumer,
      inject: [INTEGRATION_REGISTRY, IntegrationRepository],
      useFactory: (
        registry: IntegrationRegistry,
        repo: IntegrationRepository,
      ) => new MockDeliveryConsumer(registry, repo),
    },
    {
      provide: ContactProtectionService,
      inject: [
        INTEGRATION_REGISTRY,
        ConfigService,
        IntegrationExecutor,
        TURNSTILE_TRANSPORT,
      ],
      useFactory: (
        registry: IntegrationRegistry,
        config: ConfigService,
        executor: IntegrationExecutor,
        transport: typeof fetch,
      ) => {
        // Real siteverify adapter exists only with a valid key pair; the
        // service still gates it (staging + development/test + flag on).
        const live = turnstileLiveConfig(config);
        return new ContactProtectionService(
          registry,
          config.get<string>('NODE_ENV') ?? '',
          executor,
          undefined,
          undefined,
          {
            config: live,
            adapter:
              live.state === 'ready'
                ? new SiteverifyTurnstileAdapter(live.secret, transport)
                : undefined,
          },
        );
      },
    },
  ],
  exports: [
    INTEGRATION_REGISTRY,
    IntegrationExecutor,
    IntegrationRepository,
    MockDeliveryConsumer,
    ContactProtectionService,
  ],
})
export class IntegrationsModule {}
