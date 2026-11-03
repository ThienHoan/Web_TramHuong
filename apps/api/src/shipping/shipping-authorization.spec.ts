import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { Server } from 'node:http';
import { ShippingAdminController } from './operations.controller';
import { LogisticsRepository } from './logistics.repository';
import { FulfillmentService } from './fulfillment.service';
import { ShippingOperationsService } from './operations.service';
import { ShippingTrackingService } from './tracking.service';
import { ShippingJobs } from './shipping.jobs';
import { ShippingQuoteService } from './quote.service';
import { SupabaseService } from '../supabase/supabase.service';
describe('logistics admin authorization and DTO boundary', () => {
  let app: INestApplication, server: Server;
  const list = jest
    .fn()
    .mockResolvedValue({ data: [], total: 0, page: 1, limit: 20 });
  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [ShippingAdminController],
      providers: [
        { provide: LogisticsRepository, useValue: { list } },
        { provide: FulfillmentService, useValue: {} },
        {
          provide: ShippingOperationsService,
          useValue: {
            admin: (user: { role: string }) => {
              if (user.role !== 'ADMIN') throw new Error('not admin');
            },
          },
        },
        { provide: ShippingTrackingService, useValue: {} },
        { provide: ShippingJobs, useValue: {} },
        { provide: ShippingQuoteService, useValue: {} },
        {
          provide: SupabaseService,
          useValue: {
            getClient: () => ({
              auth: {
                getUser: (token: string) =>
                  Promise.resolve({
                    data: {
                      user: { id: 'fixture', email: 'test@example.invalid' },
                    },
                    error: token === 'invalid' ? {} : null,
                  }),
              },
              from: () => ({
                select: () => ({
                  eq: () => ({
                    single: () =>
                      Promise.resolve({
                        data: { role: currentRole, is_banned: banned },
                        error: null,
                      }),
                  }),
                }),
              }),
            }),
          },
        },
      ],
    }).compile();
    app = module.createNestApplication();
    app.useLogger(false);
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
  let currentRole = 'ADMIN',
    banned = false;
  beforeEach(() => {
    currentRole = 'ADMIN';
    banned = false;
    list.mockClear();
  });
  afterAll(async () => {
    await app.close();
  });
  it('rejects a guest', async () => {
    await request(server).get('/admin/shipping').expect(401);
    expect(list).not.toHaveBeenCalled();
  });
  it.each(['CUSTOMER', 'ADMIN', 'STAFF'])('enforces role %s', async (role) => {
    currentRole = role;
    await request(server)
      .get('/admin/shipping')
      .set('Authorization', 'Bearer fixture')
      .expect(role === 'CUSTOMER' ? 403 : 200);
  });
  it('rejects a banned admin', async () => {
    banned = true;
    await request(server)
      .get('/admin/shipping')
      .set('Authorization', 'Bearer fixture')
      .expect(403);
  });
  it('denies staff financial mutation and configuration', async () => {
    currentRole = 'STAFF';
    await request(server)
      .post('/admin/shipping/cod/00000000-0000-4000-8000-000000000001')
      .set('Authorization', 'Bearer fixture')
      .send({})
      .expect(403);
    await request(server)
      .post('/admin/shipping/configure')
      .set('Authorization', 'Bearer fixture')
      .send({})
      .expect(403);
  });
  it('rejects arbitrary kind, invalid pagination and browser-injected provider URLs', async () => {
    for (const query of [
      'kind=quote',
      'limit=0',
      'page=-1',
      'url=https://attacker.invalid',
    ])
      await request(server)
        .get(`/admin/shipping?${query}`)
        .set('Authorization', 'Bearer fixture')
        .expect(400);
    expect(list).not.toHaveBeenCalled();
  });
});
