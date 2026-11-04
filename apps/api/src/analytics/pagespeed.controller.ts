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
import { Throttle } from '@nestjs/throttler';
import { IsIn } from 'class-validator';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '../auth/role.enum';
import { PAGESPEED_TARGETS, type AuditStrategy } from './pagespeed.adapter';
import { PagespeedService } from './pagespeed.service';
class PagespeedAuditDto {
  @IsIn(['mock']) source: 'mock';
  @IsIn(PAGESPEED_TARGETS.map((t) => t.id)) targetId: string;
  @IsIn(['mobile', 'desktop']) strategy: AuditStrategy;
}
@Controller('admin/seo/pagespeed')
@UseGuards(AuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class PagespeedController {
  constructor(private readonly pagespeed: PagespeedService) {}
  @Get('summary')
  @Header('Cache-Control', 'no-store')
  summary() {
    return this.pagespeed.summary();
  }
  @Post('audits')
  @Header('Cache-Control', 'no-store')
  @Throttle({ default: { limit: 4, ttl: 60000 } })
  @UsePipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  )
  audit(@Body() body: PagespeedAuditDto) {
    return this.pagespeed.audit(body.targetId, body.strategy);
  }
}
