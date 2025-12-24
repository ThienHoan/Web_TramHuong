import { Injectable, BadRequestException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

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

        if (checkError && checkError.code !== 'PGRST116') { // PGRST116 is 'Row not found'
            throw new BadRequestException(checkError.message);
        }

        if (existing) {
            // Remove
            const { error } = await this.client
                .from('wishlists')
                .delete()
                .eq('id', existing.id);

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
            .select(`
                *,
                product:products (
                    id, 
                    slug, 
                    images, 
                    price,
                    translations:product_translations(*)
                )
            `)
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (error) throw new BadRequestException(error.message);

        // Transform for frontend if needed, but returning raw is fine for now
        return data.map((item: any) => ({
            ...item,
            product_title: item.product?.translations?.find((t: any) => t.locale === 'en')?.title || item.product?.slug // Default fallback
        }));
    }

    async getLikedIds(userId: string) {
        const { data, error } = await this.client
            .from('wishlists')
            .select('product_id')
            .eq('user_id', userId);

        if (error) throw new BadRequestException(error.message);
        return data.map((item: any) => item.product_id);
    }
}
