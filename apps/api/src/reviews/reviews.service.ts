import { Injectable, BadRequestException, ForbiddenException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class ReviewsService {
    constructor(private readonly supabase: SupabaseService) { }

    private get client() {
        return this.supabase.getClient();
    }

    async create(userId: string, productId: string, rating: number, comment: string) {
        if (rating < 1 || rating > 5) {
            throw new BadRequestException('Rating must be between 1 and 5');
        }

        // 1. Verify Purchase
        // Check if user has a PAID/SHIPPED/COMPLETED order containing this product
        const { count, error: countError } = await this.client
            .from('orders')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId)
            .in('status', ['PAID', 'SHIPPED', 'COMPLETED'])
            .contains('items', JSON.stringify([{ productId: productId }])); // JSONB Contains check

        if (countError) {
            console.error('Verify Purchase Error:', countError);
            throw new BadRequestException('Error checking purchase history');
        }

        if (count === 0) {
            throw new ForbiddenException('You need to purchase this product to review it.');
        }

        // 2. Insert Review
        const { data, error } = await this.client
            .from('reviews')
            .insert({
                user_id: userId,
                product_id: productId,
                rating,
                comment,
                is_verified: true
            })
            .select()
            .single();

        if (error) {
            if (error.code === '23505') { // Unique violation
                throw new BadRequestException('You have already reviewed this product.');
            }
            throw new BadRequestException(error.message);
        }

        return data;
    }

    async createGuestSeed(productId: string, rating: number, comment: string, reviewerName: string, reviewerAvatar?: string) {
        const { data, error } = await this.client
            .from('reviews')
            .insert({
                product_id: productId,
                rating,
                comment,
                reviewer_name: reviewerName,
                reviewer_avatar: reviewerAvatar,
                is_verified: true,
                user_id: null
            })
            .select()
            .single();

        if (error) throw new BadRequestException(error.message);
        return data;
    }

    async findAllForProduct(productId: string) {
        // Fetch reviews with User info
        const { data: reviews, error } = await this.client
            .from('reviews')
            .select(`
                *,
                user:users(id, full_name, avatar_url)
            `)
            .eq('product_id', productId)
            .order('created_at', { ascending: false });

        if (error) throw new BadRequestException(error.message);

        // Map data to unified structure
        const mappedReviews = reviews.map(r => ({
            id: r.id,
            rating: r.rating,
            comment: r.comment,
            created_at: r.created_at,
            is_verified: r.is_verified || false,
            user: {
                full_name: r.user?.full_name || r.reviewer_name || 'Khách hàng',
                avatar_url: r.user?.avatar_url || r.reviewer_avatar
            }
        }));

        // Calculate Stats
        const total = mappedReviews.length;
        const average = total > 0
            ? (mappedReviews.reduce((acc, r) => acc + r.rating, 0) / total).toFixed(1)
            : 0;

        // Distribution (5 stars, 4 stars...)
        const distribution: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
        mappedReviews.forEach(r => {
            if (distribution[r.rating] !== undefined) distribution[r.rating]++;
        });

        return {
            data: mappedReviews,
            meta: {
                total,
                average: Number(average),
                distribution
            }
        };
    }

    async delete(id: string, userId: string, isAdmin: boolean) {
        let query = this.client.from('reviews').delete().eq('id', id);

        // If not admin, restrict to own review
        if (!isAdmin) {
            query = query.eq('user_id', userId);
        }

        const { error } = await query;
        if (error) throw new BadRequestException(error.message);

        return { success: true };
    }

    async findAllForUser(userId: string) {
        const { data, error } = await this.client
            .from('reviews')
            .select(`
                *,
                product:products(id, slug, image, images, translations)
            `)
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (error) throw new BadRequestException(error.message);

        // Map product title based on Translation if possible, but for key info keeping it simple
        return data.map(r => ({
            ...r,
            product_title: r.product?.translations?.find((t: any) => t.locale === 'en')?.title || r.product?.slug
        }));
    }
}
