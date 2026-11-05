import { Controller, Get, Header, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '../auth/role.enum';
import { IntegrationHealthService } from './integration-health.service';

@Controller('integrations/admin')
@UseGuards(AuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class IntegrationHealthController {
  constructor(private readonly health: IntegrationHealthService) {}

  @Get('health')
  @Header('Cache-Control', 'no-store')
  healthSnapshot() {
    return this.health.report();
  }
}
