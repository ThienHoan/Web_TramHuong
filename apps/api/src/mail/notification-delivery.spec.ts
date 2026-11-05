import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { loadIntegrationRegistry } from '../integrations/integrations.config';
import {
  IntegrationExecutor,
  IntegrationFailure,
} from '../integrations/integration-executor';
import { IntegrationRepository } from '../integrations/integration.repository';
import { MockDeliveryConsumer } from '../integrations/mock-delivery.consumer';
import { MockResendEmailProvider } from './mock-resend-email.provider';
import {
  NotificationDeliveryService,
  renderNotification,
} from './notification-delivery.service';
import {
  NotificationRepository,
  validNotificationMail,
} from './notification.repository';
import { MailService } from './mail.service';
import type { IntegrationOutboxRow } from '../integrations/integration-database.types';

const id = '00000000-0000-4000-8000-000000000001';
const row = {
  id,
  provider: 'resend',
  environment: 'mock',
  event_type: 'payment_success',
  operation_kind: 'mutation',
  state: 'WORKING',
  lease_token: id,
  version: 2,
  dedupe_key: 'fixture-key',
  payload: { orderId: id },
} as IntegrationOutboxRow;
const mail = {
  to: 'customer@example.invalid',
  subject: 'Synthetic notice',
  template: 'payment-success' as const,
  context: { id, total: 100000 },
};
function setup(
  values: Record<string, string> = {
    FEATURE_RESEND_ENABLED: 'true',
    FEATURE_NOTIFICATION_OUTBOX_ENABLED: 'true',
    NODE_ENV: 'test',
  },
) {
  const config = new ConfigService(values),
    registry = loadIntegrationRegistry(config);
  const repo = {
    capture: jest.fn().mockResolvedValue({
      source: 'mock',
      status: 'recorded',
      id,
      state: 'QUEUED',
    }),
    resolve: jest.fn().mockResolvedValue(mail),
    list: jest
      .fn()
      .mockResolvedValue({ rows: [], source: 'mock', persistence: 'database' }),
  };
  const usage = {
    claimMock: jest.fn().mockResolvedValue([row]),
    reserveMockUsage: jest.fn().mockResolvedValue({ used: 1 }),
    finish: jest.fn().mockResolvedValue(undefined),
  };
  const simulate = jest.fn<Promise<void>, [AbortSignal]>().mockResolvedValue();
  const consumer = new MockDeliveryConsumer(
    registry,
    usage as unknown as IntegrationRepository,
  );
  const provider = new MockResendEmailProvider(
    registry,
    new IntegrationExecutor(registry),
    'test',
    simulate,
  );
  const service = new NotificationDeliveryService(
    registry,
    config,
    repo as unknown as NotificationRepository,
    consumer,
    provider,
    usage as unknown as IntegrationRepository,
  );
  return { service, repo, usage, simulate, config, provider };
}
describe('notification outbox policy/worker and SMTP compatibility', () => {
  beforeEach(() => {
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
  });
  afterEach(() => jest.restoreAllMocks());
  it.each([
    {},
    { FEATURE_NOTIFICATION_OUTBOX_ENABLED: 'true', NODE_ENV: 'test' },
    {
      FEATURE_NOTIFICATION_OUTBOX_ENABLED: 'true',
      FEATURE_RESEND_ENABLED: 'true',
      NODE_ENV: 'production',
    },
    {
      FEATURE_NOTIFICATION_OUTBOX_ENABLED: 'true',
      FEATURE_RESEND_ENABLED: 'true',
      NODE_ENV: 'test',
      INTEGRATIONS_KILL_SWITCH: 'true',
    },
    {
      FEATURE_NOTIFICATION_OUTBOX_ENABLED: 'true',
      FEATURE_RESEND_ENABLED: 'true',
      NODE_ENV: 'test',
      INTEGRATIONS_ENV: 'staging',
    },
  ])('blocks capture/send for policy %j', async (values) => {
    const { service, repo, simulate, usage } = setup(values);
    await expect(service.capture(id, 'payment_success')).rejects.toThrow(
      'NOT_EXECUTABLE',
    );
    await expect(service.drain()).rejects.toThrow('NOT_EXECUTABLE');
    await expect(service.reconcile()).rejects.toThrow('NOT_EXECUTABLE');
    await expect(service.reconcileShipments()).rejects.toThrow(
      'NOT_EXECUTABLE',
    );
    expect(repo.capture).not.toHaveBeenCalled();
    expect(usage.claimMock).not.toHaveBeenCalled();
    expect(simulate).not.toHaveBeenCalled();
  });
  it('rejects malformed flag without printing value', () => {
    expect(() =>
      setup({ FEATURE_NOTIFICATION_OUTBOX_ENABLED: 'SECRET' }),
    ).toThrow('FEATURE_NOTIFICATION_OUTBOX_ENABLED must be true or false');
  });
  it('resolves source, renders existing template, reserves requests/emails and only marks accepted', async () => {
    const { service, usage, simulate } = setup();
    expect(await service.drain()).toMatchObject({
      source: 'mock',
      accepted: 1,
      delivered: false,
    });
    expect(simulate).toHaveBeenCalledTimes(1);
    expect(usage.reserveMockUsage).toHaveBeenCalledWith(
      'resend',
      100,
      'emails',
    );
    expect(usage.finish).toHaveBeenCalledWith(row, 'ACCEPTED', undefined);
  });
  it('leaves ambiguous delivery UNKNOWN without resending or fallback', async () => {
    const { service, simulate, usage } = setup();
    simulate.mockRejectedValue(new Error('PRIVATE_PROVIDER_PAYLOAD'));
    expect(await service.drain()).toMatchObject({ accepted: 0, failed: 1 });
    expect(usage.finish).toHaveBeenCalledWith(row, 'UNKNOWN', 'UNAVAILABLE');
    expect(simulate).toHaveBeenCalledTimes(1);
  });
  it('refuses changed/stale source before any simulated provider call', async () => {
    const { service, repo, simulate, usage } = setup();
    repo.resolve.mockRejectedValue(new IntegrationFailure('REJECTED'));
    await service.drain();
    expect(simulate).not.toHaveBeenCalled();
    expect(usage.finish).toHaveBeenCalledWith(row, 'DEAD', 'REJECTED');
  });
  it('stops before sending when durable email quota is exhausted', async () => {
    const { service, usage, simulate } = setup();
    usage.reserveMockUsage
      .mockResolvedValueOnce({ used: 1 })
      .mockRejectedValueOnce(new IntegrationFailure('QUOTA_EXCEEDED'));
    await service.drain();
    expect(simulate).not.toHaveBeenCalled();
    expect(usage.finish).toHaveBeenCalledWith(row, 'DEAD', 'QUOTA_EXCEEDED');
  });
  it('does not re-invoke a provider after a finish CAS conflict', async () => {
    const { service, simulate, usage } = setup();
    usage.finish.mockRejectedValue(new Error('CAS_CONFLICT'));
    expect(await service.drain()).toMatchObject({ conflicts: 1, accepted: 0 });
    expect(simulate).toHaveBeenCalledTimes(1);
  });
  it('retains existing SMTP default with the new flag off', async () => {
    const { service, config, repo } = setup({ NODE_ENV: 'test' });
    const send = jest.fn().mockResolvedValue({
      source: 'smtp',
      outcome: 'accepted',
      delivered: false,
    });
    await new MailService({ send }, config, service).sendPaymentSuccess({
      id,
      total: 1,
      items: [],
      shipping_info: { email: 'fixture@example.invalid' },
      status: 'PAID',
    });
    expect(send).toHaveBeenCalledTimes(1);
    expect(repo.capture).not.toHaveBeenCalled();
  });
  it('hooks capture by reference and suppresses SMTP/admin mail in opt-in mock mode even on failure', async () => {
    const { service, config, repo } = setup();
    const send = jest.fn();
    repo.capture.mockRejectedValue(new Error('SECRET_ERROR'));
    const existing = new MailService({ send }, config, service);
    const order = {
      id,
      total: 1,
      items: [],
      shipping_info: { email: 'forged@example.invalid' },
      status: 'PAID',
    };
    await existing.sendPaymentSuccess(order);
    await existing.sendAdminAlert(order);
    expect(repo.capture).toHaveBeenCalledWith(id, 'payment_success');
    expect(send).not.toHaveBeenCalled();
    expect(
      JSON.stringify((Logger.prototype.error as jest.Mock).mock.calls),
    ).not.toContain('SECRET_ERROR');
  });
  it('supports old status template helpers and escapes customer-sourced item text', () => {
    const html = renderNotification({
      ...mail,
      template: 'order-status',
      context: {
        id,
        total: 1,
        status: 'SHIPPED',
        items: [{ title: '<script>bad()</script>', price: 1, quantity: 1 }],
      },
    });
    expect(html).toContain('on its way');
    const confirmation = renderNotification({
      ...mail,
      template: 'order-confirmation',
      context: {
        id,
        total: 1,
        items: [{ title: '<script>bad()</script>', price: 1, quantity: 1 }],
      },
    });
    expect(confirmation).not.toContain('<script>');
    expect(confirmation).toContain('&lt;script&gt;');
  });
  it.each([
    { ...mail, to: 'bad\nheader@example.invalid' },
    { ...mail, template: '../private' },
    { ...mail, context: { ...mail.context, total: -1 } },
  ])('rejects invalid source mail %j', (value) => {
    expect(validNotificationMail(value)).toBe(false);
  });
});
