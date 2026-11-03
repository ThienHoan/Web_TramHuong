import { pagination } from '../common/pagination';
import { Injectable, InternalServerErrorException, BadRequestException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

export interface CreateContactDto {
  full_name: string;
  email: string;
  topic?: string;
  message: string;
}

@Injectable()
export class ContactsService {
  constructor(private readonly supabase: SupabaseService) {}

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
    });

    if (error) {
      console.error('Error creating contact:', error);
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
    if (!['new', 'read', 'replied'].includes(status)) throw new BadRequestException('Invalid contact status');
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
