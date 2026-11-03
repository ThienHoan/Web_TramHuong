import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsBoolean,
  IsDateString,
  IsIn,
  Min,
  IsInt,
  ValidateIf,
} from 'class-validator';

export class CreateVoucherDto {
  @IsString()
  @IsNotEmpty()
  code: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsIn(['PERCENTAGE', 'FIXED_AMOUNT'])
  discount_type: 'PERCENTAGE' | 'FIXED_AMOUNT';

  @ValidateIf(o => o.discount_value !== undefined || o.discount_amount === undefined)
  @IsNumber()
  @Min(0.01)
  discount_value?: number;

  // Optional frontend alias
  @IsOptional()
  @IsNumber()
  @Min(0.01)
  discount_amount?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  min_order_value?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  max_discount_amount?: number;

  @IsDateString()
  start_date: string;

  @IsDateString()
  end_date: string;

  @IsInt()
  @Min(1)
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
  @IsNotEmpty()
  code?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsIn(['PERCENTAGE', 'FIXED_AMOUNT'])
  discount_type?: 'PERCENTAGE' | 'FIXED_AMOUNT';

  @IsOptional()
  @IsNumber()
  discount_value?: number;

  @IsOptional()
  @IsNumber()
  @Min(0.01)
  discount_amount?: number; // Alias

  @IsOptional()
  @IsNumber()
  @Min(0)
  min_order_value?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  max_discount_amount?: number;

  @IsOptional()
  @IsDateString()
  start_date?: string;

  @IsOptional()
  @IsDateString()
  end_date?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  usage_limit?: number;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}

export class ValidateVoucherDto {
  @IsString()
  @IsNotEmpty()
  code: string;

  @IsNumber()
  cartTotal: number;
}
