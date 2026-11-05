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
import { SearchConsoleService } from './search-console.service';

class SyncSearchConsoleDto {
  @IsIn(['mock'])
  source: 'mock';
}

@Controller('admin/seo/search-console')
@UseGuards(AuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class SearchConsoleController {
  constructor(private readonly search: SearchConsoleService) {}

  @Get('summary')
  @Header('Cache-Control', 'no-store')
  summary() {
    return this.search.report();
  }

  @Post('sync')
  @Header('Cache-Control', 'no-store')
  @Throttle({ default: { limit: 2, ttl: 60000 } })
  @UsePipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  )
  sync(@Body() _body: SyncSearchConsoleDto) {
    void _body;
    return this.search.sync();
  }
}
