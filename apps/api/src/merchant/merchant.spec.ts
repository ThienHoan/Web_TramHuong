import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  mapMerchantProduct,
  type MerchantCatalogProduct,
} from './merchant.mapper';
import { MerchantService } from './merchant.service';
import { ProductsService } from '../products/products.service';
import { IntegrationExecutor } from '../integrations/integration-executor';
import { loadIntegrationRegistry } from '../integrations/integrations.config';

export const fixtureProduct: MerchantCatalogProduct = {
  id: '00000000-0000-4000-8000-000000000001',
  slug: 'nhang-tram',
  price: 200000,
  quantity: 3,
  is_active: true,
  images: ['https://cdn.example.org/product.webp'],
  variants: null,
  discount_percentage: 10,
  discount_start_date: null,
  discount_end_date: null,
  translation: {
    title: 'Nhang trầm',
    description: '<p>Nhang trầm thử nghiệm.</p>',
  },
};
const now = new Date('2026-11-05T00:00:00Z');

describe('Merchant products/v1 read-only preview', () => {
  beforeEach(() => {
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
  });
  afterEach(() => jest.restoreAllMocks());

  it('maps active source stock, effective discount, localized canonical and integer micros', () => {
    const input = mapMerchantProduct(
      fixtureProduct,
      'https://shop.example.org',
      now,
    );
    expect(input).toEqual({
      offerId: fixtureProduct.id,
      contentLanguage: 'vi',
      feedLabel: 'VN',
      productAttributes: {
        title: 'Nhang trầm',
        description: 'Nhang trầm thử nghiệm.',
        link: 'https://shop.example.org/vi/products/nhang-tram',
        imageLink: fixtureProduct.images[0],
        availability: 'IN_STOCK',
        price: { amountMicros: '180000000000', currencyCode: 'VND' },
      },
    });
    expect(input.productAttributes).not.toHaveProperty('shipping');
    expect(input.productAttributes).not.toHaveProperty('brand');
    expect(input.productAttributes).not.toHaveProperty('gtin');
    expect(input.productAttributes).not.toHaveProperty('condition');
  });

  it('matches an expired discount and out-of-stock source without changing it', () => {
    const product = {
      ...fixtureProduct,
      quantity: 0,
      discount_end_date: '2026-01-01',
    };
    const original = JSON.stringify(product);
    const input = mapMerchantProduct(product, 'https://shop.example.org/', now);
    expect(input.productAttributes.availability).toBe('OUT_OF_STOCK');
    expect(input.productAttributes.price.amountMicros).toBe('200000000000');
    expect(JSON.stringify(product)).toBe(original);
  });

  it.each([
    { is_active: false },
    { price: -1 },
    { price: 0 },
    { price: 2.5 },
    { price: NaN },
    { quantity: -1 },
    { quantity: 1.5 },
    { images: [] },
    { images: ['http://cdn.example.org/image.jpg'] },
    { images: ['https://127.0.0.1/image.jpg'] },
    { images: ['https://user:secret@cdn.example.org/image.jpg'] },
    { slug: '../private' },
    { id: 'bad/id' },
    { translation: { title: '', description: 'text' } },
    { variants: [{ name: 'variant', price: 3 }] },
    { discount_percentage: 101 },
    { discount_start_date: 'invalid' },
    { discount_start_date: '2026-12-01', discount_end_date: '2026-01-01' },
  ])('rejects incomplete/hidden/unsafe source %j', (change) => {
    expect(() =>
      mapMerchantProduct(
        { ...fixtureProduct, ...change },
        'https://shop.example.org',
        now,
      ),
    ).toThrow();
  });

  it.each([
    '',
    'http://shop.example.org',
    'https://localhost',
    'https://192.168.0.1',
    'https://shop.example.org/path',
    'https://shop.example.org?key=secret',
  ])('rejects unapproved canonical origin %s', (origin) => {
    expect(() => mapMerchantProduct(fixtureProduct, origin, now)).toThrow();
  });

  it.each([
    {},
    { FEATURE_MERCHANT_SYNC_ENABLED: 'true', INTEGRATIONS_KILL_SWITCH: 'true' },
    { FEATURE_MERCHANT_SYNC_ENABLED: 'true', INTEGRATIONS_ENV: 'staging' },
    { FEATURE_MERCHANT_SYNC_ENABLED: 'true', INTEGRATIONS_ENV: 'production' },
    { FEATURE_MERCHANT_SYNC_ENABLED: 'true', NODE_ENV: 'production' },
  ])(
    'blocks execution before catalog/credential access %j',
    async (overrides) => {
      const config = new ConfigService({ NODE_ENV: 'test', ...overrides });
      const registry = loadIntegrationRegistry(config);
      const findAll = jest.fn();
      const service = new MerchantService(
        config,
        { findAll } as unknown as ProductsService,
        registry,
        new IntegrationExecutor(registry),
      );
      await expect(service.syncProducts()).rejects.toThrow('NOT_EXECUTABLE');
      expect(findAll).not.toHaveBeenCalled();
      expect(service.status().schedulerEnabled).toBe(false);
    },
  );

  it('reads only the bounded existing catalog and never describes a preview as a successful sync', async () => {
    const config = new ConfigService({
      NODE_ENV: 'test',
      FEATURE_MERCHANT_SYNC_ENABLED: 'true',
      FRONTEND_URL: 'https://shop.example.org',
    });
    const registry = loadIntegrationRegistry(config);
    const findAll = jest.fn().mockResolvedValue({
      data: [fixtureProduct, { ...fixtureProduct, is_active: false }],
    });
    const service = new MerchantService(
      config,
      { findAll } as unknown as ProductsService,
      registry,
      new IntegrationExecutor(registry),
    );
    expect(await service.syncProducts()).toMatchObject({
      source: 'mock',
      result: 'preview',
      synced: false,
      candidateCount: 1,
      schedulerEnabled: false,
      scope: 'first_page_only',
      persistence: 'none',
    });
    expect(findAll).toHaveBeenCalledTimes(1);
    expect(findAll).toHaveBeenCalledWith('vi', { page: 1, limit: 20 });
  });

  it('redacts database errors rather than returning provider payloads or false success', async () => {
    const config = new ConfigService({
      NODE_ENV: 'test',
      FEATURE_MERCHANT_SYNC_ENABLED: 'true',
    });
    const registry = loadIntegrationRegistry(config);
    const findAll = jest
      .fn()
      .mockRejectedValue(new Error('RAW_SECRET_SENTINEL'));
    const executor = new IntegrationExecutor(registry, { readRetries: 0 });
    const service = new MerchantService(
      config,
      { findAll } as unknown as ProductsService,
      registry,
      executor,
    );
    await expect(service.syncProducts()).rejects.toThrow(
      'MERCHANT_PREVIEW_UNAVAILABLE',
    );
    const logs = JSON.stringify(
      (Logger.prototype.warn as jest.Mock).mock.calls,
    );
    expect(logs).not.toContain('RAW_SECRET_SENTINEL');
  });
});
