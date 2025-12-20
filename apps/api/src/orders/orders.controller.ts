import { Controller, Get, Patch, Post, Param, Body, UseGuards, Request, ForbiddenException } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '../auth/role.enum';

@Controller('orders')
@UseGuards(AuthGuard, RolesGuard)
export class OrdersController {
    constructor(private readonly ordersService: OrdersService) { }

    @Post()
    @Roles(Role.CUSTOMER, Role.ADMIN, Role.STAFF)
    async create(@Request() req: any, @Body() body: any) {
        const userId = req.user.id;
        const { items, shipping_info } = body;
        return this.ordersService.create(userId, items, shipping_info);
    }

    @Get()
    @Roles(Role.ADMIN, Role.STAFF)
    async findAll(@Request() req: any) {
        // Admin/Staff can see all orders
        return this.ordersService.findAll();
    }

    @Get('me')
    @Roles(Role.CUSTOMER, Role.ADMIN, Role.STAFF)
    async findMyOrders(@Request() req: any) {
        const user = req.user;
        if (user.role === Role.CUSTOMER) {
            return this.ordersService.findAllForUser(user.id);
        }
        // Admin/Staff accessing 'me' - probably want their own orders or all?
        // User requirement says: "If admin/staff -> reuse logic GET /orders or filter".
        // Let's return their own orders essentially acting as a customer, 
        // OR if they want to manage orders they should use GET /orders.
        // For consistency, 'me' usually means 'my orders'.
        return this.ordersService.findAllForUser(user.id);
    }

    @Patch(':id/status')
    @Roles(Role.ADMIN, Role.STAFF)
    async updateStatus(@Param('id') id: string, @Body('status') status: string) {
        return this.ordersService.updateStatus(id, status);
    }
}
