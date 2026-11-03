import { Body, Controller, Get, Inject, Post, Query } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ShippingAddressService } from './address.service';
import {
  DistrictQueryDto,
  ProvinceQueryDto,
  ShippingDestinationDto,
} from './dto/address.dto';
import { GHN_CONFIG, type GhnConfig } from './ghn/ghn.config';
import { LOGISTICS_SETTINGS, type LogisticsSettings } from './logistics.types';

// Public, non-sensitive master-data endpoints. The AppModule's global
// ThrottlerGuard applies; no GHN URL, token or arbitrary payload proxy exists.
@Controller('shipping')
@Throttle({ default: { limit: 30, ttl: 60000 } })
export class ShippingController {
  constructor(
    private readonly addresses: ShippingAddressService,
    @Inject(GHN_CONFIG) private readonly config: GhnConfig,
    @Inject(LOGISTICS_SETTINGS) private readonly settings: LogisticsSettings,
  ) {}

  @Get('status')
  status() {
    return {
      enabled: this.config.enabled,
      provider: 'ghn',
      checkoutEnabled: this.config.enabled && this.settings.checkout,
    };
  }

  @Get('addresses/provinces')
  provinces() {
    return this.addresses.provinces();
  }

  @Get('addresses/wards')
  wards(@Query() query: ProvinceQueryDto) {
    return this.addresses.wards(query.provinceId);
  }

  @Get('addresses/legacy/provinces')
  legacyProvinces() {
    return this.addresses.legacyProvinces();
  }

  @Get('addresses/legacy/districts')
  districts(@Query() query: ProvinceQueryDto) {
    return this.addresses.legacyDistricts(query.provinceId);
  }

  @Get('addresses/legacy/wards')
  legacyWards(@Query() query: DistrictQueryDto) {
    return this.addresses.legacyWards(query.districtId);
  }

  @Post('addresses/validate')
  validate(@Body() body: ShippingDestinationDto) {
    return this.addresses.validate(body);
  }
}
