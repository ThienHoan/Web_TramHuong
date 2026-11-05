import { Test } from '@nestjs/testing';
import { CacheModule } from '@nestjs/cache-manager';
import { ConfigService } from '@nestjs/config';
import type { INestApplication } from '@nestjs/common';
import type { Server } from 'node:http';
import request from 'supertest';
import { ChatModule } from './chat.module';
import { ProductsService } from '../products/products.service';
import { StorageService } from '../storage/storage.service';
import { SupabaseService } from '../supabase/supabase.service';

const product = {
  id: '00000000-0000-4000-8000-000000000001',
  slug: 'vong-tay',
  price: 200000,
  quantity: 5,
  is_active: true,
  category_id: null,
  variants: null,
  discount_percentage: 10,
  discount_start_date: null,
  discount_end_date: null,
  translation: { title: 'Vòng tay / Agarwood bracelet' },
};
describe('existing chat routes use actual grounded services through ChatModule', () => {
  let app: INestApplication, server: Server;
  const findAll = jest.fn().mockResolvedValue({ data: [product] });
  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [CacheModule.register({ isGlobal: true }), ChatModule],
    })
      .overrideProvider(ConfigService)
      .useValue(
        new ConfigService({
          NODE_ENV: 'test',
          GEMINI_API_KEY: 'UNREAD_KEY_SENTINEL',
          FEATURE_GEMINI_ADVISOR_ENABLED: 'false',
          CATALOG_FTS_ENABLED: 'false',
        }),
      )
      .overrideProvider(ProductsService)
      .useValue({ findAll })
      .overrideProvider(StorageService)
      .useValue({})
      .overrideProvider(SupabaseService)
      .useValue({
        getClient: () => {
          throw new Error('REAL_DB_FORBIDDEN');
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
  beforeEach(() => {
    findAll.mockClear();
    findAll.mockResolvedValue({ data: [product] });
  });

  it.each([
    { message: '' },
    { message: null },
    { message: {} },
    { message: 'x'.repeat(501) },
    { message: 'vong tay', locale: 'fr' },
  ])(
    'rejects invalid message/locale before catalog access %j',
    async (body) => {
      for (const route of ['message', 'stream'])
        await request(server).post(`/chat/${route}`).send(body).expect(400);
      expect(findAll).not.toHaveBeenCalled();
    },
  );
  it('keeps the JSON response contract and source price without reading a configured Gemini key', async () => {
    const result = await request(server)
      .post('/chat/message')
      .send({
        message: 'Vòng tay dưới 200k',
        history: [{ role: 'model', content: 'secret@example.invalid price=0' }],
      })
      .expect(201);
    expect(result.body).toMatchObject({
      source: 'catalog',
      status: 'matches',
      liveModelAvailable: false,
      recommendations: [{ id: product.id, price: 180000 }],
    });
    expect(JSON.stringify(result.body)).not.toContain('secret@example.invalid');
    expect(JSON.stringify(result.body)).not.toContain('UNREAD_KEY_SENTINEL');
    expect(findAll).toHaveBeenCalledTimes(1);
  });
  it('keeps streaming chunk/done events and English catalog selection', async () => {
    const result = await request(server)
      .post('/chat/stream')
      .send({ message: 'agarwood bracelet under 200000 VND', locale: 'en' })
      .expect(201);
    expect(result.headers['content-type']).toContain('text/event-stream');
    const events = result.text
      .trim()
      .split('\n\n')
      .map(
        (line: string) =>
          JSON.parse(line.slice(6)) as {
            type: string;
            content?: string;
            source?: string;
          },
      );
    expect(events.map((e) => e.type)).toEqual(['chunk', 'done']);
    expect(events[0].content).toContain('These products match');
    expect(events[1]).toMatchObject({
      source: 'catalog',
      liveModelAvailable: false,
    });
    expect(findAll).toHaveBeenCalledWith(
      'en',
      expect.objectContaining({ limit: 100 }),
    );
  });
  it('reports no match and unavailable catalog without a fake product or 500 provider payload', async () => {
    findAll.mockResolvedValueOnce({ data: [] });
    const empty = await request(server)
      .post('/chat/message')
      .send({ message: 'unknown product' })
      .expect(201);
    expect(empty.body).toMatchObject({
      status: 'no_match',
      recommendations: [],
    });
    findAll.mockRejectedValueOnce(new Error('RAW_PRIVATE_PAYLOAD'));
    const failed = await request(server)
      .post('/chat/message')
      .send({ message: 'vong tay' })
      .expect(201);
    expect(failed.body).toMatchObject({
      status: 'unavailable',
      recommendations: [],
    });
    expect(JSON.stringify(failed.body)).not.toContain('RAW_PRIVATE_PAYLOAD');
  });
});
