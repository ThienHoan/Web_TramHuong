import { Controller, Get, Post, Body, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { VouchersService } from './vouchers.service';

@Controller('vouchers')
export class VouchersController {
    constructor(private readonly vouchersService: VouchersService) { }

    // Public / Protected: Validate Voucher
    // POST /vouchers/validate { code: "ABC", cartTotal: 100000 }
    @Post('validate')
    async validate(@Body() body: { code: string; cartTotal: number }) {
        return this.vouchersService.validateVoucher(body.code, body.cartTotal);
    }

    // Admin: List
    @Get()
    async list(@Query() query: any) {
        return this.vouchersService.listVouchers(query);
    }

    // Admin: Get One
    @Get(':id')
    async getOne(@Param('id') id: string) {
        return this.vouchersService.getVoucher(id);
    }

    // Admin: Create
    @Post()
    async create(@Body() body: any) {
        return this.vouchersService.createVoucher(body);
    }

    // Admin: Update
    @Patch(':id')
    async update(@Param('id') id: string, @Body() body: any) {
        return this.vouchersService.updateVoucher(id, body);
    }
}
