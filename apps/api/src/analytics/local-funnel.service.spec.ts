import { ConfigService } from '@nestjs/config';
import { loadIntegrationRegistry } from '../integrations/integrations.config';
import {
  LocalDebugEventService,
  LocalGa4TestLimitError,
  type LocalFunnelIntent,
} from './local-debug-event.service';
import { CollectionPolicyService } from './collection-policy.service';
import { LOCAL_FUNNEL_EVENTS } from './local-funnel.contract';
const input: LocalFunnelIntent = {
  consent: 'granted',
  eventId: '10000000-0000-4000-8000-000000000001',
  clientId: '123.456',
  sessionId: 123,
  name: 'add_to_cart',
  parameters: {
    currency: 'VND',
    value: 100,
    items: [{ item_id: 'SKU_A', price: 50, quantity: 2 }],
  },
};
function fixture(patch: Record<string, unknown> = {}) {
  let now = 1000000000;
  const config = new ConfigService({
    NODE_ENV: 'test',
    FEATURE_GA4_ENABLED: 'true',
    FEATURE_GA4_LOCAL_BROWSER_TEST_ENABLED: 'true',
    FEATURE_GA4_LOCAL_FUNNEL_ENABLED: 'true',
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
      () => now,
      10,
    ),
    transport,
    advance: (ms: number) => {
      now += ms;
    },
  };
}
describe('ADMIN local pre-purchase funnel', () => {
  it.each([
    { FEATURE_GA4_LOCAL_FUNNEL_ENABLED: undefined },
    { FEATURE_GA4_LOCAL_FUNNEL_ENABLED: 'false' },
    { FEATURE_GA4_LOCAL_BROWSER_TEST_ENABLED: 'false' },
    { FEATURE_GA4_ENABLED: 'false' },
    { NODE_ENV: 'production' },
    { INTEGRATIONS_ENV: 'staging' },
    { INTEGRATIONS_KILL_SWITCH: 'true' },
    { GA4_MEASUREMENT_ID: 'G-OTHER' },
  ])('blocks gates %j', async (patch) => {
    const f = fixture(patch);
    expect(f.service.funnelEnabled()).toBe(false);
    await expect(
      f.service.sendFunnel(input, 'admin', 'http://localhost:4400'),
    ).rejects.toThrow('LOCAL_GA4_FUNNEL_DISABLED');
    expect(f.transport).not.toHaveBeenCalled();
  });
  it.each(LOCAL_FUNNEL_EVENTS)(
    'sends canonical %s without actor, URL, purchase or raw secret',
    async (name) => {
      const f = fixture();
      const result = await f.service.sendFunnel(
        { ...input, name },
        'PRIVATE_ACTOR',
        'http://localhost:4400',
      );
      expect(result).toMatchObject({
        status: 'accepted',
        ingestionVerified: false,
      });
      const [url, options] = f.transport.mock.calls[0];
      expect(new URL(url as string).pathname).toBe('/mp/collect');
      expect(options?.redirect).toBe('error');
      const body = JSON.parse(options?.body as string) as {
        events: { name: string; params: Record<string, unknown> }[];
      };
      expect(body.events).toEqual([
        {
          name,
          params: {
            ...input.parameters,
            debug_mode: true,
            session_id: 123,
            engagement_time_msec: 1,
          },
        },
      ]);
      expect(options?.body).not.toMatch(
        /PRIVATE|order|email|page_location|test_action/,
      );
    },
  );
  it.each([
    { name: 'purchase' },
    { name: 'refund' },
    { consent: 'denied' },
    { parameters: { ...input.parameters, email: 'private' } },
    {
      parameters: {
        ...input.parameters,
        items: [
          { item_id: 'SKU_A', price: 100, quantity: 1, item_name: 'private' },
        ],
      },
    },
    { parameters: { ...input.parameters, value: 99 } },
    { parameters: { ...input.parameters, currency: 'USD' } },
    {
      parameters: {
        ...input.parameters,
        items: [{ item_id: '0356176878', price: 100, quantity: 1 }],
      },
    },
    {
      parameters: {
        ...input.parameters,
        items: [{ item_id: 'SKU_A', price: -100, quantity: 1 }],
      },
    },
    {
      parameters: {
        ...input.parameters,
        items: [{ item_id: 'SKU_A', price: 100, quantity: 1.5 }],
      },
    },
    {
      name: 'add_shipping_info',
      parameters: { ...input.parameters, shipping_tier: ['delivery'] },
    },
    {
      name: 'add_payment_info',
      parameters: { ...input.parameters, payment_type: 'bank-account-private' },
    },
    {
      name: 'select_item',
      parameters: {
        currency: 'VND',
        value: 200,
        items: [
          { item_id: 'SKU_A', price: 100, quantity: 1 },
          { item_id: 'SKU_B', price: 100, quantity: 1 },
        ],
      },
    },
  ])('rejects unsafe intent %j without transport', async (patch) => {
    const f = fixture();
    await expect(
      f.service.sendFunnel(
        { ...input, ...patch } as LocalFunnelIntent,
        'admin',
        'http://localhost:4400',
      ),
    ).rejects.toThrow();
    expect(f.transport).not.toHaveBeenCalled();
  });
  it('dedupes exact event, rejects changed name/parameters and does not retry failures', async () => {
    const f = fixture();
    f.transport.mockRejectedValue(new Error('PRIVATE'));
    expect(
      await f.service.sendFunnel(input, 'admin', 'http://localhost:4400'),
    ).toMatchObject({ status: 'unknown' });
    expect(
      await f.service.sendFunnel(input, 'admin', 'http://localhost:4400'),
    ).toMatchObject({ duplicate: true, status: 'unknown' });
    for (const changed of [
      { ...input, name: 'view_item' },
      {
        ...input,
        parameters: {
          ...input.parameters,
          value: 200,
          items: [{ item_id: 'SKU_B', price: 100, quantity: 2 }],
        },
      },
    ])
      await expect(
        f.service.sendFunnel(changed, 'admin', 'http://localhost:4400'),
      ).rejects.toThrow('LOCAL_GA4_EVENT_CONFLICT');
    expect(f.transport).toHaveBeenCalledTimes(1);
  });
  it('blocks concurrent requests and keeps bounded daily usage across minute changes', async () => {
    const f = fixture();
    f.transport.mockImplementationOnce(() => new Promise(() => {}));
    const pending = f.service.sendFunnel(
      input,
      'admin',
      'http://localhost:4400',
    );
    await expect(
      f.service.sendFunnel(
        { ...input, eventId: '10000000-0000-4000-8000-000000000002' },
        'admin',
        'http://localhost:4400',
      ),
    ).rejects.toThrow('LOCAL_GA4_BUSY');
    await pending;
    for (let i = 2; i <= 100; i++) {
      if (i % 25 === 0) f.advance(60000);
      await f.service.sendFunnel(
        {
          ...input,
          eventId: '10000000-0000-4000-8000-' + String(i).padStart(12, '0'),
        },
        'admin',
        'http://localhost:4400',
      );
    }
    await expect(
      f.service.sendFunnel(
        { ...input, eventId: '10000000-0000-4000-8000-000000000101' },
        'admin',
        'http://localhost:4400',
      ),
    ).rejects.toMatchObject({ status: 429 });
    expect(f.transport).toHaveBeenCalledTimes(100);
  });
  it('limits thirty attempts per minute before transport', async () => {
    const f = fixture();
    for (let i = 1; i <= 30; i++)
      await f.service.sendFunnel(
        {
          ...input,
          eventId: '20000000-0000-4000-8000-' + String(i).padStart(12, '0'),
        },
        'admin',
        'http://localhost:4400',
      );
    const next = { ...input, eventId: '20000000-0000-4000-8000-000000000031' };
    await expect(
      f.service.sendFunnel(next, 'admin', 'http://localhost:4400'),
    ).rejects.toMatchObject({ status: 429 });
    f.advance(60000);
    await f.service.sendFunnel(next, 'admin', 'http://localhost:4400');
    expect(f.transport).toHaveBeenCalledTimes(31);
  });
  it.each([false, true])(
    'public policy exposes funnel only when enabled=%s',
    (enabled) => {
      const config = new ConfigService({
        NODE_ENV: 'test',
        FEATURE_GA4_ENABLED: 'true',
        FEATURE_GA4_LOCAL_BROWSER_TEST_ENABLED: 'true',
        FEATURE_GA4_LOCAL_FUNNEL_ENABLED: String(enabled),
        GA4_LOCAL_TEST_ORIGIN: 'http://localhost:4400',
        GA4_MEASUREMENT_ID: 'G-XJNSBPN8HN',
        GA4_API_SECRET: 'PRIVATE',
      });
      const registry = loadIntegrationRegistry(config),
        service = new LocalDebugEventService(config, registry);
      const result = new CollectionPolicyService(
        registry,
        config,
        service,
      ).getPolicy();
      expect(result.localDebug?.funnelEnabled).toBe(enabled ? true : undefined);
      expect(JSON.stringify(result)).not.toMatch(/PRIVATE|api_secret/);
    },
  );
  it('reports a trusted pre-transport cap as blocked, retains reason for dedupe and never retries', async () => {
    const f = fixture();
    f.transport.mockImplementation(() =>
      Promise.reject(new LocalGa4TestLimitError()),
    );
    const first = await f.service.sendFunnel(
      input,
      'admin',
      'http://localhost:4400',
    );
    expect(first).toMatchObject({
      status: 'blocked',
      reason: 'test_limit',
      duplicate: false,
      ingestionVerified: false,
    });
    expect(
      await f.service.sendFunnel(input, 'admin', 'http://localhost:4400'),
    ).toMatchObject({
      status: 'blocked',
      reason: 'test_limit',
      duplicate: true,
    });
    expect(f.transport).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(first)).not.toMatch(/PRIVATE|api_secret/);
  });
  it('does not trust arbitrary provider error text as proof of a local cap', async () => {
    const f = fixture();
    f.transport.mockRejectedValue(new Error('LOCAL_GA4_TEST_LIMIT'));
    const result = await f.service.sendFunnel(
      input,
      'admin',
      'http://localhost:4400',
    );
    expect(result).toMatchObject({ status: 'unknown' });
    expect(result).not.toHaveProperty('reason');
  });
});
