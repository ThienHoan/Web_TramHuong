import { Logger } from '@nestjs/common';
import type {
  ShippingPreviewInput,
  ShippingQuoteInput,
} from '../contracts/shipping-provider';
import { GhnClient } from './ghn.client';
import { loadGhnConfig } from './ghn.config';
import { GhnProvider } from './ghn.provider';

describe('GHN documented adapter contracts (fixture transport)', () => {
  const config = loadGhnConfig({
    get: (key) =>
      (
        ({
          GHN_ENABLED: 'true',
          GHN_TOKEN: 'fixture',
          GHN_SHOP_ID: '123',
        }) as Record<string, string>
      )[key],
  });
  let fetcher: jest.MockedFunction<typeof fetch>;
  let provider: GhnProvider;
  const parcel = {
    weightGrams: 600,
    lengthCm: 25,
    widthCm: 20,
    heightCm: 8,
    declaredValue: 285000,
  };
  const quote: ShippingQuoteInput = {
    originDistrictId: 1452,
    destinationDistrictId: 1444,
    destinationWardCode: '00308',
    serviceTypeId: 2,
    parcel,
    codAmount: 285000,
  };
  const preview: ShippingPreviewInput = {
    destination: {
      provider: 'ghn',
      scheme: 'two_level',
      eligibility: 'provider_validation_required',
      province: {
        id: '1000001',
        name: 'Hồ Chí Minh',
        scheme: 'two_level',
        level: 'province',
      },
      ward: {
        id: '1003646',
        name: 'Phường Vũng Tàu',
        scheme: 'two_level',
        level: 'ward',
        parentId: '1000001',
      },
    },
    recipient: {
      name: 'Fixture buyer',
      phone: '0900000000',
      address: 'Fixture street',
    },
    parcel,
    serviceTypeId: 2,
    codAmount: 285000,
    content: 'Fixture product',
  };
  const respond = (data: unknown) =>
    new Response(JSON.stringify({ code: 200, data }));
  const body = () =>
    JSON.parse(fetcher.mock.calls[0][1]?.body as string) as Record<
      string,
      unknown
    >;

  beforeEach(() => {
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
    fetcher = jest.fn<ReturnType<typeof fetch>, Parameters<typeof fetch>>();
    provider = new GhnProvider(
      new GhnClient(config, fetcher, async () => {}),
      config,
    );
  });
  afterEach(() => jest.restoreAllMocks());

  it('keeps legacy ward codes as strings including leading zeros', async () => {
    fetcher.mockResolvedValue(
      respond([
        { WardCode: '00308', WardName: 'Fixture ward', SupportType: 2 },
      ]),
    );
    expect(await provider.legacyWards(1444)).toEqual([
      {
        id: '00308',
        name: 'Fixture ward',
        scheme: 'legacy',
        level: 'ward',
        parentId: '1444',
        deliverySupported: true,
      },
    ]);
  });
  it('rejects numeric ward codes rather than losing leading zeros', async () => {
    fetcher.mockResolvedValue(
      respond([{ WardCode: 308, WardName: 'Fixture ward', SupportType: 3 }]),
    );
    await expect(provider.legacyWards(1444)).rejects.toMatchObject({
      code: 'SHIPPING_INVALID_RESPONSE',
    });
  });
  it('exposes district eligibility without treating pickup-only as delivery', async () => {
    fetcher.mockResolvedValue(
      respond([
        { DistrictID: 1444, DistrictName: 'Fixture district', SupportType: 1 },
      ]),
    );
    expect(await provider.legacyDistricts(202)).toMatchObject([
      { deliverySupported: false, parentId: '202' },
    ]);
  });
  it('filters inactive two-level units and validates their parent', async () => {
    fetcher.mockResolvedValue(
      respond([
        {
          _id: 11,
          name: 'Active',
          type: 'ward',
          parent_id: 1000001,
          status: 1,
        },
        {
          _id: 12,
          name: 'Inactive',
          type: 'ward',
          parent_id: 1000001,
          status: 2,
        },
      ]),
    );
    expect(await provider.wards(1000001)).toMatchObject([
      { id: '11', name: 'Active', scheme: 'two_level' },
    ]);
  });
  it('rejects a wrong new-address parent in an upstream response', async () => {
    fetcher.mockResolvedValue(
      respond([
        {
          _id: 11,
          name: 'Wrong parent',
          type: 'ward',
          parent_id: 99,
          status: 1,
        },
      ]),
    );
    await expect(provider.wards(1000001)).rejects.toMatchObject({
      code: 'SHIPPING_INVALID_RESPONSE',
    });
  });
  it('does not turn null data for invalid province into valid address options', async () => {
    fetcher.mockResolvedValue(respond(null));
    await expect(provider.wards(123)).rejects.toMatchObject({
      code: 'SHIPPING_INVALID_RESPONSE',
    });
  });
  it('paginates before filtering inactive rows', async () => {
    const first = Array.from({ length: 200 }, (_, i) => ({
      _id: i + 1,
      name: `Inactive ${i}`,
      type: 'province',
      parent_id: 1,
      status: 2,
    }));
    fetcher
      .mockResolvedValueOnce(respond(first))
      .mockResolvedValueOnce(
        respond([
          { _id: 201, name: 'Last', type: 'province', parent_id: 1, status: 1 },
        ]),
      );
    expect(await provider.provinces()).toMatchObject([{ id: '201' }]);
    expect((fetcher.mock.calls[1][0] as URL).searchParams.get('offset')).toBe(
      '200',
    );
  });
  it('uses configured shop and service_type_id from available services', async () => {
    fetcher.mockResolvedValue(
      respond([
        { service_id: 53320, service_type_id: 2, short_name: 'Hàng nhẹ' },
      ]),
    );
    expect(await provider.getAvailableServices(quote)).toEqual([
      { typeId: 2, name: 'Hàng nhẹ' },
    ]);
    expect(body()).toEqual({
      shop_id: 123,
      from_district: 1452,
      to_district: 1444,
    });
  });
  it('returns no services for an empty list, never a fallback service', async () => {
    fetcher.mockResolvedValue(respond([]));
    expect(await provider.getAvailableServices(quote)).toEqual([]);
  });
  it('sends only documented fee fields and uses the carrier fee, including zero', async () => {
    fetcher.mockResolvedValue(respond({ total: 0, service_fee: 0 }));
    expect(await provider.calculateFee(quote)).toEqual({
      provider: 'ghn',
      actualFee: 0,
      currency: 'VND',
    });
    expect(body()).toEqual({
      from_district_id: 1452,
      to_district_id: 1444,
      to_ward_code: '00308',
      service_type_id: 2,
      weight: 600,
      length: 25,
      width: 20,
      height: 8,
      insurance_value: 285000,
      cod_value: 285000,
    });
  });
  it.each([-1, 1.5, '30000', null])('rejects invalid fee %s', async (total) => {
    fetcher.mockResolvedValue(respond({ total }));
    await expect(provider.calculateFee(quote)).rejects.toMatchObject({
      code: 'SHIPPING_INVALID_RESPONSE',
    });
  });
  it('interprets leadtime as seconds, not milliseconds, and excludes amount fields', async () => {
    fetcher.mockResolvedValue(respond({ leadtime: 1784221199 }));
    expect(await provider.estimateDelivery(quote)).toEqual({
      estimatedDeliveryAt: new Date(1784221199 * 1000).toISOString(),
    });
    expect(body()).not.toHaveProperty('cod_value');
    expect(body()).not.toHaveProperty('insurance_value');
  });
  it('handles unavailable ETA explicitly', async () => {
    fetcher.mockResolvedValue(respond({}));
    expect(await provider.estimateDelivery(quote)).toEqual({
      estimatedDeliveryAt: null,
    });
  });
  it('previews two-level addresses by canonical names without fabricating legacy IDs', async () => {
    fetcher.mockResolvedValue(
      respond({
        order_code: '',
        total_fee: 20900,
        expected_delivery_time: '2026-11-03T16:59:59Z',
      }),
    );
    expect(await provider.previewShipment(preview)).toMatchObject({
      actualFee: 20900,
      estimatedDeliveryAt: '2026-11-03T16:59:59.000Z',
    });
    expect((fetcher.mock.calls[0][0] as URL).pathname).toBe(
      '/shiip/public-api/v2/shipping-order/preview',
    );
    expect(body()).toMatchObject({
      is_new_to_address: true,
      to_province_name: 'Hồ Chí Minh',
      to_ward_name: 'Phường Vũng Tàu',
      payment_type_id: 1,
      cod_amount: 285000,
    });
    expect(body()).not.toHaveProperty('to_district_id');
    expect(body()).not.toHaveProperty('to_district_name');
  });
  it('rejects an unexpected shipment code from preview', async () => {
    fetcher.mockResolvedValue(
      respond({ order_code: 'UNEXPECTED', total_fee: 20900 }),
    );
    await expect(provider.previewShipment(preview)).rejects.toMatchObject({
      code: 'SHIPPING_INVALID_RESPONSE',
    });
  });
  it.each([
    { parcel: { ...parcel, weightGrams: 0 } },
    { parcel: { ...parcel, weightGrams: 20000 } },
    { parcel: { ...parcel, lengthCm: 201 } },
    { parcel: { ...parcel, declaredValue: 5000001 } },
    { codAmount: 50000001 },
    { serviceTypeId: 5 },
  ])(
    'rejects invalid or unsupported parcel before network IO: %o',
    async (patch) => {
      await expect(
        provider.previewShipment({ ...preview, ...patch }),
      ).rejects.toThrow();
      expect(fetcher).not.toHaveBeenCalled();
    },
  );
  it('rejects invalid recipient locally', async () => {
    await expect(
      provider.previewShipment({
        ...preview,
        recipient: { ...preview.recipient, phone: 'invalid' },
      }),
    ).rejects.toThrow('SHIPPING_RECIPIENT_INVALID');
    expect(fetcher).not.toHaveBeenCalled();
  });
});
