import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  ParseUUIDPipe,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { ShippingTrackingService } from './tracking.service';
import type { Actor } from './fulfillment.service';
@Controller('shipping')
export class ShippingTrackingController {
  constructor(private readonly service: ShippingTrackingService) {}
  @Get('track/:orderId')
  @UseGuards(AuthGuard)
  track(
    @Param('orderId', ParseUUIDPipe) id: string,
    @Request() req: { user: Actor },
  ) {
    return this.service.track(id, req.user);
  }
  @Post('webhooks/ghn')
  receive(
    @Headers('x-ghn-secret') secret: string | undefined,
    @Body() body: unknown,
  ) {
    return this.service.receive(secret, body);
  }
}
