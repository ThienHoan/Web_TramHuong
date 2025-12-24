import { Injectable, BadRequestException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { CartService } from '../cart/cart.service';

import { MailService } from '../mail/mail.service';

@Injectable()
export class OrdersService {
    constructor(
        private readonly supabaseService: SupabaseService,
        private readonly cartService: CartService,
        private readonly mailService: MailService
    ) { }

    private get client() {
        return this.supabaseService.getClient();
    }

    async findAll(options?: { page?: number; limit?: number }) {
        const page = options?.page || 1;
        const limit = options?.limit || 20;

        const { data, count, error } = await this.client
            .from('orders')
            .select('*', { count: 'exact' })
            .order('created_at', { ascending: false })
            .range((page - 1) * limit, page * limit - 1);

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

    async findAllForUser(userId: string, options?: { page?: number; limit?: number }) {
        const page = options?.page || 1;
        const limit = options?.limit || 20;

        const { data, count, error } = await this.client
            .from('orders')
            .select('*', { count: 'exact' })
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .range((page - 1) * limit, page * limit - 1);

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

    async findOne(id: string) {
        const { data, error } = await this.client
            .from('orders')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw new BadRequestException('Order not found');
        return data;
    }

    async create(userId: string, items: any[], shippingInfo: any, paymentMethod: string = 'cod') {
        if (!items || items.length === 0) {
            throw new BadRequestException('Items are required');
        }
        if (!shippingInfo) {
            throw new BadRequestException('Shipping info is required');
        }

        // Fetch products to validate and get prices
        const productIds = items.map(i => i.productId);
        const { data: products, error: productsError } = await this.client
            .from('products')
            .select(`
                id,
                price,
                slug,
                images,
                is_active,
                quantity,
                translations:product_translations(title, locale)
            `)
            .in('id', productIds);

        if (productsError) {
            console.error('Error fetching products:', productsError);
            throw new BadRequestException('Database error while fetching products');
        }

        // 1. Validate Stock & Active Status
        for (const item of items) {
            const product = products?.find(p => p.id === item.productId);
            if (!product) continue;

            // Check Active
            if (!product.is_active) {
                const title = product.translations?.find((t: any) => t.locale === 'en')?.title || product.slug;
                throw new BadRequestException(`Product '${title}' is currently unavailable.`);
            }

            // Check Stock
            if (product.quantity < item.quantity) {
                const title = product.translations?.find((t: any) => t.locale === 'en')?.title || product.slug;
                throw new BadRequestException(`Product '${title}' is out of stock (Only ${product.quantity} left).`);
            }
        }

        let total = 0;
        const enrichedItems = items.map(item => {
            const product = products?.find(p => p.id === item.productId);
            if (!product) {
                throw new BadRequestException(`One or more items in your cart are invalid.`);
            }

            const itemTotal = product.price * item.quantity;
            total += itemTotal;

            const title = product.translations?.find((t: any) => t.locale === 'en')?.title
                || product.translations?.[0]?.title
                || product.slug;
            const image = product.images?.[0] || null;

            return {
                ...item,
                price: product.price,
                slug: product.slug,
                title,
                image
            };
        });

        // 2. Determine order status and deadline based on payment method
        let orderStatus = 'PENDING';
        let paymentDeadline = null;

        if (paymentMethod === 'sepay') {
            orderStatus = 'AWAITING_PAYMENT';
            // Set deadline 15 minutes from now (in UTC)
            const now = new Date();
            const deadlineMs = now.getTime() + (15 * 60 * 1000); // Add 15 minutes in milliseconds
            paymentDeadline = new Date(deadlineMs).toISOString();
        }

        // 3. Insert Order
        const { data: orderData, error: orderError } = await this.client
            .from('orders')
            .insert({
                user_id: userId,
                status: orderStatus,
                payment_deadline: paymentDeadline,
                total,
                items: enrichedItems,
                shipping_info: shippingInfo,
                payment_method: paymentMethod,
                payment_status: 'pending'
            })
            .select()
            .single();

        if (orderError) throw new BadRequestException(orderError.message);

        // 3. Decrement Stock
        for (const item of items) {
            const product = products?.find(p => p.id === item.productId);
            if (product) {
                const newQty = product.quantity - item.quantity;
                await this.client
                    .from('products')
                    .update({ quantity: newQty })
                    .eq('id', item.productId);
            }
        }

        // 4. Clear Cart
        await this.cartService.clearCart(userId);

        // 5. Emails are now triggered in verifyPayment (Webhook)

        return orderData;
    }

    async updateStatus(id: string, status: string) {
        const allowedStatuses = ['PENDING', 'AWAITING_PAYMENT', 'PAID', 'SHIPPED', 'COMPLETED', 'CANCELED', 'EXPIRED'];
        if (!allowedStatuses.includes(status)) {
            throw new BadRequestException('Invalid status');
        }

        // Fetch current order with items to handle stock logic
        const { data: currentOrder } = await this.client
            .from('orders')
            .select('status, items') // Fetch items too
            .eq('id', id)
            .single();

        if (!currentOrder) throw new BadRequestException('Order not found');

        const currentStatus = currentOrder.status;

        // 1. STRICT TRANSITION CHECK
        // Define allowed next steps for each status
        const validTransitions: Record<string, string[]> = {
            'PENDING': ['PAID', 'CANCELED'],
            'AWAITING_PAYMENT': ['PAID', 'CANCELED', 'EXPIRED'],
            'PAID': ['SHIPPED', 'CANCELED'],
            'SHIPPED': ['COMPLETED'],
            'COMPLETED': [],
            'CANCELED': [],
            'EXPIRED': []
        };

        const allowedNext = validTransitions[currentStatus] || [];

        // Allow staying in same status (idempotent), otherwise must be in allowed list
        if (currentStatus !== status && !allowedNext.includes(status)) {
            throw new BadRequestException(`Invalid status transition from ${currentStatus} to ${status}`);
        }

        // STOCK REVERSION LOGIC
        // If moving TO Canceled FROM non-canceled
        if (status === 'CANCELED' && currentOrder.status !== 'CANCELED') {
            console.log(`Canceling Order ${id}: Returning stock...`);
            const items = currentOrder.items;
            if (Array.isArray(items)) {
                for (const item of items) {
                    if (item.productId && item.quantity) {
                        // Fetch current product to get latest quantity
                        const { data: product } = await this.client
                            .from('products')
                            .select('quantity')
                            .eq('id', item.productId)
                            .single();

                        if (product) {
                            await this.client
                                .from('products')
                                .update({ quantity: product.quantity + item.quantity })
                                .eq('id', item.productId);
                            console.log(`Returned ${item.quantity} to Product ${item.productId}`);
                        }
                    }
                }
            }
        }

        // SYNC LOGIC: If Admin sets status to PAID, ensure payment_status is 'paid'
        let paymentStatusUpdate = {};
        if (status === 'PAID') {
            paymentStatusUpdate = { payment_status: 'paid' };
        }

        const { data, error } = await this.client
            .from('orders')
            .update({ status, ...paymentStatusUpdate })
            .eq('id', id)
            .select()
            .single();

        if (error) throw new BadRequestException(error.message);

        // Email Notification
        if (currentStatus !== status) {
            console.log(`[OrdersService] Status changed ${currentStatus} -> ${status}. Attempting to send email...`);

            // Email Fallback: If updated data has no email, try to fetch from User
            if (!data.shipping_info?.email && data.user_id) {
                const { data: user } = await this.client
                    .from('users')
                    .select('email')
                    .eq('id', data.user_id)
                    .single();

                if (user?.email) {
                    if (!data.shipping_info) data.shipping_info = {};
                    data.shipping_info.email = user.email;
                    console.log(`[OrdersService] Recovered Email for Status Update: ${user.email}`);
                }
            }

            this.mailService.sendOrderStatusUpdate(data).catch(err => console.error(err));
        }

        return data;
    }

    async verifyPayment(content: string, amount: number, transactionCode: string) {
        // Regex for UUID (Standard)
        const uuidRegex = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
        let match = content.match(uuidRegex);

        let orderId = match ? match[0] : null;

        // Fallback: Check for UUID without hyphens (some banks strip special chars)
        if (!orderId) {
            const hex32Regex = /[0-9a-f]{32}/i;
            const matchHex = content.match(hex32Regex);
            if (matchHex) {
                const raw = matchHex[0];
                // Reconstruct UUID: 8-4-4-4-12
                orderId = `${raw.slice(0, 8)}-${raw.slice(8, 12)}-${raw.slice(12, 16)}-${raw.slice(16, 20)}-${raw.slice(20)}`;
            }
        }

        if (!orderId) {
            console.log('Webhook ignored: No UUID found in content', content);
            return { success: false, reason: 'No Order ID found' };
        }

        const { data: order, error } = await this.client
            .from('orders')
            .select('*')
            .eq('id', orderId)
            .single();

        if (error || !order) {
            console.log('Webhook ignored: Order not found', orderId);
            return { success: false, reason: 'Order not found' };
        }

        // Idempotency Check
        if (order.payment_status === 'paid') {
            return { success: true, message: 'Already paid' };
        }

        // Amount Check 
        if (amount < order.total) {
            console.log(`Webhook Warning: Amount mismatch for ${orderId}. Expected ${order.total}, got ${amount}`);
            return { success: false, reason: 'Amount mismatch' };
        }

        // Update Order
        await this.client
            .from('orders')
            .update({
                payment_status: 'paid',
                transaction_code: transactionCode,
                status: 'PAID'
            })
            .eq('id', orderId);

        // Send Emails (Async - don't block response)
        let customerEmail = order.shipping_info?.email;

        // Fallback: If no email in shipping_info, try to get from User profile
        if (!customerEmail && order.user_id) {
            console.log('[VerifyPayment] Email missing in shipping_info, fetching from Users table...');
            const { data: user } = await this.client
                .from('users')
                .select('email')
                .eq('id', order.user_id)
                .single();

            if (user?.email) {
                customerEmail = user.email;
                // Patch the order object so MailService can use it
                if (!order.shipping_info) order.shipping_info = {};
                order.shipping_info.email = customerEmail;
                console.log('[VerifyPayment] Recovered Email from User:', customerEmail);
            }
        } else {
            console.log(`[VerifyPayment] Found Customer Email: '${customerEmail}'`);
        }

        // 1. Notify Verification/Payment Success to User
        this.mailService.sendPaymentSuccess(order).catch(err => console.error('Email Error:', err));

        // 2. Notify Admin about the New Paid Order
        this.mailService.sendAdminAlert(order).catch(err => console.error('Admin Email Error:', err));

        return { success: true, orderId };
    }
}
