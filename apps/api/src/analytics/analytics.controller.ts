import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { AuthGuard } from '../auth/auth.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '../auth/role.enum';

@Controller('analytics')
@UseGuards(AuthGuard)
export class AnalyticsController {
    constructor(private readonly analyticsService: AnalyticsService) { }

    @Get('dashboard')
    @Roles(Role.ADMIN) // RBAC Protection
    async getDashboardData(@Query('range') range: string) {
        return this.analyticsService.getDashboardData(range);
    }
}
