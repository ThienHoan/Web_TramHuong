import { pagination } from '../common/pagination';
import {
  Injectable,
  BadRequestException,
  NotFoundException,
  InternalServerErrorException,
  Logger,
  Optional,
  HttpException,
  ConflictException,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { CartService } from '../cart/cart.service';
import { MailService } from '../mail/mail.service';
import { VouchersService } from '../vouchers/vouchers.service';
import { LookupOrderDto } from './dto/lookup-order.dto';
import { ShippingQuoteService } from '../shipping/quote.service';
import { productPrice } from '../common/commerce-pricing';
import { CheckoutRepository } from './checkout.repository';
import { checkoutIntent } from './checkout-intent';

interface OrderItemInput {
  productId: string;
  quantity: number;
  variantId?: string;
  variantName?: string;
  price?: number;
}

interface ShippingInfo {
  full_name?: string;
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
  province?: string;
  city?: string;
  district?: string;
  ward?: string;
  shipping_fee?: number;
  delivery_method?: string;
  pickup_location?: any;
  [key: string]: any;
}

interface ProductTranslation {
  locale: string;
  title?: string;
  description?: string;
}

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly cartService: CartService,
    private readonly mailService: MailService,
    private readonly vouchersService: VouchersService,
    @Optional() private readonly shippingQuotes?: ShippingQuoteService,
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
    const shippingInfo = (order.shipping_info as unknown as ShippingInfo) || {};
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
    const { page, limit } = pagination(options?.page, options?.limit ?? 20);
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
          } catch (error) {
            this.logger.error('Failed to parse payment content', error);
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
    const { page, limit } = pagination(options?.page, options?.limit ?? 20);

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
    shippingQuoteReference?: string,
    idempotencyKey?: string,
  ) {
    this.logger.log('CHECKOUT_ATTEMPT');
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

      shippingInfo = {
        ...shippingInfo,
        name: shippingInfo.name?.trim(),
        address: shippingInfo.address?.trim(),
        city: shippingInfo.city?.trim(),
        email: shippingInfo.email?.trim().toLowerCase() || undefined,
      };
      const intent = checkoutIntent(
        idempotencyKey,
        userId,
        items,
        shippingInfo,
        paymentMethod,
        voucherCode,
      );
      const checkout = new CheckoutRepository(this.supabaseService);
      // Recover a committed result BEFORE stock, voucher or quote revalidation.
      const previous = await checkout.lookup(
        intent.key,
        userId,
        intent.fingerprint,
      );
      if (previous) return previous.order;
      items = intent.items;

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

      // Stock belongs to a product, so variants and duplicate lines share it.
      const requestedQuantities = new Map<string, number>();
      for (const item of items) {
        requestedQuantities.set(
          item.productId,
          (requestedQuantities.get(item.productId) || 0) + item.quantity,
        );
      }
      // 1. Validate Stock & Active Status
      for (const item of items) {
        const product = products?.find((p) => p.id === item.productId);
        if (!product) continue;

        // Check Active
        if (!product.is_active) {
          const trans =
            (product.translations as unknown as ProductTranslation[]) || [];
          const title =
            trans.find((t: ProductTranslation) => t.locale === 'vi')?.title ||
            trans.find((t: ProductTranslation) => t.locale === 'en')?.title ||
            product.slug;
          throw new BadRequestException(
            `Product '${title}' is currently unavailable.`,
          );
        }

        // Check Stock
        if (product.quantity < (requestedQuantities.get(item.productId) || 0)) {
          const trans =
            (product.translations as unknown as ProductTranslation[]) || [];
          const title =
            trans.find((t: ProductTranslation) => t.locale === 'vi')?.title ||
            trans.find((t: ProductTranslation) => t.locale === 'en')?.title ||
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

        const trans =
          (product.translations as unknown as ProductTranslation[]) || [];
        const title =
          trans.find((t) => t.locale === 'vi')?.title ||
          trans.find((t) => t.locale === 'en')?.title ||
          trans[0]?.title ||
          product.slug;
        const image = product.images?.[0] || null;

        if (
          item.variantId &&
          (!Array.isArray(product.variants) ||
            !product.variants.some(
              (value) =>
                value &&
                typeof value === 'object' &&
                'name' in value &&
                value.name === item.variantId,
            ))
        ) {
          throw new ConflictException('CHECKOUT_VARIANT_UNAVAILABLE');
        }
        const priced = productPrice(product, item.variantId);
        const originalPrice = priced.originalPrice;
        const finalPrice = priced.price;
        const discountAmount = priced.discountAmount;

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
          variant_name: item.variantId || null,
        };
      });

      // 2. Calculate Final Total & Shipping

      // Calculate Subtotal (Sum of item totals)
      // Note: 'total' currently holds the sum of item prices * quantity
      const subtotal = total;
      if (
        paymentMethod !== 'showroom' &&
        this.shippingQuotes?.requiresQuote() &&
        !shippingQuoteReference
      ) {
        throw new BadRequestException('SHIPPING_QUOTE_REQUIRED');
      }
      const shippingQuote =
        shippingQuoteReference && paymentMethod !== 'showroom'
          ? await this.shippingQuotes?.revalidate(
              shippingQuoteReference,
              userId,
              items,
              shippingInfo,
              paymentMethod,
              voucherCode,
            )
          : undefined;
      if (shippingQuote && shippingQuote.subtotal !== subtotal)
        throw new BadRequestException('SHIPPING_QUOTE_CHANGED');

      // Validate Voucher & Calculate Discount
      let voucherDiscountAmount = 0;
      let appliedVoucherCode = null;

      if (voucherCode?.trim()) {
        const validation = await this.vouchersService.validateVoucher(
          voucherCode,
          subtotal,
        );
        if (!validation.isValid || !validation.voucher)
          throw new BadRequestException('CHECKOUT_VOUCHER_UNAVAILABLE');
        if (
          shippingQuote &&
          shippingQuote.voucherDiscount !== validation.discountAmount
        )
          throw new ConflictException('SHIPPING_QUOTE_CHANGED');
        voucherDiscountAmount = validation.discountAmount;
        appliedVoucherCode = validation.voucher.code;
      }

      let shippingFee = shippingQuote
        ? shippingQuote.customerFee
        : total >= 300000
          ? 0
          : 30000;
      if (shippingQuote) {
        shippingInfo.shipping_quote_reference = shippingQuote.reference;
        shippingInfo.shipping_snapshot = shippingQuote;
      }

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

      if (paymentMethod === 'showroom') shippingInfo.delivery_method = 'pickup';
      const committed = await checkout.create({
        p_key: intent.key,
        p_user_id: userId,
        p_fingerprint: intent.fingerprint,
        p_items: enrichedItems,
        p_shipping_info: shippingInfo,
        p_payment_method: paymentMethod,
        p_voucher_code: appliedVoucherCode,
        p_expected_subtotal: subtotal,
        p_expected_discount: voucherDiscountAmount,
        p_shipping_fee: shippingFee,
        p_quote: shippingQuote ?? null,
      });
      const orderData = committed.order;

      // 4. Clear Cart (Only if user logged in)
      if (userId && !committed.replayed) {
        try {
          await this.cartService.clearCart(userId);
        } catch {
          // ignore
        }
      }

      // 5. Emails are now triggered in verifyPayment (Webhook)
      this.logger.log(`Order created successfully: ${orderData.id}`);
      return orderData;
    } catch (error) {
      // Do not log the request, receiver details, keys or raw DB/provider errors.
      if (error instanceof HttpException) throw error;
      this.logger.error('CHECKOUT_FAILED');
      throw new InternalServerErrorException('CHECKOUT_RESULT_UNKNOWN');
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

    // Stock is restored atomically by the database trigger in admin-order-integrity.sql.

    const { data: result, error } = await this.client.rpc('transition_order', {
      p_id: id,
      p_status: status,
      p_expected_status: currentStatus,
    });
    if (error) {
      if (error.code === 'PGRST202')
        throw new InternalServerErrorException(
          'Apply admin-order-integrity.sql before changing order status',
        );
      throw new BadRequestException(error.message);
    }
    const data =
      result as unknown as import('../common/types/database.types').Database['public']['Tables']['orders']['Row'];

    // Email Notification
    if (currentStatus !== status) {
      // Email Fallback: If updated data has no email, try to fetch from User
      const shippingInfo =
        (data.shipping_info as unknown as ShippingInfo) || {};
      if (!shippingInfo.email && data.user_id) {
        const { data: user } = await this.client
          .from('users')
          .select('email')
          .eq('id', data.user_id)
          .single();

        if (user?.email) {
          if (data.shipping_info) {
            const info = data.shipping_info as unknown as ShippingInfo;
            if (!info.email) {
              // Only set if email is not already present
              info.email = user.email;
            }

            data.shipping_info = { ...shippingInfo, email: user.email };
          }
        }
      }

      this.mailService
        .sendOrderStatusUpdate({
          ...data,
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          items: data.items as any,
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          shipping_info: data.shipping_info as any,
        })
        .catch((err) => console.error(err));
    }

    return data;
  }

  async verifyPayment(
    content: string,
    amount: number,
    transactionCode: string,
  ) {
    this.logger.log('Verifying SePay payment');
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
      this.logger.warn('Payment verification failed: missing order reference');
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

    if (
      !['PENDING', 'AWAITING_PAYMENT', 'SHIPPED', 'COMPLETED'].includes(
        order.status,
      )
    ) {
      return {
        success: false,
        reason: 'Order state requires manual payment review',
      };
    }
    const nextStatus = ['PENDING', 'AWAITING_PAYMENT'].includes(order.status)
      ? 'PAID'
      : order.status;
    const confirmed = await this.client
      .from('orders')
      .update({
        payment_status: 'paid',
        transaction_code: transactionCode,
        status: nextStatus,
      })
      .eq('id', orderId)
      .eq('status', order.status)
      .eq('payment_status', order.payment_status)
      .select('id')
      .maybeSingle();
    if (confirmed.error) {
      this.logger.error(
        'SePay payment persistence failed; manual/retry verification required',
      );
      return { success: false, reason: 'Payment could not be recorded' };
    }
    if (!confirmed.data) {
      const current = await this.client
        .from('orders')
        .select('payment_status')
        .eq('id', orderId)
        .maybeSingle();
      return current.data?.payment_status === 'paid'
        ? { success: true, message: 'Already paid' }
        : {
            success: false,
            reason: 'Order changed during payment verification',
          };
    }
    order.status = nextStatus;
    order.payment_status = 'paid';

    // Send Emails (Async - don't block response)
    let customerEmail = (order.shipping_info as unknown as ShippingInfo)?.email;

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
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        (order.shipping_info as any).email = customerEmail;
      }
    }

    // 1. Notify Verification/Payment Success to User
    this.mailService
      .sendPaymentSuccess({
        ...order,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        items: order.items as any,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        shipping_info: order.shipping_info as any,
      }) // Cast items
      .catch((e) => this.logger.error('Email failed', e));

    // 2. Notify Admin about the New Paid Order
    this.mailService
      .sendAdminAlert({
        ...order,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        items: order.items as any,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        shipping_info: order.shipping_info as any,
      })
      .catch((err) => console.error('Admin Email Error:', err));

    return { success: true, orderId };
  }
}
