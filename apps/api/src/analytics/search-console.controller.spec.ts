import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import type { INestApplication } from '@nestjs/common';
import type { Server } from 'node:http';
import request from 'supertest';
import { AnalyticsModule } from './analytics.module';
import { SupabaseService } from '../supabase/supabase.service';
import { AnalyticsService } from './analytics.service';

describe('Search Console HTTP RBAC with synthetic auth only', () => {
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
  it.each(['summary', 'sync'])('rejects guests for %s', async (action) => {
    const call =
      action === 'sync'
        ? request(server)
            .post('/admin/seo/search-console/sync')
            .send({ source: 'mock' })
        : request(server).get('/admin/seo/search-console/summary');
    await call.expect(401);
  });
  it.each(['STAFF', 'CUSTOMER', 'BANNED'])(
    'rejects %s for both read and mutation',
    async (role) => {
      await request(server)
        .get('/admin/seo/search-console/summary')
        .set('Authorization', 'Bearer ' + role)
        .expect(403);
      await request(server)
        .post('/admin/seo/search-console/sync')
        .set('Authorization', 'Bearer ' + role)
        .send({ source: 'mock' })
        .expect(403);
    },
  );
  it.each([
    {},
    { source: 'live' },
    { source: 'mock', property: 'https://attacker.invalid' },
    { source: 'mock', token: 'secret' },
  ])('rejects malformed input %j', async (body) => {
    await request(server)
      .post('/admin/seo/search-console/sync')
      .set('Authorization', 'Bearer ADMIN')
      .send(body)
      .expect(400);
  });
  it('ADMIN sees empty no-store data then performs explicit mock sync without changing revenue source', async () => {
    const before = await request(server)
      .get('/admin/seo/search-console/summary')
      .set('Authorization', 'Bearer ADMIN')
      .expect(200);
    expect((before.body as { lastSyncedAt: unknown }).lastSyncedAt).toBeNull();
    expect(before.headers['cache-control']).toBe('no-store');
    const sync = await request(server)
      .post('/admin/seo/search-console/sync')
      .set('Authorization', 'Bearer ADMIN')
      .send({ source: 'mock' })
      .expect(201);
    expect(sync.headers['cache-control']).toBe('no-store');
    expect(sync.body).toMatchObject({
      mode: 'mock',
      source: 'mock',
      schedulerEnabled: false,
      persistence: 'process_memory',
    });
    expect((sync.body as { daily: unknown[] }).daily).toHaveLength(14);
    const dashboard = await request(server)
      .get('/analytics/dashboard')
      .set('Authorization', 'Bearer ADMIN')
      .expect(200);
    expect(dashboard.body).toEqual({ source: 'internal_db' });
  });
});
