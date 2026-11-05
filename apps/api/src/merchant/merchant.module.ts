import { Module } from '@nestjs/common';
import { MerchantService } from './merchant.service';
import { MerchantController } from './merchant.controller';
import { ProductsModule } from '../products/products.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import {
  INTEGRATION_REGISTRY,
  IntegrationsModule,
} from '../integrations/integrations.module';
import type { IntegrationRegistry } from '../integrations/integrations.config';
import { IntegrationExecutor } from '../integrations/integration-executor';
import { ProductsService } from '../products/products.service';
import { MerchantDeliveryService } from './merchant-delivery.service';
import { IntegrationRepository } from '../integrations/integration.repository';
import { MockDeliveryConsumer } from '../integrations/mock-delivery.consumer';

@Module({
  imports: [ProductsModule, ConfigModule, IntegrationsModule],
  controllers: [MerchantController],
  providers: [
    {
      provide: MerchantDeliveryService,
      inject: [
        INTEGRATION_REGISTRY,
        ConfigService,
        ProductsService,
        IntegrationRepository,
        MockDeliveryConsumer,
      ],
      useFactory: (
        registry: IntegrationRegistry,
        config: ConfigService,
        products: ProductsService,
        repo: IntegrationRepository,
        consumer: MockDeliveryConsumer,
      ) =>
        new MerchantDeliveryService(registry, config, products, repo, consumer),
    },
    {
      provide: MerchantService,
      inject: [
        ConfigService,
        ProductsService,
        INTEGRATION_REGISTRY,
        IntegrationExecutor,
      ],
      useFactory: (
        config: ConfigService,
        products: ProductsService,
        registry: IntegrationRegistry,
        executor: IntegrationExecutor,
      ) => new MerchantService(config, products, registry, executor),
    },
  ],
})
export class MerchantModule {}
