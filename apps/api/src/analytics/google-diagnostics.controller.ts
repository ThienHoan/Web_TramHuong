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
import { IsIn, IsOptional } from 'class-validator';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '../auth/role.enum';
import {
  GoogleDiagnosticsService,
  type GoogleDiagnostic,
} from './google-diagnostics.service';
class GoogleDiagnosticDto {
  @IsIn(['pagespeed', 'search_console', 'ga4']) provider: GoogleDiagnostic;
  @IsOptional() @IsIn(['mobile', 'desktop']) strategy?: 'mobile' | 'desktop';
}
@Controller('admin/integrations/google')
@UseGuards(AuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class GoogleDiagnosticsController {
  constructor(private readonly diagnostics: GoogleDiagnosticsService) {}
  @Get('status')
  @Header('Cache-Control', 'no-store')
  status() {
    return this.diagnostics.status();
  }
  @Post('diagnose')
  @Header('Cache-Control', 'no-store')
  @UsePipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  )
  diagnose(@Body() dto: GoogleDiagnosticDto) {
    return this.diagnostics.diagnose(dto.provider, dto.strategy);
  }
}
