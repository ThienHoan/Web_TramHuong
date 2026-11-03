import { loadGhnConfig } from './ghn.config';

const load = (values: Record<string, string> = {}) =>
  loadGhnConfig({ get: (key) => values[key] });

describe('GHN startup configuration', () => {
  it('is disabled and staging by default without credentials', () => {
    expect(load()).toMatchObject({
      enabled: false,
      environment: 'staging',
      shopId: 0,
    });
    expect(Object.isFrozen(load())).toBe(true);
  });
  it.each(['1', 'yes', 'TRUE', ''])(
    'rejects ambiguous enabled flag %s',
    (flag) => {
      expect(() => load({ GHN_ENABLED: flag })).toThrow('GHN_ENABLED');
    },
  );
  it('requires credentials only when enabled', () => {
    expect(() => load({ GHN_ENABLED: 'true' })).toThrow('GHN_TOKEN');
    expect(() => load({ GHN_ENABLED: 'true', GHN_TOKEN: 'fixture' })).toThrow(
      'GHN_SHOP_ID',
    );
  });
  it.each(['-1', '1e3', '1.2', '9007199254740992'])(
    'rejects shop ID %s',
    (shop) => {
      expect(() =>
        load({ GHN_ENABLED: 'true', GHN_TOKEN: 'fixture', GHN_SHOP_ID: shop }),
      ).toThrow('GHN_SHOP_ID');
    },
  );
  it('rejects credential header injection without printing the value', () => {
    expect(() =>
      load({
        GHN_ENABLED: 'true',
        GHN_TOKEN: 'secret\r\ninjected',
        GHN_SHOP_ID: '123',
      }),
    ).toThrow('GHN_TOKEN is required');
  });
  it('never permits production GHN from a dev/test server', () => {
    expect(() =>
      load({ GHN_ENABLED: 'true', GHN_ENV: 'production', NODE_ENV: 'test' }),
    ).toThrow('forbidden');
    expect(() => load({ GHN_ENV: 'unknown' })).toThrow('GHN_ENV');
  });
  it('uses the explicit production origin only in production when enabled', () => {
    expect(
      load({
        NODE_ENV: 'production',
        GHN_ENABLED: 'true',
        GHN_ENV: 'production',
        GHN_TOKEN: 'fixture',
        GHN_SHOP_ID: '123',
      }).origin,
    ).toBe('https://online-gateway.ghn.vn');
  });
  it.each([
    ['GHN_TIMEOUT_MS', '0'],
    ['GHN_TIMEOUT_MS', '30001'],
    ['GHN_READ_RETRIES', '3'],
  ])('bounds %s', (key, value) => {
    expect(() => load({ [key]: value })).toThrow(key);
  });
});
