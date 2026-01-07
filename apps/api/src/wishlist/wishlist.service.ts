import { Injectable, BadRequestException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

export interface ProductTranslation {
  locale: string;
  title: string;
  description?: string;
}

export interface WishlistProduct {
  id: string;
  slug: string;
  images: string[];
  price: number;
  translations?: ProductTranslation[];
}

interface WishlistItem {
  id: string;
  user_id: string;
  product_id: string;
  created_at: string;
  product?: WishlistProduct;
}

interface WishlistIdItem {
  product_id: string;
}

@Injectable()
export class WishlistService {
  private client;

  constructor(private readonly supabase: SupabaseService) {
    this.client = this.supabase.getClient();
  }

  async toggle(userId: string, productId: string) {
    // Check if exists
    const { data: existing, error: checkError } = await this.client
      .from('wishlists')
      .select('id')
      .eq('user_id', userId)
      .eq('product_id', productId)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      // PGRST116 is 'Row not found'
      throw new BadRequestException(checkError.message);
    }

    if (existing) {
      // Remove
      const { error } = await this.client
        .from('wishlists')
        .delete()
        .eq('id', (existing as { id: string }).id);

      if (error) throw new BadRequestException(error.message);
      return { isLiked: false };
    } else {
      // Add
      const { error } = await this.client
        .from('wishlists')
        .insert({ user_id: userId, product_id: productId });

      if (error) throw new BadRequestException(error.message);
      return { isLiked: true };
    }
  }

  async findAll(userId: string) {
    const { data, error } = await this.client
      .from('wishlists')
      .select(
        `
                *,
                product:products (
                    id, 
                    slug, 
                    images, 
                    price,
                    translations:product_translations(*)
                )
            `,
      )
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw new BadRequestException(error.message);

    // Transform for frontend if needed, but returning raw is fine for now
    return (data as WishlistItem[]).map((item: WishlistItem) => ({
      ...item,
      product_title:
        item.product?.translations?.find(
          (t: ProductTranslation) => t.locale === 'en',
        )?.title || item.product?.slug, // Default fallback
    }));
  }

  async getLikedIds(userId: string): Promise<string[]> {
    const { data, error } = await this.client
      .from('wishlists')
      .select('product_id')
      .eq('user_id', userId);

    if (error) throw new BadRequestException(error.message);
    return (data as WishlistIdItem[]).map(
      (item: WishlistIdItem) => item.product_id,
    );
  }
}
