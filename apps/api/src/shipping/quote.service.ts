import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { createHash, randomUUID } from 'node:crypto';
import { SupabaseService } from '../supabase/supabase.service';
import { VouchersService } from '../vouchers/vouchers.service';
import { productPrice } from '../common/commerce-pricing';
import { LogisticsRepository } from './logistics.repository';
import {
  LOGISTICS_SETTINGS,
  type LogisticsSettings,
  type PackageProfile,
  type Warehouse,
} from './logistics.types';
import { GhnProvider } from './ghn/ghn.provider';
import { ShippingAddressService } from './address.service';
import { QuoteDto } from './dto/quote.dto';
import type { ShippingPreviewInput } from './contracts/shipping-provider';
import type { ShippingDestinationDto } from './dto/address.dto';
import { promotionSubsidy, type ShippingPromotion } from './promotion-policy';
export function logisticsHash(value: unknown) {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}
export function canonicalItems(items: QuoteDto['items']) {
  const map = new Map<
    string,
    { productId: string; variantId: string; quantity: number }
  >();
  for (const item of items) {
    const key = JSON.stringify([item.productId, item.variantId || '']);
    const row = map.get(key) || {
      productId: item.productId,
      variantId: item.variantId || '',
      quantity: 0,
    };
    row.quantity += item.quantity;
    if (
      !Number.isSafeInteger(row.quantity) ||
      row.quantity < 1 ||
      row.quantity > 100
    )
      throw new BadRequestException('SHIPPING_QUANTITY_INVALID');
    map.set(key, row);
  }
  return [...map.values()].sort((a, b) =>
    JSON.stringify(a).localeCompare(JSON.stringify(b)),
  );
}
export interface QuoteSnapshot {
  input: QuoteDto;
  preview: ShippingPreviewInput;
  shopId: number;
  warehouseId: string;
  warehouseName?: string;
  categoryValues?: { categoryId: string | null; subtotal: number }[];
  fingerprint: string;
  subtotal: number;
  voucherDiscount: number;
  actualFee: number;
  customerFee: number;
  subsidy: number;
  total: number;
  eta: string | null;
  expiresAt: string;
}
interface HistoricalPricing {
  items: {
    productId: string;
    variantId?: string;
    quantity: number;
    price: number;
  }[];
  voucherDiscount: number;
  customerFee: number;
  total: number;
  paid: boolean;
}
@Injectable()
export class ShippingQuoteService {
  private readonly inFlight = new Map<
    string,
    Promise<QuoteSnapshot & { reference: string }>
  >();
  constructor(
    private readonly repo: LogisticsRepository,
    private readonly supabase: SupabaseService,
    private readonly vouchers: VouchersService,
    private readonly addresses: ShippingAddressService,
    private readonly provider: GhnProvider,
    @Inject(LOGISTICS_SETTINGS) private readonly settings: LogisticsSettings,
  ) {}
  requiresQuote() {
    return this.settings.checkout;
  }
  async quote(
    input: QuoteDto,
    ownerId: string | null,
    persist = true,
    historical?: HistoricalPricing,
  ): Promise<QuoteSnapshot & { reference: string }> {
    // Only coalesce simultaneous public quote requests. Checkout revalidation
    // and historical preparation always read current trusted data afresh.
    if (!persist || historical)
      return this.buildQuote(input, ownerId, persist, historical);
    const key = logisticsHash([ownerId, input]);
    const pending = this.inFlight.get(key);
    if (pending) return pending;
    if (this.inFlight.size >= 256)
      throw new ServiceUnavailableException('SHIPPING_QUOTE_BUSY');
    const task = this.buildQuote(input, ownerId, persist);
    this.inFlight.set(key, task);
    try {
      return await task;
    } finally {
      this.inFlight.delete(key);
    }
  }
  private async buildQuote(
    input: QuoteDto,
    ownerId: string | null,
    persist = true,
    historical?: HistoricalPricing,
  ) {
    if (!this.settings.checkout && !historical)
      throw new ServiceUnavailableException('SHIPPING_CHECKOUT_DISABLED');
    const warehouse = await this.repo.get<Warehouse>(
      `warehouse:${input.warehouseId}`,
    );
    if (!warehouse?.data.active)
      throw new BadRequestException('SHIPPING_WAREHOUSE_UNAVAILABLE');
    const items = canonicalItems(input.items);
    const result = await this.supabase
      .getClient()
      .from('products')
      .select(
        'id,slug,price,is_active,quantity,variants,discount_percentage,discount_start_date,discount_end_date,category_id',
      )
      .in(
        'id',
        items.map((row) => row.productId),
      );
    if (result.error)
      throw new ServiceUnavailableException('SHIPPING_CATALOG_UNAVAILABLE');
    let unitCostTotal: number | null = 0;
    const categoryValues: { categoryId: string | null; subtotal: number }[] =
      [];
    let subtotal = 0,
      weight = warehouse.data.tareGrams,
      height = 2 * warehouse.data.paddingCm,
      length = 0,
      width = 0;
    const fingerprint: unknown[] = [warehouse.version];
    for (const item of items) {
      const product = result.data?.find((row) => row.id === item.productId);
      const requested = items
        .filter((row) => row.productId === item.productId)
        .reduce((sum, row) => sum + row.quantity, 0);
      if (
        !product ||
        (!historical && (!product.is_active || product.quantity < requested))
      )
        throw new BadRequestException('SHIPPING_PRODUCT_UNAVAILABLE');
      if (
        item.variantId &&
        (!Array.isArray(product.variants) ||
          !product.variants.some(
            (v) =>
              v &&
              typeof v === 'object' &&
              !Array.isArray(v) &&
              v.name === item.variantId,
          ))
      )
        throw new BadRequestException('SHIPPING_VARIANT_INVALID');
      const profile = await this.repo.get<PackageProfile>(
        `profile:${item.productId}:${item.variantId}`,
      );
      if (!profile || profile.state !== 'ACTIVE')
        throw new BadRequestException('SHIPPING_MEASURED_PACKAGE_REQUIRED');
      const p = profile.data;
      unitCostTotal =
        p.unitCost === undefined
          ? null
          : unitCostTotal === null
            ? null
            : unitCostTotal + p.unitCost * item.quantity;
      weight += p.weightGrams * item.quantity;
      height += p.heightCm * item.quantity;
      length = Math.max(length, p.lengthCm);
      width = Math.max(width, p.widthCm);
      const price = historical
        ? historical.items.find(
            (row) =>
              row.productId === item.productId &&
              (row.variantId || '') === item.variantId,
          )?.price
        : productPrice(product, item.variantId || undefined).price;
      if (price === undefined || !Number.isFinite(price) || price < 0)
        throw new BadRequestException('HISTORICAL_ORDER_PRICE_INVALID');
      subtotal += price * item.quantity;
      categoryValues.push({
        categoryId: product.category_id || null,
        subtotal: price * item.quantity,
      });
      fingerprint.push([item, price, profile.version]);
    }
    length += 2 * warehouse.data.paddingCm;
    width += 2 * warehouse.data.paddingCm;
    let voucherDiscount = 0;
    if (historical) voucherDiscount = historical.voucherDiscount;
    else if (input.voucherCode) {
      const validation = await this.vouchers.validateVoucher(
        input.voucherCode,
        subtotal,
      );
      if (!validation.isValid)
        throw new BadRequestException('SHIPPING_VOUCHER_INVALID');
      voucherDiscount = validation.discountAmount;
    }
    const destination = await this.addresses.validate(input.destination);
    const preview: ShippingPreviewInput = {
      destination,
      recipient: input.recipient,
      parcel: {
        weightGrams: weight,
        lengthCm: length,
        widthCm: width,
        heightCm: height,
        declaredValue: subtotal,
      },
      serviceTypeId: 2,
      codAmount: historical
        ? historical.paid
          ? 0
          : historical.total
        : input.paymentMethod === 'cod'
          ? Math.max(0, subtotal - voucherDiscount)
          : 0,
      content: 'TramHuong merchandise',
    };
    const provider = this.provider.forShop(warehouse.data.shopId);
    if (destination.scheme === 'legacy') {
      const services = await provider.getAvailableServices({
        originDistrictId: warehouse.data.districtId,
        destinationDistrictId: Number(destination.district!.id),
      });
      if (!services.some((row) => row.typeId === 2))
        throw new BadRequestException('SHIPPING_SERVICE_UNAVAILABLE');
    }
    let carrier = await provider.previewShipment(preview);
    const promotions = await this.repo.list<ShippingPromotion>('promotion', {
      state: 'ACTIVE',
      limit: 100,
    });
    const fee = (actual: number) =>
      subtotal >= 300000
        ? 0
        : Math.max(
            0,
            actual -
              Math.max(
                0,
                ...promotions.data.map((r) =>
                  promotionSubsidy(
                    r.data,
                    subtotal,
                    voucherDiscount,
                    unitCostTotal,
                    actual,
                  ),
                ),
              ),
          );
    let customerFee = historical
      ? historical.customerFee
      : fee(carrier.actualFee);
    if (!historical && input.paymentMethod === 'cod') {
      let converged = false;
      for (let i = 0; i < 3; i++) {
        const cod = Math.max(0, subtotal - voucherDiscount) + customerFee;
        if (preview.codAmount === cod) {
          converged = true;
          break;
        }
        preview.codAmount = cod;
        carrier = await provider.previewShipment(preview);
        customerFee = fee(carrier.actualFee);
      }
      if (
        !converged &&
        preview.codAmount !==
          Math.max(0, subtotal - voucherDiscount) + customerFee
      )
        throw new ConflictException('SHIPPING_COD_FEE_NOT_STABLE');
    }
    fingerprint.push(
      promotions.data
        .map((r) => [r.key, r.version])
        .sort((a, b) => String(a[0]).localeCompare(String(b[0]))),
    );
    const snapshot: QuoteSnapshot = {
      input,
      preview,
      shopId: warehouse.data.shopId,
      warehouseId: input.warehouseId,
      warehouseName: warehouse.data.name,
      categoryValues,
      fingerprint: logisticsHash(fingerprint),
      subtotal,
      voucherDiscount,
      actualFee: carrier.actualFee,
      customerFee,
      subsidy: Math.max(0, carrier.actualFee - customerFee),
      total: historical
        ? historical.total
        : Math.max(0, subtotal - voucherDiscount) + customerFee,
      eta: carrier.estimatedDeliveryAt,
      expiresAt: new Date(Date.now() + 5 * 60000).toISOString(),
    };
    const id = randomUUID();
    if (persist)
      await this.repo.write(
        `quote:${id}`,
        'quote',
        'VALID',
        snapshot,
        undefined,
        ownerId,
      );
    return { reference: id, ...snapshot };
  }
  async prepareExistingOrder(
    orderId: string,
    warehouseId: string,
    destination: ShippingDestinationDto,
  ) {
    const db = this.supabase.getClient();
    const r = await db.from('orders').select('*').eq('id', orderId).single();
    if (r.error || !r.data) throw new BadRequestException('ORDER_NOT_FOUND');
    const order = r.data;
    const info = order.shipping_info as Record<string, unknown> | null;
    if (!info || !Array.isArray(order.items))
      throw new BadRequestException('ORDER_SHIPPING_DETAILS_REQUIRED');
    const items = order.items.map((value) => {
      if (!value || typeof value !== 'object' || Array.isArray(value))
        throw new BadRequestException('ORDER_ITEMS_INVALID');
      const productId = value.productId || value.product_id;
      const variant = value.variantId || value.variant_id;
      const quantity = Number(value.quantity),
        price = Number(value.price);
      if (
        typeof productId !== 'string' ||
        !Number.isSafeInteger(quantity) ||
        quantity <= 0 ||
        !Number.isFinite(price) ||
        price < 0
      )
        throw new BadRequestException('ORDER_ITEMS_INVALID');
      return {
        productId,
        quantity,
        price,
        variantId: typeof variant === 'string' ? variant : undefined,
      };
    });
    const field = (value: unknown) => (typeof value === 'string' ? value : '');
    const recipient = {
      name: field(info.name) || field(info.full_name),
      phone: field(info.phone),
      address: field(info.full_address) || field(info.address),
    };
    const subtotal = items.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0,
      ),
      discount = order.voucher_discount_amount || 0;
    const customerFee = Number(
      info.shipping_fee ?? order.total - subtotal + discount,
    );
    if (!Number.isSafeInteger(customerFee) || customerFee < 0)
      throw new BadRequestException('ORDER_SHIPPING_PRICE_REQUIRES_REVIEW');
    const result = await this.quote(
      {
        items,
        recipient,
        destination,
        warehouseId,
        paymentMethod: order.payment_status === 'paid' ? 'sepay' : 'cod',
      },
      order.user_id,
      false,
      {
        items,
        voucherDiscount: discount,
        customerFee,
        total: order.total,
        paid: order.payment_status === 'paid',
      },
    );
    const attached = await db.rpc('shipping_attach_snapshot', {
      p_order_id: orderId,
      p_total: order.total,
      p_snapshot: JSON.parse(
        JSON.stringify(result),
      ) as import('../common/types/database.types').Json,
    });
    if (attached.error)
      throw new ConflictException('ORDER_CHANGED_DURING_PREPARATION');
    return {
      actualFee: result.actualFee,
      customerFee: result.customerFee,
      subsidy: result.subsidy,
      total: result.total,
      warehouseId,
    };
  }
  async revalidate(
    reference: string,
    ownerId: string | null,
    items: QuoteDto['items'],
    info: { name?: string; phone?: string; address?: string; city?: string },
    paymentMethod: string,
    voucherCode?: string,
  ) {
    const record = await this.repo.get<QuoteSnapshot>(`quote:${reference}`);
    if (!record || Date.parse(record.data.expiresAt) <= Date.now())
      throw new ConflictException('SHIPPING_QUOTE_EXPIRED');
    if (record.owner_id !== ownerId)
      throw new ForbiddenException('SHIPPING_QUOTE_OWNER_MISMATCH');
    const old = record.data;
    const phone = (value: string) =>
      value.replace(/^0/, '+84').replace(/\s/g, '');
    if (
      JSON.stringify(canonicalItems(items)) !==
        JSON.stringify(canonicalItems(old.input.items)) ||
      info.name?.trim() !== old.input.recipient.name.trim() ||
      phone(info.phone || '') !== phone(old.input.recipient.phone) ||
      info.address?.trim() !== old.input.recipient.address.trim() ||
      info.city?.trim() !== old.preview.destination.province.name.trim() ||
      paymentMethod !== old.input.paymentMethod ||
      (voucherCode || '').trim().toUpperCase() !==
        (old.input.voucherCode || '').trim().toUpperCase()
    )
      throw new ConflictException('SHIPPING_QUOTE_CHANGED');
    const fresh = await this.quote(old.input, ownerId, false);
    if (
      [
        'fingerprint',
        'subtotal',
        'voucherDiscount',
        'actualFee',
        'customerFee',
        'total',
      ].some(
        (key) =>
          fresh[key as keyof QuoteSnapshot] !== old[key as keyof QuoteSnapshot],
      )
    )
      throw new ConflictException('SHIPPING_QUOTE_CHANGED');
    return { reference, ...old };
  }
}
