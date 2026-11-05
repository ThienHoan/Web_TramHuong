import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import type { INestApplication } from '@nestjs/common';
import type { Server } from 'node:http';
import request from 'supertest';
import { IntegrationsModule } from './integrations.module';
import { IntegrationHealthService } from './integration-health.service';
import {
  INTEGRATION_DEFINITIONS,
  loadIntegrationRegistry,
} from './integrations.config';
import { SupabaseService } from '../supabase/supabase.service';

describe('integration health truthfulness and scope', () => {
  const config = new ConfigService({
    NODE_ENV: 'test',
    FEATURE_RESEND_ENABLED: 'true',
    GHN_ENABLED: 'true',
    GHN_ENV: 'staging',
    RESEND_API_KEY: 'SECRET_SENTINEL',
  });
  const health = new IntegrationHealthService(
    loadIntegrationRegistry(config),
    config,
  );

  it('reports exactly the eleven providers, configuration versus evidence and unknown metrics', () => {
    const snapshot = health.snapshot();
    expect(snapshot).toMatchObject({
      source: 'configuration_and_documented_evidence',
      probesPerformed: false,
      releaseReady: false,
      financialSource: 'internal_database',
    });
    expect(snapshot.providers.map((p) => p.provider).sort()).toEqual(
      ['ghn', ...Object.keys(INTEGRATION_DEFINITIONS)].sort(),
    );
    for (const provider of snapshot.providers) {
      expect(provider.metrics).toEqual({
        available: false,
        lastSuccessAt: null,
        lastErrorCode: null,
        failRate: null,
        quotaMetric: null,
        quotaUsed: null,
        quotaLimit: null,
        quotaAlert: null,
        backlog: null,
        inflight: null,
        liveUsage: null,
        estimatedMonthlySpend: null,
      });
      expect(provider.liveReadiness).toBe('not_certified');
      expect(provider.blockers.length).toBeGreaterThan(0);
    }
    expect(
      snapshot.providers.find((p) => p.provider === 'resend'),
    ).toMatchObject({ mode: 'mock', implementation: 'mock', fallback: 'smtp' });
    expect(JSON.stringify(snapshot)).not.toContain('SECRET_SENTINEL');
    expect(JSON.stringify(snapshot)).not.toContain('RESEND_API_KEY');
  });

  it('identifies legacy flag coverage separately from a disabled new policy', () => {
    const providers = health.snapshot().providers;
    for (const provider of ['google', 'cloudinary']) {
      expect(providers.find((p) => p.provider === provider)).toMatchObject({
        mode: 'disabled',
        legacyPathOutsideRegistry: true,
      });
    }
    expect(providers.find((p) => p.provider === 'gemini')).toMatchObject({
      mode: 'disabled',
      legacyPathOutsideRegistry: false,
    });
    expect(providers.find((p) => p.provider === 'ghn')).toMatchObject({
      mode: 'existing_shipping_policy',
      implementation: 'reused',
    });
  });

  it('respects kill and staging mode without translating them into live health', () => {
    for (const [overrides, mode] of [
      [{ INTEGRATIONS_KILL_SWITCH: 'true' }, 'disabled'],
      [{ INTEGRATIONS_ENV: 'staging' }, 'blocked'],
    ] as const) {
      const config = new ConfigService({
        FEATURE_RESEND_ENABLED: 'true',
        ...overrides,
      });
      const snapshot = new IntegrationHealthService(
        loadIntegrationRegistry(config),
        config,
      ).snapshot();
      expect(
        snapshot.providers.find((p) => p.provider === 'resend')?.mode,
      ).toBe(mode);
      expect(snapshot.releaseReady).toBe(false);
    }
  });

  it('returns detached evidence so a caller cannot mutate later readiness', () => {
    health
      .snapshot()
      .providers.find((p) => p.provider === 'resend')!.blockers.length = 0;
    expect(
      health.snapshot().providers.find((p) => p.provider === 'resend')!.blockers
        .length,
    ).toBeGreaterThan(0);
  });
});

describe('integration health real HTTP authorization', () => {
  let app: INestApplication, server: Server;
  const from = jest.fn((table: string) => {
    if (table !== 'users') throw new Error('INTEGRATION_DATA_READ_FORBIDDEN');
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
  });
  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [IntegrationsModule],
    })
      .overrideProvider(ConfigService)
      .useValue(new ConfigService({ NODE_ENV: 'test' }))
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
          from,
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
  beforeEach(() => from.mockClear());

  it.each(['', 'INVALID', 'STAFF', 'CUSTOMER', 'BANNED'])(
    'denies %s',
    async (role) => {
      const call = request(server).get('/integrations/admin/health');
      if (role) call.set('Authorization', `Bearer ${role}`);
      await call.expect(['', 'INVALID'].includes(role) ? 401 : 403);
    },
  );

  it('allows admin/no-store with only existing auth lookup and no integration data probe', async () => {
    const result = await request(server)
      .get('/integrations/admin/health')
      .set('Authorization', 'Bearer ADMIN')
      .expect(200);
    expect(result.headers['cache-control']).toBe('no-store');
    expect(result.body).toMatchObject({
      releaseReady: false,
      probesPerformed: false,
    });
    expect((result.body as { providers: unknown[] }).providers).toHaveLength(
      11,
    );
    expect(from.mock.calls).toEqual([['users']]);
  });
});
