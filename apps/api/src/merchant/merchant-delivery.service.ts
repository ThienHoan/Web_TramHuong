import {
  BadRequestException,
  ServiceUnavailableException,
} from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import { createHash } from 'node:crypto';
import type { Json } from '../common/types/database.types';
import type { ProductsService } from '../products/products.service';
import type { IntegrationRegistry } from '../integrations/integrations.config';
import {
  canonicalJson,
  IntegrationRepository,
} from '../integrations/integration.repository';
import { IntegrationFailure } from '../integrations/integration-executor';
import {
  IntegrationDeferred,
  type MockDeliveryConsumer,
} from '../integrations/mock-delivery.consumer';
import { mapMerchantProduct } from './merchant.mapper';

export class MerchantDeliveryService {
  readonly enabled: boolean;
  private readonly local: boolean;
  constructor(
    private readonly registry: IntegrationRegistry,
    private readonly config: ConfigService,
    private readonly products: ProductsService,
    private readonly repo: IntegrationRepository,
    private readonly consumer: MockDeliveryConsumer,
    private readonly simulate: (
      value: Record<string, Json>,
      signal: AbortSignal,
    ) => Promise<void> = () => Promise.resolve(),
  ) {
    const flag = config.get<unknown>('FEATURE_MERCHANT_OUTBOX_ENABLED');
    if (
      flag !== undefined &&
      flag !== true &&
      flag !== false &&
      flag !== 'true' &&
      flag !== 'false'
    )
      throw new Error('FEATURE_MERCHANT_OUTBOX_ENABLED must be true or false');
    this.enabled = flag === true || flag === 'true';
    this.local = ['development', 'test'].includes(
      config.get<string>('NODE_ENV') ?? '',
    );
  }
  mode() {
    return !this.enabled
      ? 'disabled'
      : this.registry.merchant.mode === 'mock' && this.local
        ? 'mock'
        : 'blocked';
  }
  private requireMock() {
    if (this.mode() !== 'mock')
      throw new ServiceUnavailableException('MERCHANT_QUEUE_NOT_EXECUTABLE');
  }
  private async source(productId: string) {
    const p = await this.products.findById(productId);
    if (p.id !== productId) throw new IntegrationFailure('REJECTED');
    const action = p.is_active === false ? 'withdraw' : 'upsert';
    const translation = p.translations?.find((t) => t.locale === 'vi');
    const content: Record<string, Json> =
      action === 'withdraw'
        ? { offerId: p.id, action: 'withdraw' }
        : mapMerchantProduct(
            { ...p, translation: translation ?? undefined },
            this.config.get<string>('FRONTEND_URL') ?? '',
          );
    const fingerprint = createHash('sha256')
      .update(canonicalJson(content))
      .digest('hex');
    return { action, content, fingerprint };
  }
  async queue(productIds: string[]) {
    this.requireMock();
    if (
      !Array.isArray(productIds) ||
      productIds.length < 1 ||
      productIds.length > 20 ||
      new Set(productIds).size !== productIds.length ||
      productIds.some(
        (id) =>
          !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(
            id,
          ),
      )
    )
      throw new BadRequestException('MERCHANT_QUEUE_INVALID_IDS');
    const items: { productId: string; result: string }[] = [];
    for (const productId of productIds) {
      let source: Awaited<ReturnType<MerchantDeliveryService['source']>>;
      try {
        source = await this.source(productId);
      } catch {
        items.push({ productId, result: 'source_requires_review' });
        continue;
      }
      try {
        await this.repo.enqueueMerchantMock(
          productId,
          source.action,
          source.fingerprint,
        );
        items.push({ productId, result: 'recorded_or_existing' });
      } catch {
        throw new ServiceUnavailableException(
          'MERCHANT_QUEUE_STORE_UNAVAILABLE',
        );
      }
    }
    return { source: 'mock', persistence: 'database', synced: false, items };
  }
  async reconcile(page: number) {
    this.requireMock();
    if (!Number.isSafeInteger(page) || page < 1 || page > 1000)
      throw new BadRequestException('MERCHANT_PAGE_INVALID');
    let catalog: Awaited<ReturnType<ProductsService['findAll']>>;
    try {
      catalog = await this.products.findAll('vi', {
        include_inactive: true,
        page,
        limit: 20,
      });
    } catch {
      throw new ServiceUnavailableException('MERCHANT_CATALOG_UNAVAILABLE');
    }
    if (!Array.isArray(catalog.data) || catalog.data.length > 20)
      throw new ServiceUnavailableException('MERCHANT_CATALOG_UNAVAILABLE');
    const result = catalog.data.length
      ? await this.queue(catalog.data.map((p) => p.id))
      : { source: 'mock', persistence: 'database', synced: false, items: [] };
    return {
      ...result,
      page,
      limit: 20,
      hasMore: page < catalog.meta.last_page,
      schedulerEnabled: false,
    };
  }
  async drain() {
    this.requireMock();
    // Preflight: a missing/paused send fence must not burn claimed rows.
    if (!(await this.repo.merchantFenceReadyMock().catch(() => false)))
      throw new ServiceUnavailableException('MERCHANT_SEND_FENCE_UNAVAILABLE');
    const result = await this.consumer.drain(
      'merchant',
      async (row, signal) => {
        const p = row.payload;
        if (
          row.operation_kind !== 'mutation' ||
          !p ||
          typeof p !== 'object' ||
          Array.isArray(p) ||
          typeof p.productId !== 'string' ||
          typeof p.fingerprint !== 'string' ||
          typeof p.generation !== 'number' ||
          !Number.isSafeInteger(p.generation) ||
          p.generation < 1 ||
          typeof p.action !== 'string' ||
          !['upsert', 'withdraw'].includes(p.action) ||
          row.event_type !== `catalog_${p.action}`
        )
          throw new IntegrationFailure('REJECTED');
        let current: Awaited<ReturnType<MerchantDeliveryService['source']>>;
        try {
          current = await this.source(p.productId);
        } catch {
          throw new IntegrationFailure('REJECTED');
        }
        if (
          current.action !== p.action ||
          current.fingerprint !== p.fingerprint
        )
          throw new IntegrationFailure('REJECTED');
        signal.throwIfAborted();
        // P8-03: one in-flight send per product across instances, started in
        // generation order. The latest-generation check is atomic with it.
        let fence: Awaited<
          ReturnType<IntegrationRepository['merchantBeginSendMock']>
        >;
        try {
          fence = await this.repo.merchantBeginSendMock(row);
        } catch {
          throw new IntegrationDeferred(); // nothing sent; requeue if provable
        }
        if (fence.status !== 'acquired')
          throw fence.status === 'busy'
            ? new IntegrationDeferred()
            : new IntegrationFailure('REJECTED');
        try {
          signal.throwIfAborted();
          await this.simulate(current.content, signal);
        } catch (error) {
          const definitive =
            error instanceof IntegrationFailure &&
            error.outcome === 'rejected' &&
            !['TIMEOUT', 'UNAVAILABLE'].includes(error.code);
          await this.repo
            .merchantEndSendMock(
              fence.fenceToken,
              definitive ? 'REJECTED' : 'UNKNOWN',
            )
            .catch(() => undefined); // fence lease expires on its own
          throw error;
        }
        // If this fails the outbox records UNKNOWN; the generation never resends.
        await this.repo.merchantEndSendMock(fence.fenceToken, 'ACCEPTED');
      },
      (row) => this.repo.merchantDeferMock(row),
    );
    return {
      source: 'mock',
      persistence: 'database',
      synced: false,
      googleApproval: null,
      ...result,
    };
  }
}
