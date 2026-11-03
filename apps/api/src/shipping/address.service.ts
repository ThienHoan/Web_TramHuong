import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import type {
  ShippingAddressOption,
  VerifiedShippingAddress,
} from './contracts/shipping-provider';
import { ShippingDestinationDto } from './dto/address.dto';
import { GhnProvider } from './ghn/ghn.provider';
import { GHN_CONFIG, type GhnConfig } from './ghn/ghn.config';

@Injectable()
export class ShippingAddressService {
  constructor(
    private readonly provider: GhnProvider,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
    @Inject(GHN_CONFIG) private readonly config: GhnConfig,
  ) {}

  provinces(): Promise<ShippingAddressOption[]> {
    return this.lookup('new:provinces', () => this.provider.provinces());
  }
  wards(provinceId: number): Promise<ShippingAddressOption[]> {
    return this.lookup(`new:wards:${provinceId}`, () =>
      this.provider.wards(provinceId),
    );
  }
  legacyProvinces(): Promise<ShippingAddressOption[]> {
    return this.lookup('legacy:provinces', () =>
      this.provider.legacyProvinces(),
    );
  }
  legacyDistricts(provinceId: number): Promise<ShippingAddressOption[]> {
    return this.lookup(`legacy:districts:${provinceId}`, () =>
      this.provider.legacyDistricts(provinceId),
    );
  }
  legacyWards(districtId: number): Promise<ShippingAddressOption[]> {
    return this.lookup(`legacy:wards:${districtId}`, () =>
      this.provider.legacyWards(districtId),
    );
  }

  async validate(
    input: ShippingDestinationDto,
  ): Promise<VerifiedShippingAddress> {
    const select = (options: ShippingAddressOption[], id: string) => {
      const option = options.find((row) => row.id === id);
      if (!option) throw new BadRequestException('SHIPPING_ADDRESS_NOT_FOUND');
      return option;
    };
    if (input.scheme === 'two_level') {
      if (input.districtId !== undefined)
        throw new BadRequestException('SHIPPING_NEW_ADDRESS_HAS_NO_DISTRICT');
      const province = select(await this.provinces(), String(input.provinceId));
      const ward = select(await this.wards(input.provinceId), input.wardCode);
      // New catalog does not attest delivery service eligibility. Only preview
      // can validate the route. Do not turn a catalog match into a guarantee.
      return {
        provider: 'ghn',
        scheme: 'two_level',
        province,
        ward,
        eligibility: 'provider_validation_required',
      };
    }
    if (input.scheme !== 'legacy' || !input.districtId)
      throw new BadRequestException('SHIPPING_LEGACY_DISTRICT_REQUIRED');
    const province = select(
      await this.legacyProvinces(),
      String(input.provinceId),
    );
    const district = select(
      await this.legacyDistricts(input.provinceId),
      String(input.districtId),
    );
    const ward = select(
      await this.legacyWards(input.districtId),
      input.wardCode,
    );
    if (!district.deliverySupported || !ward.deliverySupported)
      throw new BadRequestException('SHIPPING_DELIVERY_UNSUPPORTED');
    return {
      provider: 'ghn',
      scheme: 'legacy',
      province,
      district,
      ward,
      eligibility: 'eligible',
    };
  }

  private async lookup(
    key: string,
    fetch: () => Promise<ShippingAddressOption[]>,
  ): Promise<ShippingAddressOption[]> {
    if (!this.config.enabled) {
      // Delegate to the disabled client for a consistent, redacted error.
      return fetch();
    }
    const cacheKey = `ghn:addresses:v1:${this.config.environment}:${this.config.shopId}:${key}`;
    const cached = await this.cache.get<ShippingAddressOption[]>(cacheKey);
    if (cached !== undefined && cached !== null) return cached;
    const result = await fetch();
    await this.cache.set(cacheKey, result, 300000);
    return result;
  }
}
