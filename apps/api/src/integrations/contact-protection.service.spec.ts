import { Logger } from '@nestjs/common';
import { ContactProtectionService } from './contact-protection.service';
import { loadIntegrationRegistry } from './integrations.config';
import { IntegrationExecutor } from './integration-executor';
import { MockTurnstileAdapter } from './turnstile.adapter';
import { ContactsController } from '../contacts/contacts.controller';
import { ContactsService } from '../contacts/contacts.service';

describe('contact protection enforcement', () => {
  const origin = 'http://localhost:3000';
  const make = (
    values: Record<string, unknown> = {},
    environment = 'test',
    now = Date.now,
  ) => {
    const registry = loadIntegrationRegistry({
      get: (key) => ({ FEATURE_TURNSTILE_ENABLED: 'true', ...values })[key],
    });
    const adapter = new MockTurnstileAdapter(now);
    const executor = new IntegrationExecutor(registry);
    return {
      adapter,
      service: new ContactProtectionService(
        registry,
        environment,
        executor,
        adapter,
        now,
      ),
    };
  };
  beforeEach(() => {
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
  });
  afterEach(() => jest.restoreAllMocks());
  it('flag off ignores tokens/origin and preserves existing contact submission', async () => {
    const { service, adapter } = make(
      { FEATURE_TURNSTILE_ENABLED: 'false' },
      'production',
    );
    const verify = jest.spyOn(adapter, 'verify');
    expect(service.status()).toEqual({ mode: 'disabled' });
    await expect(service.verify(undefined)).resolves.toBeUndefined();
    expect(verify).not.toHaveBeenCalled();
  });
  it('global kill switch returns to disabled behavior', () => {
    expect(make({ INTEGRATIONS_KILL_SWITCH: 'true' }).service.status()).toEqual(
      { mode: 'disabled' },
    );
  });
  it.each(['production', '', 'staging'])(
    'refuses mock operation under NODE_ENV=%s',
    async (env) => {
      const { service } = make({}, env);
      expect(service.status()).toEqual({ mode: 'unavailable' });
      expect(() => service.issue(origin)).toThrow();
      await expect(service.verify('token', origin)).rejects.toMatchObject({
        status: 503,
      });
    },
  );
  it.each(['staging', 'production'])(
    'does not silently disable protection in integration env=%s',
    async (env) => {
      const { service } = make({ INTEGRATIONS_ENV: env });
      expect(service.status()).toEqual({ mode: 'unavailable' });
      await expect(service.verify('token', origin)).rejects.toMatchObject({
        status: 503,
      });
    },
  );
  it('accepts issued token once and rejects replay and missing token', async () => {
    const { service } = make();
    const { token } = service.issue(origin);
    await expect(service.verify(token, origin)).resolves.toBeUndefined();
    await expect(service.verify(token, origin)).rejects.toMatchObject({
      status: 403,
    });
    await expect(service.verify(undefined, origin)).rejects.toMatchObject({
      status: 403,
    });
  });
  it('rejects tokens at the five-minute expiration boundary', async () => {
    let clock = 1700000000000;
    const { service } = make({}, 'test', () => clock);
    const { token } = service.issue(origin);
    clock += 300000;
    await expect(service.verify(token, origin)).rejects.toMatchObject({
      status: 403,
    });
  });
  it.each([
    undefined,
    'https://example.invalid',
    'null',
    'http://localhost:3000/path',
  ])('requires a local request origin in mock mode: %p', async (bad) => {
    const { service } = make();
    expect(() => service.issue(bad)).toThrow();
    await expect(service.verify('token', bad)).rejects.toMatchObject({
      status: 403,
    });
  });
  it('checks returned hostname against submission hostname', async () => {
    const { service } = make();
    const { token } = service.issue(origin);
    await expect(
      service.verify(token, 'http://127.0.0.1:3000'),
    ).rejects.toMatchObject({ status: 403 });
  });
  it.each([
    { hostname: 'wrong.invalid' },
    { action: 'signup' },
    { challenge_ts: 'not-a-date' },
    { challenge_ts: new Date(Date.now() + 60000).toISOString() },
  ])('checks provider metadata, not only success: %p', async (override) => {
    const { service, adapter } = make();
    jest.spyOn(adapter, 'verify').mockResolvedValue({
      success: true,
      hostname: 'localhost',
      action: 'contact',
      challenge_ts: new Date().toISOString(),
      ...override,
    });
    await expect(service.verify('token', origin)).rejects.toMatchObject({
      status: 403,
    });
  });
  it('fails closed for contact when validation is unavailable', async () => {
    const { service, adapter } = make();
    jest
      .spyOn(adapter, 'verify')
      .mockRejectedValue(new Error('synthetic outage'));
    await expect(service.verify('token', origin)).rejects.toMatchObject({
      status: 503,
    });
  });
  it('never persists rejected requests, and strips verification token on valid contact', async () => {
    const { service } = make();
    const contacts = { create: jest.fn().mockResolvedValue({ success: true }) };
    const controller = new ContactsController(
      contacts as unknown as ContactsService,
      service,
    );
    const input = {
      full_name: 'Fixture',
      email: 'fixture@example.invalid',
      message: 'Synthetic test message',
    };
    await expect(controller.create(input, origin)).rejects.toMatchObject({
      status: 403,
    });
    expect(contacts.create).not.toHaveBeenCalled();
    const { token } = controller.issueChallenge(origin);
    await expect(
      controller.create({ ...input, turnstileToken: token }, origin),
    ).resolves.toEqual({ success: true });
    expect(contacts.create).toHaveBeenCalledWith({
      ...input,
      topic: undefined,
    });
    expect(JSON.stringify(contacts.create.mock.calls)).not.toContain(token);
  });
});
