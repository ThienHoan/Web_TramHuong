import { Controller, Post, UseGuards } from '@nestjs/common';
import { MerchantService } from './merchant.service';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '../auth/role.enum';

@Controller('merchant')
export class MerchantController {
  constructor(private readonly merchantService: MerchantService) {}

  @Post('sync')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async syncProducts() {
    return this.merchantService.syncProducts();
  }
}
