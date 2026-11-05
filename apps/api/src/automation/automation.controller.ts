import { Body, Controller, Get, Header, Post, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { IsIn, IsUUID } from 'class-validator';
import {
  AutomationRepository,
  OUTCOMES,
  type Outcome,
} from './automation.repository';
import { AutomationGuard } from './automation.guard';

class FinishAlertDto {
  @IsUUID() id: string;
  @IsUUID() leaseToken: string;
  @IsIn(OUTCOMES) outcome: Outcome;
}
@Controller('automation')
export class AutomationController {
  constructor(private readonly repository: AutomationRepository) {}
  @Get('live')
  @Header('Cache-Control', 'no-store')
  live() {
    return { status: 'ok' };
  }

  @Get('ready')
  @UseGuards(AutomationGuard)
  @Header('Cache-Control', 'no-store')
  ready() {
    return this.repository.ready();
  }

  @Post('events/claim')
  @UseGuards(AutomationGuard)
  @Throttle({ default: { limit: 25, ttl: 60000 } })
  @Header('Cache-Control', 'no-store')
  async claim() {
    return { event: await this.repository.claim() };
  }

  @Post('events/finish')
  @UseGuards(AutomationGuard)
  @Throttle({ default: { limit: 25, ttl: 60000 } })
  @Header('Cache-Control', 'no-store')
  finish(@Body() body: FinishAlertDto) {
    return this.repository.finish(body.id, body.leaseToken, body.outcome);
  }
}
