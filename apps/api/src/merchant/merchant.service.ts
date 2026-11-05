import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ProductsService } from '../products/products.service';
import type { IntegrationRegistry } from '../integrations/integrations.config';
import { IntegrationExecutor } from '../integrations/integration-executor';
import { mapMerchantProduct } from './merchant.mapper';

@Injectable()
export class MerchantService {
  constructor(
    private readonly config: ConfigService,
    private readonly products: ProductsService,
    private readonly registry: IntegrationRegistry,
    private readonly executor: IntegrationExecutor,
  ) {}

  status() {
    return {
      source: 'configuration' as const,
      mode: this.registry.merchant.mode,
      apiVersion: 'products/v1',
      liveAvailable: false,
      schedulerEnabled: false,
      persistence: 'none',
      blockers: [
        'MERCHANT_ACCOUNT_AND_DATA_SOURCE',
        'OAUTH_RIGHTS',
        'CATALOG_ELIGIBILITY',
        'LIVE_TRANSPORT_NOT_RELEASED',
      ],
    };
  }

  // Explicit manual mock preview, never a Google write or a scheduled sync.
  async syncProducts(source: 'mock' = 'mock') {
    if (
      source !== 'mock' ||
      this.registry.merchant.mode !== 'mock' ||
      !['development', 'test'].includes(
        this.config.get<string>('NODE_ENV') ?? '',
      )
    )
      throw new ServiceUnavailableException('MERCHANT_PREVIEW_NOT_EXECUTABLE');
    try {
      const result = await this.executor.runMock(
        'merchant',
        'catalog_preview',
        'read',
        async (signal) => {
          const catalog = await this.products.findAll('vi', {
            page: 1,
            limit: 20,
          });
          signal.throwIfAborted();
          if (!Array.isArray(catalog.data) || catalog.data.length > 20)
            throw new Error('MERCHANT_CATALOG_INVALID');
          const baseUrl = this.config.get<string>('FRONTEND_URL') ?? '';
          const evaluatedAt = new Date();
          const items = catalog.data.map((product) => {
            try {
              return {
                outcome: 'candidate' as const,
                input: mapMerchantProduct(product, baseUrl, evaluatedAt),
              };
            } catch (error: unknown) {
              return {
                outcome: 'ineligible_source' as const,
                input: null,
                reason:
                  error instanceof Error &&
                  /^MERCHANT_[A-Z_]+$/.test(error.message)
                    ? error.message
                    : 'MERCHANT_SOURCE_INELIGIBLE',
              };
            }
          });
          return {
            items,
            evaluatedAt: evaluatedAt.toISOString(),
            candidateCount: items.filter((p) => p.outcome === 'candidate')
              .length,
          };
        },
      );
      return {
        ...this.status(),
        source: 'mock',
        result: 'preview',
        synced: false,
        scope: 'first_page_only',
        limit: 20,
        ...result.data,
        limitations: [
          'NOT_GOOGLE_APPROVAL',
          'NO_CATALOG_WRITES_OR_DELETIONS',
          'NO_ACCOUNT_SHIPPING_OR_RETURNS_VALIDATION',
        ],
      };
    } catch {
      throw new ServiceUnavailableException('MERCHANT_PREVIEW_UNAVAILABLE');
    }
  }
}
