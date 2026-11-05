import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe, type INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { Server } from 'node:http';
import { AutomationController } from './automation.controller';
import { AutomationGuard } from './automation.guard';
import { AutomationRepository, parseEvent } from './automation.repository';
import { SupabaseService } from '../supabase/supabase.service';

const ID = '20000000-0000-4000-8000-000000000001';
const LEASE = '20000000-0000-4000-8000-000000000002';
const TOKEN = 'a'.repeat(43);
describe('operations automation boundary', () => {
  let app: INestApplication<Server>;
  let enabled: string, token: string;
  const claim = jest.fn(),
    finish = jest.fn(),
    ready = jest.fn();
  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [AutomationController],
      providers: [
        AutomationGuard,
        {
          provide: ConfigService,
          useValue: {
            get: (name: string) =>
              name === 'AUTOMATION_ENABLED' ? enabled : token,
          },
        },
        { provide: AutomationRepository, useValue: { claim, finish, ready } },
      ],
    }).compile();
    app = module.createNestApplication({ logger: false });
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.listen(0, '127.0.0.1');
  });
  beforeEach(() => {
    enabled = 'true';
    token = TOKEN;
    jest.clearAllMocks();
  });
  afterAll(async () => {
    await app.close();
  });
  it('public liveness exposes no config or database query', async () => {
    enabled = 'false';
    const r = await request(app.getHttpServer())
      .get('/api/automation/live')
      .expect(200);
    expect(r.body).toEqual({ status: 'ok' });
    expect(ready).not.toHaveBeenCalled();
    expect(r.headers['cache-control']).toBe('no-store');
  });
  it('disabled routes do not touch the queue', async () => {
    enabled = 'false';
    await request(app.getHttpServer())
      .post('/api/automation/events/claim')
      .set('Authorization', 'Bearer ' + TOKEN)
      .send({})
      .expect(404);
    expect(claim).not.toHaveBeenCalled();
  });
  it.each(['', 'Bearer wrong', 'Bearer ' + TOKEN + 'x', 'Basic ' + TOKEN])(
    'rejects invalid token %s',
    async (header) => {
      await request(app.getHttpServer())
        .post('/api/automation/events/claim')
        .set('Authorization', header)
        .send({})
        .expect(401);
      expect(claim).not.toHaveBeenCalled();
    },
  );
  it('short configured token fails closed', async () => {
    token = 'short';
    await request(app.getHttpServer())
      .get('/api/automation/ready')
      .set('Authorization', 'Bearer ' + TOKEN)
      .expect(401);
  });
  it('machine token can read readiness without a user session', async () => {
    ready.mockResolvedValue({ status: 'ok', database: 'reachable' });
    const r = await request(app.getHttpServer())
      .get('/api/automation/ready')
      .set('Authorization', 'Bearer ' + TOKEN)
      .expect(200);
    expect(r.body).toEqual({ status: 'ok', database: 'reachable' });
  });
  it('finishes only the owned event with a fixed outcome', async () => {
    finish.mockResolvedValue({ id: ID, state: 'CAPTURED' });
    await request(app.getHttpServer())
      .post('/api/automation/events/finish')
      .set('Authorization', 'Bearer ' + TOKEN)
      .send({ id: ID, leaseToken: LEASE, outcome: 'CAPTURED' })
      .expect(201);
    expect(finish).toHaveBeenCalledWith(ID, LEASE, 'CAPTURED');
  });
  it.each([
    { id: 'bad', leaseToken: LEASE, outcome: 'ACCEPTED' },
    { id: ID, leaseToken: LEASE, outcome: 'QUEUED' },
    {
      id: ID,
      leaseToken: LEASE,
      outcome: 'ACCEPTED',
      email: 'private@example.invalid',
    },
  ])('rejects malformed or expanded finish input', async (body) => {
    await request(app.getHttpServer())
      .post('/api/automation/events/finish')
      .set('Authorization', 'Bearer ' + TOKEN)
      .send(body)
      .expect(400);
    expect(finish).not.toHaveBeenCalled();
  });
  it('parses a strict projection and drops all customer fields', () => {
    const event = {
      id: ID,
      kind: 'contact.created',
      sourceId: ID,
      leaseToken: LEASE,
      createdAt: '2026-11-06T00:00:00Z',
    };
    expect(
      parseEvent({
        ...event,
        email: 'secret',
        message: 'private',
        shipping_info: { phone: 'private' },
      }),
    ).toEqual({ ...event, createdAt: '2026-11-06T00:00:00.000Z' });
    expect(() => parseEvent({ ...event, kind: 'payment.force' })).toThrow(
      'AUTOMATION_INVALID_EVENT',
    );
  });
  it('maps DB conflicts without leaking provider errors', async () => {
    const rpc = jest.fn().mockResolvedValue({
      data: null,
      error: { code: 'PT409', message: 'secret' },
    });
    const repo = new AutomationRepository({
      getClient: () => ({ rpc }),
    } as unknown as SupabaseService);
    await expect(repo.finish(ID, LEASE, 'ACCEPTED')).rejects.toThrow(
      'AUTOMATION_LEASE_CONFLICT',
    );
    rpc.mockResolvedValue({ data: null, error: { message: 'private key' } });
    await expect(repo.claim()).rejects.toThrow('AUTOMATION_STORE_UNAVAILABLE');
  });
});
