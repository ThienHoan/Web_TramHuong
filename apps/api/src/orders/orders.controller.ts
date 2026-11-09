import {
  Controller,
  Get,
  Patch,
  Post,
  Param,
  Body,
  UseGuards,
  Request,
  ForbiddenException,
  BadRequestException,
  Query,
  Optional,
  Headers,
} from '@nestjs/common';
import type { Request as ExpressRequest } from 'express';
import { ConfigService } from '@nestjs/config';
import { legalReceipt } from '../legal/legal-acceptance';
import { OrdersService } from './orders.service';
import { AuthGuard } from '../auth/auth.guard';

interface RequestWithUser extends ExpressRequest {
  user: {
    id: string;
    role: Role;
    email: string;
  };
}
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '../auth/role.enum';
import { Public } from '../auth/public.decorator';
import { LookupOrderDto } from './dto/lookup-order.dto';
import { CreateOrderDto } from './dto/create-order.dto';
import { Throttle } from '@nestjs/throttler';
import { ContactProtectionService } from '../integrations/contact-protection.service';

@Controller('orders')
@UseGuards(AuthGuard, RolesGuard)
export class OrdersController {
  constructor(
    private readonly ordersService: OrdersService,
    @Optional() private readonly config?: ConfigService,
    @Optional() private readonly protection?: ContactProtectionService,
  ) {}

  @Post('lookup')
  @Public()
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async lookup(@Body() body: LookupOrderDto) {
    return this.ordersService.lookupOrder(body);
  }

  @Post()
  @Public()
  // A new order reserves stock and sends email, so it is worth protecting.
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async create(
    @Request() req: RequestWithUser,
    @Body() body: CreateOrderDto,
    @Headers('origin') origin?: string,
  ) {
    const userId = req.user?.id || null;
    const { items, shipping_info, paymentMethod, voucherCode } =
      body as CreateOrderDto & { voucherCode?: string };
    const receipt = legalReceipt(
      body.legalAcceptance,
      'order_fulfilment_and_terms',
      this.config?.get('LEGAL_CONSENT_ENFORCED') === 'true',
    );
    return this.ordersService.create(
      userId,
      items,
      { ...shipping_info, ...(receipt ? { legal_acceptance: receipt } : {}) },
      paymentMethod,
      voucherCode,
      body.shippingQuoteReference,
      body.idempotencyKey,
      async () => {
        await this.protection?.verify(body.turnstileToken, origin, 'checkout');
      },
    );
  }

  @Post('sepay-webhook')
  @Public()
  async sepayWebhook(@Body() body: any, @Request() req: ExpressRequest) {
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
    const apiKey = rawHeader
      ?.toString()
      .replace(/^(apikey|bearer)\s+/i, '')
      .trim();

    const expectedKey = process.env.SEPAY_API_KEY;

    if (!expectedKey || apiKey !== expectedKey) {
      throw new ForbiddenException('Invalid API Key');
    }

    // SePay body structure: { id, gateway, transactionDate, accountNumber, subAccount, content, transferType, transferAmount, ... }
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const { content, transferAmount, transferType, id } = body;

    // A SePay webhook can also be set to report outgoing transfers (for example a
    // refund whose memo quotes the order ID). Only money coming in can pay an order.
    if (transferType !== 'in') {
      return { success: true, reason: 'Ignored: not an incoming transfer' };
    }

    if (!content) return { success: false, reason: 'No content' };
    if (
      !Number.isFinite(Number(transferAmount)) ||
      Number(transferAmount) <= 0
    ) {
      throw new BadRequestException('Invalid transfer amount');
    }

    const { success, reason } = await this.ordersService.verifyPayment(
      content,
      Number(transferAmount),
      String(id),
    );

    if (!success) {
      throw new BadRequestException(reason || 'Payment verification failed');
    }

    return { success, reason };
  }

  @Get()
  @Roles(Role.ADMIN, Role.STAFF)
  async findAll(
    @Request() _req: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
  ) {
    // Admin/Staff can see all orders
    return this.ordersService.findAll({
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
      search,
    });
  }

  @Get('me')
  @Roles(Role.CUSTOMER, Role.ADMIN, Role.STAFF)
  async findMyOrders(
    @Request() req: RequestWithUser,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const user = req.user;

    const options = {
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
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

  // Public endpoint for guest users to check their order (payment page)
  @Get('status/:id')
  @Public()
  @Throttle({ default: { limit: 20, ttl: 60000 } }) // 20 requests per minute
  async getOrderStatus(@Param('id') id: string) {
    const order = await this.ordersService.findOne(id);
    if (!order) return null;
    // Return limited info for security (no full shipping_info)
    return {
      id: order.id,
      total: order.total,
      status: order.status,
      payment_status: order.payment_status,
      payment_deadline: order.payment_deadline,
      created_at: order.created_at,
    };
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.STAFF, Role.CUSTOMER)
  async findOne(@Param('id') id: string, @Request() req: RequestWithUser) {
    const order = await this.ordersService.findOne(id);
    if (req.user.role === Role.CUSTOMER && order.user_id !== req.user.id) {
      throw new ForbiddenException();
    }
    return order;
  }

  @Patch(':id/status')
  @Roles(Role.ADMIN, Role.STAFF)
  async updateStatus(@Param('id') id: string, @Body('status') status: string) {
    return this.ordersService.updateStatus(id, status);
  }
}
