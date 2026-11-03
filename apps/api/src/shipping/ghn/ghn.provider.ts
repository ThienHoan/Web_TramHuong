import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import type {
  AddressScheme,
  CarrierFee,
  DeliveryEstimate,
  ShippingAddressOption,
  ShippingPreviewInput,
  ShippingPreviewProvider,
  ShippingQuoteInput,
  ShippingQuoteProvider,
  ShippingRoute,
  ShippingService,
} from '../contracts/shipping-provider';
import { GHN_CONFIG, type GhnConfig } from './ghn.config';
import { GhnClient } from './ghn.client';
import { integer, isoDate, list, object, string } from './ghn.decode';

@Injectable()
export class GhnProvider
  implements ShippingQuoteProvider, ShippingPreviewProvider
{
  constructor(
    private readonly client: GhnClient,
    @Inject(GHN_CONFIG) private readonly config: GhnConfig,
  ) {}

  forShop(shopId: number): GhnProvider {
    return new GhnProvider(this.client.forShop(shopId), {
      ...this.config,
      shopId,
    });
  }

  legacyProvinces(): Promise<ShippingAddressOption[]> {
    return this.client.request('legacyProvinces', {}, (value) =>
      list(value, (row) => ({
        id: String(integer(row.ProvinceID, 1)),
        name: string(row.ProvinceName),
        scheme: 'legacy',
        level: 'province',
      })),
    );
  }

  legacyDistricts(provinceId: number): Promise<ShippingAddressOption[]> {
    this.positiveId(provinceId);
    return this.client.request(
      'legacyDistricts',
      { province_id: provinceId },
      (value) =>
        list(value, (row) => ({
          id: String(integer(row.DistrictID, 1)),
          name: string(row.DistrictName),
          scheme: 'legacy',
          level: 'district',
          parentId: String(provinceId),
          deliverySupported: [2, 3].includes(integer(row.SupportType, 0, 3)),
        })),
    );
  }

  legacyWards(districtId: number): Promise<ShippingAddressOption[]> {
    this.positiveId(districtId);
    return this.client.request(
      'legacyWards',
      { district_id: districtId },
      (value) =>
        list(value, (row) => ({
          id: string(row.WardCode),
          name: string(row.WardName),
          scheme: 'legacy',
          level: 'ward',
          parentId: String(districtId),
          deliverySupported: [2, 3].includes(integer(row.SupportType, 0, 3)),
        })),
    );
  }

  provinces(): Promise<ShippingAddressOption[]> {
    return this.newAddresses('province');
  }

  wards(provinceId: number): Promise<ShippingAddressOption[]> {
    this.positiveId(provinceId);
    return this.newAddresses('ward', provinceId);
  }

  private async newAddresses(
    level: 'province' | 'ward',
    parentId?: number,
  ): Promise<ShippingAddressOption[]> {
    const result: ShippingAddressOption[] = [];
    // Bounded pagination, independent of today's administrative unit counts.
    for (let offset = 0; offset < 10000; offset += 200) {
      const page = await this.client.request(
        level === 'province' ? 'provinces' : 'wards',
        {
          offset,
          limit: 200,
          ...(parentId === undefined ? {} : { province_id: parentId }),
        },
        (value) =>
          list(value, (row) => {
            if (
              row.type !== level ||
              (parentId !== undefined && row.parent_id !== parentId)
            )
              throw new Error('Wrong address hierarchy');
            return {
              id: String(integer(row._id, 1)),
              name: string(row.name),
              scheme: 'two_level' as AddressScheme,
              level,
              parentId: String(integer(row.parent_id, 1)),
              status: integer(row.status, 1, 10),
            };
          }),
      );
      result.push(
        ...page
          .filter((row) => row.status === 1)
          .map((row) => ({
            id: row.id,
            name: row.name,
            scheme: row.scheme,
            level: row.level,
            parentId: row.parentId,
          })),
      );
      if (page.length < 200) return result;
    }
    throw new BadRequestException('SHIPPING_ADDRESS_PAGINATION_LIMIT');
  }

  getAvailableServices(input: ShippingRoute): Promise<ShippingService[]> {
    this.positiveId(input.originDistrictId);
    this.positiveId(input.destinationDistrictId);
    return this.client.request(
      'services',
      {
        shop_id: this.config.shopId,
        from_district: input.originDistrictId,
        to_district: input.destinationDistrictId,
      },
      (value) =>
        list(value, (row) => ({
          typeId: integer(row.service_type_id, 1),
          name: string(row.short_name),
        })),
    );
  }

  calculateFee(input: ShippingQuoteInput): Promise<CarrierFee> {
    return this.client.request('fee', this.quotePayload(input), (value) => ({
      provider: 'ghn',
      actualFee: integer(object(value).total),
      currency: 'VND',
    }));
  }

  estimateDelivery(input: ShippingQuoteInput): Promise<DeliveryEstimate> {
    return this.client.request(
      'leadtime',
      this.quotePayload(input, false),
      (value) => {
        const data = object(value);
        if (data.leadtime === undefined || data.leadtime === null)
          return { estimatedDeliveryAt: null };
        const seconds = integer(data.leadtime, 1, 253402300799);
        return { estimatedDeliveryAt: new Date(seconds * 1000).toISOString() };
      },
    );
  }

  async previewShipment(
    input: ShippingPreviewInput,
  ): Promise<CarrierFee & DeliveryEstimate> {
    this.validateParcel(input);
    const { destination, recipient } = input;
    if (
      destination.provider !== 'ghn' ||
      !destination.province?.name ||
      !destination.ward?.name ||
      (destination.scheme === 'legacy' && !destination.district?.name)
    )
      throw new BadRequestException('SHIPPING_ADDRESS_INVALID');
    if (
      !recipient.name.trim() ||
      recipient.name.length > 1024 ||
      !recipient.address.trim() ||
      recipient.address.length > 1024 ||
      !/^(0\d{9}|\+84\d{9})$/.test(recipient.phone) ||
      !input.content.trim() ||
      input.content.length > 2000
    ) {
      throw new BadRequestException('SHIPPING_RECIPIENT_INVALID');
    }
    return this.client.request(
      'preview',
      {
        to_name: recipient.name,
        to_phone: recipient.phone,
        to_address: recipient.address,
        to_province_name: destination.province.name,
        to_ward_name: destination.ward.name,
        ...(destination.scheme === 'legacy'
          ? { to_district_name: destination.district!.name }
          : {}),
        is_new_to_address: destination.scheme === 'two_level',
        weight: input.parcel.weightGrams,
        length: input.parcel.lengthCm,
        width: input.parcel.widthCm,
        height: input.parcel.heightCm,
        insurance_value: input.parcel.declaredValue,
        cod_amount: input.codAmount,
        service_type_id: input.serviceTypeId,
        // Shop pays the provider; what the customer pays is a separate policy.
        payment_type_id: 1,
        required_note: 'KHONGCHOXEMHANG',
        content: input.content,
      },
      (value) => {
        const data = object(value);
        if (data.order_code !== '')
          throw new Error('Preview unexpectedly returned a shipment');
        return {
          provider: 'ghn',
          actualFee: integer(data.total_fee),
          currency: 'VND',
          estimatedDeliveryAt: isoDate(data.expected_delivery_time),
        };
      },
    );
  }

  private quotePayload(
    input: ShippingQuoteInput,
    includeAmounts = true,
  ): Record<string, unknown> {
    this.validateParcel(input);
    this.positiveId(input.originDistrictId);
    this.positiveId(input.destinationDistrictId);
    if (!input.destinationWardCode.trim())
      throw new BadRequestException('SHIPPING_ADDRESS_INVALID');
    return {
      from_district_id: input.originDistrictId,
      ...(input.originWardCode ? { from_ward_code: input.originWardCode } : {}),
      to_district_id: input.destinationDistrictId,
      to_ward_code: input.destinationWardCode,
      service_type_id: input.serviceTypeId,
      weight: input.parcel.weightGrams,
      length: input.parcel.lengthCm,
      width: input.parcel.widthCm,
      height: input.parcel.heightCm,
      ...(includeAmounts
        ? {
            insurance_value: input.parcel.declaredValue,
            cod_value: input.codAmount,
          }
        : {}),
    };
  }

  private positiveId(value: number): void {
    if (!Number.isSafeInteger(value) || value <= 0)
      throw new BadRequestException('SHIPPING_LOCATION_ID_INVALID');
  }

  private validateParcel(
    input: Pick<ShippingQuoteInput, 'parcel' | 'codAmount' | 'serviceTypeId'>,
  ): void {
    const p = input.parcel;
    const bounded = (v: number, min: number, max: number) =>
      Number.isSafeInteger(v) && v >= min && v <= max;
    if (
      !bounded(p.weightGrams, 1, 50000) ||
      ![p.lengthCm, p.widthCm, p.heightCm].every((v) => bounded(v, 1, 200)) ||
      !bounded(p.declaredValue, 0, 5000000) ||
      !bounded(input.codAmount, 0, 50000000)
    )
      throw new BadRequestException('SHIPPING_PARCEL_INVALID');
    // Multi-parcel / heavy shipping requires verified item-level packaging.
    // Reject explicitly until that application flow exists; never silently
    // quote heavy goods with an incomplete lightweight payload.
    if (input.serviceTypeId !== 2 || p.weightGrams >= 20000)
      throw new BadRequestException('SHIPPING_HEAVY_PARCEL_NOT_SUPPORTED');
  }
}
