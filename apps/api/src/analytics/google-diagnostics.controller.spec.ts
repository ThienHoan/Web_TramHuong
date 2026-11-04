import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import type { INestApplication } from '@nestjs/common';
import type { Server } from 'node:http';
import request from 'supertest';
import { AnalyticsModule } from './analytics.module';
import { SupabaseService } from '../supabase/supabase.service';
import { AnalyticsService } from './analytics.service';

describe('Google diagnostics HTTP guards and disabled defaults', () => {
  let app: INestApplication, server: Server;
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
  it.each(['CUSTOMER', 'STAFF', 'BANNED'])(
    'rejects %s for both endpoints',
    async (role) => {
      await request(server)
        .get('/admin/integrations/google/status')
        .set('Authorization', 'Bearer ' + role)
        .expect(403);
      await request(server)
        .post('/admin/integrations/google/diagnose')
        .set('Authorization', 'Bearer ' + role)
        .send({ provider: 'ga4' })
        .expect(403);
    },
  );
  it('rejects guests', async () => {
    await request(server).get('/admin/integrations/google/status').expect(401);
    await request(server)
      .post('/admin/integrations/google/diagnose')
      .send({ provider: 'ga4' })
      .expect(401);
  });
  it('ADMIN sees safe missing config, default disabled POST does not call Google', async () => {
    const result = await request(server)
      .get('/admin/integrations/google/status')
      .set('Authorization', 'Bearer ADMIN')
      .expect(200);
    expect(result.headers['cache-control']).toBe('no-store');
    expect(result.body).toMatchObject({
      source: 'configuration',
      reportsIngested: false,
      schedulerEnabled: false,
    });
    const data = result.body as { providers: { ready: boolean }[] };
    expect(data.providers.every((p) => !p.ready)).toBe(true);
    await request(server)
      .post('/admin/integrations/google/diagnose')
      .set('Authorization', 'Bearer ADMIN')
      .send({ provider: 'ga4' })
      .expect(503);
  });
  it.each([
    {},
    { provider: 'unknown' },
    { provider: 'ga4', url: 'https://other.invalid' },
    { provider: 'ga4', secret: 'private' },
    { provider: 'pagespeed', strategy: 'tablet' },
  ])('rejects invalid intent %j', async (body) => {
    await request(server)
      .post('/admin/integrations/google/diagnose')
      .set('Authorization', 'Bearer ADMIN')
      .send(body)
      .expect(400);
  });
});
