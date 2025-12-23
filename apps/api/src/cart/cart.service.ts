import { Injectable, BadRequestException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class CartService {
    constructor(private readonly supabase: SupabaseService) { }

    private get client() {
        return this.supabase.getClient();
    }

    async getCart(userId: string) {
        // Fetch cart items and join with product details
        const { data, error } = await this.client
            .from('cart_items')
            .select(`
                *,
                product:products (
                    id,
                    slug,
                    price,
                    images,
                    translations:product_translations(title, locale)
                )
            `)
            .eq('user_id', userId);

        if (error) throw new BadRequestException(error.message);

        // Transform to simplified CartItem format for frontend
        return data.map((item: any) => {
            const product = item.product;
            // Best effort title (EN or first available)
            const title = product.translations?.find((t: any) => t.locale === 'en')?.title
                || product.translations?.[0]?.title
                || product.slug;

            return {
                id: product.id,
                slug: product.slug,
                title: title,
                price: product.price,
                image: product.images?.[0] || null,
                quantity: item.quantity
            };
        });
    }

    async mergeCart(userId: string, items: any[]) {
        if (!items || items.length === 0) return { success: true };

        // For each item, upsert into DB
        // Since we have a unique constraint on (user_id, product_id), we can manage duplicates
        // However, standard SQL UPSERT replaces value. We might want to sum quantities?
        // For simplicity in MVP: Database quantity wins OR we sum them.
        // Let's do a simple loop for now to handle logic:

        for (const item of items) {
            // Check existence
            const { data: existing } = await this.client
                .from('cart_items')
                .select('quantity')
                .eq('user_id', userId)
                .eq('product_id', item.id)
                .single();

            if (existing) {
                // Update quantity (summing logic is safer for merges)
                await this.client
                    .from('cart_items')
                    .update({ quantity: existing.quantity + item.quantity })
                    .eq('user_id', userId)
                    .eq('product_id', item.id);
            } else {
                // Insert new
                await this.client
                    .from('cart_items')
                    .insert({
                        user_id: userId,
                        product_id: item.id,
                        quantity: item.quantity
                    });
            }
        }

        return this.getCart(userId);
    }

    async addItem(userId: string, productId: string, quantity: number = 1) {
        // Upsert logic (Summing)
        const { data: existing } = await this.client
            .from('cart_items')
            .select('quantity')
            .eq('user_id', userId)
            .eq('product_id', productId)
            .single();

        if (existing) {
            const { error } = await this.client
                .from('cart_items')
                .update({ quantity: existing.quantity + quantity })
                .eq('user_id', userId)
                .eq('product_id', productId);
            if (error) throw new BadRequestException(error.message);
        } else {
            const { error } = await this.client
                .from('cart_items')
                .insert({
                    user_id: userId,
                    product_id: productId,
                    quantity: quantity
                });
            if (error) throw new BadRequestException(error.message);
        }

        return { success: true };
    }

    async updateQuantity(userId: string, productId: string, quantity: number) {
        const { error } = await this.client
            .from('cart_items')
            .update({ quantity })
            .eq('user_id', userId)
            .eq('product_id', productId);

        if (error) throw new BadRequestException(error.message);
        return { success: true };
    }

    async removeItem(userId: string, productId: string) {
        const { error } = await this.client
            .from('cart_items')
            .delete()
            .eq('user_id', userId)
            .eq('product_id', productId);

        if (error) throw new BadRequestException(error.message);
        return { success: true };
    }
    async clearCart(userId: string) {
        const { error } = await this.client
            .from('cart_items')
            .delete()
            .eq('user_id', userId);

        if (error) throw new BadRequestException(error.message);
        return { success: true };
    }
}
