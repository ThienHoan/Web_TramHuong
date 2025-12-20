import { Injectable, BadRequestException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class OrdersService {
    constructor(private readonly supabaseService: SupabaseService) { }

    private get client() {
        return this.supabaseService.getClient();
    }

    async findAll() {
        const { data, error } = await this.client
            .from('orders')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw new BadRequestException(error.message);
        return data;
    }

    async findAllForUser(userId: string) {
        const { data, error } = await this.client
            .from('orders')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (error) throw new BadRequestException(error.message);
        return data;
    }

    async create(userId: string, items: any[], shippingInfo: any) {
        if (!items || items.length === 0) {
            throw new BadRequestException('Items are required');
        }
        if (!shippingInfo) {
            throw new BadRequestException('Shipping info is required');
        }

        // Calculate total (Fetching prices from DB to be secure)
        // For now, assuming items have productId. We should fetch fresh prices.
        const productIds = items.map(i => i.productId);
        const { data: products, error: productsError } = await this.client
            .from('products')
            .select(`
                id, 
                price, 
                slug, 
                images,
                translations:product_translations(title, locale)
            `)
            .in('id', productIds);

        if (productsError) {
            console.error('Error fetching products during order creation:', productsError);
            throw new BadRequestException('Database error while fetching products');
        }

        let total = 0;
        const enrichedItems = items.map(item => {
            const product = products?.find(p => p.id === item.productId);
            if (!product) {
                console.error(`Product ID ${item.productId} not found in DB query. Available IDs:`, products?.map(p => p.id));
                throw new BadRequestException(`Product '${item.productId}' is unavailable (Archived or Deleted). Please remove it from your cart.`);
            }

            const itemTotal = product.price * item.quantity;
            total += itemTotal;

            // Get English title as default snapshot (or first available)
            const title = product.translations?.find((t: any) => t.locale === 'en')?.title
                || product.translations?.[0]?.title
                || product.slug;

            const image = product.images?.[0] || null;

            return {
                ...item,
                price: product.price, // Snapshot price
                slug: product.slug,
                title,   // Snapshot title
                image    // Snapshot image
            };
        });

        const { data, error } = await this.client
            .from('orders')
            .insert({
                user_id: userId,
                status: 'PENDING',
                total,
                items: enrichedItems,
                shipping_info: shippingInfo
            })
            .select()
            .single();

        if (error) throw new BadRequestException(error.message);
        return data;
    }

    async updateStatus(id: string, status: string) {
        // Validate status
        const allowedStatuses = ['PENDING', 'PAID', 'SHIPPED', 'COMPLETED', 'CANCELED'];
        if (!allowedStatuses.includes(status)) {
            throw new BadRequestException('Invalid status');
        }

        // Check current status if needed (e.g. prevent reviving CANCELED)
        const { data: currentOrder } = await this.client.from('orders').select('status').eq('id', id).single();

        if (currentOrder?.status === 'CANCELED' && status !== 'CANCELED') {
            throw new BadRequestException('Cannot update a CANCELED order');
        }

        const { data, error } = await this.client
            .from('orders')
            .update({ status })
            .eq('id', id)
            .select()
            .single();

        if (error) throw new BadRequestException(error.message);
        return data;
    }
}
