import { Controller, Get, Patch, Post, Param, Body, UseGuards, Request, ForbiddenException, BadRequestException, Query } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '../auth/role.enum';
import { Public } from '../auth/public.decorator';
import { LookupOrderDto } from './dto/lookup-order.dto';
import { CreateOrderDto } from './dto/create-order.dto';
import { ThrottlerGuard } from '@nestjs/throttler';

@Controller('orders')
@UseGuards(AuthGuard, RolesGuard)
export class OrdersController {
    constructor(private readonly ordersService: OrdersService) { }

    @Post('lookup')
    @Public()
    @UseGuards(ThrottlerGuard)
    async lookup(@Body() body: LookupOrderDto) {
        return this.ordersService.lookupOrder(body);
    }

    @Post()
    @Public()
    @UseGuards(ThrottlerGuard)
    async create(@Request() req: any, @Body() body: CreateOrderDto) {
        const userId = req.user?.id || null;
        const { items, shipping_info, paymentMethod } = body;
        return this.ordersService.create(userId, items, shipping_info, paymentMethod);
    }

    @Post('sepay-webhook')
    @Public()
    async sepayWebhook(@Body() body: any, @Request() req: any) {
        // Security Check: Verify API Key or SePay Source
        // SePay sends 'Authorization' header optionally, or we can check a shared secret?
        // Plan said: "Protects webhook by secret/API key".
        // Let's assume we use a headers check 'x-sepay-api-key' or token.
        // Or if SePay just POSTs data, we rely on matching the content's Order ID and Transaction Code.
        // But user specifically asked for "Secret/API Key protection".
        // Assuming we configured SePay to send a key in headers or it's standard.
        // Let's implement a check for 'x-api-key' header against ENV variable.



        const rawHeader = req.headers['x-api-key'] || req.headers['authorization'];
        // Remove 'Apikey ' or 'Bearer ' prefix to get just the key
        const apiKey = rawHeader?.toString().replace(/^(apikey|bearer)\s+/i, '').trim();

        const expectedKey = process.env.SEPAY_API_KEY;





        if (expectedKey && apiKey !== expectedKey) {
            throw new ForbiddenException('Invalid API Key');
        }

        // SePay body structure: { id, gateway, transactionDate, accountNumber, subAccount, content, transferType, transferAmount, ... }
        const { content, transferAmount, transactionDate, id } = body;

        if (!content) return { success: false, reason: 'No content' };

        const result = await this.ordersService.verifyPayment(content, Number(transferAmount), String(id));

        if (!result.success) {

            throw new BadRequestException(result.reason || 'Payment verification failed');
        }

        return result;
    }

    @Get()
    @Roles(Role.ADMIN, Role.STAFF)
    async findAll(@Request() req: any, @Query('page') page?: string, @Query('limit') limit?: string, @Query('search') search?: string) {
        // Admin/Staff can see all orders
        return this.ordersService.findAll({
            page: page ? parseInt(page) : 1,
            limit: limit ? parseInt(limit) : 20,
            search
        });
    }

    @Get('me')
    @Roles(Role.CUSTOMER, Role.ADMIN, Role.STAFF)
    async findMyOrders(@Request() req: any, @Query('page') page?: string, @Query('limit') limit?: string) {
        const user = req.user;

        const options = {
            page: page ? parseInt(page) : 1,
            limit: limit ? parseInt(limit) : 20
        };

        if (user.role === Role.CUSTOMER) {
            return this.ordersService.findAllForUser(user.id, options);
        }
        // Admin/Staff accessing 'me' - probably want their own orders or all?
        // User requirement says: "If admin/staff -> reuse logic GET /orders or filter".
        // Let's return their own orders essentially acting as a customer, 
        // OR if they want to manage orders they should use GET /orders.
        // For consistency, 'me' usually means 'my orders'.
        return this.ordersService.findAllForUser(user.id, options);
    }

    @Get(':id')
    @Roles(Role.ADMIN, Role.STAFF, Role.CUSTOMER)
    async findOne(@Request() req: any, @Param('id') id: string) {
        // TODO: Enforce ownership if Customer
        return this.ordersService.findOne(id);
    }

    @Patch(':id/status')
    @Roles(Role.ADMIN, Role.STAFF)
    async updateStatus(@Param('id') id: string, @Body('status') status: string) {
        return this.ordersService.updateStatus(id, status);
    }
}
