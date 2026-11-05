import { Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { ProductsService } from '../products/products.service';
import { IntegrationRepository } from '../integrations/integration.repository';
import { loadIntegrationRegistry } from '../integrations/integrations.config';
import { IntegrationFailure } from '../integrations/integration-executor';
import {
  IntegrationDeferred,
  MockDeliveryConsumer,
} from '../integrations/mock-delivery.consumer';
import type { IntegrationOutboxRow } from '../integrations/integration-database.types';
import type { SupabaseService } from '../supabase/supabase.service';
import { MerchantDeliveryService } from './merchant-delivery.service';

const id = '00000000-0000-4000-8000-000000000001';
const FENCE = '00000000-0000-4000-8000-0000000000f1';
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
  translations: [{ locale: 'vi', title: 'Vòng tay', description: 'Mẫu' }],
};
const config = new ConfigService({
  NODE_ENV: 'test',
  FEATURE_MERCHANT_SYNC_ENABLED: 'true',
  FEATURE_MERCHANT_OUTBOX_ENABLED: 'true',
  FRONTEND_URL: 'https://shop.example.org',
});

async function setup() {
  const registry = loadIntegrationRegistry(config);
  const repo = {
    enqueueMerchantMock: jest.fn().mockResolvedValue({ id }),
    merchantIsCurrentMock: jest.fn(),
    merchantFenceReadyMock: jest.fn().mockResolvedValue(true),
    merchantBeginSendMock: jest.fn().mockResolvedValue({
      status: 'acquired',
      fenceToken: FENCE,
      generation: 1,
    }),
    merchantEndSendMock: jest.fn().mockResolvedValue(undefined),
    merchantDeferMock: jest.fn().mockResolvedValue(undefined),
    claimMock: jest.fn(),
    finish: jest.fn().mockResolvedValue(undefined),
    reserveMockUsage: jest.fn().mockResolvedValue({ used: 1 }),
  };
  const simulate = jest
    .fn<Promise<void>, [Record<string, unknown>, AbortSignal]>()
    .mockResolvedValue();
  const service = new MerchantDeliveryService(
    registry,
    config,
    {
      findById: jest.fn().mockResolvedValue(product),
      findAll: jest.fn(),
    } as unknown as ProductsService,
    repo as unknown as IntegrationRepository,
    new MockDeliveryConsumer(
      registry,
      repo as unknown as IntegrationRepository,
    ),
    simulate,
  );
  // Capture the real fingerprint so the row matches the fresh source.
  await service.queue([id]);
  const [, action, fingerprint] = repo.enqueueMerchantMock.mock.calls[0] as [
    string,
    string,
    string,
  ];
  repo.claimMock.mockResolvedValue([
    {
      id,
      provider: 'merchant',
      environment: 'mock',
      operation_kind: 'mutation',
      state: 'WORKING',
      lease_token: id,
      version: 1,
      dedupe_key: 'merchant_v2:' + id + ':1',
      event_type: 'catalog_' + action,
      payload: { productId: id, action, fingerprint, generation: 1 },
    },
  ]);
  return { service, repo, simulate };
}

