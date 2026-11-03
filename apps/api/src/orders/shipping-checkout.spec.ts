import { Logger } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { SupabaseService } from '../supabase/supabase.service';
import { CartService } from '../cart/cart.service';
import { MailService } from '../mail/mail.service';
import { VouchersService } from '../vouchers/vouchers.service';
import { ShippingQuoteService } from '../shipping/quote.service';
describe('checkout integration preserves order/payment/voucher behavior', () => {
  let service: OrdersService;
  let inserted: Record<string, unknown> | undefined;
  const reference = '00000000-0000-4000-8000-000000000001';
  const revalidate = jest.fn(),
    requiresQuote = jest.fn(),
    stock = jest.fn(),
    voucherUse = jest.fn(),
    clearCart = jest.fn();
  beforeEach(() => {
    inserted = undefined;
    stock.mockReset().mockResolvedValue({ error: null });
    voucherUse.mockReset().mockReturnValue({
      eq: () => ({
        select: () => ({
          single: () => Promise.resolve({ data: {}, error: null }),
        }),
      }),
    });
    clearCart.mockReset().mockResolvedValue(undefined);
    requiresQuote.mockReset().mockReturnValue(true);
    revalidate.mockReset().mockResolvedValue({
      reference,
      subtotal: 200000,
      voucherDiscount: 20000,
      customerFee: 25000,
      total: 205000,
    });
    const product = {
      id: 'product',
      price: 200000,
      quantity: 10,
      is_active: true,
      images: [],
      slug: 'fixture',
      variants: [],
      discount_percentage: 0,
      discount_start_date: null,
      discount_end_date: null,
      translations: [{ title: 'Fixture', locale: 'vi' }],
    };
    const db = {
      from: (table: string) => {
        if (table === 'products')
          return {
            select: () => ({
              in: () => Promise.resolve({ data: [product], error: null }),
            }),
            update: () => ({ eq: stock }),
          };
        if (table === 'vouchers') return { update: voucherUse };
        return {
          insert: (data: Record<string, unknown>) => {
            inserted = data;
            return {
              select: () => ({
                single: () =>
                  Promise.resolve({
                    data: { id: 'fixture-order', ...data },
                    error: null,
                  }),
              }),
            };
          },
        };
      },
    };
    service = new OrdersService(
      { getClient: () => db } as unknown as SupabaseService,
      { clearCart } as unknown as CartService,
      {} as MailService,
      {
        validateVoucher: () =>
          Promise.resolve({
            isValid: true,
            discountAmount: 20000,
            voucher: { code: 'TEST', id: 'voucher', usage_count: 0 },
          }),
      } as unknown as VouchersService,
      { requiresQuote, revalidate } as unknown as ShippingQuoteService,
    );
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
  });
  afterEach(() => jest.restoreAllMocks());
  const info = () => ({
    name: 'Fixture',
    phone: '0900000000',
    address: 'Fixture street',
    city: 'Province',
  });
  it('persists server-quoted fee while preserving SePay status and voucher snapshots', async () => {
    await service.create(
      'owner',
      [{ productId: 'product', quantity: 1 }],
      info(),
      'sepay',
      'TEST',
      reference,
    );
    expect(inserted).toMatchObject({
      total: 205000,
      status: 'AWAITING_PAYMENT',
      payment_status: 'pending',
      payment_method: 'sepay',
      voucher_code: 'TEST',
      voucher_discount_amount: 20000,
      shipping_info: {
        shipping_fee: 25000,
        shipping_quote_reference: reference,
      },
    });
    expect(voucherUse).toHaveBeenCalledTimes(1);
    expect(stock).toHaveBeenCalledTimes(1);
  });
  it('does not consume a voucher, decrement stock or insert an order for an expired quote', async () => {
    revalidate.mockRejectedValue(new Error('SHIPPING_QUOTE_EXPIRED'));
    await expect(
      service.create(
        'owner',
        [{ productId: 'product', quantity: 1 }],
        info(),
        'sepay',
        'TEST',
        reference,
      ),
    ).rejects.toThrow();
    expect(inserted).toBeUndefined();
    expect(voucherUse).not.toHaveBeenCalled();
    expect(stock).not.toHaveBeenCalled();
  });
  it('requires a quote when enabled and preserves the legacy fee while disabled', async () => {
    await expect(
      service.create(
        null,
        [{ productId: 'product', quantity: 1 }],
        info(),
        'cod',
      ),
    ).rejects.toThrow('QUOTE_REQUIRED');
    expect(inserted).toBeUndefined();
    requiresQuote.mockReturnValue(false);
    await service.create(
      null,
      [{ productId: 'product', quantity: 1 }],
      info(),
      'cod',
    );
    expect(inserted).toMatchObject({
      total: 230000,
      status: 'PENDING',
      shipping_info: { shipping_fee: 30000 },
    });
  });
  it('preserves showroom pickup without a shipping quote or shipping charge', async () => {
    await service.create(
      null,
      [{ productId: 'product', quantity: 1 }],
      info(),
      'showroom',
    );
    expect(revalidate).not.toHaveBeenCalled();
    expect(inserted).toMatchObject({
      total: 200000,
      payment_method: 'cod',
      shipping_info: { shipping_fee: 0, delivery_method: 'pickup' },
    });
  });
});
