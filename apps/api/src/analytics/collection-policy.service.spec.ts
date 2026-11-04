import { ConfigService } from '@nestjs/config';
import { CollectionPolicyService } from './collection-policy.service';
import { loadIntegrationRegistry } from '../integrations/integrations.config';
import { AnalyticsController } from './analytics.controller';
import { IS_PUBLIC_KEY } from '../auth/public.decorator';
import { ROLES_KEY } from '../auth/roles.decorator';
import { Role } from '../auth/role.enum';
import { Test } from '@nestjs/testing';
import { AnalyticsModule } from './analytics.module';
import { AnalyticsService } from './analytics.service';
import { SupabaseService } from '../supabase/supabase.service';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { Server } from 'node:http';

describe('GA4 collection policy', () => {
  it('defaults purchase off independently from the funnel flag', () => {
    const config = new ConfigService({
      NODE_ENV: 'test',
      FEATURE_GA4_ENABLED: 'true',
    });
    expect(
      new CollectionPolicyService(
        loadIntegrationRegistry(config),
        config,
      ).isPurchaseEnabled(),
    ).toBe(false);
  });
  it('enables purchase only with its own opt-in in mock', () => {
    const config = new ConfigService({
      NODE_ENV: 'test',
      FEATURE_GA4_ENABLED: 'true',
      FEATURE_GA4_PURCHASE_ENABLED: 'true',
    });
    expect(
      new CollectionPolicyService(
        loadIntegrationRegistry(config),
        config,
      ).isPurchaseEnabled(),
    ).toBe(true);
  });
  it('validates the subflag without leaking the supplied value', () => {
    const config = new ConfigService({
      FEATURE_GA4_PURCHASE_ENABLED: 'PRIVATE',
    });
    expect(
      () =>
        new CollectionPolicyService(loadIntegrationRegistry(config), config),
    ).toThrow('FEATURE_GA4_PURCHASE_ENABLED must be true or false');
  });
  it.each([
    [{}, 'production', 'disabled'],
    [{ FEATURE_GA4_ENABLED: 'true' }, 'test', 'mock'],
    [{ FEATURE_GA4_ENABLED: 'true' }, 'development', 'mock'],
    [{ FEATURE_GA4_ENABLED: 'true' }, 'production', 'unavailable'],
    [{ FEATURE_GA4_ENABLED: 'true' }, '', 'unavailable'],
    [
      { FEATURE_GA4_ENABLED: 'true', INTEGRATIONS_ENV: 'staging' },
      'test',
      'unavailable',
    ],
    [
      { FEATURE_GA4_ENABLED: 'true', INTEGRATIONS_ENV: 'production' },
      'test',
      'unavailable',
    ],
    [
      { FEATURE_GA4_ENABLED: 'true', INTEGRATIONS_KILL_SWITCH: 'true' },
      'test',
      'disabled',
    ],
  ])('returns only safe public mode for %j / %s', (values, env, mode) => {
    const registry = loadIntegrationRegistry(new ConfigService(values));
    const service = new CollectionPolicyService(
      registry,
      new ConfigService({ NODE_ENV: env, SECRET: 'never expose' }),
    );
    expect(service.getPolicy()).toEqual({ mode, purchaseEnabled: false });
  });
  it('exposes public policy without making the revenue dashboard public', () => {
    expect(
      Reflect.getMetadata(
        IS_PUBLIC_KEY,
        Object.getOwnPropertyDescriptor(
          AnalyticsController.prototype,
          'getCollectionPolicy',
        )!.value as object,
      ),
    ).toBe(true);
    expect(
      Reflect.getMetadata(
        IS_PUBLIC_KEY,
        Object.getOwnPropertyDescriptor(
          AnalyticsController.prototype,
          'getDashboardData',
        )!.value as object,
      ),
    ).toBeUndefined();
    expect(
      Reflect.getMetadata(
        ROLES_KEY,
        Object.getOwnPropertyDescriptor(
          AnalyticsController.prototype,
          'getDashboardData',
        )!.value as object,
      ),
    ).toEqual([Role.ADMIN]);
  });
});

describe('Analytics HTTP policy and existing dashboard authorization', () => {
  let app: INestApplication;
  let server: Server;
  const dashboard = jest
    .fn()
    .mockResolvedValue({ source: 'internal_db_fixture' });
  const getClient = jest.fn(() => ({
    auth: {
      getUser: (token: string) =>
        Promise.resolve({ data: { user: { id: token } }, error: null }),
    },
    from: () => ({
      select: () => ({
        eq: (_field: string, id: string) => ({
          single: () =>
            Promise.resolve({
              data: { role: id, is_banned: false },
              error: null,
            }),
        }),
      }),
    }),
  }));
  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [AnalyticsModule],
    })
      .overrideProvider(ConfigService)
      .useValue(
        new ConfigService({ NODE_ENV: 'test', FEATURE_GA4_ENABLED: 'true' }),
      )
      .overrideProvider(SupabaseService)
      .useValue({ getClient })
      .overrideProvider(AnalyticsService)
      .useValue({ getDashboardData: dashboard })
      .compile();
    app = module.createNestApplication({ logger: false });
    await app.init();
    server = app.getHttpServer() as Server;
  });
  afterAll(async () => {
    await app.close();
  });
  beforeEach(() => {
    jest.clearAllMocks();
  });
  it('public policy does not query the DB or expose registry/credentials', async () => {
    const response = await request(server)
      .get('/analytics/collection-policy')
      .expect(200);
    expect(response.body).toEqual({ mode: 'mock', purchaseEnabled: false });
    expect(response.headers['cache-control']).toBe('no-store');
    expect(getClient).not.toHaveBeenCalled();
  });
  it('keeps dashboard unauthorized without auth', async () => {
    await request(server).get('/analytics/dashboard').expect(401);
    expect(dashboard).not.toHaveBeenCalled();
  });
  it('keeps customer access forbidden', async () => {
    await request(server)
      .get('/analytics/dashboard')
      .set('Authorization', 'Bearer CUSTOMER')
      .expect(403);
    expect(dashboard).not.toHaveBeenCalled();
  });
  it('retains admin dashboard from internal DB source', async () => {
    const response = await request(server)
      .get('/analytics/dashboard')
      .set('Authorization', 'Bearer ADMIN')
      .expect(200);
    expect(response.body).toEqual({ source: 'internal_db_fixture' });
  });
});
