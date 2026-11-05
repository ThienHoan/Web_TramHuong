import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { ProductsService } from '../products/products.service';
import { IntegrationRepository } from '../integrations/integration.repository';
import { loadIntegrationRegistry } from '../integrations/integrations.config';
import { MockDeliveryConsumer } from '../integrations/mock-delivery.consumer';
import { MerchantDeliveryService } from './merchant-delivery.service';
const id = '00000000-0000-4000-8000-000000000001';
const product = {
  id,
  slug: 'fixture',
  is_active: true,
  price: 200000,
  quantity: 3,
  images: ['https://cdn.example.org/photo.webp'],
  variants: null,
  discount_percentage: 0,
  discount_start_date: null,
  discount_end_date: null,
  translations: [
    { locale: 'en', title: 'Wrong locale', description: 'English' },
    { locale: 'vi', title: 'Vòng tay', description: 'Sản phẩm mẫu' },
  ],
};
const defaults = {
  NODE_ENV: 'test',
  FEATURE_MERCHANT_SYNC_ENABLED: 'true',
  FEATURE_MERCHANT_OUTBOX_ENABLED: 'true',
  FRONTEND_URL: 'https://shop.example.org',
};
function setup(values: Record<string, string> = defaults) {
  const config = new ConfigService(values),
    registry = loadIntegrationRegistry(config);
  const findById = jest.fn().mockResolvedValue(product),
    findAll = jest
      .fn()
      .mockResolvedValue({ data: [product], meta: { last_page: 2 } });
  const enqueueMock = jest
      .fn<
        Promise<{ id: string }>,
        Parameters<IntegrationRepository['enqueueMerchantMock']>
      >()
      .mockResolvedValue({ id }),
    claimMock = jest.fn(),
    finish = jest.fn().mockResolvedValue(undefined),
    reserveMockUsage = jest.fn().mockResolvedValue({ used: 1 });
  const repo = {
    enqueueMerchantMock: enqueueMock,
    merchantIsCurrentMock: jest.fn().mockResolvedValue(true),
    merchantFenceReadyMock: jest.fn().mockResolvedValue(true),
    merchantBeginSendMock: jest.fn().mockResolvedValue({
      status: 'acquired',
      fenceToken: '00000000-0000-4000-8000-0000000000f1',
      generation: 1,
    }),
    merchantEndSendMock: jest.fn().mockResolvedValue(undefined),
    merchantDeferMock: jest.fn().mockResolvedValue(undefined),
    claimMock,
    finish,
    reserveMockUsage,
  };
  const simulate = jest
    .fn<Promise<void>, [Record<string, unknown>, AbortSignal]>()
    .mockResolvedValue();
  const consumer = new MockDeliveryConsumer(
    registry,
    repo as unknown as IntegrationRepository,
  );
  const service = new MerchantDeliveryService(
    registry,
    config,
    { findById, findAll } as unknown as ProductsService,
    repo as unknown as IntegrationRepository,
    consumer,
    simulate,
  );
  return { service, findById, findAll, repo, simulate };
}
describe('incremental mock Merchant queue source and delivery fencing', () => {
  beforeEach(() => {
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
  });
  afterEach(() => jest.restoreAllMocks());
  it.each([
    {},
    { ...defaults, FEATURE_MERCHANT_OUTBOX_ENABLED: 'false' },
    { ...defaults, INTEGRATIONS_KILL_SWITCH: 'true' },
    { ...defaults, INTEGRATIONS_ENV: 'staging' },
    { ...defaults, NODE_ENV: 'production' },
  ])('blocks source/queue/provider access for %j', async (config) => {
    const { service, findById, repo, simulate } = setup(config);
    await expect(service.queue([id])).rejects.toThrow('NOT_EXECUTABLE');
    await expect(service.drain()).rejects.toThrow('NOT_EXECUTABLE');
    expect(findById).not.toHaveBeenCalled();
    expect(repo.enqueueMerchantMock).not.toHaveBeenCalled();
    expect(simulate).not.toHaveBeenCalled();
  });
  it('uses deterministic keys for unchanged content and new keys for price/stock changes', async () => {
    const { service, findById, repo } = setup();
    await service.queue([id]);
    await service.queue([id]);
    expect(repo.enqueueMerchantMock.mock.calls[0]).toEqual(
      repo.enqueueMerchantMock.mock.calls[1],
    );
    findById.mockResolvedValueOnce({ ...product, price: 300000 });
    await service.queue([id]);
    expect(repo.enqueueMerchantMock.mock.calls[2][2]).not.toBe(
      repo.enqueueMerchantMock.mock.calls[0][2],
    );
    expect(repo.enqueueMerchantMock.mock.calls[0][0]).toBe(id);
    expect(repo.enqueueMerchantMock.mock.calls[0][1]).toBe('upsert');
    expect(repo.enqueueMerchantMock.mock.calls[0][2]).toMatch(/^[a-f0-9]{64}$/);
  });
  it('only explicit archived source permits withdrawal; a missing source is review-required', async () => {
    const { service, findById, repo } = setup();
    findById.mockResolvedValueOnce({ ...product, is_active: false });
    await service.queue([id]);
    expect(repo.enqueueMerchantMock.mock.calls[0][1]).toBe('withdraw');
    findById.mockRejectedValueOnce(new Error('NOT_FOUND_OR_PRIVATE_DB_ERROR'));
    expect(await service.queue([id])).toMatchObject({
      items: [{ productId: id, result: 'source_requires_review' }],
    });
    expect(repo.enqueueMerchantMock).toHaveBeenCalledTimes(1);
  });
  it('reads VI translation explicitly and sends only freshly validated catalog content', async () => {
    const { service, repo, simulate } = setup();
    await service.queue([id]);
    const [productId, action, fingerprint] =
      repo.enqueueMerchantMock.mock.calls[0];
    const payload = { productId, action, fingerprint, generation: 1 },
      key = 'merchant_v2:' + id + ':1',
      event = 'catalog_' + action;
    repo.claimMock.mockResolvedValue([
      {
        id,
        provider: 'merchant',
        environment: 'mock',
        operation_kind: 'mutation',
        state: 'WORKING',
        lease_token: id,
        version: 1,
        dedupe_key: key,
        event_type: event,
        payload,
      },
    ]);
    expect(await service.drain()).toMatchObject({
      source: 'mock',
      accepted: 1,
      synced: false,
      googleApproval: null,
    });
    expect(simulate.mock.calls[0][0]).toMatchObject({
      offerId: id,
      productAttributes: {
        title: 'Vòng tay',
        price: { amountMicros: '200000000000', currencyCode: 'VND' },
      },
    });
  });
  it('marks obsolete source DEAD without sending a stale price', async () => {
    const { service, repo, findById, simulate } = setup();
    await service.queue([id]);
    const [productId, action, fingerprint] =
      repo.enqueueMerchantMock.mock.calls[0];
    const payload = { productId, action, fingerprint, generation: 1 },
      key = 'merchant_v2:' + id + ':1',
      event = 'catalog_' + action;
    repo.claimMock.mockResolvedValue([
      {
        id,
        provider: 'merchant',
        environment: 'mock',
        operation_kind: 'mutation',
        state: 'WORKING',
        lease_token: id,
        version: 1,
        dedupe_key: key,
        event_type: event,
        payload,
      },
    ]);
    findById.mockResolvedValueOnce({ ...product, price: 1 });
    await service.drain();
    expect(simulate).not.toHaveBeenCalled();
    expect(repo.finish).toHaveBeenCalledWith(
      expect.anything(),
      'DEAD',
      'REJECTED',
    );
  });
  it('keeps ambiguous mutation UNKNOWN and does not retry', async () => {
    const { service, repo, simulate } = setup();
    await service.queue([id]);
    const [productId, action, fingerprint] =
      repo.enqueueMerchantMock.mock.calls[0];
    const payload = { productId, action, fingerprint, generation: 1 },
      key = 'merchant_v2:' + id + ':1',
      event = 'catalog_' + action;
    repo.claimMock.mockResolvedValue([
      {
        id,
        provider: 'merchant',
        environment: 'mock',
        operation_kind: 'mutation',
        state: 'WORKING',
        lease_token: id,
        version: 1,
        dedupe_key: key,
        event_type: event,
        payload,
      },
    ]);
    simulate.mockRejectedValue(new Error('PRIVATE_UNKNOWN'));
    await service.drain();
    expect(simulate).toHaveBeenCalledTimes(1);
    expect(repo.finish).toHaveBeenCalledWith(
      expect.anything(),
      'UNKNOWN',
      'UNAVAILABLE',
    );
  });
  it('reconciles one bounded source page including inactive products without enabling a schedule', async () => {
    const { service, findAll } = setup();
    expect(await service.reconcile(1)).toMatchObject({
      page: 1,
      limit: 20,
      hasMore: true,
      schedulerEnabled: false,
      synced: false,
    });
    expect(findAll).toHaveBeenCalledWith('vi', {
      include_inactive: true,
      page: 1,
      limit: 20,
    });
  });
  it.each(
    [[], [id, id], ['bad-id'], Array.from({ length: 21 }, () => id)].map(
      (ids) => [ids],
    ),
  )('rejects invalid batches %j', async (ids) => {
    const { service, findById } = setup();
    await expect(service.queue(ids)).rejects.toThrow('INVALID_IDS');
    expect(findById).not.toHaveBeenCalled();
  });
});
