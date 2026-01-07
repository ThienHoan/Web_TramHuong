import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Req,
  BadRequestException,
} from '@nestjs/common';
import { Request } from 'express';
import { WishlistService } from './wishlist.service';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '../auth/role.enum';

interface AuthenticatedUser {
  id: string;
  email?: string;
  role?: string;
}

interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}

@Controller('wishlist')
@UseGuards(AuthGuard, RolesGuard)
export class WishlistController {
  constructor(private readonly wishlistService: WishlistService) {}

  @Post('toggle')
  @Roles(Role.CUSTOMER, Role.ADMIN, Role.STAFF)
  async toggle(
    @Req() req: AuthenticatedRequest,
    @Body() body: { productId: string },
  ) {
    if (!req.user || !req.user.id)
      throw new BadRequestException('User not found');
    return this.wishlistService.toggle(req.user.id, body.productId);
  }

  @Get()
  @Roles(Role.CUSTOMER, Role.ADMIN, Role.STAFF)
  async findAll(@Req() req: AuthenticatedRequest) {
    if (!req.user || !req.user.id)
      throw new BadRequestException('User not found');
    return this.wishlistService.findAll(req.user.id);
  }

  @Get('ids')
  @Roles(Role.CUSTOMER, Role.ADMIN, Role.STAFF)
  async getIds(@Req() req: AuthenticatedRequest) {
    if (!req.user || !req.user.id) return []; // Fail silent for UI checks
    return this.wishlistService.getLikedIds(req.user.id);
  }
}
