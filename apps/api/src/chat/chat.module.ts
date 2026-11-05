import { Module } from '@nestjs/common';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { ProductsModule } from '../products/products.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import {
  INTEGRATION_REGISTRY,
  IntegrationsModule,
} from '../integrations/integrations.module';
import type { IntegrationRegistry } from '../integrations/integrations.config';
import { IntegrationExecutor } from '../integrations/integration-executor';
import { ProductsService } from '../products/products.service';
import { CatalogAdvisorController } from './catalog-advisor.controller';
import { CatalogAdvisorService } from './catalog-advisor.service';
import { CatalogSearchRepository } from '../products/catalog-search.repository';
import { IntegrationRepository } from '../integrations/integration.repository';
import {
  GeminiInteractionsAdapter,
  GeminiLiveLimiter,
  geminiLiveConfig,
} from './gemini-live';

// Outbound transport for the Gemini Interactions API; tests override with a fake.
export const GEMINI_TRANSPORT = Symbol('GEMINI_TRANSPORT');

@Module({
  imports: [ProductsModule, ConfigModule, IntegrationsModule],
  controllers: [ChatController, CatalogAdvisorController],
  providers: [
    ChatService,
    {
      provide: GEMINI_TRANSPORT,
      useFactory: (): typeof fetch => (input, init) => fetch(input, init),
    },
    {
      provide: CatalogAdvisorService,
      inject: [
        ProductsService,
        INTEGRATION_REGISTRY,
        IntegrationExecutor,
        ConfigService,
        CatalogSearchRepository,
        IntegrationRepository,
        GEMINI_TRANSPORT,
      ],
      useFactory: (
        products: ProductsService,
        registry: IntegrationRegistry,
        executor: IntegrationExecutor,
        config: ConfigService,
        search: CatalogSearchRepository,
        usage: IntegrationRepository,
        transport: typeof fetch,
      ) => {
        // Live selector exists only with a valid config; the service still
        // gates it (flag + staging + development/test).
        const live = geminiLiveConfig(config);
        return new CatalogAdvisorService(
          products,
          registry,
          executor,
          config.get<string>('NODE_ENV') ?? '',
          undefined,
          search,
          live.state === 'ready'
            ? {
                config: live,
                selector: new GeminiInteractionsAdapter(
                  live.apiKey,
                  live.model,
                  transport,
                ),
                limiter: new GeminiLiveLimiter(),
                usage,
              }
            : undefined,
        );
      },
    },
  ],
})
export class ChatModule {}
