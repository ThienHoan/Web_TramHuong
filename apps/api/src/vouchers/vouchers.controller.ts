import { Controller, Get, Post, Body, Param, Patch, Delete, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '../auth/role.enum';
import { VouchersService } from './vouchers.service';
import {
  CreateVoucherDto,
  UpdateVoucherDto,
  ValidateVoucherDto,
} from './dto/voucher.dto';

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
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.STAFF)
  async list() {
    return this.vouchersService.listVouchers();
  }

  // Admin: Get One
  @Get(':id')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.STAFF)
  async getOne(@Param('id') id: string) {
    return this.vouchersService.getVoucher(id);
  }

  // Admin: Create
  @Post()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.STAFF)
  async create(@Body() body: CreateVoucherDto) {
    return this.vouchersService.createVoucher(body);
  }

  // Admin: Update
  @Patch(':id')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.STAFF)
  async update(@Param('id') id: string, @Body() body: UpdateVoucherDto) {
    return this.vouchersService.updateVoucher(id, body);
  }

  @Delete(':id')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.STAFF)
  async remove(@Param('id') id: string) {
    return this.vouchersService.deleteVoucher(id);
  }
}
