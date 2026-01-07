import { IsNotEmpty, IsString } from 'class-validator';

export class LookupOrderDto {
  @IsString()
  @IsNotEmpty()
  orderCode: string;

  @IsString()
  @IsNotEmpty()
  emailOrPhone: string;
}
