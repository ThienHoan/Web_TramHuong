import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ValidateNested } from 'class-validator';
import { ShippingDestinationDto } from './address.dto';
import { Matches } from 'class-validator';
export class ShipmentDetailsDto {
  @IsUUID() requestId: string;
  @IsOptional() @IsString() @MaxLength(200) recipientName?: string;
  @IsOptional()
  @IsString()
  @Matches(/^(0\d{9}|\+84\d{9})$/)
  recipientPhone?: string;
  @IsOptional() @IsString() @MaxLength(1024) recipientAddress?: string;
  @IsOptional()
  @ValidateNested()
  @Type(() => ShippingDestinationDto)
  destination?: ShippingDestinationDto;
  @IsOptional() @IsString() @MaxLength(5000) note?: string;
}
export class PrepareOrderDto {
  @IsUUID() requestId: string;
  @IsUUID() warehouseId: string;
  @ValidateNested()
  @Type(() => ShippingDestinationDto)
  destination: ShippingDestinationDto;
}

export class ShippingListDto {
  @IsOptional()
  @IsIn([
    'shipment',
    'exception',
    'return',
    'cod',
    'ticket',
    'warehouse',
    'profile',
    'inventory',
    'inbox',
    'action',
    'notification',
    'promotion',
  ])
  kind:
    | 'shipment'
    | 'exception'
    | 'return'
    | 'cod'
    | 'ticket'
    | 'warehouse'
    | 'profile'
    | 'inventory'
    | 'inbox'
    | 'action'
    | 'notification'
    | 'promotion' = 'shipment';
  @IsOptional() @IsString() @MaxLength(60) state?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100000) page = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit = 20;
  @IsOptional() @IsUUID() orderId?: string;
  @IsOptional() @IsDateString() from?: string;
  @IsOptional() @IsDateString() to?: string;
}
export class ActionDto {
  @IsOptional() @IsUUID() assigneeId?: string;
  @IsUUID() requestId: string;
  @IsOptional()
  @IsIn(['cancel', 'return', 'redeliver', 'updateCod', 'update'])
  action?: 'cancel' | 'return' | 'redeliver' | 'updateCod' | 'update';
  @IsOptional() @IsInt() @Min(0) @Max(50000000) amount?: number;
  @IsOptional() @IsString() @MaxLength(5000) note?: string;
  @IsOptional() @IsInt() @Min(1) pickShift?: number;
}
export class LabelsDto extends ActionDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @IsUUID('all', { each: true })
  orderIds: string[];
}
export class SupportDto extends ActionDto {
  @IsUUID() orderId: string;
  @IsIn(['Tư vấn', 'Khiếu nại', 'Hối Giao/Lấy/Trả hàng', 'Thay đổi thông tin'])
  category: string;
  @IsString() @MaxLength(2000) description: string;
}
export class DecisionDto extends ActionDto {
  @IsIn(['approve', 'reject', 'receive']) decision:
    | 'approve'
    | 'reject'
    | 'receive';
}
export class ReceiptDto extends ActionDto {
  @IsIn(['bank_confirmed', 'collected']) type: 'bank_confirmed' | 'collected';
  @IsString() @MaxLength(500) proof: string;
}
export class TicketActionDto extends ActionDto {
  @IsIn(['send', 'reply', 'refresh', 'note']) operation:
    | 'send'
    | 'reply'
    | 'refresh'
    | 'note';
}
export class ConfigureDto {
  @IsIn(['warehouse', 'profile', 'inventory', 'promotion']) kind:
    | 'warehouse'
    | 'profile'
    | 'inventory'
    | 'promotion';
  @IsOptional() @IsUUID() id?: string;
  @IsInt() @Min(0) version: number;
  @IsOptional() @IsUUID() productId?: string;
  @IsOptional() @IsString() @MaxLength(150) variantId?: string;
  @IsOptional() @IsUUID() warehouseId?: string;
  @IsOptional() @IsString() @MaxLength(150) name?: string;
  @IsOptional() @IsBoolean() active?: boolean;
  @IsOptional() @IsInt() @Min(1) shopId?: number;
  @IsOptional() @IsInt() @Min(1) districtId?: number;
  @IsOptional() @IsInt() @Min(1) @Max(50000) tareGrams?: number;
  @IsOptional() @IsInt() @Min(1) @Max(20) paddingCm?: number;
  @IsOptional() @IsInt() @Min(1) @Max(50000) weightGrams?: number;
  @IsOptional() @IsInt() @Min(1) @Max(200) lengthCm?: number;
  @IsOptional() @IsInt() @Min(1) @Max(200) widthCm?: number;
  @IsOptional() @IsInt() @Min(1) @Max(200) heightCm?: number;
  @IsOptional() @IsInt() @Min(0) unitCost?: number;
  @IsOptional() @IsInt() @Min(0) available?: number;
  @IsOptional() @IsInt() @Min(0) minSubtotal?: number;
  @IsOptional() @IsInt() @Min(0) maxSubsidy?: number;
  @IsOptional() @IsInt() @Min(0) minMargin?: number;
}
