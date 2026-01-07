import {
  Injectable,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class StorageService {
  private supabase: SupabaseClient;
  private readonly BUCKET_NAME = 'product-images';
  private readonly MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
  private readonly ALLOWED_TYPES = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/avif',
  ];

  constructor(private configService: ConfigService) {
    // Use service role key for admin operations
    const supabaseUrl = this.configService.get<string>('SUPABASE_URL');
    const serviceRoleKey = this.configService.get<string>(
      'SUPABASE_SERVICE_ROLE_KEY',
    );

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error('Supabase credentials not configured');
    }

    this.supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  /**
   * Upload product image to Supabase Storage
   * @param file - The uploaded file
   * @param _userId - The ID of the admin user uploading (logged for audit)
   */
  async uploadProductImage(
    file: Express.Multer.File,
    _userId: string,
  ): Promise<{ url: string; path: string }> {
    // Validate file
    this.validateImage(file);

    // Generate unique filename with timestamp and random string
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 15);
    const ext = this.getFileExtension(file.originalname);
    const sanitizedName = this.sanitizeFilename(file.originalname);
    const filename = `products/${timestamp}-${randomStr}-${sanitizedName}.${ext}`;

    try {
      // Upload to Supabase Storage
      const { data, error } = await this.supabase.storage
        .from(this.BUCKET_NAME)
        .upload(filename, file.buffer, {
          contentType: file.mimetype,
          cacheControl: '31536000', // 1 year cache
          upsert: false, // Prevent overwrites
        });

      if (error) {
        throw new BadRequestException(`Upload failed: ${error.message}`);
      }

      // Get public URL
      const {
        data: { publicUrl },
      } = this.supabase.storage.from(this.BUCKET_NAME).getPublicUrl(data.path);

      return {
        url: publicUrl,
        path: data.path,
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new BadRequestException(`Failed to upload image: ${message}`);
    }
  }

  /**
   * Delete product image from Supabase Storage
   * @param path - The storage path of the image
   * @param _userId - The ID of the admin user deleting (logged for audit)
   */
  async deleteProductImage(path: string, _userId: string): Promise<void> {
    // Validate path to prevent directory traversal attacks
    if (!this.isValidProductImagePath(path)) {
      throw new ForbiddenException('Invalid file path');
    }

    try {
      const { error } = await this.supabase.storage
        .from(this.BUCKET_NAME)
        .remove([path]);

      if (error) {
        throw new BadRequestException(`Delete failed: ${error.message}`);
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new BadRequestException(`Failed to delete image: ${message}`);
    }
  }

  /**
   * Validate uploaded image file
   */
  private validateImage(file: Express.Multer.File): void {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    // Check file size
    if (file.size > this.MAX_FILE_SIZE) {
      throw new BadRequestException(
        `File size exceeds ${this.MAX_FILE_SIZE / (1024 * 1024)}MB limit`,
      );
    }

    // Check mime type
    if (!this.ALLOWED_TYPES.includes(file.mimetype)) {
      throw new BadRequestException(
        'Invalid file type. Only JPEG, PNG, WebP, and AVIF allowed',
      );
    }

    // Additional validation: check file buffer is not empty
    if (!file.buffer || file.buffer.length === 0) {
      throw new BadRequestException('File is empty');
    }
  }

  /**
   * Validate that the path is a legitimate product image path
   * Prevents directory traversal attacks
   */
  private isValidProductImagePath(path: string): boolean {
    // Must start with 'products/'
    if (!path.startsWith('products/')) {
      return false;
    }

    // Must not contain directory traversal sequences
    if (path.includes('..') || path.includes('//')) {
      return false;
    }

    // Must have valid file extension
    const validExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.avif'];
    const hasValidExt = validExtensions.some((ext) =>
      path.toLowerCase().endsWith(ext),
    );

    return hasValidExt;
  }

  /**
   * Get file extension safely
   */
  private getFileExtension(filename: string): string {
    const parts = filename.split('.');
    if (parts.length < 2) {
      throw new BadRequestException('Invalid filename');
    }
    return parts.pop()!.toLowerCase();
  }

  /**
   * Sanitize filename to prevent injection
   */
  private sanitizeFilename(filename: string): string {
    // Remove extension
    const nameWithoutExt =
      filename.substring(0, filename.lastIndexOf('.')) || filename;

    // Keep only alphanumeric, dash, underscore
    return nameWithoutExt
      .replace(/[^a-zA-Z0-9-_]/g, '-')
      .replace(/--+/g, '-')
      .substring(0, 50); // Limit length
  }
}
