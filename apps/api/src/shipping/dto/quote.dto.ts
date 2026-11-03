import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { ShippingDestinationDto } from './address.dto';
export class QuoteItemDto {
  @IsUUID() productId: string;
  @IsInt() @Min(1) @Max(100) quantity: number;
  @IsOptional() @IsString() @MaxLength(150) variantId?: string;
}
export class QuoteRecipientDto {
  @IsString() @IsNotEmpty() @MaxLength(200) name: string;
  @IsString() @Matches(/^(0\d{9}|\+84\d{9})$/) phone: string;
  @IsString() @IsNotEmpty() @MaxLength(1024) address: string;
}
export class QuoteDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => QuoteItemDto)
  items: QuoteItemDto[];
  @ValidateNested()
  @Type(() => ShippingDestinationDto)
  destination: ShippingDestinationDto;
  @ValidateNested() @Type(() => QuoteRecipientDto) recipient: QuoteRecipientDto;
  @IsUUID() warehouseId: string;
  @IsIn(['cod', 'sepay']) paymentMethod: 'cod' | 'sepay';
  @IsOptional() @IsString() @MaxLength(50) voucherCode?: string;
}
