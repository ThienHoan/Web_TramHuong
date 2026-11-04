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
import { CollectionPolicyService } from './collection-policy.service';
import { PurchaseCaptureService } from './purchase-capture.service';
import { PagespeedService, pagespeedThresholds } from './pagespeed.service';
import { PagespeedController } from './pagespeed.controller';
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
    {
      provide: PagespeedService,
      inject: [INTEGRATION_REGISTRY, ConfigService, IntegrationExecutor],
      useFactory: (
        registry: IntegrationRegistry,
        config: ConfigService,
        executor: IntegrationExecutor,
      ) =>
        new PagespeedService(
          registry,
          config.get<string>('NODE_ENV') ?? '',
          executor,
          undefined,
          undefined,
          pagespeedThresholds(config),
        ),
    },
    {
      provide: SearchConsoleService,
      inject: [INTEGRATION_REGISTRY, ConfigService, IntegrationExecutor],
      useFactory: (
        registry: IntegrationRegistry,
        config: ConfigService,
        executor: IntegrationExecutor,
      ) =>
        new SearchConsoleService(
          registry,
          config.get<string>('NODE_ENV') ?? '',
          executor,
        ),
    },
  ],
})
export class AnalyticsModule {}
