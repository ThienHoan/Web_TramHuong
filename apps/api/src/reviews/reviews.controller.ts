import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  BadRequestException,
  UseGuards,
  Delete,
  Request,
} from '@nestjs/common';
import type { Request as ExpressRequest } from 'express';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto, SeedReviewDto } from './dto/review.dto';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Public } from '../auth/public.decorator';
import { Roles } from '../auth/roles.decorator';
import { Role } from '../auth/role.enum';

interface AuthenticatedUser {
  id: string;
  email?: string;
  role?: string;
}

interface AuthenticatedRequest extends ExpressRequest {
  user?: AuthenticatedUser;
}

@Controller('reviews')
@UseGuards(AuthGuard, RolesGuard)
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Post()
  @Roles(Role.CUSTOMER, Role.ADMIN, Role.STAFF) // Only customers can review? Admin too?
  async create(
    @Body() body: CreateReviewDto,
    @Request() req: AuthenticatedRequest,
  ) {
    const user = req.user;
    if (!user || !user.id) throw new BadRequestException('User not found');
    const userId = user.id;

    // Verified Purchase logic handles the rest
    return this.reviewsService.create(
      userId,
      body.productId,
      body.rating,
      body.comment,
    );
  }

  @Post('seed')
  @Roles(Role.ADMIN)
  async seed(@Body() body: SeedReviewDto) {
    return this.reviewsService.createGuestSeed(
      body.productId,
      body.rating,
      body.comment,
      body.reviewerName,
      body.reviewerAvatar,
    );
  }

  @Get('user/me')
  @Roles(Role.CUSTOMER, Role.ADMIN, Role.STAFF)
  async getMyReviews(@Request() req: AuthenticatedRequest) {
    const user = req.user;
    if (!user || !user.id) throw new BadRequestException('User not found');
    return this.reviewsService.findAllForUser(user.id);
  }

  @Get(':productId')
  @Public()
  async findAll(@Param('productId') productId: string) {
    return this.reviewsService.findAllForProduct(productId);
  }

  @Delete(':id')
  @Roles(Role.CUSTOMER, Role.ADMIN) // Customers can delete their own, Admins can delete any
  async delete(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    if (!req.user || !req.user.id)
      throw new BadRequestException('User not found');
    const userId = req.user.id;
    const isAdmin = req.user.role === Role.ADMIN;
    return this.reviewsService.delete(id, userId, isAdmin);
  }
}
