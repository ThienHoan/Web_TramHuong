import { Controller, Get, Query, UseGuards, Header } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '../auth/role.enum';
import { Public } from '../auth/public.decorator';
import { CollectionPolicyService } from './collection-policy.service';
import {
  Post,
  Param,
  ParseUUIDPipe,
  Body,
  Req,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { IsIn } from 'class-validator';
import { Throttle } from '@nestjs/throttler';
import { PurchaseCaptureService } from './purchase-capture.service';

class CapturePurchaseDto {
  @IsIn(['granted'])
  consent: 'granted';
}

@Controller('analytics')
@UseGuards(AuthGuard, RolesGuard)
export class AnalyticsController {
  constructor(
    private readonly analyticsService: AnalyticsService,
    private readonly collectionPolicy: CollectionPolicyService,
    private readonly purchaseCapture: PurchaseCaptureService,
  ) {}

  @Get('collection-policy')
  @Header('Cache-Control', 'no-store')
  @Public()
  getCollectionPolicy() {
    return this.collectionPolicy.getPolicy();
  }

  @Post('purchases/:orderId')
  @Header('Cache-Control', 'no-store')
  @Roles(Role.CUSTOMER, Role.ADMIN, Role.STAFF)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @UsePipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  )
  capturePurchase(
    @Param('orderId', new ParseUUIDPipe({ version: '4' })) orderId: string,
    @Body() _body: CapturePurchaseDto,
    @Req() req: { user: { id: string } },
  ) {
    return this.purchaseCapture.capture(orderId, req.user.id);
  }

  @Get('dashboard')
  @Roles(Role.ADMIN) // RBAC Protection
  async getDashboardData(@Query('range') range: string) {
    return this.analyticsService.getDashboardData(range);
  }
}
