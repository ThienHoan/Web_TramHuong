import {
  Injectable,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { ConfigService } from '@nestjs/config';
import sharp from 'sharp';
import { randomUUID } from 'node:crypto';
import { downloadPublicImage } from './remote-image';
import { Database } from '../common/types/database.types';

@Injectable()
export class StorageService {
  private supabase: SupabaseClient<Database>;
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

    this.supabase = createClient<Database>(supabaseUrl, serviceRoleKey, {
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
  ): Promise<{ url: string; path: string }> {
    // Validate file
    this.validateImage(file);

    return this.storeOptimizedImage(file.buffer);
  }

  async importRemoteImage(
    source: string,
  ): Promise<{ url: string; path: string; reused?: boolean }> {
    const image = await downloadPublicImage(source);
    const url = new URL(source);
    const storageUrl = new URL(this.configService.get<string>('SUPABASE_URL')!);
    const prefix = '/storage/v1/object/public/product-images/';
    const ownedPath = url.pathname.startsWith(prefix)
      ? url.pathname.slice(prefix.length)
      : '';
    if (
      url.origin === storageUrl.origin &&
      /^products\/optimized\/[a-f0-9-]{36}\.webp$/.test(ownedPath)
    ) {
      return { url: url.origin + url.pathname, path: ownedPath, reused: true };
    }
    return this.storeOptimizedImage(image.buffer);
  }

  async storeOptimizedImage(
    buffer: Buffer,
  ): Promise<{ url: string; path: string }> {
    let main: Buffer;
    let thumbnail: Buffer;
    try {
      const image = sharp(buffer, {
        limitInputPixels: 60_000_000,
        animated: false,
        failOn: 'error',
      });
      const metadata = await image.metadata();
      if (
        !['jpeg', 'png', 'webp', 'avif', 'heif'].includes(metadata.format || '')
      )
        throw new Error('Unsupported image');
      main = await image
        .rotate()
        .resize({
          width: 1600,
          height: 1600,
          fit: 'inside',
          withoutEnlargement: true,
        })
        .webp({ quality: 82, effort: 4 })
        .toBuffer();
      thumbnail = await sharp(main)
        .resize({
          width: 480,
          height: 480,
          fit: 'inside',
          withoutEnlargement: true,
        })
        .webp({ quality: 78 })
        .toBuffer();
    } catch {
      throw new BadRequestException(
        'Không đọc được ảnh. Hãy dùng JPEG, PNG, WebP hoặc AVIF hợp lệ.',
      );
    }
    const path = `products/optimized/${randomUUID()}.webp`;
    const thumbnailPath = path.replace(/\.webp$/, '-thumb.webp');
    const mainResult = await this.supabase.storage
      .from(this.BUCKET_NAME)
      .upload(path, main, {
        contentType: 'image/webp',
        cacheControl: '31536000',
        upsert: false,
      });
    if (mainResult.error)
      throw new BadRequestException('Không thể lưu ảnh vào Supabase Storage');
    const thumbResult = await this.supabase.storage
      .from(this.BUCKET_NAME)
      .upload(thumbnailPath, thumbnail, {
        contentType: 'image/webp',
        cacheControl: '31536000',
        upsert: false,
      });
    if (thumbResult.error) {
      await this.supabase.storage
        .from(this.BUCKET_NAME)
        .remove(
          path.startsWith('products/optimized/') &&
            !path.endsWith('-thumb.webp')
            ? [path, path.replace(/\.webp$/, '-thumb.webp')]
            : [path],
        );
      throw new BadRequestException('Không thể lưu ảnh thu nhỏ');
    }
    return {
      path,
      url: this.supabase.storage.from(this.BUCKET_NAME).getPublicUrl(path).data
        .publicUrl,
    };
  }

  /**
   * Delete product image from Supabase Storage
   * @param path - The storage path of the image
   * @param _userId - The ID of the admin user deleting (logged for audit)
   */
  async deleteProductImage(path: string): Promise<void> {
    // Validate path to prevent directory traversal attacks
    if (!this.isValidProductImagePath(path)) {
      throw new ForbiddenException('Invalid file path');
    }

    // Existing products may share a public image URL (e.g. Excel imports).
    // Detaching an image in an editor must not remove another product's file.
    const publicUrl = this.supabase.storage
      .from(this.BUCKET_NAME)
      .getPublicUrl(path).data.publicUrl;
    const references = await this.supabase
      .from('products')
      .select('id')
      .contains('images', [publicUrl])
      .limit(1);
    if (references.error)
      throw new BadRequestException(
        'Không kiểm tra được ảnh đang được sử dụng',
      );
    if (references.data.length) return;

    try {
      const { error } = await this.supabase.storage
        .from(this.BUCKET_NAME)
        .remove(
          path.startsWith('products/optimized/') &&
            !path.endsWith('-thumb.webp')
            ? [path, path.replace(/\.webp$/, '-thumb.webp')]
            : [path],
        );

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
}
