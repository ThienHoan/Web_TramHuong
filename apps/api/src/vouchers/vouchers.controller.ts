import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  Query,
} from '@nestjs/common';
import { VouchersService } from './vouchers.service';
import {
  CreateVoucherDto,
  UpdateVoucherDto,
  ValidateVoucherDto,
} from './dto/voucher.dto';

interface ListVouchersQuery {
  active?: string;
  page?: string;
  limit?: string;
}

@Controller('vouchers')
export class VouchersController {
  constructor(private readonly vouchersService: VouchersService) {}

  // Public / Protected: Validate Voucher
  // POST /vouchers/validate { code: "ABC", cartTotal: 100000 }
  @Post('validate')
  async validate(@Body() body: ValidateVoucherDto) {
    return this.vouchersService.validateVoucher(body.code, body.cartTotal);
  }

  // Admin: List
  @Get()
  async list() {
    return this.vouchersService.listVouchers();
  }

  // Admin: Get One
  @Get(':id')
  async getOne(@Param('id') id: string) {
    return this.vouchersService.getVoucher(id);
  }

  // Admin: Create
  @Post()
  async create(@Body() body: CreateVoucherDto) {
    return this.vouchersService.createVoucher(body);
  }

  // Admin: Update
  @Patch(':id')
  async update(@Param('id') id: string, @Body() body: UpdateVoucherDto) {
    return this.vouchersService.updateVoucher(id, body);
  }
}
