import { BadRequestException, Injectable } from '@nestjs/common';
import { GhnProvider } from './ghn/ghn.provider';
import type {
  ShippingQuoteProvider,
  ShippingPreviewProvider,
} from './contracts/shipping-provider';
export interface ProviderEntry {
  id: string;
  quote: ShippingQuoteProvider;
  preview?: ShippingPreviewProvider;
  capabilities: Readonly<Record<string, boolean>>;
}
@Injectable()
export class ShippingProviderRegistry {
  private readonly providers = new Map<string, ProviderEntry>();
  constructor(ghn: GhnProvider) {
    this.register({
      id: 'ghn',
      quote: ghn,
      preview: ghn,
      capabilities: {
        quote: true,
        preview: true,
        newAddresses: true,
        stagingFulfillment: true,
        productionFulfillment: false,
        liveGps: false,
      },
    });
  }
  register(entry: ProviderEntry) {
    if (this.providers.has(entry.id))
      throw new Error('SHIPPING_PROVIDER_ALREADY_REGISTERED');
    this.providers.set(entry.id, entry);
  }
  get(id: string) {
    const entry = this.providers.get(id);
    if (!entry) throw new BadRequestException('SHIPPING_PROVIDER_UNSUPPORTED');
    return entry;
  }
  capabilities() {
    return [...this.providers.values()].map((p) => ({
      id: p.id,
      capabilities: p.capabilities,
    }));
  }
}
