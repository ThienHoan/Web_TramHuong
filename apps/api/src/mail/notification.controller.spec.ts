import { Test } from '@nestjs/testing';
import { MailerService } from '@nestjs-modules/mailer';
import { ConfigService } from '@nestjs/config';
import type { INestApplication } from '@nestjs/common';
import type { Server } from 'node:http';
import request from 'supertest';
import { MailModule } from './mail.module';
import { SupabaseService } from '../supabase/supabase.service';

const id = '00000000-0000-4000-8000-000000000001';
describe('notification ADMIN HTTP references, history privacy and mock-only intent', () => {
  let app: INestApplication, server: Server;
  const sendMail = jest.fn();
  const rpc = jest.fn((name: string) =>
    Promise.resolve({
      data:
        name === 'integration_claim'
          ? []
          : [
                'integration_reconcile_notifications_mock',
                'integration_reconcile_shipment_notifications_mock',
              ].includes(name)
            ? {
                source: 'mock',
                persistence: 'database',
                ...(name === 'integration_reconcile_notifications_mock'
                  ? { processedOrders: 0 }
                  : { processedShipments: 0 }),
                limit: 20,
                hasMore: false,
                nextCursor: null,
                items: [],
              }
            : { source: 'mock', status: 'recorded', id, state: 'QUEUED' },
      error: null,
    }),
  );
  const historyReads = jest.fn<void, [string]>();
  beforeAll(async () => {
    const module = await Test.createTestingModule({ imports: [MailModule] })
      .overrideProvider(ConfigService)
      .useValue(
        new ConfigService({
          NODE_ENV: 'test',
          FEATURE_RESEND_ENABLED: 'true',
          FEATURE_NOTIFICATION_OUTBOX_ENABLED: 'true',
        }),
      )
      .overrideProvider(MailerService)
      .useValue({ sendMail })
      .overrideProvider(SupabaseService)
      .useValue({
        getClient: () => ({
          rpc,
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
            if (table === 'users')
              return {
                select: () => ({
                  eq: (_key: string, role: string) => ({
                    single: () =>
                      Promise.resolve({
                        data: { role, is_banned: role === 'BANNED' },
                        error: null,
                      }),
                  }),
                }),
              };
            if (table !== 'integration_outbox')
              throw new Error('DATABASE_FORBIDDEN');
            const chain = {
              select: (columns: string) => {
                historyReads(columns);
                return chain;
              },
              eq: () => chain,
              in: () => chain,
              order: () => chain,
              range: () =>
                Promise.resolve({
                  error: null,
                  data: Array.from({ length: 21 }, () => ({
                    id,
                    event_type: 'payment_success',
                    state: 'ACCEPTED',
                    attempts: 1,
                    last_error_code: null,
                    created_at: '2026-11-05T00:00:00Z',
                    updated_at: '2026-11-05T00:00:00Z',
                    payload: { to: 'PRIVATE_RECIPIENT' },
                    to: 'PRIVATE_RECIPIENT',
                  })),
                }),
            };
            return chain;
          },
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
  beforeEach(() => {
    rpc.mockClear();
    historyReads.mockClear();
    sendMail.mockClear();
  });
  const capture = { source: 'mock', orderId: id, event: 'payment_success' };
  it.each(['', 'INVALID', 'STAFF', 'CUSTOMER', 'BANNED'])(
    'denies caller %s before private queue access',
    async (role) => {
      for (const action of [
        'capture',
        'drain',
        'deliveries',
        'reconcile',
        'reconcile-shipments',
      ]) {
        const call =
          action === 'deliveries'
            ? request(server).get('/admin/notifications/deliveries')
            : request(server)
                .post('/admin/notifications/' + action)
                .send(action === 'capture' ? capture : { source: 'mock' });
        if (role) call.set('Authorization', 'Bearer ' + role);
        await call.expect(['', 'INVALID'].includes(role) ? 401 : 403);
      }
      expect(rpc).not.toHaveBeenCalled();
      expect(historyReads).not.toHaveBeenCalled();
    },
  );
  it.each([
    {},
    { ...capture, source: 'live' },
    { ...capture, to: 'new@example.invalid' },
    { ...capture, event: 'admin_new_order' },
    { ...capture, orderId: 'bad-id' },
    { ...capture, html: '<p>bad</p>' },
  ])('rejects caller supplied content or ambiguous intent %j', async (body) => {
    await request(server)
      .post('/admin/notifications/capture')
      .set('Authorization', 'Bearer ADMIN')
      .send(body)
      .expect(400);
    expect(rpc).not.toHaveBeenCalled();
  });
  it.each(['0', '-1', 'bad', '1.5', '1001'])(
    'rejects invalid page %s',
    async (page) => {
      await request(server)
        .get('/admin/notifications/deliveries?page=' + page)
        .set('Authorization', 'Bearer ADMIN')
        .expect(400);
      expect(historyReads).not.toHaveBeenCalled();
    },
  );
  it.each([
    {},
    { source: 'live' },
    { source: 'mock', afterId: 'bad' },
    { source: 'mock', afterId: null },
    { source: 'mock', limit: 1000 },
    { source: 'mock', to: 'private@example.invalid' },
  ])('rejects invalid reconciliation intent %j', async (body) => {
    await request(server)
      .post('/admin/notifications/reconcile')
      .set('Authorization', 'Bearer ADMIN')
      .send(body)
      .expect(400);
    expect(rpc).not.toHaveBeenCalled();
  });
  it('runs one bounded reconciliation page without caller-selected content or SMTP', async () => {
    const result = await request(server)
      .post('/admin/notifications/reconcile')
      .set('Authorization', 'Bearer ADMIN')
      .send({ source: 'mock', afterId: id })
      .expect(201);
    expect(result.headers['cache-control']).toBe('no-store');
    expect(result.body).toMatchObject({
      processedOrders: 0,
      hasMore: false,
      nextCursor: null,
      items: [],
    });
    expect(rpc).toHaveBeenCalledWith(
      'integration_reconcile_notifications_mock',
      { p_after_id: id, p_limit: 20 },
    );
    expect(sendMail).not.toHaveBeenCalled();
  });
  it('reconciles one shipment page through the existing ADMIN mock policy', async () => {
    const result = await request(server)
      .post('/admin/notifications/reconcile-shipments')
      .set('Authorization', 'Bearer ADMIN')
      .send({ source: 'mock' })
      .expect(201);
    expect(result.headers['cache-control']).toBe('no-store');
    expect(result.body).toMatchObject({
      processedShipments: 0,
      hasMore: false,
      nextCursor: null,
    });
    expect(rpc).toHaveBeenCalledWith(
      'integration_reconcile_shipment_notifications_mock',
      { p_limit: 20 },
    );
    expect(sendMail).not.toHaveBeenCalled();
  });
  it('captures only source references, reads projected history and drains mock queue without SMTP', async () => {
    const accepted = await request(server)
      .post('/admin/notifications/capture')
      .set('Authorization', 'Bearer ADMIN')
      .send(capture)
      .expect(201);
    expect(accepted.headers['cache-control']).toBe('no-store');
    expect(rpc).toHaveBeenCalledWith('integration_capture_notification_mock', {
      p_order_id: id,
      p_event: 'payment_success',
    });
    const history = await request(server)
      .get('/admin/notifications/deliveries?page=2')
      .set('Authorization', 'Bearer ADMIN')
      .expect(200);
    expect(history.headers['cache-control']).toBe('no-store');
    expect(history.body).toMatchObject({
      page: 2,
      limit: 20,
      hasMore: true,
      source: 'mock',
      deliveredMetric: null,
    });
    expect((history.body as { rows: unknown[] }).rows).toHaveLength(20);
    expect(JSON.stringify(history.body)).not.toContain('PRIVATE_RECIPIENT');
    expect(historyReads.mock.calls[0][0]).not.toContain('payload');
    const drained = await request(server)
      .post('/admin/notifications/drain')
      .set('Authorization', 'Bearer ADMIN')
      .send({ source: 'mock' })
      .expect(201);
    expect(drained.body).toMatchObject({
      source: 'mock',
      delivered: false,
      claimed: 0,
      accepted: 0,
    });
    expect(sendMail).not.toHaveBeenCalled();
  });
});
