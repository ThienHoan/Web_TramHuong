import {
  Controller,
  Post,
  Delete,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Body,
  BadRequestException,
  Request,
} from '@nestjs/common';
import type { Request as ExpressRequest } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { StorageService } from './storage.service';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '../auth/role.enum';

interface AuthenticatedUser {
  id?: string;
  sub?: string;
  email?: string;
  role?: string;
}

interface AuthenticatedRequest extends ExpressRequest {
  user?: AuthenticatedUser;
}

@Controller('storage')
@UseGuards(AuthGuard, RolesGuard)
export class StorageController {
  constructor(private readonly storageService: StorageService) {}

  /**
   * Upload product image
   * Only accessible by admin users
   */
  @Post('upload/product-image')
  @Roles(Role.ADMIN)
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB
        files: 1,
      },
    }),
  )
  async uploadProductImage(
    @UploadedFile() file: Express.Multer.File,
    @Request() req: AuthenticatedRequest,
  ) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    // Get user ID from JWT token
    const userId = req.user?.id || req.user?.sub;

    if (!userId) {
      throw new BadRequestException('User ID not found in token');
    }

    try {
      const result = await this.storageService.uploadProductImage(file, userId);

      return {
        success: true,
        data: result,
        message: 'Image uploaded successfully',
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Upload failed';
      throw new BadRequestException(message);
    }
  }

  /**
   * Delete product image
   * Only accessible by admin users
   */
  @Delete('delete/product-image')
  @Roles(Role.ADMIN)
  async deleteProductImage(
    @Body('path') path: string,
    @Request() req: AuthenticatedRequest,
  ) {
    if (!path) {
      throw new BadRequestException('No path provided');
    }

    // Get user ID from JWT token
    const userId = req.user?.id || req.user?.sub;

    if (!userId) {
      throw new BadRequestException('User ID not found in token');
    }

    try {
      await this.storageService.deleteProductImage(path, userId);

      return {
        success: true,
        message: 'Image deleted successfully',
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Delete failed';
      throw new BadRequestException(message);
    }
  }
}
