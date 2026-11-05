import { Logger } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { MailerService } from '@nestjs-modules/mailer';
import { ConfigService } from '@nestjs/config';
import { SmtpEmailProvider } from './smtp-email.provider';
import { MockResendEmailProvider } from './mock-resend-email.provider';
import { IntegrationExecutor } from '../integrations/integration-executor';
import { loadIntegrationRegistry } from '../integrations/integrations.config';
import { MailModule } from './mail.module';
import { EMAIL_PROVIDER } from './email-provider';
import { MailService } from './mail.service';
import { SupabaseService } from '../supabase/supabase.service';

const message = {
  to: 'customer@example.invalid',
  subject: 'Synthetic confirmation',
  template: './order-confirmation',
  context: { id: 'fixture-order', total: '100000 VND' },
};
const registryFor = (values: Record<string, string> = {}) =>
  loadIntegrationRegistry(new ConfigService(values));

describe('email provider acceptance and non-retry contract', () => {
  beforeEach(() => {
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
  });
  afterEach(() => jest.restoreAllMocks());

  it.each([
    [{ accepted: ['synthetic'] }, 'accepted'],
    [{ accepted: [], rejected: ['synthetic'] }, 'rejected'],
    [{}, 'unknown'],
    [undefined, 'unknown'],
  ])(
    'classifies SMTP response without exposing recipient %j',
    async (response, outcome) => {
      const sendMail = jest.fn().mockResolvedValue(response);
      const smtp = new SmtpEmailProvider({
        sendMail,
      } as unknown as MailerService);
      expect(await smtp.send(message)).toEqual({
        source: 'smtp',
        outcome,
        delivered: false,
      });
      expect(sendMail).toHaveBeenCalledTimes(1);
      expect(sendMail).toHaveBeenCalledWith(message);
    },
  );

  it('keeps ambiguous SMTP failure unknown without a resend', async () => {
    const sendMail = jest.fn().mockRejectedValue(new Error('SECRET_RECIPIENT'));
    const smtp = new SmtpEmailProvider({
      sendMail,
    } as unknown as MailerService);
    expect(await smtp.send(message)).toEqual({
      source: 'smtp',
      outcome: 'unknown',
      delivered: false,
    });
    expect(sendMail).toHaveBeenCalledTimes(1);
  });

  it.each([
    [{}, 'test'],
    [
      { FEATURE_RESEND_ENABLED: 'true', INTEGRATIONS_KILL_SWITCH: 'true' },
      'test',
    ],
    [{ FEATURE_RESEND_ENABLED: 'true', INTEGRATIONS_ENV: 'staging' }, 'test'],
    [
      { FEATURE_RESEND_ENABLED: 'true', INTEGRATIONS_ENV: 'production' },
      'test',
    ],
    [{ FEATURE_RESEND_ENABLED: 'true' }, 'production'],
  ])('blocks unapproved mock execution %j/%s', (values, nodeEnv) => {
    const registry = registryFor(values);
    const simulate = jest
      .fn<Promise<void>, [AbortSignal]>()
      .mockResolvedValue();
    const mock = new MockResendEmailProvider(
      registry,
      new IntegrationExecutor(registry),
      nodeEnv,
      simulate,
    );
    expect(() => mock.send(message, 'fixture-key')).toThrow();
    expect(simulate).not.toHaveBeenCalled();
  });

  it('coalesces simultaneous duplicates and prevents conflicting key reuse', async () => {
    const registry = registryFor({ FEATURE_RESEND_ENABLED: 'true' });
    const simulate = jest
      .fn<Promise<void>, [AbortSignal]>()
      .mockResolvedValue();
    const mock = new MockResendEmailProvider(
      registry,
      new IntegrationExecutor(registry),
      'test',
      simulate,
    );
    const results = await Promise.all(
      Array.from({ length: 6 }, () => mock.send(message, 'same-key')),
    );
    expect(
      results.every(
        (r) => r.source === 'mock' && r.outcome === 'accepted' && !r.delivered,
      ),
    ).toBe(true);
    expect(simulate).toHaveBeenCalledTimes(1);
    expect(() =>
      mock.send({ ...message, to: 'other@example.invalid' }, 'same-key'),
    ).toThrow('KEY_CONFLICT');
    await mock.send(message, 'same-key');
    expect(simulate).toHaveBeenCalledTimes(1);
  });

  it('retains an unknown mutation result without retry or fallback and redacts logs', async () => {
    const registry = registryFor({ FEATURE_RESEND_ENABLED: 'true' });
    const simulate = jest.fn().mockRejectedValue(new Error('SECRET_RECIPIENT'));
    const mock = new MockResendEmailProvider(
      registry,
      new IntegrationExecutor(registry),
      'test',
      simulate,
    );
    for (let i = 0; i < 2; i++) {
      expect(await mock.send(message, 'unknown-key')).toEqual({
        source: 'mock',
        outcome: 'unknown',
        delivered: false,
      });
    }
    expect(simulate).toHaveBeenCalledTimes(1);
    const logs = JSON.stringify(
      (Logger.prototype.warn as jest.Mock).mock.calls,
    );
    expect(logs).not.toContain('SECRET_RECIPIENT');
    expect(logs).not.toContain(message.to);
  });

  it('deduplicates the same message when JSON object fields arrive in a different order', async () => {
    const registry = registryFor({ FEATURE_RESEND_ENABLED: 'true' });
    const simulate = jest
      .fn<Promise<void>, [AbortSignal]>()
      .mockResolvedValue();
    const mock = new MockResendEmailProvider(
      registry,
      new IntegrationExecutor(registry),
      'test',
      simulate,
    );
    await mock.send(message, 'canonical-key');
    await mock.send(
      {
        context: { total: message.context.total, id: message.context.id },
        template: message.template,
        subject: message.subject,
        to: message.to,
      },
      'canonical-key',
    );
    expect(simulate).toHaveBeenCalledTimes(1);
  });

  it('rejects invalid or oversized messages and keys before consuming quota', () => {
    const registry = registryFor({ FEATURE_RESEND_ENABLED: 'true' });
    const simulate = jest
      .fn<Promise<void>, [AbortSignal]>()
      .mockResolvedValue();
    const mock = new MockResendEmailProvider(
      registry,
      new IntegrationExecutor(registry),
      'test',
      simulate,
    );
    for (const key of [undefined, '', 'bad/key', 'x'.repeat(251)])
      expect(() => mock.send(message, key)).toThrow('INVALID_KEY');
    expect(() =>
      mock.send({ ...message, text: 'x'.repeat(60001) }, 'large'),
    ).toThrow('INVALID_MESSAGE');
    expect(() =>
      mock.send({ ...message, bcc: 'hidden@example.invalid' }, 'bcc'),
    ).toThrow('INVALID_MESSAGE');
    expect(simulate).not.toHaveBeenCalled();
  });

  it('bounds the ledger without evicting earlier idempotency results', async () => {
    const registry = registryFor({ FEATURE_RESEND_ENABLED: 'true' });
    const simulate = jest
      .fn<Promise<void>, [AbortSignal]>()
      .mockResolvedValue();
    const executor = new IntegrationExecutor(registry, {
      requestsPerMinute: 100,
    });
    const mock = new MockResendEmailProvider(
      registry,
      executor,
      'test',
      simulate,
    );
    for (let i = 0; i < 100; i++) await mock.send(message, `key-${i}`);
    expect(() => mock.send(message, 'overflow')).toThrow('LEDGER_FULL');
    expect((await mock.send(message, 'key-0')).outcome).toBe('accepted');
    expect(simulate).toHaveBeenCalledTimes(100);
  });

  it('retains SMTP as the real DI default even with the Resend mock flag enabled', async () => {
    const sendMail = jest.fn().mockResolvedValue({ accepted: ['synthetic'] });
    const module = await Test.createTestingModule({ imports: [MailModule] })
      .overrideProvider(ConfigService)
      .useValue(
        new ConfigService({ NODE_ENV: 'test', FEATURE_RESEND_ENABLED: 'true' }),
      )
      .overrideProvider(MailerService)
      .useValue({ sendMail })
      .overrideProvider(SupabaseService)
      .useValue({
        getClient: () => {
          throw new Error('NO_DATABASE_ACCESS');
        },
      })
      .compile();
    try {
      expect(module.get(EMAIL_PROVIDER)).toBe(module.get(SmtpEmailProvider));
      await module.get(MailService).sendPaymentSuccess({
        id: 'fixture-order',
        total: 100000,
        items: [],
        shipping_info: { email: message.to },
        status: 'PAID',
      });
      expect(sendMail).toHaveBeenCalledTimes(1);
    } finally {
      await module.close();
    }
  });
});
