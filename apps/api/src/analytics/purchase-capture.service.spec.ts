import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe, type INestApplication } from '@nestjs/common';
import type { Server } from 'node:http';
import request from 'supertest';
import { PurchaseCaptureService } from './purchase-capture.service';
import { CollectionPolicyService } from './collection-policy.service';
import { SupabaseService } from '../supabase/supabase.service';
import { AnalyticsModule } from './analytics.module';
import { AnalyticsService } from './analytics.service';

const OWNER = '10000000-0000-4000-8000-000000000001';
const OTHER = '10000000-0000-4000-8000-000000000002';
const ORDER = '20000000-0000-4000-8000-000000000001';
const transactionId = 'gp_mock_v1_' + 'a'.repeat(64);
describe('Purchase capture service boundary', () => {
  const rpc = jest.fn();
  const getClient = jest.fn(() => ({ rpc }));
  let mode: 'disabled' | 'mock' | 'unavailable';
  let purchaseEnabled: boolean;
  const service = new PurchaseCaptureService(
    {
      getPolicy: () => ({ mode }),
      isPurchaseEnabled: () => purchaseEnabled,
    } as CollectionPolicyService,
    { getClient } as unknown as SupabaseService,
  );
  beforeEach(() => {
    jest.clearAllMocks();
    mode = 'mock';
    purchaseEnabled = true;
    rpc.mockResolvedValue({
      data: { source: 'mock', status: 'recorded', transactionId },
      error: null,
    });
  });
  it('off returns disabled without a DB call', async () => {
    mode = 'disabled';
    expect(await service.capture(ORDER, OWNER)).toEqual({
      source: 'none',
      status: 'disabled',
    });
    expect(getClient).not.toHaveBeenCalled();
  });
  it('unavailable blocks before a DB call', async () => {
    mode = 'unavailable';
    await expect(service.capture(ORDER, OWNER)).rejects.toThrow(
      'PURCHASE_CAPTURE_BLOCKED',
    );
    expect(getClient).not.toHaveBeenCalled();
  });
  it('purchase subflag off prevents capture even when funnel collection is on', async () => {
    purchaseEnabled = false;
    expect(await service.capture(ORDER, OWNER)).toEqual({
      source: 'none',
      status: 'disabled',
    });
    expect(getClient).not.toHaveBeenCalled();
  });
  it('only sends trusted references/consent to the RPC, strips extra result fields', async () => {
    rpc.mockResolvedValue({
      data: {
        source: 'mock',
        status: 'recorded',
        transactionId,
        email: 'PRIVATE',
      },
      error: null,
    });
    expect(await service.capture(ORDER, OWNER)).toEqual({
      source: 'mock',
      status: 'recorded',
      transactionId,
    });
    expect(rpc).toHaveBeenCalledWith('integration_record_purchase_mock', {
      p_order_id: ORDER,
      p_actor_id: OWNER,
      p_consent: true,
    });
  });
  it.each(['recorded', 'duplicate'])(
    'returns a valid %s receipt',
    async (status) => {
      rpc.mockResolvedValue({
        data: { source: 'mock', status, transactionId },
        error: null,
      });
      expect((await service.capture(ORDER, OWNER)).status).toBe(status);
    },
  );
  it('ineligible never returns a transaction', async () => {
    rpc.mockResolvedValue({
      data: {
        source: 'mock',
        status: 'not_eligible',
        transactionId,
        email: 'PRIVATE',
      },
      error: null,
    });
    expect(await service.capture(ORDER, OWNER)).toEqual({
      source: 'mock',
      status: 'not_eligible',
    });
  });
  it.each([
    ['PT404', 'PURCHASE_NOT_FOUND'],
    ['PT409', 'PURCHASE_CONFLICT'],
    ['PT422', 'PURCHASE_SNAPSHOT_INVALID'],
    ['PT429', 'PURCHASE_QUOTA_EXCEEDED'],
    ['PGRST202', 'PURCHASE_FOUNDATION_NOT_READY'],
    ['42P01', 'PURCHASE_FOUNDATION_NOT_READY'],
    ['OTHER', 'PURCHASE_CAPTURE_UNAVAILABLE'],
  ])('sanitizes database error %s', async (code, message) => {
    rpc.mockResolvedValue({
      data: null,
      error: { code, message: 'PRIVATE secret/URL' },
    });
    await expect(service.capture(ORDER, OWNER)).rejects.toThrow(message);
  });
  it('sanitizes transport failure without retrying the RPC', async () => {
    rpc.mockRejectedValue(new Error('PRIVATE token'));
    await expect(service.capture(ORDER, OWNER)).rejects.toThrow(
      'PURCHASE_CAPTURE_UNAVAILABLE',
    );
    expect(rpc).toHaveBeenCalledTimes(1);
  });
  it.each([
    null,
    {},
    { source: 'production', status: 'recorded', transactionId },
    { source: 'mock', status: 'recorded', transactionId: 'PRIVATE' },
  ])('rejects malformed response %j', async (data) => {
    rpc.mockResolvedValue({ data, error: null });
    await expect(service.capture(ORDER, OWNER)).rejects.toThrow(
      'PURCHASE_CAPTURE_UNAVAILABLE',
    );
  });
});

