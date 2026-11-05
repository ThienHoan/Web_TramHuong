import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Matches,
  Max,
  Min,
} from 'class-validator';

export class CatalogAdvisorDto {
  @IsString() @Length(2, 120) query: string;
  @IsIn(['vi', 'en']) locale: 'vi' | 'en';
  @IsOptional() @IsInt() @Min(0) @Max(1000000000000) minPrice?: number;
  @IsOptional() @IsInt() @Min(0) @Max(1000000000000) maxPrice?: number;
  @IsOptional()
  @IsString()
  @Matches(/^[a-zA-Z0-9_-]{1,100}$/)
  categoryId?: string;
}
