import { Logger } from '@nestjs/common';
import { GhnClient } from './ghn.client';
import { loadGhnConfig } from './ghn.config';
import { ShippingError } from './ghn.error';
import type { GhnOperation } from './ghn.operations';

describe('closed GHN transport (no real network)', () => {
  const secret = 'fixture-token-do-not-log';
  const config = loadGhnConfig({
    get: (key) =>
      (
        ({
          GHN_ENABLED: 'true',
          GHN_TOKEN: secret,
          GHN_SHOP_ID: '123',
          GHN_TIMEOUT_MS: '200',
        }) as Record<string, string>
      )[key],
  });
  let fetcher: jest.MockedFunction<typeof fetch>;
  let wait: jest.Mock<Promise<void>, [number]>;
  let client: GhnClient;
  const decoder = (value: unknown) => value;
  const ok = () => new Response(JSON.stringify({ code: 200, data: [] }));
  let log: jest.SpyInstance;
  let warn: jest.SpyInstance;

  beforeEach(() => {
    fetcher = jest.fn<ReturnType<typeof fetch>, Parameters<typeof fetch>>();
    wait = jest.fn<Promise<void>, [number]>().mockResolvedValue(undefined);
    client = new GhnClient(config, fetcher, wait);
    log = jest.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
    warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
  });
  afterEach(() => jest.restoreAllMocks());

  it('does no IO while disabled', async () => {
    client = new GhnClient({ ...config, enabled: false }, fetcher, wait);
    await expect(
      client.request('legacyProvinces', {}, decoder),
    ).rejects.toMatchObject({ code: 'SHIPPING_DISABLED' });
    expect(fetcher).not.toHaveBeenCalled();
  });
  it('hard blocks production mutations even with enabled credentials', async () => {
    const production = new GhnClient(
      {
        ...config,
        environment: 'production',
        origin: 'https://online-gateway.ghn.vn',
      },
      fetcher,
      wait,
    );
    await expect(
      production.request('createShipment', {}, decoder),
    ).rejects.toMatchObject({ code: 'SHIPPING_VALIDATION_FAILED' });
    expect(fetcher).not.toHaveBeenCalled();
  });
  it('requires multipart tickets without overriding the generated boundary header', async () => {
    await expect(
      client.request('ticketCreate', {}, decoder),
    ).rejects.toMatchObject({ code: 'SHIPPING_VALIDATION_FAILED' });
    fetcher.mockResolvedValue(ok());
    const form = new FormData();
    form.set('order_code', 'FIXTURE');
    await client.request('ticketCreate', form, decoder);
    expect(fetcher.mock.calls[0][1]?.body).toBe(form);
    expect(fetcher.mock.calls[0][1]?.headers).not.toHaveProperty(
      'Content-Type',
    );
  });
  it('denies all unknown operations, including fulfillment and prototype names', async () => {
    for (const name of [
      'create',
      'cancel',
      'constructor',
      'toString',
      'https://other.test/',
    ]) {
      await expect(
        client.request(name as GhnOperation, {}, decoder),
      ).rejects.toBeInstanceOf(ShippingError);
    }
    expect(fetcher).not.toHaveBeenCalled();
  });
  it('encodes GET params, authenticates server-side and refuses redirects', async () => {
    fetcher.mockResolvedValue(ok());
    await client.request('legacyWards', { district_id: 1 }, decoder);
    const [url, options] = fetcher.mock.calls[0];
    expect((url as URL).href).toBe(
      'https://dev-online-gateway.ghn.vn/shiip/public-api/master-data/ward?district_id=1',
    );
    expect(options).toMatchObject({
      method: 'GET',
      redirect: 'error',
      headers: { Token: secret, ShopId: '123' },
    });
    expect(options?.body).toBeUndefined();
  });
  it('retries eligible POST fee reads with bounded backoff and same correlation', async () => {
    fetcher
      .mockResolvedValueOnce(new Response('unavailable', { status: 503 }))
      .mockResolvedValueOnce(ok());
    await client.request('fee', { weight: 100 }, decoder);
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(wait.mock.calls[0][0]).toBeGreaterThanOrEqual(200);
    expect(fetcher.mock.calls[0][1]?.headers).toEqual(
      fetcher.mock.calls[1][1]?.headers,
    );
  });
  it.each([400, 401, 403, 422])('never retries upstream %s', async (status) => {
    fetcher.mockResolvedValue(new Response(`raw secret ${secret}`, { status }));
    await expect(client.request('fee', {}, decoder)).rejects.toBeInstanceOf(
      ShippingError,
    );
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(wait).not.toHaveBeenCalled();
  });
  it('does not retry preview even on ambiguous network failure', async () => {
    fetcher.mockRejectedValue(new Error(`network error contains ${secret}`));
    await expect(client.request('preview', {}, decoder)).rejects.toMatchObject({
      code: 'SHIPPING_UNAVAILABLE',
    });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it('bounds repeated rate-limit failures', async () => {
    fetcher.mockResolvedValue(new Response('{}', { status: 429 }));
    await expect(client.request('fee', {}, decoder)).rejects.toMatchObject({
      code: 'SHIPPING_RATE_LIMITED',
    });
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
  it('aborts timed-out requests and applies the bounded read retry', async () => {
    fetcher.mockImplementation(
      (_url, options) =>
        new Promise((_resolve, reject) => {
          options?.signal?.addEventListener(
            'abort',
            () => reject(new Error('aborted')),
            { once: true },
          );
        }),
    );
    await expect(client.request('fee', {}, decoder)).rejects.toMatchObject({
      code: 'SHIPPING_TIMEOUT',
    });
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
  it.each([
    '',
    '<html>error</html>',
    '{"code":200}',
    '{"code":"200","data":[]}',
  ])('rejects malformed envelope %s', async (body) => {
    fetcher.mockResolvedValue(new Response(body));
    await expect(client.request('services', {}, decoder)).rejects.toMatchObject(
      { code: 'SHIPPING_INVALID_RESPONSE' },
    );
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it('checks GHN envelope errors even on HTTP 200', async () => {
    fetcher.mockResolvedValue(
      new Response(JSON.stringify({ code: 401, message: secret, data: null })),
    );
    await expect(client.request('fee', {}, decoder)).rejects.toMatchObject({
      code: 'SHIPPING_AUTH_FAILED',
    });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it('bounds response size by streamed bytes, even without Content-Length', async () => {
    fetcher.mockResolvedValue(new Response('x'.repeat(1024 * 1024 + 1)));
    await expect(client.request('services', {}, decoder)).rejects.toMatchObject(
      { code: 'SHIPPING_INVALID_RESPONSE' },
    );
  });
  it('does not expose upstream text, headers, recipient or exception causes in logs/errors', async () => {
    fetcher.mockRejectedValue(
      new Error(`Token: ${secret} recipient=Sensitive Customer`),
    );
    let failure: unknown;
    try {
      await client.request(
        'preview',
        { to_name: 'Sensitive Customer' },
        decoder,
      );
    } catch (error) {
      failure = error;
    }
    const output = JSON.stringify([failure, log.mock.calls, warn.mock.calls]);
    expect(output).not.toContain(secret);
    expect(output).not.toContain('Sensitive Customer');
    expect(output).toContain('correlationId');
  });
});
