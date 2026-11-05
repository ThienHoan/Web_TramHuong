import { pagination } from '../common/pagination';
import {
  Injectable,
  InternalServerErrorException,
  BadRequestException,
  Optional,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { LegalReceipt } from '../legal/legal-acceptance';
import { SupabaseService } from '../supabase/supabase.service';

export interface CreateContactDto {
  full_name: string;
  email: string;
  topic?: string;
  message: string;
  legal_acceptance?: LegalReceipt;
}

@Injectable()
export class ContactsService {
  private readonly logger = new Logger(ContactsService.name);
  constructor(
    private readonly supabase: SupabaseService,
    @Optional() private readonly config?: ConfigService,
  ) {}

  private get client() {
    return this.supabase.getClient();
  }

  async create(dto: CreateContactDto) {
    const { error } = await this.client.from('contacts').insert({
      full_name: dto.full_name,
      email: dto.email,
      topic: dto.topic || 'Khác',
      message: dto.message,
      status: 'new',
      ...(this.config?.get('LEGAL_CONSENT_ENFORCED') === 'true'
        ? { legal_acceptance: dto.legal_acceptance }
        : {}),
    });

    if (error) {
      this.logger.error('CONTACT_SAVE_FAILED');
      throw new InternalServerErrorException('Could not save contact message');
    }

    return { success: true, message: 'Message sent successfully' };
  }

  async findAll(pageInput: number = 1, limitInput: number = 10) {
    const { page, limit } = pagination(pageInput, limitInput);
    const { data, count, error } = await this.client
      .from('contacts')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range((page - 1) * limit, page * limit - 1);

    if (error) throw new InternalServerErrorException(error.message);

    return {
      data,
      meta: {
        total: count,
        page,
        limit,
        last_page: Math.max(1, Math.ceil((count || 0) / limit)),
      },
    };
  }

  async updateStatus(id: string, status: string) {
    if (!['new', 'read', 'replied'].includes(status))
      throw new BadRequestException('Invalid contact status');
    const { data, error } = await this.client
      .from('contacts')
      .update({ status })
      .eq('id', id)
      .select()
      .single();

    if (error) throw new InternalServerErrorException(error.message);
    return data;
  }
}
