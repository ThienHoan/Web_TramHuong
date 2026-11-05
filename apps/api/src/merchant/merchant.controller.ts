import {
  Body,
  Controller,
  Get,
  Header,
  Post,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsIn,
  IsInt,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import { Throttle } from '@nestjs/throttler';
import { MerchantService } from './merchant.service';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '../auth/role.enum';
import { MerchantDeliveryService } from './merchant-delivery.service';

class MerchantPreviewDto {
  @IsIn(['mock']) source: 'mock';
}
class MerchantQueueDto extends MerchantPreviewDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(20)
  @ArrayUnique()
  @IsUUID(undefined, { each: true })
  productIds: string[];
}
class MerchantPageDto extends MerchantPreviewDto {
  @IsInt() @Min(1) @Max(1000) page: number;
}
@Controller('merchant')
@UseGuards(AuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class MerchantController {
  constructor(
    private readonly merchantService: MerchantService,
    private readonly delivery: MerchantDeliveryService,
  ) {}

  @Post('queue')
  @Header('Cache-Control', 'no-store')
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @UsePipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  )
  queue(@Body() body: MerchantQueueDto) {
    return this.delivery.queue(body.productIds);
  }
  @Post('reconcile')
  @Header('Cache-Control', 'no-store')
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @UsePipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  )
  reconcile(@Body() body: MerchantPageDto) {
    return this.delivery.reconcile(body.page);
  }
  @Post('drain')
  @Header('Cache-Control', 'no-store')
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @UsePipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  )
  drain(@Body() body: MerchantPreviewDto) {
    if (body.source === 'mock') return this.delivery.drain();
  }

  @Get('sync-status')
  @Header('Cache-Control', 'no-store')
  status() {
    return this.merchantService.status();
  }

  @Post('sync')
  @Header('Cache-Control', 'no-store')
  @Throttle({ default: { limit: 4, ttl: 60000 } })
  @UsePipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  )
  async syncProducts(@Body() body: MerchantPreviewDto) {
    return this.merchantService.syncProducts(body.source);
  }
}
