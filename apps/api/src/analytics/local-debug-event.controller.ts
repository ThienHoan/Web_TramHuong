import {
  Body,
  Controller,
  Header,
  Headers,
  Post,
  Req,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import {
  IsIn,
  IsInt,
  IsUUID,
  Matches,
  Min,
  Max,
  IsObject,
} from 'class-validator';
import { LOCAL_FUNNEL_EVENTS } from './local-funnel.contract';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '../auth/role.enum';
import {
  LocalDebugEventService,
  type LocalDebugIntent,
  type LocalFunnelIntent,
} from './local-debug-event.service';
class LocalIdentityDto {
  @IsIn(['granted']) consent: 'granted';
  @IsUUID('4') eventId: string;
  @Matches(/^[1-9]\d{0,14}\.[1-9]\d{0,14}$/) clientId: string;
  @IsInt() @Min(1) @Max(Number.MAX_SAFE_INTEGER) sessionId: number;
}
class LocalFunnelDto extends LocalIdentityDto implements LocalFunnelIntent {
  @IsIn(LOCAL_FUNNEL_EVENTS) name: string;
  @IsObject() parameters: Record<string, unknown>;
}
class LocalDebugDto implements LocalDebugIntent {
  @IsIn(['granted']) consent: 'granted';
  @IsIn(['manual_test']) action: 'manual_test';
  @IsUUID('4') eventId: string;
  @Matches(/^[1-9]\d{0,14}\.[1-9]\d{0,14}$/) clientId: string;
  @IsInt() @Min(1) @Max(Number.MAX_SAFE_INTEGER) sessionId: number;
}
@Controller('analytics/local-debug-event')
@UseGuards(AuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class LocalDebugEventController {
  constructor(private readonly service: LocalDebugEventService) {}
  @Post('funnel')
  @Header('Cache-Control', 'no-store')
  @UsePipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  )
  funnel(
    @Body() dto: LocalFunnelDto,
    @Req() req: { user: { id: string } },
    @Headers('origin') origin?: string,
  ) {
    return this.service.sendFunnel(dto, req.user.id, origin);
  }
  @Post()
  @Header('Cache-Control', 'no-store')
  @UsePipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  )
  send(
    @Body() dto: LocalDebugDto,
    @Req() req: { user: { id: string } },
    @Headers('origin') origin?: string,
  ) {
    return this.service.send(dto, req.user.id, origin);
  }
}
