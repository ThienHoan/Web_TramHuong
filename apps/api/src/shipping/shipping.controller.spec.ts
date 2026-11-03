import { INestApplication, ValidationPipe } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { Server } from 'node:http';
import { ShippingModule } from './shipping.module';
import { GHN_CONFIG, loadGhnConfig } from './ghn/ghn.config';
import { GHN_FETCH } from './ghn/ghn.client';
import { SupabaseService } from '../supabase/supabase.service';

describe('shipping API isolated integration (disabled, no DB or external IO)', () => {
  let app: INestApplication;
  let server: Server;
  const fetcher = jest.fn();

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [
        ConfigModule,
        CacheModule.register({ isGlobal: true }),
        ShippingModule,
      ],
    })
      .overrideProvider(SupabaseService)
      .useValue({ getClient: jest.fn() })
      .overrideProvider('SUPABASE_CLIENT')
      .useValue({})
      .overrideProvider(GHN_CONFIG)
      .useValue(loadGhnConfig({ get: () => undefined }))
      .overrideProvider(GHN_FETCH)
      .useValue(fetcher)
      .compile();
    app = module.createNestApplication();
    app.useLogger(false);
    app.setGlobalPrefix('api');
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
    await app?.close();
  });

  it('reports safe disabled status without exposing config or enabling checkout', async () => {
    const result = await request(server)
      .get('/api/shipping/status')
      .expect(200);
    expect(result.body).toEqual({
      enabled: false,
      provider: 'ghn',
      checkoutEnabled: false,
    });
  });
  it.each([
    '/api/shipping/addresses/provinces',
    '/api/shipping/addresses/wards?provinceId=1000001',
    '/api/shipping/addresses/legacy/provinces',
    '/api/shipping/addresses/legacy/districts?provinceId=202',
    '/api/shipping/addresses/legacy/wards?districtId=1444',
  ])('returns a clear disabled error without network: %s', async (path) => {
    const result = await request(server).get(path).expect(503);
    expect((result.body as { error: string }).error).toBe('SHIPPING_DISABLED');
    expect(fetcher).not.toHaveBeenCalled();
  });
  it.each([
    '/api/shipping/addresses/wards',
    '/api/shipping/addresses/wards?provinceId=0',
    '/api/shipping/addresses/wards?provinceId=1.5',
    '/api/shipping/addresses/legacy/wards?districtId=-1',
    '/api/shipping/addresses/legacy/districts?provinceId=202&url=https://other.test',
  ])('validates query and rejects arbitrary proxy inputs: %s', async (path) => {
    await request(server).get(path).expect(400);
    expect(fetcher).not.toHaveBeenCalled();
  });
  it('requires district for legacy addresses', async () => {
    await request(server)
      .post('/api/shipping/addresses/validate')
      .send({ scheme: 'legacy', provinceId: 202, wardCode: '00308' })
      .expect(400);
  });
  it('refuses non-GHN schemes or browser-supplied names', async () => {
    await request(server)
      .post('/api/shipping/addresses/validate')
      .send({
        scheme: 'other',
        provinceId: 202,
        wardCode: '00308',
        provinceName: 'Untrusted',
      })
      .expect(400);
  });
  it.each(['create', 'cancel', 'update', 'sepay-webhook'])(
    'has no public shipping mutation %s',
    async (action) => {
      await request(server)
        .post(`/api/shipping/${action}`)
        .send({})
        .expect(404);
      expect(fetcher).not.toHaveBeenCalled();
    },
  );
});
