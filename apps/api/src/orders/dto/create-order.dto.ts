import {
  IsNotEmpty,
  IsString,
  IsArray,
  ValidateNested,
  IsNumber,
  IsOptional,
  // IsPhoneNumber,
  // IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';

class CartItemDto {
  @IsString()
  @IsNotEmpty()
  productId: string;

  @IsNumber()
  quantity: number;

  @IsOptional()
  @IsString()
  variantId?: string;

  @IsOptional()
  @IsString()
  variantName?: string;
}

class ShippingInfoDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  phone: string;
  // Ideally @IsPhoneNumber('VN') but strictness might block legitimate weird formats.
  // Given the requirement for strictness, let's keep it string but maybe add regex manually if needed.
  // User asked for "Inputmode / type phù hợp (phone -> numeric keypad)", which is frontend.
  // Backend validation: IsString + IsNotEmpty is baseline.

  @IsString()
  @IsNotEmpty()
  address: string;

  @IsString()
  @IsNotEmpty()
  city: string; // Province

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  full_address?: string;
}

export class CreateOrderDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CartItemDto)
  items: CartItemDto[];

  @ValidateNested()
  @Type(() => ShippingInfoDto)
  shipping_info: ShippingInfoDto;

  @IsString()
  @IsNotEmpty()
  paymentMethod: string;

  @IsOptional()
  @IsString()
  voucherCode?: string;
}
