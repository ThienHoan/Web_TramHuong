import { Injectable, BadRequestException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { CreatePostDto, UpdatePostDto } from './dto/post.dto';

@Injectable()
export class PostsService {
    constructor(private readonly supabase: SupabaseService) { }

    private get client() {
        return this.supabase.getClient();
    }

    async findAll(options?: {
        page?: number;
        limit?: number;
        category?: string;
        search?: string;
        status?: string;
    }) {
        const page = options?.page || 1;
        const limit = options?.limit || 12;
        const status = options?.status; // Allow undefined to mean 'published' default, or passed value

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

        const { data, count, error } = await query.range((page - 1) * limit, page * limit - 1);

        if (error) throw new BadRequestException(error.message);

        return {
            data,
            meta: {
                total: count,
                page,
                limit,
                last_page: Math.ceil((count || 0) / limit) || 1
            }
        };
    }

    async findOne(identifier: string) {
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identifier);

        const query = this.client.from('posts').select('*');

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
            .insert(dto)
            .select()
            .single();

        if (error) throw new BadRequestException(error.message);
        return data;
    }

    async update(id: string, dto: UpdatePostDto) {
        const { data, error } = await this.client
            .from('posts')
            .update({ ...dto, updated_at: new Date() })
            .eq('id', id)
            .select()
            .single();

        if (error) throw new BadRequestException(error.message);
        return data;
    }

    async delete(id: string) {
        const { error } = await this.client
            .from('posts')
            .delete()
            .eq('id', id);

        if (error) throw new BadRequestException(error.message);
        return { success: true };
    }

    private slugify(text: string) {
        return text
            .toString()
            .normalize('NFD') // Change diacritics
            .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
            .toLowerCase()
            .trim()
            .replace(/\s+/g, '-')
            .replace(/[^\w\-]+/g, '')
            .replace(/\-\-+/g, '-');
    }
}