describe('Purchase capture HTTP authorization and DTO', () => {
  let app: INestApplication, server: Server;
  const rpc = jest.fn((_name: string, args: { p_actor_id: string }) =>
    Promise.resolve(
      args.p_actor_id === OWNER
        ? {
            data: { source: 'mock', status: 'recorded', transactionId },
            error: null,
          }
        : { data: null, error: { code: 'PT404', message: 'PRIVATE' } },
    ),
  );
  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [AnalyticsModule],
    })
      .overrideProvider(ConfigService)
      .useValue(
        new ConfigService({
          NODE_ENV: 'test',
          FEATURE_GA4_ENABLED: 'true',
          FEATURE_GA4_PURCHASE_ENABLED: 'true',
        }),
      )
      .overrideProvider(SupabaseService)
      .useValue({
        getClient: () => ({
          rpc,
          auth: {
            getUser: (token: string) =>
              Promise.resolve({
                data: { user: { id: token === 'owner' ? OWNER : OTHER } },
                error: null,
              }),
          },
          from: () => ({
            select: () => ({
              eq: () => ({
                single: () =>
                  Promise.resolve({
                    data: { role: 'CUSTOMER', is_banned: false },
                    error: null,
                  }),
              }),
            }),
          }),
        }),
      })
      .overrideProvider(AnalyticsService)
      .useValue({})
      .compile();
    app = module.createNestApplication({ logger: false });
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
    server = app.getHttpServer() as Server;
  });
  afterAll(async () => {
    await app.close();
  });
  beforeEach(() => rpc.mockClear());
  it('guest cannot capture by knowing an order UUID', async () => {
    await request(server)
      .post('/analytics/purchases/' + ORDER)
      .send({ consent: 'granted' })
      .expect(401);
    expect(rpc).not.toHaveBeenCalled();
  });
  it('another authenticated owner gets a concealed 404', async () => {
    await request(server)
      .post('/analytics/purchases/' + ORDER)
      .set('Authorization', 'Bearer other')
      .send({ consent: 'granted' })
      .expect(404);
  });
  it.each([
    {},
    { consent: 'denied' },
    { consent: 'granted', total: 1 },
    { consent: 'granted', payment_status: 'paid' },
  ])('rejects missing consent or forged body %j', async (body) => {
    await request(server)
      .post('/analytics/purchases/' + ORDER)
      .set('Authorization', 'Bearer owner')
      .send(body)
      .expect(400);
    expect(rpc).not.toHaveBeenCalled();
  });
  it('rejects an invalid order reference', async () => {
    await request(server)
      .post('/analytics/purchases/invalid')
      .set('Authorization', 'Bearer owner')
      .send({ consent: 'granted' })
      .expect(400);
    expect(rpc).not.toHaveBeenCalled();
  });
  it('uses verified actor ID and returns no-store safe receipt', async () => {
    const res = await request(server)
      .post('/analytics/purchases/' + ORDER)
      .set('Authorization', 'Bearer owner')
      .send({ consent: 'granted' })
      .expect(201);
    expect(res.body).toEqual({
      source: 'mock',
      status: 'recorded',
      transactionId,
    });
    expect(res.headers['cache-control']).toBe('no-store');
    expect(rpc).toHaveBeenCalledWith('integration_record_purchase_mock', {
      p_order_id: ORDER,
      p_actor_id: OWNER,
      p_consent: true,
    });
  });
});
