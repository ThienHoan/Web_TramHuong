import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import type { INestApplication } from '@nestjs/common';
import type { Server } from 'node:http';
import request from 'supertest';
import { AnalyticsModule } from './analytics.module';
import { SupabaseService } from '../supabase/supabase.service';
import { AnalyticsService } from './analytics.service';

// Real AnalyticsModule DI with the PageSpeed persistence flag; synthetic auth/rpc.
async function boot(flags: Record<string, string>, store: 'missing' | 'empty') {
  const rpc = jest.fn((name: string) => ({
    abortSignal: () =>
      Promise.resolve(
        store === 'missing' || name !== 'seo_pagespeed_read_mock'
          ? {
              data: null,
              error: { code: 'PGRST202', message: 'private detail' },
            }
          : { data: { source: 'mock', reports: [] }, error: null },
      ),
  }));
  const module = await Test.createTestingModule({ imports: [AnalyticsModule] })
    .overrideProvider(ConfigService)
    .useValue(
      new ConfigService({
        NODE_ENV: 'test',
        FEATURE_PAGESPEED_AUDIT_ENABLED: 'true',
        ...flags,
      }),
    )
    .overrideProvider(AnalyticsService)
    .useValue({ getDashboardData: () => ({ source: 'internal_db' }) })
    .overrideProvider(SupabaseService)
    .useValue({
      getClient: () => ({
        rpc,
        auth: {
          getUser: (token: string) =>
            Promise.resolve({
              data: { user: token === 'ADMIN' ? { id: token } : null },
              error: null,
            }),
        },
        from: () => ({
          select: () => ({
            eq: () => ({
              single: () =>
                Promise.resolve({
                  data: { role: 'ADMIN', is_banned: false },
                  error: null,
                }),
            }),
          }),
        }),
      }),
    })
    .compile();
  const app = module.createNestApplication({ logger: false });
  await app.listen(0, '127.0.0.1');
  return { app, server: app.getHttpServer() as Server, rpc };
}

describe('PageSpeed persistence flag over HTTP', () => {
  let app: INestApplication | undefined;
  afterEach(async () => {
    await app?.close();
    app = undefined;
  });
  it('missing/paused store: GET and POST fail closed with 503 and no private detail', async () => {
    const booted = await boot(
      { FEATURE_PAGESPEED_PERSISTENCE_ENABLED: 'true' },
      'missing',
    );
    app = booted.app;
    const get = await request(booted.server)
      .get('/admin/seo/pagespeed/summary')
      .set('Authorization', 'Bearer ADMIN')
      .expect(503);
    expect(JSON.stringify(get.body)).not.toContain('private detail');
    expect(JSON.stringify(get.body)).toContain('PAGESPEED_STORAGE_UNAVAILABLE');
    const post = await request(booted.server)
      .post('/admin/seo/pagespeed/audits')
      .set('Authorization', 'Bearer ADMIN')
      .send({ source: 'mock', targetId: 'home_vi', strategy: 'mobile' })
      .expect(503);
    expect(JSON.stringify(post.body)).toContain(
      'PAGESPEED_STORAGE_UNAVAILABLE',
    );
    expect(booted.rpc.mock.calls.map(([name]) => name)).toEqual([
      'seo_pagespeed_read_mock',
      'seo_pagespeed_begin_mock',
    ]);
  });
  it('installed empty store reports database persistence without any audit', async () => {
    const booted = await boot(
      { FEATURE_PAGESPEED_PERSISTENCE_ENABLED: 'true' },
      'empty',
    );
    app = booted.app;
    const res = await request(booted.server)
      .get('/admin/seo/pagespeed/summary')
      .set('Authorization', 'Bearer ADMIN')
      .expect(200);
    expect(res.headers['cache-control']).toBe('no-store');
    expect(res.body).toMatchObject({ persistence: 'database', running: false });
    expect(booted.rpc.mock.calls.map(([name]) => name)).toEqual([
      'seo_pagespeed_read_mock',
    ]);
  });
  it('flag off keeps RAM behaviour and never calls the store', async () => {
    const booted = await boot({}, 'missing');
    app = booted.app;
    const res = await request(booted.server)
      .get('/admin/seo/pagespeed/summary')
      .set('Authorization', 'Bearer ADMIN')
      .expect(200);
    expect(res.body).toMatchObject({ persistence: 'process_memory' });
    expect(booted.rpc).not.toHaveBeenCalled();
  });
  it('an invalid flag value stops startup', async () => {
    await expect(
      boot({ FEATURE_PAGESPEED_PERSISTENCE_ENABLED: 'yes' }, 'empty'),
    ).rejects.toThrow(
      'FEATURE_PAGESPEED_PERSISTENCE_ENABLED must be true or false',
    );
  });
});
