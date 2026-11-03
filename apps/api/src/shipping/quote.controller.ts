import {
  Body,
  Controller,
  Get,
  Inject,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { Public } from '../auth/public.decorator';
import { ShippingQuoteService } from './quote.service';
import { QuoteDto } from './dto/quote.dto';
import { LogisticsRepository } from './logistics.repository';
import { ShippingProviderRegistry } from './provider-registry';
import {
  LOGISTICS_SETTINGS,
  type LogisticsSettings,
  type Warehouse,
} from './logistics.types';
@Controller('shipping')
@UseGuards(AuthGuard)
export class ShippingQuoteController {
  constructor(
    private readonly quotes: ShippingQuoteService,
    private readonly repo: LogisticsRepository,
    private readonly registry: ShippingProviderRegistry,
    @Inject(LOGISTICS_SETTINGS) private readonly settings: LogisticsSettings,
  ) {}
  @Get('providers')
  @Public()
  providers() {
    return this.registry.capabilities();
  }
  @Post('quote')
  @Public()
  async quote(
    @Body() body: QuoteDto,
    @Request() req: { user?: { id: string } },
  ) {
    const r = await this.quotes.quote(body, req.user?.id || null);
    return {
      reference: r.reference,
      subtotal: r.subtotal,
      voucherDiscount: r.voucherDiscount,
      actualFee: r.actualFee,
      customerFee: r.customerFee,
      subsidy: r.subsidy,
      total: r.total,
      eta: r.eta,
      expiresAt: r.expiresAt,
      provider: 'ghn',
      serviceTypeId: 2,
    };
  }
  @Get('warehouses')
  @Public()
  async warehouses() {
    if (!this.settings.checkout) return [];
    const rows = await this.repo.list<Warehouse>('warehouse', {
      state: 'ACTIVE',
      limit: 100,
    });
    return rows.data
      .filter((r) => r.data.active)
      .map((row) => ({ id: row.key.slice(10), name: row.data.name }));
  }
}
