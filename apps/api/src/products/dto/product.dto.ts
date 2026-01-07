import {
  IsString,
  IsNumber,
  IsOptional,
  IsBoolean,
  IsArray,
  IsInt,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateProductDto {
  @IsString()
  title_en: string;

  @IsString()
  title_vi: string;

  @IsString()
  desc_en: string;

  @IsString()
  desc_vi: string;

  @IsNumber()
  price: number | string;

  @IsOptional()
  @IsNumber()
  original_price?: number | string;

  @IsString()
  slug: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsNumber()
  quantity?: number | string;

  @IsOptional()
  variants?: any;

  @IsOptional()
  specifications_en?: any;

  @IsOptional()
  specifications_vi?: any;

  @IsOptional()
  seo_title_en?: string;

  @IsOptional()
  seo_title_vi?: string;

  @IsOptional()
  seo_desc_en?: string;

  @IsOptional()
  seo_desc_vi?: string;

  @IsOptional()
  images?: string[]; // URLs

  @IsOptional()
  style?: string;

  @IsOptional()
  is_featured?: boolean | string;

  @IsOptional()
  featured_section?: string;

  @IsOptional()
  discount_percentage?: number | string;

  @IsOptional()
  discount_start_date?: string;

  @IsOptional()
  discount_end_date?: string;
}

export class UpdateProductDto {
  @IsOptional()
  price?: number | string;

  @IsOptional()
  original_price?: number | string;

  @IsOptional()
  category?: string;

  @IsOptional()
  slug?: string;

  // Add other fields as optional...
  // For brevity, using mapped types or PartialType from mapped-types is better but class-validator requires decorators.
  // I'll define common update fields.
  @IsOptional()
  quantity?: number | string;

  @IsOptional()
  is_active?: boolean | string;

  @IsOptional()
  keep_images?: string | string[];

  // Missing fields for update
  @IsOptional()
  is_featured?: boolean | string;

  @IsOptional()
  featured_section?: string;

  @IsOptional()
  discount_percentage?: number | string;

  @IsOptional()
  discount_start_date?: string;

  @IsOptional()
  discount_end_date?: string;

  @IsOptional()
  variants?: any;

  // Translation fields (optional for update)
  @IsOptional()
  title_en?: string;
  @IsOptional()
  title_vi?: string;
  @IsOptional()
  desc_en?: string;
  @IsOptional()
  desc_vi?: string;
  @IsOptional()
  specifications_en?: any;
  @IsOptional()
  specifications_vi?: any;
  @IsOptional()
  seo_title_en?: string;
  @IsOptional()
  seo_title_vi?: string;
  @IsOptional()
  seo_desc_en?: string;
  @IsOptional()
  seo_desc_vi?: string;
}
