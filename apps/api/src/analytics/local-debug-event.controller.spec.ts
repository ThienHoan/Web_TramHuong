import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import type { INestApplication } from '@nestjs/common';
import type { Server } from 'node:http';
import request from 'supertest';
import { AnalyticsModule } from './analytics.module';
import { SupabaseService } from '../supabase/supabase.service';
import { LocalDebugEventService } from './local-debug-event.service';
import { loadIntegrationRegistry } from '../integrations/integrations.config';
import { AnalyticsService } from './analytics.service';

describe('Local GA4 test HTTP guards and consent', () => {
  let app: INestApplication, server: Server;
  const funnelConfig = new ConfigService({
    NODE_ENV: 'test',
    FEATURE_GA4_ENABLED: 'true',
    FEATURE_GA4_LOCAL_BROWSER_TEST_ENABLED: 'true',
    FEATURE_GA4_LOCAL_FUNNEL_ENABLED: 'true',
    GA4_LOCAL_TEST_ORIGIN: 'http://localhost:4400',
    GA4_MEASUREMENT_ID: 'G-XJNSBPN8HN',
    GA4_API_SECRET: 'PRIVATE_TEST_SECRET',
  });
  const transport = jest
    .fn<ReturnType<typeof fetch>, Parameters<typeof fetch>>()
    .mockImplementation(() =>
      Promise.resolve(new Response(null, { status: 204 })),
    );
  const realService = new LocalDebugEventService(
    funnelConfig,
    loadIntegrationRegistry(funnelConfig),
    transport,
  );
  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [AnalyticsModule],
    })
      .overrideProvider(ConfigService)
      .useValue(
        new ConfigService({
          NODE_ENV: 'test',
          FEATURE_SEARCH_CONSOLE_SYNC_ENABLED: 'true',
        }),
      )
      .overrideProvider(LocalDebugEventService)
      .useValue({
        policy: () => undefined,
        sendFunnel: realService.sendFunnel.bind(realService),
        send: () => ({ status: 'accepted', ingestionVerified: false }),
      })
      .overrideProvider(AnalyticsService)
      .useValue({ getDashboardData: () => ({ source: 'internal_db' }) })
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
  afterAll(async () => app.close());
  const body = {
    consent: 'granted',
    action: 'manual_test',
    eventId: '10000000-0000-4000-8000-000000000001',
    clientId: '123.456',
    sessionId: 123,
  };
  it.each(['CUSTOMER', 'STAFF', 'BANNED'])('rejects %s', async (role) => {
    await request(server)
      .post('/analytics/local-debug-event')
      .set('Authorization', 'Bearer ' + role)
      .send(body)
      .expect(403);
  });
  it('rejects guests', async () => {
    await request(server)
      .post('/analytics/local-debug-event')
      .send(body)
      .expect(401);
  });
  it.each([
    { ...body, consent: 'denied' },
    { ...body, action: 'purchase' },
    { ...body, email: 'private@example.org' },
    { ...body, orderId: 'fake' },
    { ...body, clientId: 'email@example.org' },
    {},
  ])('rejects invalid body %j', async (invalid) => {
    await request(server)
      .post('/analytics/local-debug-event')
      .set('Authorization', 'Bearer ADMIN')
      .send(invalid)
      .expect(400);
  });
  it('allows only strict ADMIN intent with no-store', async () => {
    const result = await request(server)
      .post('/analytics/local-debug-event')
      .set('Authorization', 'Bearer ADMIN')
      .set('Origin', 'http://localhost:4400')
      .send(body)
      .expect(201);
    expect(result.headers['cache-control']).toBe('no-store');
    expect(result.body).toMatchObject({
      status: 'accepted',
      ingestionVerified: false,
    });
  });
  const funnelBody = {
    consent: 'granted',
    eventId: '20000000-0000-4000-8000-000000000001',
    clientId: '123.456',
    sessionId: 123,
    name: 'add_to_cart',
    parameters: {
      currency: 'VND',
      value: 100,
      items: [{ item_id: 'SKU_A', price: 100, quantity: 1 }],
    },
  };
  it.each(['CUSTOMER', 'STAFF', 'BANNED', ''])(
    'funnel denies non-ADMIN %s',
    async (role) => {
      const req = request(server).post('/analytics/local-debug-event/funnel');
      if (role) req.set('Authorization', 'Bearer ' + role);
      await req.send(funnelBody).expect(role ? 403 : 401);
    },
  );
  it.each([
    { ...funnelBody, email: 'private@example.org' },
    { ...funnelBody, name: 'purchase' },
    { ...funnelBody, consent: 'denied' },
    {
      ...funnelBody,
      parameters: {
        ...funnelBody.parameters,
        page_location: '/?token=private',
      },
    },
    {
      ...funnelBody,
      parameters: {
        ...funnelBody.parameters,
        items: [
          {
            item_id: 'SKU_A',
            price: 100,
            quantity: 1,
            email: 'private@example.org',
          },
        ],
      },
    },
    { ...funnelBody, parameters: null },
  ])('funnel rejects unsafe HTTP intent before Google %j', async (body) => {
    const before = transport.mock.calls.length;
    await request(server)
      .post('/analytics/local-debug-event/funnel')
      .set('Authorization', 'Bearer ADMIN')
      .set('Origin', 'http://localhost:4400')
      .send(body)
      .expect(400);
    expect(transport.mock.calls.length).toBe(before);
  });
  it('funnel enforces Origin then forwards one canonical ADMIN request', async () => {
    await request(server)
      .post('/analytics/local-debug-event/funnel')
      .set('Authorization', 'Bearer ADMIN')
      .send(funnelBody)
      .expect(403);
    const response = await request(server)
      .post('/analytics/local-debug-event/funnel')
      .set('Authorization', 'Bearer ADMIN')
      .set('Origin', 'http://localhost:4400')
      .send(funnelBody)
      .expect(201);
    expect(response.headers['cache-control']).toBe('no-store');
    expect(response.body).toMatchObject({ status: 'accepted' });
    expect(transport).toHaveBeenCalledTimes(1);
  });
});
