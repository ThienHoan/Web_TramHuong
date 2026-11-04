import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import type { INestApplication } from '@nestjs/common';
import type { Server } from 'node:http';
import request from 'supertest';
import { AnalyticsModule } from './analytics.module';
import { SupabaseService } from '../supabase/supabase.service';
import { AnalyticsService } from './analytics.service';

describe('PageSpeed HTTP authorization and strict intent', () => {
  let app: INestApplication, server: Server;
  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [AnalyticsModule],
    })
      .overrideProvider(ConfigService)
      .useValue(
        new ConfigService({
          NODE_ENV: 'test',
          FEATURE_PAGESPEED_AUDIT_ENABLED: 'true',
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
  const intent = { source: 'mock', targetId: 'home_vi', strategy: 'mobile' };
  it.each(['summary', 'audits'])('rejects guests for %s', async (action) => {
    const call =
      action === 'summary'
        ? request(server).get('/admin/seo/pagespeed/summary')
        : request(server).post('/admin/seo/pagespeed/audits').send(intent);
    await call.expect(401);
  });
  it.each(['STAFF', 'CUSTOMER', 'BANNED'])(
    'rejects %s for read and audit',
    async (role) => {
      await request(server)
        .get('/admin/seo/pagespeed/summary')
        .set('Authorization', 'Bearer ' + role)
        .expect(403);
      await request(server)
        .post('/admin/seo/pagespeed/audits')
        .set('Authorization', 'Bearer ' + role)
        .send(intent)
        .expect(403);
    },
  );
  it.each([
    {},
    { ...intent, source: 'live' },
    { ...intent, strategy: 'tablet' },
    { ...intent, targetId: '/checkout' },
    { ...intent, url: 'http://127.0.0.1' },
    { ...intent, force: true },
    { ...intent, key: 'RAW_ERROR_SENTINEL' },
  ])('rejects invalid body %j', async (body) => {
    await request(server)
      .post('/admin/seo/pagespeed/audits')
      .set('Authorization', 'Bearer ADMIN')
      .send(body)
      .expect(400);
  });
  it('reads empty state, records audit, then hits cache; revenue source is unchanged', async () => {
    const before = await request(server)
      .get('/admin/seo/pagespeed/summary')
      .set('Authorization', 'Bearer ADMIN')
      .expect(200);
    expect(before.headers['cache-control']).toBe('no-store');
    expect(
      (before.body as { reports: { latest: unknown }[] }).reports.every(
        (r) => r.latest === null,
      ),
    ).toBe(true);
    const first = await request(server)
      .post('/admin/seo/pagespeed/audits')
      .set('Authorization', 'Bearer ADMIN')
      .send(intent)
      .expect(201);
    expect(first.headers['cache-control']).toBe('no-store');
    expect(first.body).toMatchObject({
      mode: 'mock',
      source: 'mock',
      result: 'recorded',
      schedulerEnabled: false,
      persistence: 'process_memory',
    });
    const second = await request(server)
      .post('/admin/seo/pagespeed/audits')
      .set('Authorization', 'Bearer ADMIN')
      .send(intent)
      .expect(201);
    expect(second.body).toMatchObject({ result: 'cached' });
    const report = (
      second.body as {
        reports: { targetId: string; strategy: string; history: unknown[] }[];
      }
    ).reports.find((r) => r.targetId === 'home_vi' && r.strategy === 'mobile')!;
    expect(report.history).toHaveLength(1);
    await request(server)
      .get('/analytics/dashboard')
      .set('Authorization', 'Bearer ADMIN')
      .expect(200, { source: 'internal_db' });
  });
});
