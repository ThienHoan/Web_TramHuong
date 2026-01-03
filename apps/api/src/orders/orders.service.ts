import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { CartService } from '../cart/cart.service';
import { MailService } from '../mail/mail.service';
import { LookupOrderDto } from './dto/lookup-order.dto';

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

    async lookupOrder(dto: LookupOrderDto) {
        const { orderCode, emailOrPhone } = dto;

        // Clean input
        const cleanEmailOrPhone = emailOrPhone.trim().toLowerCase();

        // 1. Find Order by ID (UUID usually)
        // Note: Using 'id' for orderCode. If strict UUID validation fails on DB side, it handles it.
        const { data: order, error } = await this.client
            .from('orders')
            .select('*')
            .eq('id', orderCode)
            .single();

        if (error || !order) {
            // Generic error for security
            throw new NotFoundException('Không tìm thấy đơn hàng. Vui lòng kiểm tra lại mã đơn và thông tin xác thực.');
        }

        // 2. Verify Email OR Phone from shipping_info
        const shippingInfo = order.shipping_info || {};
        const orderEmail = (shippingInfo.email || '').trim().toLowerCase();
        const orderPhone = (shippingInfo.phone || '').trim().replace(/\s+/g, ''); // Normalize phone

        const inputIsPhone = /^\d+$/.test(cleanEmailOrPhone.replace(/[^\d]/g, ''));
        const cleanInputPhone = cleanEmailOrPhone.replace(/[^\d]/g, '');

        let isMatch = false;

        if (orderEmail && orderEmail === cleanEmailOrPhone) {
            isMatch = true;
        } else if (orderPhone && cleanInputPhone && orderPhone.includes(cleanInputPhone)) {
            // Simple contains check for phone to be lenient with formats, or strict?
            // Let's use flexible match: last 9 digits match
            if (orderPhone.endsWith(cleanInputPhone) || cleanInputPhone.endsWith(orderPhone)) {
                isMatch = true;
            }
        }

        if (!isMatch) {
            throw new NotFoundException('Không tìm thấy đơn hàng. Vui lòng kiểm tra lại mã đơn và thông tin xác thực.');
        }

        // 3. Return Safe Data
        return {
            id: order.id,
            status: order.status,
            created_at: order.created_at,
            total: order.total,
            items: order.items,
            shipping_info: {
                full_name: shippingInfo.full_name,
                // Hide sensitive info
                email: shippingInfo.email,
                phone: shippingInfo.phone ? '******' + shippingInfo.phone.slice(-3) : null,
                address: shippingInfo.address ? '******' : null,
                province: shippingInfo.province,
                district: shippingInfo.district,
                ward: shippingInfo.ward
            },
            payment_status: order.payment_status,
            payment_method: order.payment_method,
            tracking_code: order.tracking_code || null
        };
    }

    async findAll(options?: { page?: number; limit?: number; search?: string }) {
        const page = options?.page || 1;
        const limit = options?.limit || 20;
        const search = options?.search;

        let query = this.client
            .from('orders')
            .select('*', { count: 'exact' });

        if (search) {
            console.log(`[Orders] Searching for: "${search}"`);

            // Check if search term is a valid UUID to use exact match, otherwise use partial match on casted text
            const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(search);

            if (isUUID) {
                query = query.eq('id', search);
            } else {
                // Fallback to Prefix Search using UUID Ranges
                // This avoids casting errors (uuid ~~* unknown) and parser errors (id::text)
                // We convert "528" -> "528000..." (start) and "528fff..." (end)
                const cleanSearch = search.replace(/[^0-9a-fA-F]/g, '').toLowerCase();

                // Only proceed if we have valid hex chars and simpler than full UUID
                if (cleanSearch.length > 0 && cleanSearch.length <= 32) {
                    const padEnd = (str: string, char: string) => str.padEnd(32, char);
                    const formatUUID = (hex: string) =>
                        `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;

                    const minHex = padEnd(cleanSearch, '0');
                    const maxHex = padEnd(cleanSearch, 'f');

                    try {
                        const minUUID = formatUUID(minHex);
                        const maxUUID = formatUUID(maxHex);
                        query = query.gte('id', minUUID).lte('id', maxUUID);
                    } catch (e) {
                        // If formatting fails, fallback (e.g. do nothing or return empty)
                        console.warn("Invalid UUID prefix search:", search);
                        // Force empty result as search term matches nothing
                        query = query.eq('id', '00000000-0000-0000-0000-000000000000');
                    }
                } else {
                    // Invalid characters or too long
                    // Force empty result
                    query = query.eq('id', '00000000-0000-0000-0000-000000000000');
                }
            }
        }

        const { data, count, error } = await query
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

        // Fetch user email to link guest orders
        const { data: user } = await this.client
            .from('users')
            .select('email')
            .eq('id', userId)
            .single();

        let query = this.client
            .from('orders')
            .select('*', { count: 'exact' });

        if (user?.email) {
            // Match user_id OR guest orders with same email
            // Note: Postgres syntax for JSON text extraction in OR filter
            query = query.or(`user_id.eq.${userId},shipping_info->>email.eq.${user.email}`);
        } else {
            query = query.eq('user_id', userId);
        }

        const { data, count, error } = await query
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

    async create(userId: string | null, items: any[], shippingInfo: any, paymentMethod: string = 'cod') {
        if (!items || items.length === 0) {
            throw new BadRequestException('Items are required');
        }
        if (!shippingInfo) {
            throw new BadRequestException('Shipping info is required');
        }

        // Normalize Phone Number (Backend Enforcement)
        if (shippingInfo.phone) {
            let p = shippingInfo.phone.trim().replace(/\s/g, '');
            if (p.startsWith('0')) {
                p = '+84' + p.slice(1);
            } else if (p.startsWith('84')) {
                p = '+' + p;
            } else if (!p.startsWith('+')) {
                p = '+84' + p;
            }
            shippingInfo.phone = p;
        }

        // Fetch products to validate and get prices + DISCOUNT INFO
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
                variants,
                discount_percentage,
                discount_start_date,
                discount_end_date,
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
                const title = product.translations?.find((t: any) => t.locale === 'vi')?.title || product.translations?.find((t: any) => t.locale === 'en')?.title || product.slug;
                throw new BadRequestException(`Product '${title}' is currently unavailable.`);
            }

            // Check Stock
            if (product.quantity < item.quantity) {
                const title = product.translations?.find((t: any) => t.locale === 'vi')?.title || product.translations?.find((t: any) => t.locale === 'en')?.title || product.slug;
                throw new BadRequestException(`Product '${title}' is out of stock (Only ${product.quantity} left).`);
            }
        }

        let total = 0;
        const enrichedItems = items.map(item => {
            const product = products?.find(p => p.id === item.productId);
            if (!product) {
                throw new BadRequestException(`One or more items in your cart are invalid.`);
            }

            const title = product.translations?.find((t: any) => t.locale === 'vi')?.title
                || product.translations?.find((t: any) => t.locale === 'en')?.title
                || product.translations?.[0]?.title
                || product.slug;
            const image = product.images?.[0] || null;

            // Get BASE price (original price before discount)
            let originalPrice = Number(product.price);
            if (item.variantId && Array.isArray(product.variants)) {
                const v = product.variants.find((v: any) => v.name === item.variantId);
                if (v && v.price !== undefined) {
                    originalPrice = Number(v.price);
                }
            }

            // Calculate discount (same logic as cart.service.ts)
            let finalPrice = originalPrice;
            let discountAmount = 0;

            if (product.discount_percentage > 0) {
                const now = new Date();
                const startDate = product.discount_start_date ? new Date(product.discount_start_date) : null;
                const endDate = product.discount_end_date ? new Date(product.discount_end_date) : null;

                const isActive = (!startDate || startDate <= now) && (!endDate || endDate >= now);

                if (isActive) {
                    finalPrice = Math.round(originalPrice * (1 - product.discount_percentage / 100));
                    discountAmount = originalPrice - finalPrice;
                }
            }

            const itemTotal = finalPrice * item.quantity;
            total += itemTotal;

            return {
                ...item,
                price: finalPrice,              // Discounted price
                original_price: originalPrice,   // Original price before discount
                discount_amount: discountAmount, // Amount saved per unit
                slug: product.slug,
                title,
                image,
                variant_id: item.variantId || null,
                variant_name: item.variantName || null
            };
        });

        // 2. Calculate Shipping and Final Total
        let shippingFee = total >= 300000 ? 0 : 30000;

        // Override shipping fee if picking up at showroom
        if (paymentMethod === 'showroom') {
            shippingFee = 0;
        }

        total += shippingFee;

        // Record shipping fee in shipping info
        if (typeof shippingInfo === 'object') {
            shippingInfo.shipping_fee = shippingFee;
        }

        // 3. Determine order status and deadline based on payment method
        let orderStatus = 'PENDING';
        let paymentDeadline = null;
        let dbPaymentMethod = paymentMethod;

        if (paymentMethod === 'showroom') {
            // Map 'showroom' to 'cod' for DB constraint compatibility
            // But mark delivery_method as 'pickup' in shipping_info
            dbPaymentMethod = 'cod';
            if (typeof shippingInfo === 'object') {
                shippingInfo.delivery_method = 'pickup';
                shippingInfo.pickup_location = {
                    name: 'Showroom Thiên Phúc',
                    address: '123 Đường Trầm Hương, Quận 1, TP. HCM',
                    hours: '9:00 - 21:00 (T2 - CN)',
                    instructions: 'Vui lòng đọc mã đơn hàng hoặc số điện thoại cho nhân viên tại quầy.'
                };
            }
        }

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
                user_id: userId, // Can be null
                status: orderStatus,
                payment_deadline: paymentDeadline,
                total,
                items: enrichedItems,
                shipping_info: shippingInfo,
                payment_method: dbPaymentMethod,
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

        // 4. Clear Cart (Only if user logged in)
        if (userId) {
            await this.cartService.clearCart(userId);
        }

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

            return { success: false, reason: 'No Order ID found' };
        }

        const { data: order, error } = await this.client
            .from('orders')
            .select('*')
            .eq('id', orderId)
            .single();

        if (error || !order) {

            return { success: false, reason: 'Order not found' };
        }

        // Idempotency Check
        if (order.payment_status === 'paid') {
            return { success: true, message: 'Already paid' };
        }

        // Amount Check 
        if (amount < order.total) {

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

            }
        } else {

        }

        // 1. Notify Verification/Payment Success to User
        this.mailService.sendPaymentSuccess(order).catch(err => console.error('Email Error:', err));

        // 2. Notify Admin about the New Paid Order
        this.mailService.sendAdminAlert(order).catch(err => console.error('Admin Email Error:', err));

        return { success: true, orderId };
    }
}
