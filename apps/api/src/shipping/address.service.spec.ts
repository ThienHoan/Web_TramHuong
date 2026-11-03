import type { Cache } from 'cache-manager';
import { ShippingAddressService } from './address.service';
import type { ShippingAddressOption } from './contracts/shipping-provider';
import type { GhnConfig } from './ghn/ghn.config';
import type { GhnProvider } from './ghn/ghn.provider';

describe('shipping address membership and cache', () => {
  const province: ShippingAddressOption = {
    id: '202',
    name: 'Fixture province',
    scheme: 'legacy',
    level: 'province',
  };
  const district: ShippingAddressOption = {
    id: '1444',
    name: 'Fixture district',
    scheme: 'legacy',
    level: 'district',
    parentId: '202',
    deliverySupported: true,
  };
  const ward: ShippingAddressOption = {
    id: '00308',
    name: 'Fixture ward',
    scheme: 'legacy',
    level: 'ward',
    parentId: '1444',
    deliverySupported: true,
  };
  let provider: Record<
    | 'provinces'
    | 'wards'
    | 'legacyProvinces'
    | 'legacyDistricts'
    | 'legacyWards',
    jest.Mock
  >;
  let cache: { get: jest.Mock; set: jest.Mock };
  let service: ShippingAddressService;

  beforeEach(() => {
    provider = {
      legacyProvinces: jest.fn().mockResolvedValue([province]),
      legacyDistricts: jest.fn().mockResolvedValue([district]),
      legacyWards: jest.fn().mockResolvedValue([ward]),
      provinces: jest
        .fn()
        .mockResolvedValue([
          { ...province, id: '1000001', scheme: 'two_level' },
        ]),
      wards: jest.fn().mockResolvedValue([
        {
          ...ward,
          id: '1003646',
          scheme: 'two_level',
          parentId: '1000001',
          deliverySupported: undefined,
        },
      ]),
    };
    cache = {
      get: jest.fn().mockResolvedValue(undefined),
      set: jest.fn().mockResolvedValue(undefined),
    };
    service = new ShippingAddressService(
      provider as unknown as GhnProvider,
      cache as unknown as Cache,
      { enabled: true, environment: 'staging', shopId: 123 } as GhnConfig,
    );
  });

  it('validates the complete legacy hierarchy with canonical provider names', async () => {
    expect(
      await service.validate({
        scheme: 'legacy',
        provinceId: 202,
        districtId: 1444,
        wardCode: '00308',
      }),
    ).toMatchObject({ eligibility: 'eligible', province, district, ward });
    expect(provider.legacyDistricts).toHaveBeenCalledWith(202);
    expect(provider.legacyWards).toHaveBeenCalledWith(1444);
  });
  it('rejects a province ID from a different address source/scheme', async () => {
    await expect(
      service.validate({
        scheme: 'legacy',
        provinceId: 79,
        districtId: 1444,
        wardCode: '00308',
      }),
    ).rejects.toThrow('SHIPPING_ADDRESS_NOT_FOUND');
    expect(provider.legacyDistricts).not.toHaveBeenCalled();
  });
  it('rejects a district not belonging to the selected province', async () => {
    await expect(
      service.validate({
        scheme: 'legacy',
        provinceId: 202,
        districtId: 999,
        wardCode: '00308',
      }),
    ).rejects.toThrow('SHIPPING_ADDRESS_NOT_FOUND');
    expect(provider.legacyWards).not.toHaveBeenCalled();
  });
  it('rejects a ward not in the selected district', async () => {
    await expect(
      service.validate({
        scheme: 'legacy',
        provinceId: 202,
        districtId: 1444,
        wardCode: '308',
      }),
    ).rejects.toThrow('SHIPPING_ADDRESS_NOT_FOUND');
  });
  it.each(['district', 'ward'])(
    'rejects delivery-disabled %s',
    async (level) => {
      if (level === 'district')
        provider.legacyDistricts.mockResolvedValue([
          { ...district, deliverySupported: false },
        ]);
      else
        provider.legacyWards.mockResolvedValue([
          { ...ward, deliverySupported: false },
        ]);
      await expect(
        service.validate({
          scheme: 'legacy',
          provinceId: 202,
          districtId: 1444,
          wardCode: '00308',
        }),
      ).rejects.toThrow('SHIPPING_DELIVERY_UNSUPPORTED');
    },
  );
  it('supports new two-level addresses without claiming route eligibility or mapping a district', async () => {
    const result = await service.validate({
      scheme: 'two_level',
      provinceId: 1000001,
      wardCode: '1003646',
    });
    expect(result.eligibility).toBe('provider_validation_required');
    expect(result.district).toBeUndefined();
    expect(provider.legacyDistricts).not.toHaveBeenCalled();
  });
  it('refuses an ambiguous mixture of address schemes', async () => {
    await expect(
      service.validate({
        scheme: 'two_level',
        provinceId: 1000001,
        wardCode: '1003646',
        districtId: 1444,
      }),
    ).rejects.toThrow('SHIPPING_NEW_ADDRESS_HAS_NO_DISTRICT');
  });
  it('reuses the existing cache with bounded TTL and provider/environment namespace', async () => {
    cache.get.mockResolvedValue([province]);
    expect(await service.legacyProvinces()).toEqual([province]);
    expect(provider.legacyProvinces).not.toHaveBeenCalled();
    cache.get.mockResolvedValue(undefined);
    await service.legacyProvinces();
    expect(cache.set).toHaveBeenCalledWith(
      'ghn:addresses:v1:staging:123:legacy:provinces',
      [province],
      300000,
    );
  });
  it('does not cache upstream validation/auth failures', async () => {
    provider.provinces.mockRejectedValue(new Error('fixture failure'));
    await expect(service.provinces()).rejects.toThrow('fixture failure');
    expect(cache.set).not.toHaveBeenCalled();
  });
});
