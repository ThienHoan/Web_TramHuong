import { Test } from '@nestjs/testing';
import { CacheModule } from '@nestjs/cache-manager';
import { ConfigService } from '@nestjs/config';
import type { INestApplication } from '@nestjs/common';
import type { Server } from 'node:http';
import request from 'supertest';
import { ChatModule } from './chat.module';
import { ChatService } from './chat.service';
import { ProductsService } from '../products/products.service';
import { StorageService } from '../storage/storage.service';
import { SupabaseService } from '../supabase/supabase.service';

describe('public advisor strict HTTP contract through existing ChatModule', () => {
  let app: INestApplication, server: Server;
  const findAll = jest.fn().mockResolvedValue({ data: [] });
  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [CacheModule.register({ isGlobal: true }), ChatModule],
    })
      .overrideProvider(ConfigService)
      .useValue(new ConfigService({ NODE_ENV: 'test' }))
      .overrideProvider(ChatService)
      .useValue({})
      .overrideProvider(ProductsService)
      .useValue({ findAll })
      .overrideProvider(StorageService)
      .useValue({})
      .overrideProvider(SupabaseService)
      .useValue({
        getClient: () => {
          throw new Error('NO_DB_OR_PROVIDER_ACCESS');
        },
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
  const intent = { query: 'vong tay', locale: 'vi' };

  it.each([
    {},
    { ...intent, locale: 'fr' },
    { ...intent, query: {} },
    { ...intent, query: 'x'.repeat(121) },
    { ...intent, query: 'x' },
    { ...intent, minPrice: -1 },
    { ...intent, minPrice: '10' },
    { ...intent, maxPrice: 1.5 },
    { ...intent, categoryId: 'private/../' },
    { ...intent, minPrice: 100, maxPrice: 1 },
    { ...intent, source: 'live' },
    { ...intent, history: [] },
    { ...intent, email: 'pii@example.invalid' },
  ])('rejects invalid input before accessing catalog %j', async (body) => {
    await request(server).post('/ai/product-advisor').send(body).expect(400);
    expect(findAll).not.toHaveBeenCalled();
  });

  it('offers a public no-store catalog fallback with no fabricated empty results', async () => {
    const result = await request(server)
      .post('/ai/product-advisor')
      .send(intent)
      .expect(201);
    expect(result.headers['cache-control']).toBe('no-store');
    expect(result.body).toMatchObject({
      source: 'catalog',
      searchEngine: 'bounded_keyword',
      result: 'no_match',
      recommendations: [],
      liveModelAvailable: false,
    });
    expect(findAll).toHaveBeenCalledTimes(1);
  });
});