describe('P8-03 per-product send fence in the Merchant worker', () => {
  beforeEach(() => {
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
  });
  afterEach(() => jest.restoreAllMocks());

  it('missing/paused fence: 503 before claiming any row', async () => {
    const { service, repo } = await setup();
    repo.merchantFenceReadyMock.mockResolvedValue(false);
    await expect(service.drain()).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
    repo.merchantFenceReadyMock.mockRejectedValue(new Error('network'));
    await expect(service.drain()).rejects.toThrow(
      'MERCHANT_SEND_FENCE_UNAVAILABLE',
    );
    expect(repo.claimMock).not.toHaveBeenCalled();
  });

  it('acquired: simulate once, end ACCEPTED, then finish ACCEPTED', async () => {
    const { service, repo, simulate } = await setup();
    expect(await service.drain()).toMatchObject({
      accepted: 1,
      deferred: 0,
      synced: false,
    });
    expect(simulate).toHaveBeenCalledTimes(1);
    expect(repo.merchantEndSendMock).toHaveBeenCalledWith(FENCE, 'ACCEPTED');
    expect(repo.finish).toHaveBeenCalledWith(
      expect.anything(),
      'ACCEPTED',
      undefined,
    );
    expect(repo.merchantEndSendMock.mock.invocationCallOrder[0]).toBeLessThan(
      repo.finish.mock.invocationCallOrder[0],
    );
  });

  it('busy (another generation in flight): deferred, never sent, never finished', async () => {
    const { service, repo, simulate } = await setup();
    repo.merchantBeginSendMock.mockResolvedValue({
      status: 'busy',
      generation: 1,
    });
    expect(await service.drain()).toMatchObject({
      deferred: 1,
      failed: 0,
      accepted: 0,
    });
    expect(simulate).not.toHaveBeenCalled();
    expect(repo.merchantDeferMock).toHaveBeenCalledTimes(1);
    expect(repo.finish).not.toHaveBeenCalled();
  });

  it('stale (newer generation exists or already started): DEAD without sending', async () => {
    const { service, repo, simulate } = await setup();
    repo.merchantBeginSendMock.mockResolvedValue({
      status: 'stale',
      generation: 1,
    });
    await service.drain();
    expect(simulate).not.toHaveBeenCalled();
    expect(repo.merchantEndSendMock).not.toHaveBeenCalled();
    expect(repo.finish).toHaveBeenCalledWith(
      expect.anything(),
      'DEAD',
      'REJECTED',
    );
  });

  it('fence store error before send: deferred (provably unsent), not UNKNOWN', async () => {
    const { service, repo, simulate } = await setup();
    repo.merchantBeginSendMock.mockRejectedValue(
      new Error('INTEGRATION_STORE_UNAVAILABLE'),
    );
    expect(await service.drain()).toMatchObject({ deferred: 1 });
    expect(simulate).not.toHaveBeenCalled();
  });

  it('defer refused (generation may have started): counted as conflict, row left to expire', async () => {
    const { service, repo } = await setup();
    repo.merchantBeginSendMock.mockResolvedValue({
      status: 'busy',
      generation: 1,
    });
    repo.merchantDeferMock.mockRejectedValue(new Error('PT409'));
    expect(await service.drain()).toMatchObject({ deferred: 0, conflicts: 1 });
    expect(repo.finish).not.toHaveBeenCalled();
  });

  it('ambiguous simulated failure: fence UNKNOWN, outbox UNKNOWN, no retry', async () => {
    const { service, repo, simulate } = await setup();
    simulate.mockRejectedValue(new Error('socket hang up'));
    await service.drain();
    expect(simulate).toHaveBeenCalledTimes(1);
    expect(repo.merchantEndSendMock).toHaveBeenCalledWith(FENCE, 'UNKNOWN');
    expect(repo.finish).toHaveBeenCalledWith(
      expect.anything(),
      'UNKNOWN',
      'UNAVAILABLE',
    );
  });

  it('definitive provider rejection: fence REJECTED, outbox DEAD', async () => {
    const { service, repo, simulate } = await setup();
    simulate.mockRejectedValue(new IntegrationFailure('REJECTED'));
    await service.drain();
    expect(repo.merchantEndSendMock).toHaveBeenCalledWith(FENCE, 'REJECTED');
    expect(repo.finish).toHaveBeenCalledWith(
      expect.anything(),
      'DEAD',
      'REJECTED',
    );
  });

  it('cannot record fence ACCEPTED: outbox stays UNKNOWN, never claimed accepted', async () => {
    const { service, repo } = await setup();
    repo.merchantEndSendMock.mockRejectedValue(new Error('store down'));
    expect(await service.drain()).toMatchObject({ accepted: 0 });
    expect(repo.finish).toHaveBeenCalledWith(
      expect.anything(),
      'UNKNOWN',
      'UNAVAILABLE',
    );
  });
});

describe('consumer defer hook stays opt-in', () => {
  const row = {
    id,
    provider: 'resend',
    environment: 'mock',
    operation_kind: 'mutation',
    state: 'WORKING',
    lease_token: id,
    version: 1,
    dedupe_key: 'k',
    event_type: 'email',
    payload: {},
  } as unknown as IntegrationOutboxRow;
  it('without a defer callback, IntegrationDeferred is an ordinary DEAD failure', async () => {
    const registry = loadIntegrationRegistry(
      new ConfigService({ FEATURE_RESEND_ENABLED: 'true' }),
    );
    const repo = {
      claimMock: jest.fn().mockResolvedValue([row]),
      reserveMockUsage: jest.fn().mockResolvedValue({ used: 1 }),
      finish: jest.fn().mockResolvedValue(undefined),
    };
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
    const consumer = new MockDeliveryConsumer(
      registry,
      repo as unknown as IntegrationRepository,
    );
    await expect(
      consumer.drain('resend', () => Promise.reject(new IntegrationDeferred())),
    ).resolves.toMatchObject({ failed: 1, deferred: 0 });
    expect(repo.finish).toHaveBeenCalledWith(row, 'DEAD', 'CONCURRENCY_LIMIT');
  });
});

describe('merchantBeginSendMock response validation', () => {
  function repo(data: unknown, error: unknown = null) {
    const rpc = jest.fn().mockResolvedValue({ data, error });
    return new IntegrationRepository({
      getClient: () => ({ rpc }),
    } as unknown as SupabaseService);
  }
  const row = { id, lease_token: id, version: 1 } as IntegrationOutboxRow;
  it.each([
    [null, { code: 'PT409' }],
    [{ status: 'acquired', generation: 1 }, null],
    [{ status: 'acquired', generation: 1, fenceToken: 'not-a-token' }, null],
    [{ status: 'sent', generation: 1 }, null],
    [{ status: 'busy' }, null],
  ])('rejects %j / %j', async (data, error) => {
    await expect(repo(data, error).merchantBeginSendMock(row)).rejects.toThrow(
      'INTEGRATION_STORE_UNAVAILABLE',
    );
  });
  it('passes busy/stale through and returns the fence token when acquired', async () => {
    await expect(
      repo({ status: 'busy', generation: 2 }).merchantBeginSendMock(row),
    ).resolves.toEqual({ status: 'busy', generation: 2 });
    await expect(
      repo({
        status: 'acquired',
        generation: 2,
        fenceToken: FENCE,
      }).merchantBeginSendMock(row),
    ).resolves.toEqual({
      status: 'acquired',
      generation: 2,
      fenceToken: FENCE,
    });
  });
});
