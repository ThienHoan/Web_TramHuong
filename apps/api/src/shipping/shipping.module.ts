import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { GHN_CONFIG, loadGhnConfig } from './ghn/ghn.config';
import { GhnClient, ghnTransportProviders } from './ghn/ghn.client';
import { GhnProvider } from './ghn/ghn.provider';
import { ShippingAddressService } from './address.service';
import { ShippingController } from './shipping.controller';
import { SupabaseModule } from '../supabase/supabase.module';
import { VouchersModule } from '../vouchers/vouchers.module';
import { LogisticsRepository } from './logistics.repository';
import { ShippingQuoteService } from './quote.service';
import { ShippingQuoteController } from './quote.controller';
import { LOGISTICS_SETTINGS } from './logistics.types';
import { FulfillmentService } from './fulfillment.service';
import { ShippingTrackingService } from './tracking.service';
import { ShippingTrackingController } from './tracking.controller';
import { ShippingJobs } from './shipping.jobs';
import { ShippingOperationsService } from './operations.service';
import { ShippingEvidenceService } from './evidence.service';
import { ShippingProviderRegistry } from './provider-registry';
import {
  ShippingAdminController,
  ShippingCustomerController,
} from './operations.controller';

@Module({
  imports: [ConfigModule, SupabaseModule, VouchersModule],
  providers: [
    { provide: GHN_CONFIG, inject: [ConfigService], useFactory: loadGhnConfig },
    ...ghnTransportProviders,
    GhnClient,
    GhnProvider,
    ShippingAddressService,
    LogisticsRepository,
    ShippingQuoteService,
    FulfillmentService,
    ShippingTrackingService,
    ShippingJobs,
    ShippingOperationsService,
    ShippingEvidenceService,
    ShippingProviderRegistry,
    {
      provide: LOGISTICS_SETTINGS,
      inject: [ConfigService],
      useFactory: (c: ConfigService) => {
        const flag = (key: string) => {
          const value = c.get<string>(key) ?? 'false';
          if (!['true', 'false'].includes(value))
            throw new Error(`${key} must be true or false`);
          return value === 'true';
        };
        const checkout = flag('SHIPPING_CHECKOUT_ENABLED'),
          jobs = flag('SHIPPING_JOBS_ENABLED'),
          fulfillment = flag('SHIPPING_FULFILLMENT_ENABLED');
        if (
          (checkout || jobs || fulfillment) &&
          c.get<string>('GHN_ENABLED') !== 'true'
        )
          throw new Error(
            'Enable verified GHN staging configuration before shipping features',
          );
        if (fulfillment && c.get<string>('GHN_ENV') === 'production')
          throw new Error('Production fulfillment is locked in this release');
        return {
          checkout,
          jobs,
          fulfillment,
          webhookSecret: c.get<string>('GHN_WEBHOOK_SECRET') || '',
        };
      },
    },
  ],
  controllers: [
    ShippingController,
    ShippingQuoteController,
    ShippingTrackingController,
    ShippingAdminController,
    ShippingCustomerController,
  ],
  exports: [
    GHN_CONFIG,
    GhnProvider,
    ShippingAddressService,
    ShippingQuoteService,
  ],
})
export class ShippingModule {}
