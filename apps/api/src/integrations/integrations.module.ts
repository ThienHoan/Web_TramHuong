import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { loadIntegrationRegistry } from './integrations.config';
import type { IntegrationRegistry } from './integrations.config';
import { IntegrationExecutor } from './integration-executor';
import { SupabaseModule } from '../supabase/supabase.module';
import { IntegrationRepository } from './integration.repository';
import { MockDeliveryConsumer } from './mock-delivery.consumer';
import { ContactProtectionService } from './contact-protection.service';

export const INTEGRATION_REGISTRY = Symbol('INTEGRATION_REGISTRY');

@Module({
  imports: [ConfigModule, SupabaseModule],
  providers: [
    IntegrationRepository,
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
      inject: [INTEGRATION_REGISTRY, ConfigService, IntegrationExecutor],
      useFactory: (
        registry: IntegrationRegistry,
        config: ConfigService,
        executor: IntegrationExecutor,
      ) =>
        new ContactProtectionService(
          registry,
          config.get<string>('NODE_ENV') ?? '',
          executor,
        ),
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
