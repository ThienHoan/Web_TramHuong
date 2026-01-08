import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

// INTERFACES
export interface CategoryTranslation {
  id?: string;
  category_id?: string;
  locale: string;
  name: string;
  description?: string;
}

export interface Category {
  id: string;
  slug: string;
  is_active: boolean;
  translations: CategoryTranslation[];
}

export interface CreateCategoryDto {
  name_en: string;
  name_vi: string;
  description_en?: string;
  description_vi?: string;
  slug: string;
  is_active?: boolean;
}

export interface UpdateCategoryDto {
  name_en?: string;
  name_vi?: string;
  description_en?: string;
  description_vi?: string;
  slug?: string;
  is_active?: boolean;
}

@Injectable()
export class CategoriesService {
  constructor(private readonly supabase: SupabaseService) {}

  async findAll(
    locale: string = 'en',
    options?: { include_inactive?: boolean; page?: number; limit?: number },
  ) {
    const client = this.supabase.getClient();
    const page = options?.page || 1;
    const limit = options?.limit || 20;

    const query = client
      .from('categories')
      .select(
        `
        *,
        translations:category_translations(*)
      `,
        { count: 'exact' },
      )
      .eq('category_translations.locale', locale);

    if (!options?.include_inactive) {
      query.eq('is_active', true);
    }

    const { data, count, error } = await query.range(
      (page - 1) * limit,
      page * limit - 1,
    );

    if (error) {
      throw error;
    }

    const items = (data as unknown as Category[]).map((category) => {
      const translation = category.translations?.[0] || {};
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { translations: _unused, ...rest } = category;
      return {
        ...rest,
        translation,
      };
    });

    return {
      data: items,
      meta: {
        total: count,
        page,
        limit,
        last_page: Math.ceil((count || 0) / limit) || 1,
      },
    };
  }

  async findOne(id: string) {
    const client = this.supabase.getClient();
    const { data, error } = await client
      .from('categories')
      .select(
        `
        *,
        translations:category_translations(*)
      `,
      )
      .eq('id', id)
      .single();

    if (error || !data)
      throw new NotFoundException(`Category with id ${id} not found`);

    return data;
  }

  async create(body: CreateCategoryDto) {
    const client = this.supabase.getClient();
    const {
      name_en,
      name_vi,
      description_en,
      description_vi,
      slug,
      is_active,
    } = body;

    // 1. Create Category
    const { data: category, error: catError } = await client
      .from('categories')
      .insert({
        slug,
        is_active: is_active ?? true,
      })
      .select()
      .single();

    if (catError) throw new BadRequestException(catError.message);

    // 2. Create Translations
    const translations = [
      {
        category_id: category.id,
        locale: 'en',
        name: name_en,
        description: description_en,
      },
      {
        category_id: category.id,
        locale: 'vi',
        name: name_vi,
        description: description_vi,
      },
    ];

    const { error: transError } = await client
      .from('category_translations')
      .insert(translations);

    if (transError) {
      // Rollback category creation if translation fails (best effort without transactions here)
      await client.from('categories').delete().eq('id', category.id);
      throw new BadRequestException(transError.message);
    }

    return category;
  }

  async update(id: string, body: UpdateCategoryDto) {
    const client = this.supabase.getClient();

    // Update Category fields
    if (body.slug || body.is_active !== undefined) {
      const updateData: import('../common/types/database.types').Database['public']['Tables']['categories']['Update'] =
        {};
      if (body.slug) updateData.slug = body.slug;
      if (body.is_active !== undefined) updateData.is_active = body.is_active;

      const { error } = await client
        .from('categories')
        .update(updateData)
        .eq('id', id);
      if (error) throw new BadRequestException(error.message);
    }

    // Upsert Translations
    const { name_en, name_vi, description_en, description_vi } = body;

    if (name_en || description_en) {
      const { error } = await client.from('category_translations').upsert(
        {
          category_id: id,
          locale: 'en',
          name: name_en || '',
          description: description_en,
        },
        { onConflict: 'category_id,locale' },
      );
      if (error)
        throw new BadRequestException(`EN Translation Error: ${error.message}`);
    }

    if (name_vi || description_vi) {
      const { error } = await client.from('category_translations').upsert(
        {
          category_id: id,
          locale: 'vi',
          name: name_vi || '',
          description: description_vi,
        },
        { onConflict: 'category_id,locale' },
      );
      if (error)
        throw new BadRequestException(`VI Translation Error: ${error.message}`);
    }

    return { success: true };
  }

  async delete(id: string) {
    const client = this.supabase.getClient();
    // Soft delete preferred? User asked for CRUD. Let's do Soft Delete to match Products,
    // or actually Delete if requested.
    // Plan said: "Delete (or soft delete)". Let's implement Soft Delete as default delete action for safety.

    const { error } = await client
      .from('categories')
      .update({ is_active: false })
      .eq('id', id);

    if (error) throw new BadRequestException(error.message);
    return { success: true };
  }
}
