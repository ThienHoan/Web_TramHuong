import { Module } from '@nestjs/common';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { SupabaseModule } from '../supabase/supabase.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import {
  INTEGRATION_REGISTRY,
  IntegrationsModule,
} from '../integrations/integrations.module';
import type { IntegrationRegistry } from '../integrations/integrations.config';
import { IntegrationExecutor } from '../integrations/integration-executor';
import { SearchConsoleService } from './search-console.service';
import { SearchConsoleController } from './search-console.controller';
import {
  SearchConsoleRepository,
  searchPersistenceEnabled,
} from './search-console.repository';
import { CollectionPolicyService } from './collection-policy.service';
import { PurchaseCaptureService } from './purchase-capture.service';
import { PagespeedService, pagespeedThresholds } from './pagespeed.service';
import { PagespeedController } from './pagespeed.controller';
import {
  PagespeedRepository,
  pagespeedPersistenceEnabled,
} from './pagespeed.repository';
import { GoogleDiagnosticsController } from './google-diagnostics.controller';
import { GoogleDiagnosticsService } from './google-diagnostics.service';
import { LocalDebugEventService } from './local-debug-event.service';
import { LocalDebugEventController } from './local-debug-event.controller';

@Module({
  imports: [SupabaseModule, ConfigModule, IntegrationsModule],
  controllers: [
    AnalyticsController,
    SearchConsoleController,
    PagespeedController,
    GoogleDiagnosticsController,
    LocalDebugEventController,
  ],
  providers: [
    AnalyticsService,
    CollectionPolicyService,
    PurchaseCaptureService,
    {
      provide: LocalDebugEventService,
      inject: [INTEGRATION_REGISTRY, ConfigService],
      useFactory: (registry: IntegrationRegistry, config: ConfigService) =>
        new LocalDebugEventService(config, registry),
    },
    {
      provide: GoogleDiagnosticsService,
      inject: [INTEGRATION_REGISTRY, ConfigService],
      useFactory: (registry: IntegrationRegistry, config: ConfigService) =>
        new GoogleDiagnosticsService(config, registry),
    },
    PagespeedRepository,
    {
      provide: PagespeedService,
      inject: [
        INTEGRATION_REGISTRY,
        ConfigService,
        IntegrationExecutor,
        PagespeedRepository,
      ],
      useFactory: (
        registry: IntegrationRegistry,
        config: ConfigService,
        executor: IntegrationExecutor,
        store: PagespeedRepository,
      ) =>
        new PagespeedService(
          registry,
          config.get<string>('NODE_ENV') ?? '',
          executor,
          undefined,
          undefined,
          pagespeedThresholds(config),
          // Default OFF: RAM history. ON: TEST DB store, never silent RAM fallback.
          pagespeedPersistenceEnabled(config) ? store : undefined,
        ),
    },
    SearchConsoleRepository,
    {
      provide: SearchConsoleService,
      inject: [
        INTEGRATION_REGISTRY,
        ConfigService,
        IntegrationExecutor,
        SearchConsoleRepository,
      ],
      useFactory: (
        registry: IntegrationRegistry,
        config: ConfigService,
        executor: IntegrationExecutor,
        store: SearchConsoleRepository,
      ) =>
        new SearchConsoleService(
          registry,
          config.get<string>('NODE_ENV') ?? '',
          executor,
          undefined,
          undefined,
          // Default OFF: RAM snapshot. ON: TEST DB store, never silent RAM fallback.
          searchPersistenceEnabled(config) ? store : undefined,
        ),
    },
  ],
})
export class AnalyticsModule {}
