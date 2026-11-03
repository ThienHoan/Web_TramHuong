import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '../auth/role.enum';
import { AdminService } from './admin.service';

@Controller('admin')
@UseGuards(AuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.STAFF)
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get('operations')
  operations() {
    return this.admin.operations();
  }

  @Get('resources/:resource/export')
  export(
    @Param('resource') resource: string,
    @Query() query: Record<string, string>,
  ) {
    return this.admin.export(resource, query);
  }

  @Get('resources/:resource')
  list(
    @Param('resource') resource: string,
    @Query() query: Record<string, string>,
  ) {
    return this.admin.list(resource, query);
  }
}
