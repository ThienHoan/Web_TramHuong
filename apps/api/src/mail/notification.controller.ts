import {
  Body,
  Controller,
  Get,
  Header,
  Post,
  Query,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsUUID,
  Max,
  Min,
  ValidateIf,
} from 'class-validator';
import { Throttle } from '@nestjs/throttler';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '../auth/role.enum';
import { NotificationDeliveryService } from './notification-delivery.service';
import {
  NOTIFICATION_EVENTS,
  type NotificationEvent,
} from './notification.repository';
class MockIntent {
  @IsIn(['mock']) source: 'mock';
}
class CaptureIntent extends MockIntent {
  @IsUUID() orderId: string;
  @IsIn(NOTIFICATION_EVENTS) event: NotificationEvent;
}
class ReconcileIntent extends MockIntent {
  @ValidateIf((_object: unknown, value: unknown) => value !== undefined)
  @IsUUID()
  afterId?: string;
}
class HistoryQuery {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(1000) page = 1;
}
@Controller('admin/notifications')
@UseGuards(AuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@UsePipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }),
)
export class NotificationController {
  constructor(private readonly notifications: NotificationDeliveryService) {}
  @Get('deliveries')
  @Header('Cache-Control', 'no-store')
  list(@Query() query: HistoryQuery) {
    return this.notifications.list(query.page);
  }
  @Post('capture')
  @Header('Cache-Control', 'no-store')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  capture(@Body() body: CaptureIntent) {
    return this.notifications.capture(body.orderId, body.event);
  }
  @Post('drain')
  @Header('Cache-Control', 'no-store')
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  drain(@Body() body: MockIntent) {
    if (body.source === 'mock') return this.notifications.drain();
  }
  @Post('reconcile')
  @Header('Cache-Control', 'no-store')
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  reconcile(@Body() body: ReconcileIntent) {
    return this.notifications.reconcile(body.afterId);
  }
  @Post('reconcile-shipments')
  @Header('Cache-Control', 'no-store')
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  reconcileShipments(@Body() body: ReconcileIntent) {
    return this.notifications.reconcileShipments(body.afterId);
  }
}
