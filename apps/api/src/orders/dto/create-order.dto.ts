import {
  IsNotEmpty,
  IsString,
  IsArray,
  ValidateNested,
  IsInt,
  Min,
  IsOptional,
  IsUUID,
  Max,
  ArrayMinSize,
  ArrayMaxSize,
  MaxLength,
  // IsPhoneNumber,
  // IsEnum,
} from 'class-validator';
import { LegalAcceptanceDto } from '../../legal/legal-acceptance';
import { Type } from 'class-transformer';

class CartItemDto {
  @IsUUID()
  productId: string;

  @IsInt()
  @Min(1)
  @Max(100)
  quantity: number;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  variantId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
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
  @IsUUID()
  idempotencyKey: string;
  @IsOptional()
  @ValidateNested()
  @Type(() => LegalAcceptanceDto)
  legalAcceptance?: LegalAcceptanceDto;

  @IsOptional()
  @IsUUID()
  shippingQuoteReference?: string;
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
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

  @IsOptional()
  @IsString()
  @MaxLength(2048)
  turnstileToken?: string;
}
