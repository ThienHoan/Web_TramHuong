import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import type { INestApplication } from '@nestjs/common';
import type { Server } from 'node:http';
import request from 'supertest';
import { MerchantModule } from './merchant.module';
import { ProductsService } from '../products/products.service';
import { SupabaseService } from '../supabase/supabase.service';
import { StorageService } from '../storage/storage.service';
import { CacheModule } from '@nestjs/cache-manager';

describe('Merchant existing module HTTP guards and mock-only contract', () => {
  let app: INestApplication, server: Server;
  const findAll = jest.fn().mockResolvedValue({ data: [] });
  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [CacheModule.register({ isGlobal: true }), MerchantModule],
    })
      .overrideProvider(ConfigService)
      .useValue(
        new ConfigService({
          NODE_ENV: 'test',
          FEATURE_MERCHANT_SYNC_ENABLED: 'true',
        }),
      )
      .overrideProvider(ProductsService)
      .useValue({ findAll })
      .overrideProvider(StorageService)
      .useValue({})
      .overrideProvider(SupabaseService)
      .useValue({
        getClient: () => ({
          auth: {
            getUser: (token: string) =>
              Promise.resolve({
                data: {
                  user: ['ADMIN', 'STAFF', 'CUSTOMER', 'BANNED'].includes(token)
                    ? { id: token }
                    : null,
                },
                error: null,
              }),
          },
          from: (table: string) => {
            if (table !== 'users') throw new Error('DATABASE_FORBIDDEN');
            return {
              select: () => ({
                eq: (_key: string, id: string) => ({
                  single: () =>
                    Promise.resolve({
                      data: { role: id, is_banned: id === 'BANNED' },
                      error: null,
                    }),
                }),
              }),
            };
          },
        }),
      })
      .compile();
    app = module.createNestApplication({ logger: false });
    await app.listen(0, '127.0.0.1');
    server = app.getHttpServer() as Server;
  });
  afterAll(async () => {
    if (app) await app.close();
  });
  beforeEach(() => findAll.mockClear());

  it.each(['', 'INVALID', 'STAFF', 'CUSTOMER', 'BANNED'])(
    'denies unauthorized caller %s for status and sync',
    async (role) => {
      for (const method of ['get', 'post'] as const) {
        const call =
          method === 'get'
            ? request(server).get('/merchant/sync-status')
            : request(server).post('/merchant/sync').send({ source: 'mock' });
        if (role) call.set('Authorization', `Bearer ${role}`);
        await call.expect(['', 'INVALID'].includes(role) ? 401 : 403);
      }
      expect(findAll).not.toHaveBeenCalled();
    },
  );

  it.each([
    {},
    { source: 'live' },
    { source: 'mock', accountId: '123' },
    { source: 'mock', force: true },
    { source: 'mock', products: [] },
  ])('rejects ambiguous/extra-field intent %j', async (body) => {
    await request(server)
      .post('/merchant/sync')
      .set('Authorization', 'Bearer ADMIN')
      .send(body)
      .expect(400);
    expect(findAll).not.toHaveBeenCalled();
  });

  it('returns truthful no-store status without catalog access, then explicit empty mock preview', async () => {
    const status = await request(server)
      .get('/merchant/sync-status')
      .set('Authorization', 'Bearer ADMIN')
      .expect(200);
    expect(status.headers['cache-control']).toBe('no-store');
    expect(status.body).toMatchObject({
      mode: 'mock',
      apiVersion: 'products/v1',
      liveAvailable: false,
      schedulerEnabled: false,
    });
    expect(findAll).not.toHaveBeenCalled();
    const preview = await request(server)
      .post('/merchant/sync')
      .set('Authorization', 'Bearer ADMIN')
      .send({ source: 'mock' })
      .expect(201);
    expect(preview.headers['cache-control']).toBe('no-store');
    expect(preview.body).toMatchObject({
      result: 'preview',
      synced: false,
      source: 'mock',
      items: [],
      candidateCount: 0,
    });
    expect(findAll).toHaveBeenCalledTimes(1);
  });

  it.each(['', 'INVALID', 'STAFF', 'CUSTOMER', 'BANNED'])(
    'denies %s for queue/reconcile/drain',
    async (role) => {
      for (const [route, body] of [
        [
          'queue',
          {
            source: 'mock',
            productIds: ['00000000-0000-4000-8000-000000000001'],
          },
        ],
        ['reconcile', { source: 'mock', page: 1 }],
        ['drain', { source: 'mock' }],
      ] as const) {
        const call = request(server)
          .post('/merchant/' + route)
          .send(body);
        if (role) call.set('Authorization', 'Bearer ' + role);
        await call.expect(['', 'INVALID'].includes(role) ? 401 : 403);
      }
      expect(findAll).not.toHaveBeenCalled();
    },
  );
  it.each([
    { source: 'mock', productIds: [] },
    { source: 'live', productIds: [] },
    { source: 'mock', productIds: ['bad'] },
    {
      source: 'mock',
      productIds: ['00000000-0000-4000-8000-000000000001'],
      price: 1,
    },
  ])('strictly rejects invalid queue intent %j', async (body) => {
    await request(server)
      .post('/merchant/queue')
      .set('Authorization', 'Bearer ADMIN')
      .send(body)
      .expect(400);
  });
  it('does not let an existing preview flag activate the new durable worker', async () => {
    await request(server)
      .post('/merchant/queue')
      .set('Authorization', 'Bearer ADMIN')
      .send({
        source: 'mock',
        productIds: ['00000000-0000-4000-8000-000000000001'],
      })
      .expect(503);
    await request(server)
      .post('/merchant/drain')
      .set('Authorization', 'Bearer ADMIN')
      .send({ source: 'mock' })
      .expect(503);
    expect(findAll).not.toHaveBeenCalled();
  });
});
