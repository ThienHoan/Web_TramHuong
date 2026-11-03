import { Type } from 'class-transformer';
import {
  IsDefined,
  IsIn,
  IsInt,
  IsString,
  Matches,
  Max,
  Min,
  ValidateIf,
} from 'class-validator';
import type { AddressScheme } from '../contracts/shipping-provider';

export class ProvinceQueryDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(Number.MAX_SAFE_INTEGER)
  provinceId: number;
}

export class DistrictQueryDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(Number.MAX_SAFE_INTEGER)
  districtId: number;
}

export class ShippingDestinationDto extends ProvinceQueryDto {
  @IsIn(['legacy', 'two_level'])
  scheme: AddressScheme;

  @ValidateIf(
    (value: ShippingDestinationDto) =>
      value.scheme === 'legacy' || value.districtId !== undefined,
  )
  @IsDefined()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(Number.MAX_SAFE_INTEGER)
  districtId?: number;

  @IsString()
  @Matches(/^\d{1,20}$/)
  wardCode: string;
}
