import { pagination } from '../common/pagination';
import { Injectable, BadRequestException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { CreatePostDto, PostStatus, UpdatePostDto } from './dto/post.dto';

@Injectable()
export class PostsService {
  constructor(private readonly supabase: SupabaseService) {}

  private get client() {
    return this.supabase.getClient();
  }

  async findAll(
    options?: {
      page?: number;
      limit?: number;
      category?: string;
      search?: string;
      status?: string;
    },
    admin = false,
  ) {
    const { page, limit } = pagination(options?.page, options?.limit ?? 12);
    const status = admin ? options?.status : 'published'; // Allow undefined to mean 'published' default, or passed value

    let query = this.client
      .from('posts')
      .select('*', { count: 'exact' })
      .order('published_at', { ascending: false, nullsFirst: false });

    // Only filter by status if not 'all'
    if (status !== 'all') {
      query = query.eq('status', status || 'published');
    }

    if (options?.category) {
      query = query.eq('category', options.category);
    }

    if (options?.search) {
      query = query.ilike('title', `%${options.search}%`);
    }

    const { data, count, error } = await query.range(
      (page - 1) * limit,
      page * limit - 1,
    );

    if (error) throw new BadRequestException(error.message);

    return {
      data,
      meta: {
        total: count,
        page,
        limit,
        last_page: Math.ceil((count || 0) / limit) || 1,
      },
    };
  }

  async findOne(identifier: string, admin = false) {
    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        identifier,
      );

    const query = this.client.from('posts').select('*');
    if (!admin) query.eq('status', 'published');

    if (isUuid) {
      query.eq('id', identifier);
    } else {
      query.eq('slug', identifier);
    }

    const { data, error } = await query.single();

    if (error) throw new BadRequestException('Post not found');
    return data;
  }

  async create(dto: CreatePostDto) {
    // Auto generate slug if missing (basic implementation)
    if (!dto.slug && dto.title) {
      dto.slug = this.slugify(dto.title);
    }

    const { data, error } = await this.client
      .from('posts')
      .insert({
        ...dto,
        published_at:
          dto.status === PostStatus.PUBLISHED ? new Date().toISOString() : null,
      })
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);
    return data;
  }

  async update(id: string, dto: UpdatePostDto) {
    const { data, error } = await this.client
      .from('posts')
      .update({
        ...dto,
        ...(dto.status === PostStatus.PUBLISHED
          ? { published_at: new Date().toISOString() }
          : {}),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);
    return data;
  }

  async delete(id: string) {
    const { error } = await this.client.from('posts').delete().eq('id', id);

    if (error) throw new BadRequestException(error.message);
    return { success: true };
  }

  private slugify(text: string) {
    return text
      .toString()
      .normalize('NFD') // Change diacritics
      .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
      .toLowerCase()
      .replace(/đ/g, 'd')
      .trim()
      .replace(/[àáạảãâầấậẩẫăằắặẳẵ]/g, 'a')
      .replace(/[èéẹẻẽêềếệểễ]/g, 'e')
      .replace(/[ìíịỉĩ]/g, 'i')
      .replace(/\s+/g, '-')
      .replace(/[^\w-]+/g, '')
      .replace(/--+/g, '-');
  }
}
