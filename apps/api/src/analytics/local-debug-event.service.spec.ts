import { ConfigService } from '@nestjs/config';
import { loadIntegrationRegistry } from '../integrations/integrations.config';
import {
  LocalDebugEventService,
  type LocalDebugIntent,
} from './local-debug-event.service';
const intent: LocalDebugIntent = {
  consent: 'granted',
  action: 'manual_test',
  eventId: '10000000-0000-4000-8000-000000000001',
  clientId: '123.456',
  sessionId: 123456,
};
function fixture(patch: Record<string, unknown> = {}, timeout = 1000) {
  const config = new ConfigService({
    NODE_ENV: 'test',
    FEATURE_GA4_ENABLED: 'true',
    FEATURE_GA4_LOCAL_BROWSER_TEST_ENABLED: 'true',
    GA4_LOCAL_TEST_ORIGIN: 'http://localhost:4400',
    GA4_MEASUREMENT_ID: 'G-XJNSBPN8HN',
    GA4_API_SECRET: 'PRIVATE_SECRET',
    ...patch,
  });
  const transport = jest
    .fn<ReturnType<typeof fetch>, Parameters<typeof fetch>>()
    .mockImplementation(() =>
      Promise.resolve(new Response(null, { status: 204 })),
    );
  return {
    service: new LocalDebugEventService(
      config,
      loadIntegrationRegistry(config),
      transport,
      () => 1000000000,
      timeout,
    ),
    transport,
  };
}
describe('manual consented local GA4 reporting event', () => {
  it.each([
    { FEATURE_GA4_LOCAL_BROWSER_TEST_ENABLED: 'false' },
    { FEATURE_GA4_ENABLED: 'false' },
    { INTEGRATIONS_KILL_SWITCH: 'true' },
    { NODE_ENV: 'production' },
    { INTEGRATIONS_ENV: 'staging' },
    { GA4_MEASUREMENT_ID: 'G-OTHER1234' },
    { GA4_API_SECRET: '' },
    { GA4_LOCAL_TEST_ORIGIN: 'https://public.example.org' },
  ])('blocks %j without network', async (patch) => {
    const f = fixture(patch);
    expect(f.service.policy()).toBeUndefined();
    await expect(
      f.service.send(intent, 'admin', 'http://localhost:4400'),
    ).rejects.toThrow('LOCAL_GA4_DISABLED');
    expect(f.transport).not.toHaveBeenCalled();
  });
  it('rejects missing/wrong Origin before send', async () => {
    const f = fixture();
    for (const origin of [
      undefined,
      'http://evil.example',
      'http://localhost:4400.evil.example',
    ])
      await expect(f.service.send(intent, 'admin', origin)).rejects.toThrow(
        'LOCAL_GA4_ORIGIN_REJECTED',
      );
    expect(f.transport).not.toHaveBeenCalled();
  });
  it('rejects consent/identity/action violations', async () => {
    const f = fixture();
    for (const input of [
      { ...intent, consent: 'denied' },
      { ...intent, action: 'purchase' },
      { ...intent, eventId: 'wrong' },
      { ...intent, clientId: 'email@example.org' },
      { ...intent, sessionId: 0 },
    ])
      await expect(
        f.service.send(
          input as LocalDebugIntent,
          'admin',
          'http://localhost:4400',
        ),
      ).rejects.toThrow();
    expect(f.transport).not.toHaveBeenCalled();
  });
  it('sends one allowlisted debug-mode reporting event with no raw identity or commercial payload', async () => {
    const f = fixture();
    expect(f.service.policy()).toEqual({
      enabled: true,
      measurementId: 'G-XJNSBPN8HN',
    });
    const result = await f.service.send(
      intent,
      'PRIVATE_ADMIN_ID',
      'http://localhost:4400',
    );
    expect(result).toMatchObject({
      status: 'accepted',
      duplicate: false,
      ingestionVerified: false,
    });
    const [target, options] = f.transport.mock.calls[0];
    expect(new URL(target as string).pathname).toBe('/mp/collect');
    expect(options?.redirect).toBe('error');
    const body = JSON.parse(options?.body as string) as {
      events: { name: string; params: Record<string, unknown> }[];
    };
    expect(body.events).toEqual([
      {
        name: 'local_test_action',
        params: {
          debug_mode: true,
          session_id: intent.sessionId,
          engagement_time_msec: 1,
          test_action: 'manual_test',
        },
      },
    ]);
    expect(options?.body).not.toMatch(
      /PRIVATE|purchase|order|email|price|page_location/,
    );
    expect(JSON.stringify(result)).not.toContain('PRIVATE');
    expect(
      await f.service.send(intent, 'PRIVATE_ADMIN_ID', 'http://localhost:4400'),
    ).toMatchObject({ duplicate: true, status: 'accepted' });
    expect(f.transport).toHaveBeenCalledTimes(1);
  });
  it('rejects conflicting duplicate intent', async () => {
    const f = fixture();
    await f.service.send(intent, 'admin', 'http://localhost:4400');
    await expect(
      f.service.send(
        { ...intent, clientId: '789.123' },
        'admin',
        'http://localhost:4400',
      ),
    ).rejects.toThrow('LOCAL_GA4_EVENT_CONFLICT');
  });
  it('timeout is unknown and duplicate does not retry', async () => {
    const f = fixture({}, 5);
    f.transport.mockImplementation(() => new Promise(() => {}));
    expect(
      await f.service.send(intent, 'admin', 'http://localhost:4400'),
    ).toMatchObject({ status: 'unknown' });
    expect(
      await f.service.send(intent, 'admin', 'http://localhost:4400'),
    ).toMatchObject({ duplicate: true, status: 'unknown' });
    expect(f.transport).toHaveBeenCalledTimes(1);
  });
  it('provider rejection is unknown, body is never exposed', async () => {
    const f = fixture();
    f.transport.mockResolvedValue(
      new Response('PRIVATE_SECRET', { status: 403 }),
    );
    const result = await f.service.send(
      intent,
      'admin',
      'http://localhost:4400',
    );
    expect(result.status).toBe('unknown');
    expect(JSON.stringify(result)).not.toContain('PRIVATE');
  });
  it('limits attempts and overlap before transport', async () => {
    const f = fixture();
    for (let i = 1; i <= 5; i++)
      await f.service.send(
        {
          ...intent,
          eventId: '10000000-0000-4000-8000-' + String(i).padStart(12, '0'),
        },
        'admin',
        'http://localhost:4400',
      );
    await expect(
      f.service.send(
        { ...intent, eventId: '10000000-0000-4000-8000-000000000006' },
        'admin',
        'http://localhost:4400',
      ),
    ).rejects.toMatchObject({ status: 429 });
    expect(f.transport).toHaveBeenCalledTimes(5);
  });
});
