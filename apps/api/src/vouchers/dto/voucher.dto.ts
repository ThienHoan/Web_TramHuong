import {
  IsString,
  IsNumber,
  IsOptional,
  IsBoolean,
  IsDateString,
} from 'class-validator';

export class CreateVoucherDto {
  @IsString()
  code: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  discount_type: 'PERCENTAGE' | 'FIXED_AMOUNT';

  @IsNumber()
  discount_value: number;

  // Optional frontend alias
  @IsOptional()
  @IsNumber()
  discount_amount?: number;

  @IsNumber()
  @IsOptional()
  min_order_value?: number;

  @IsNumber()
  @IsOptional()
  max_discount_amount?: number;

  @IsDateString()
  start_date: string;

  @IsDateString()
  end_date: string;

  @IsNumber()
  @IsOptional()
  usage_limit?: number;

  @IsBoolean()
  @IsOptional()
  is_active?: boolean;
}

export class UpdateVoucherDto {
  // Partial of CreateVoucherDto essentially
  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  discount_type?: 'PERCENTAGE' | 'FIXED_AMOUNT';

  @IsOptional()
  @IsNumber()
  discount_value?: number;

  @IsOptional()
  @IsNumber()
  discount_amount?: number; // Alias

  @IsOptional()
  @IsNumber()
  min_order_value?: number;

  @IsOptional()
  @IsNumber()
  max_discount_amount?: number;

  @IsOptional()
  @IsDateString()
  start_date?: string;

  @IsOptional()
  @IsDateString()
  end_date?: string;

  @IsOptional()
  @IsNumber()
  usage_limit?: number;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}

export class ValidateVoucherDto {
  @IsString()
  code: string;

  @IsNumber()
  cartTotal: number;
}
