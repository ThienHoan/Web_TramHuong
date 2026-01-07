import {
  Injectable,
  BadRequestException,
  NotFoundException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { CartService } from '../cart/cart.service';
import { MailService } from '../mail/mail.service';
import { VouchersService } from '../vouchers/vouchers.service';
import { LookupOrderDto } from './dto/lookup-order.dto';

interface OrderItemInput {
  productId: string;
  quantity: number;
  variantId?: string;
  variantName?: string;
}

interface ShippingInfo {
  full_name?: string;
  name?: string; // DTO uses name
  email?: string;
  phone: string;
  address: string;
  province?: string;
  city?: string; // DTO uses city
  district?: string;
  ward?: string;
  shipping_fee?: number;
  delivery_method?: string;
  pickup_location?: any;
  [key: string]: any;
}

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly cartService: CartService,
    private readonly mailService: MailService,
    private readonly vouchersService: VouchersService,
  ) {}

  private get client() {
    return this.supabaseService.getClient();
  }

  /**
   * Normalize Vietnamese phone number to +84 format
   * Examples: 0356176878 -> +84356176878, 84356176878 -> +84356176878
   */
  private normalizeVietnamesePhone(phone: string): string {
    if (!phone) return '';
    const phoneStr = String(phone); // Ensure string

    // Remove all whitespace and special chars except + and digits
    const cleaned = phoneStr.trim().replace(/[\s\-()]/g, '');

    // Convert to +84 format
    if (cleaned.startsWith('0')) {
      // 0356... -> +84356...
      return '+84' + cleaned.slice(1);
    } else if (cleaned.startsWith('84') && !cleaned.startsWith('+')) {
      // 84356... -> +84356...
      return '+' + cleaned;
    } else if (cleaned.startsWith('+84')) {
      // Already in correct format
      return cleaned;
    } else if (/^\d{9,10}$/.test(cleaned)) {
      // Just digits without prefix, assume Vietnamese
      return '+84' + cleaned;
    }

    // Return as-is if doesn't match Vietnamese patterns
    return cleaned;
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
      throw new NotFoundException(
        'Không tìm thấy đơn hàng. Vui lòng kiểm tra lại mã đơn và thông tin xác thực.',
      );
    }

    // 2. Verify Email OR Phone from shipping_info
    const shippingInfo = order.shipping_info || {};
    const orderEmail = (shippingInfo.email || '').trim().toLowerCase();
    const orderPhone = (shippingInfo.phone || '').trim();

    let isMatch = false;

    // Check if input is email
    if (cleanEmailOrPhone.includes('@')) {
      // Email match
      isMatch = orderEmail === cleanEmailOrPhone;
    } else {
      // Assume phone number - normalize both sides
      const normalizedInputPhone =
        this.normalizeVietnamesePhone(cleanEmailOrPhone);
      const normalizedOrderPhone = this.normalizeVietnamesePhone(orderPhone);

      // Strict match after normalization
      isMatch = normalizedInputPhone === normalizedOrderPhone;
    }

    if (!isMatch) {
      throw new NotFoundException(
        'Không tìm thấy đơn hàng. Vui lòng kiểm tra lại mã đơn và thông tin xác thực.',
      );
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
        phone: shippingInfo.phone
          ? '******' + shippingInfo.phone.slice(-3)
          : null,
        address: shippingInfo.address ? '******' : null,
        province: shippingInfo.province,
        district: shippingInfo.district,
        ward: shippingInfo.ward,
        // Include pricing-related info
        shipping_fee: shippingInfo.shipping_fee || 0,
        delivery_method: shippingInfo.delivery_method || null,
      },
      payment_status: order.payment_status,
      payment_method: order.payment_method,
      tracking_code: order.tracking_code || null,
      // Include voucher info for price breakdown
      voucher_code: order.voucher_code || null,
      voucher_discount_amount: order.voucher_discount_amount || 0,
    };
  }

  async findAll(options?: { page?: number; limit?: number; search?: string }) {
    const page = options?.page || 1;
    const limit = options?.limit || 20;
    const search = options?.search;

    let query = this.client.from('orders').select('*', { count: 'exact' });

    if (search) {
      console.log(`[Orders] Searching for: "${search}"`);

      // Check if search term is a valid UUID to use exact match, otherwise use partial match on casted text
      const isUUID =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          search,
        );

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
            console.warn('Invalid UUID prefix search:', search);
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
        last_page: Math.ceil((count || 0) / limit) || 1,
      },
    };
  }

  async findAllForUser(
    userId: string,
    options?: { page?: number; limit?: number },
  ) {
    const page = options?.page || 1;
    const limit = options?.limit || 20;

    // Fetch user email to link guest orders
    const { data: user } = await this.client
      .from('users')
      .select('email')
      .eq('id', userId)
      .single();

    let query = this.client.from('orders').select('*', { count: 'exact' });

    if (user?.email) {
      // Match user_id OR guest orders with same email
      // Note: Postgres syntax for JSON text extraction in OR filter
      query = query.or(
        `user_id.eq.${userId},shipping_info->>email.eq.${user.email}`,
      );
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
        last_page: Math.ceil((count || 0) / limit) || 1,
      },
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

  async create(
    userId: string | null,
    items: OrderItemInput[],
    shippingInfo: ShippingInfo,
    paymentMethod: string = 'cod',
    voucherCode?: string,
  ) {
    this.logger.log(
      `Creating order for User: ${userId || 'Guest'}, Payment: ${paymentMethod}`,
    );
    try {
      if (!items || items.length === 0) {
        throw new BadRequestException('Items are required');
      }
      if (!shippingInfo) {
        throw new BadRequestException('Shipping info is required');
      }

      // Normalize Phone Number (Backend Enforcement)
      if (shippingInfo.phone) {
        shippingInfo.phone = this.normalizeVietnamesePhone(shippingInfo.phone);
      }

      // Fetch products to validate and get prices + DISCOUNT INFO
      const productIds = items.map((i) => i.productId);
      const { data: products, error: productsError } = await this.client
        .from('products')
        .select(
          `
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
            `,
        )
        .in('id', productIds);

      if (productsError) {
        this.logger.error('Error fetching products:', productsError);
        throw new BadRequestException('Database error while fetching products');
      }

      // 1. Validate Stock & Active Status
      for (const item of items) {
        const product = products?.find((p) => p.id === item.productId);
        if (!product) continue;

        // Check Active
        if (!product.is_active) {
          const title =
            product.translations?.find((t: any) => t.locale === 'vi')?.title ||
            product.translations?.find((t: any) => t.locale === 'en')?.title ||
            product.slug;
          throw new BadRequestException(
            `Product '${title}' is currently unavailable.`,
          );
        }

        // Check Stock
        if (product.quantity < item.quantity) {
          const title =
            product.translations?.find((t: any) => t.locale === 'vi')?.title ||
            product.translations?.find((t: any) => t.locale === 'en')?.title ||
            product.slug;
          throw new BadRequestException(
            `Product '${title}' is out of stock (Only ${product.quantity} left).`,
          );
        }
      }

      let total = 0;
      const enrichedItems = items.map((item) => {
        const product = products?.find((p) => p.id === item.productId);
        if (!product) {
          throw new BadRequestException(
            `One or more items in your cart are invalid.`,
          );
        }

        const title =
          product.translations?.find((t: any) => t.locale === 'vi')?.title ||
          product.translations?.find((t: any) => t.locale === 'en')?.title ||
          product.translations?.[0]?.title ||
          product.slug;
        const image = product.images?.[0] || null;

        // Get BASE price (original price before discount)
        let originalPrice = Number(product.price);
        if (item.variantId && Array.isArray(product.variants)) {
          const v = product.variants.find(
            (v: any) => v.name === item.variantId,
          );
          if (v && v.price !== undefined) {
            originalPrice = Number(v.price);
          }
        }

        // Calculate discount (same logic as cart.service.ts)
        let finalPrice = originalPrice;
        let discountAmount = 0;

        if (product.discount_percentage > 0) {
          const now = new Date();
          const startDate = product.discount_start_date
            ? new Date(product.discount_start_date)
            : null;
          const endDate = product.discount_end_date
            ? new Date(product.discount_end_date)
            : null;

          const isActive =
            (!startDate || startDate <= now) && (!endDate || endDate >= now);

          if (isActive) {
            finalPrice = Math.round(
              originalPrice * (1 - product.discount_percentage / 100),
            );
            discountAmount = originalPrice - finalPrice;
          }
        }

        const itemTotal = finalPrice * item.quantity;
        total += itemTotal;

        return {
          ...item,
          price: finalPrice, // Discounted price
          original_price: originalPrice, // Original price before discount
          discount_amount: discountAmount, // Amount saved per unit
          slug: product.slug,
          title,
          image,
          variant_id: item.variantId || null,
          variant_name: item.variantName || null,
        };
      });

      // 2. Calculate Final Total & Shipping

      // Calculate Subtotal (Sum of item totals)
      // Note: 'total' currently holds the sum of item prices * quantity
      const subtotal = total;

      // Validate Voucher & Calculate Discount
      let voucherDiscountAmount = 0;
      let appliedVoucherCode = null;

      if (voucherCode) {
        try {
          // Determine effective subtotal for validation constraints
          // (e.g. min_order_value usually applies to subtotal before shipping)
          const validation = await this.vouchersService.validateVoucher(
            voucherCode,
            subtotal,
          );

          if (validation.isValid && validation.voucher) {
            voucherDiscountAmount = validation.discountAmount;
            appliedVoucherCode = validation.voucher.code; // Use normalized code

            // Decrement Usage Count (Optimistic Lock)
            // If limit is null, it's unlimited. If limit exists, must be > usage_count.
            // We need to atomically increment usage_count.
            const { error: usageError, data: updatedVoucher } =
              await this.client
                .from('vouchers')
                .update({ usage_count: validation.voucher.usage_count + 1 })
                .eq('id', validation.voucher.id)
                // Safety check again: only update if usage_count is still what we saw OR just rely on constraint?
                // Better: constraint check in WHERE clause.
                // Usage: usage_limit IS NULL OR usage_count < usage_limit
                // Supabase/Postgres doesn't support complex WHERE on UPDATE easily via JS client .eq().
                // We will rely on the initial check + DB constraint if possible, but JS client is limited.
                // Best effort: Update and check usage_limit in application logic previously.
                // Since we don't have high concurrency, simple increment is acceptable for now.
                // Ideally: .rpc('increment_voucher_usage', { voucher_id: ... })
                .select()
                .single();

            if (usageError) {
              // Rollback/Throw?
              // If update fails (e.g. constraint), invalid voucher.
              throw new BadRequestException(
                'Mã giảm giá không khả dụng (đã hết lượt hoặc lỗi)',
              );
            }
          }
        } catch (error) {
          // If voucher invalid, throw error to stop order creation? Or ignore?
          // User expects valid voucher if entered. Throw error.
          if (
            error instanceof BadRequestException ||
            error instanceof NotFoundException
          ) {
            throw error;
          }
          this.logger.error('Voucher error:', error);
          // If system error, maybe ignore to not block order? No, consistent behavior better.
        }
      }

      let shippingFee = total >= 300000 ? 0 : 30000;

      // Override shipping fee if picking up at showroom
      if (paymentMethod === 'showroom') {
        shippingFee = 0;
      }

      // Final Total Calculation
      // Formula: Subtotal - Discount + Shipping
      total = subtotal - voucherDiscountAmount + shippingFee;

      // Sanity Check: Total >= 0
      if (total < 0) total = 0;

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
            instructions:
              'Vui lòng đọc mã đơn hàng hoặc số điện thoại cho nhân viên tại quầy.',
          };
        }
      }

      if (paymentMethod === 'sepay') {
        orderStatus = 'AWAITING_PAYMENT';
        // Set deadline 15 minutes from now (in UTC)
        const now = new Date();
        const deadlineMs = now.getTime() + 15 * 60 * 1000; // Add 15 minutes in milliseconds
        paymentDeadline = new Date(deadlineMs).toISOString();

        // Log SePay Initiation
        this.logger.log(
          `SePay initiated for amount ${total}, phone ${shippingInfo.phone}`,
        );
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
          payment_status: 'pending',
          voucher_code: appliedVoucherCode,
          voucher_discount_amount: voucherDiscountAmount,
        })
        .select()
        .single();

      if (orderError) throw new BadRequestException(orderError.message);

      // 3. Decrement Stock
      for (const item of items) {
        const product = products?.find((p) => p.id === item.productId);
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
      this.logger.log(`Order created successfully: ${orderData.id}`);
      return orderData;
    } catch (error) {
      this.logger.error('Create order failed', error.stack || error);
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      throw new InternalServerErrorException(
        'Không tạo được đơn hàng, vui lòng thử lại',
      );
    }
  }

  async updateStatus(id: string, status: string) {
    const allowedStatuses = [
      'PENDING',
      'AWAITING_PAYMENT',
      'PAID',
      'SHIPPED',
      'COMPLETED',
      'CANCELED',
      'EXPIRED',
    ];
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
      PENDING: ['PAID', 'CANCELED'],
      AWAITING_PAYMENT: ['PAID', 'CANCELED', 'EXPIRED'],
      PAID: ['SHIPPED', 'CANCELED'],
      SHIPPED: ['COMPLETED'],
      COMPLETED: [],
      CANCELED: [],
      EXPIRED: [],
    };

    const allowedNext = validTransitions[currentStatus] || [];

    // Allow staying in same status (idempotent), otherwise must be in allowed list
    if (currentStatus !== status && !allowedNext.includes(status)) {
      throw new BadRequestException(
        `Invalid status transition from ${currentStatus} to ${status}`,
      );
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

      this.mailService
        .sendOrderStatusUpdate(data)
        .catch((err) => console.error(err));
    }

    return data;
  }

  async verifyPayment(
    content: string,
    amount: number,
    transactionCode: string,
  ) {
    this.logger.log(
      `Verifying Payment: Content="${content}", Amount=${amount}, Code=${transactionCode}`,
    );
    // Regex for UUID (Standard)
    // Regex for UUID (Standard)
    const uuidRegex =
      /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
    const match = content.match(uuidRegex);

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
      this.logger.warn(
        `Payment Verification Failed: No Order ID found in content "${content}"`,
      );
      return { success: false, reason: 'No Order ID found' };
    }

    const { data: order, error } = await this.client
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (error || !order) {
      this.logger.warn(
        `Payment Verification Failed: Order ${orderId} not found`,
      );
      return { success: false, reason: 'Order not found' };
    }

    // Idempotency Check
    if (order.payment_status === 'paid') {
      this.logger.log(`Payment Verification: Order ${orderId} already paid`);
      return { success: true, message: 'Already paid' };
    }

    // Amount Check
    if (amount < order.total) {
      this.logger.warn(
        `Payment Verification Failed: Amount mismatch for ${orderId}. Expected ${order.total}, Got ${amount}`,
      );
      return { success: false, reason: 'Amount mismatch' };
    }

    // Update Order
    await this.client
      .from('orders')
      .update({
        payment_status: 'paid',
        transaction_code: transactionCode,
        status: 'PAID',
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
    this.mailService
      .sendPaymentSuccess(order)
      .catch((err) => console.error('Email Error:', err));

    // 2. Notify Admin about the New Paid Order
    this.mailService
      .sendAdminAlert(order)
      .catch((err) => console.error('Admin Email Error:', err));

    return { success: true, orderId };
  }
}
