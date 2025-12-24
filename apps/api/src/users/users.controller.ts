import { Controller, Get, Param, Query, Patch, Body, UseGuards, Req } from '@nestjs/common';
import { UsersService } from './users.service';
import { OrdersService } from '../orders/orders.service';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '../auth/role.enum';

@Controller('users')
@UseGuards(AuthGuard, RolesGuard)
export class UsersController {
    constructor(
        private readonly usersService: UsersService,
        private readonly ordersService: OrdersService
    ) { }

    @Get('profile')
    @Roles(Role.CUSTOMER, Role.ADMIN, Role.STAFF)
    async getProfile(@Req() req: any) {
        const user = req.user;
        if (!user || !user.id) return null;
        return this.usersService.findOne(user.id);
    }

    @Patch('profile')
    @Roles(Role.CUSTOMER, Role.ADMIN, Role.STAFF)
    async updateProfile(@Body() body: any, @Req() req: any) {
        const user = req.user;
        if (!user || !user.id) return { success: false };
        return this.usersService.updateProfile(user.id, body);
    }

    @Get()
    @Roles(Role.ADMIN, Role.STAFF)
    async findAll(
        @Query('page') page?: string,
        @Query('limit') limit?: string,
        @Query('search') search?: string,
        @Query('role') role?: string
    ) {
        return this.usersService.findAll({
            page: page ? parseInt(page) : 1,
            limit: limit ? parseInt(limit) : 20,
            search,
            role
        });
    }

    @Get(':id')
    @Roles(Role.ADMIN, Role.STAFF)
    async findOne(@Param('id') id: string) {
        return this.usersService.findOne(id);
    }

    @Get(':id/orders')
    @Roles(Role.ADMIN, Role.STAFF)
    async findUserOrders(
        @Param('id') id: string,
        @Query('page') page?: string,
        @Query('limit') limit?: string
    ) {
        return this.ordersService.findAllForUser(id, {
            page: page ? parseInt(page) : 1,
            limit: limit ? parseInt(limit) : 20
        });
    }

    @Patch(':id/role')
    @Roles(Role.ADMIN)
    async updateRole(@Param('id') id: string, @Body('role') role: string) {
        return this.usersService.updateUserRole(id, role);
    }

    @Patch(':id/ban')
    @Roles(Role.ADMIN)
    async toggleBan(@Param('id') id: string, @Body('is_banned') isBanned: boolean) {
        return this.usersService.toggleBan(id, isBanned);
    }
}
