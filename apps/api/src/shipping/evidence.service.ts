import {
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import sharp from 'sharp';
import { SupabaseService } from '../supabase/supabase.service';
import { LogisticsRepository } from './logistics.repository';
import { ShippingOperationsService } from './operations.service';
import type { Actor } from './fulfillment.service';
@Injectable()
export class ShippingEvidenceService {
  private readonly bucket = 'shipping-evidence';
  constructor(
    private readonly repo: LogisticsRepository,
    private readonly operations: ShippingOperationsService,
    private readonly supabase: SupabaseService,
  ) {}
  private async ticket(id: string, actor: Actor) {
    const row = await this.operations.record(id, 'ticket');
    if (!row.order_id) throw new BadRequestException('TICKET_ORDER_REQUIRED');
    await this.operations.owned(row.order_id, actor);
    return row;
  }
  async upload(id: string, actor: Actor, files: Express.Multer.File[]) {
    const ticket = await this.ticket(id, actor);
    const previous = Array.isArray(ticket.data.attachments)
      ? ticket.data.attachments.filter(
          (p): p is string => typeof p === 'string',
        )
      : [];
    if (!files.length || files.length > 3 || previous.length + files.length > 6)
      throw new BadRequestException('MAX_6_EVIDENCE_IMAGES');
    const storage = this.supabase.getClient().storage;
    const bucket = await storage.getBucket(this.bucket);
    if (bucket.error || !bucket.data || bucket.data.public !== false)
      throw new ServiceUnavailableException(
        'PRIVATE_SHIPPING_EVIDENCE_BUCKET_REQUIRED',
      );
    const uploaded: string[] = [];
    try {
      for (const file of files) {
        if (
          file.buffer.length > 2 * 1024 * 1024 ||
          !['image/jpeg', 'image/png'].includes(file.mimetype)
        )
          throw new BadRequestException('EVIDENCE_JPEG_PNG_MAX_2MB');
        const image = sharp(file.buffer, { limitInputPixels: 16000000 });
        const meta = await image.metadata();
        if (!['jpeg', 'png'].includes(meta.format || ''))
          throw new BadRequestException('INVALID_EVIDENCE_IMAGE');
        const bytes = await image
          .rotate()
          .resize({
            width: 1600,
            height: 1600,
            fit: 'inside',
            withoutEnlargement: true,
          })
          .jpeg({ quality: 85 })
          .toBuffer();
        const path = `tickets/${ticket.id}/${randomUUID()}.jpg`;
        const result = await storage
          .from(this.bucket)
          .upload(path, bytes, { contentType: 'image/jpeg', upsert: false });
        if (result.error)
          throw new ServiceUnavailableException('EVIDENCE_UPLOAD_FAILED');
        uploaded.push(path);
      }
      await this.repo.write(
        ticket.key,
        'ticket',
        ticket.state,
        { ...ticket.data, attachments: [...previous, ...uploaded] },
        ticket,
      );
      return { uploaded: uploaded.length };
    } catch (error) {
      if (uploaded.length) await storage.from(this.bucket).remove(uploaded);
      throw error;
    }
  }
  async url(id: string, actor: Actor, index: number) {
    const ticket = await this.ticket(id, actor);
    const paths = ticket.data.attachments;
    if (
      !Array.isArray(paths) ||
      index < 0 ||
      typeof paths[index] !== 'string' ||
      !paths[index].startsWith(`tickets/${ticket.id}/`)
    )
      throw new BadRequestException('EVIDENCE_NOT_FOUND');
    const result = await this.supabase
      .getClient()
      .storage.from(this.bucket)
      .createSignedUrl(paths[index], 60);
    if (result.error)
      throw new ServiceUnavailableException('EVIDENCE_UNAVAILABLE');
    return { url: result.data.signedUrl, expiresIn: 60 };
  }
}
