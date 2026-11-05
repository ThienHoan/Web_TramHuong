import { ConflictException, Logger } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { SupabaseService } from '../supabase/supabase.service';
import { CartService } from '../cart/cart.service';
import { MailService } from '../mail/mail.service';
import { VouchersService } from '../vouchers/vouchers.service';
import { ShippingQuoteService } from '../shipping/quote.service';

// Order, stock and voucher writes now happen inside ONE database call
// (checkout_create_order). These tests pin what the service sends to it.
describe('checkout integration preserves order/payment/voucher behavior', () => {
  let service: OrdersService;
  let created: Record<string, unknown> | undefined;
  const reference = '00000000-0000-4000-8000-000000000001';
  const owner = '00000000-0000-4000-8000-000000000002';
  const productId = '00000000-0000-4000-8000-000000000003';
  const key = '00000000-0000-4000-8000-0000000000aa';
  const quote = {
    reference,
    subtotal: 200000,
    voucherDiscount: 20000,
    customerFee: 25000,
    total: 205000,
  };
  const revalidate = jest.fn(),
    requiresQuote = jest.fn(),
    rpc = jest.fn(),
    clearCart = jest.fn();
  beforeEach(() => {
    created = undefined;
    clearCart.mockReset().mockResolvedValue(undefined);
    requiresQuote.mockReset().mockReturnValue(true);
    revalidate.mockReset().mockResolvedValue({ ...quote });
    rpc
      .mockReset()
      .mockImplementation((name: string, args: Record<string, unknown>) => {
        if (name === 'checkout_lookup_request')
          return Promise.resolve({ data: null, error: null });
        if (name !== 'checkout_create_order')
          return Promise.resolve({ data: null, error: { code: 'PGRST202' } });
        created = args;
        return Promise.resolve({
          data: {
            order: { id: 'fixture-order', items: args.p_items, total: 1 },
            replayed: false,
          },
          error: null,
        });
      });
    const product = {
      id: productId,
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
          };
        // Any direct write to orders/products/vouchers would bypass the transaction.
        throw new Error(`UNEXPECTED_DIRECT_TABLE_ACCESS:${table}`);
      },
      rpc,
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
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
  });
  afterEach(() => jest.restoreAllMocks());
  const info = () => ({
    name: 'Fixture',
    phone: '0900000000',
    address: 'Fixture street',
    city: 'Province',
  });
  const createCalls = () =>
    (rpc.mock.calls as [string, Record<string, unknown>][]).filter(
      ([name]) => name === 'checkout_create_order',
    );

  it('persists server-quoted fee while preserving SePay status and voucher snapshots', async () => {
    await service.create(
      owner,
      [{ productId, quantity: 1 }],
      info(),
      'sepay',
      'TEST',
      reference,
      key,
    );
    expect(createCalls()).toHaveLength(1);
    expect(created).toMatchObject({
      p_key: key,
      p_user_id: owner,
      p_payment_method: 'sepay',
      p_voucher_code: 'TEST',
      p_expected_subtotal: 200000,
      p_expected_discount: 20000,
      p_shipping_fee: 25000,
      p_quote: quote,
      p_shipping_info: {
        shipping_fee: 25000,
        shipping_quote_reference: reference,
      },
    });
    expect(created?.p_fingerprint).toMatch(/^[a-f0-9]{64}$/);
    expect(created?.p_items).toEqual([
      expect.objectContaining({
        productId,
        quantity: 1,
        price: 200000,
        original_price: 200000,
        discount_amount: 0,
      }),
    ]);
    expect(clearCart).toHaveBeenCalledWith(owner);
  });
  it('does not consume a voucher, decrement stock or insert an order for an expired quote', async () => {
    revalidate.mockRejectedValue(
      new ConflictException('SHIPPING_QUOTE_EXPIRED'),
    );
    await expect(
      service.create(
        owner,
        [{ productId, quantity: 1 }],
        info(),
        'sepay',
        'TEST',
        reference,
        key,
      ),
    ).rejects.toThrow('SHIPPING_QUOTE_EXPIRED');
    expect(revalidate).toHaveBeenCalledTimes(1);
    expect(createCalls()).toHaveLength(0);
    expect(clearCart).not.toHaveBeenCalled();
  });
  it('requires a quote when enabled and preserves the legacy fee while disabled', async () => {
    await expect(
      service.create(
        null,
        [{ productId, quantity: 1 }],
        info(),
        'cod',
        undefined,
        undefined,
        key,
      ),
    ).rejects.toThrow('SHIPPING_QUOTE_REQUIRED');
    expect(createCalls()).toHaveLength(0);
    requiresQuote.mockReturnValue(false);
    await service.create(
      null,
      [{ productId, quantity: 1 }],
      info(),
      'cod',
      undefined,
      undefined,
      key,
    );
    expect(created).toMatchObject({
      p_user_id: null,
      p_payment_method: 'cod',
      p_voucher_code: null,
      p_expected_discount: 0,
      p_shipping_fee: 30000,
      p_quote: null,
      p_shipping_info: { shipping_fee: 30000 },
    });
    expect(clearCart).not.toHaveBeenCalled();
  });
  it('preserves showroom pickup without a shipping quote or shipping charge', async () => {
    await service.create(
      null,
      [{ productId, quantity: 1 }],
      info(),
      'showroom',
      undefined,
      undefined,
      key,
    );
    expect(revalidate).not.toHaveBeenCalled();
    expect(created).toMatchObject({
      p_payment_method: 'showroom',
      p_shipping_fee: 0,
      p_quote: null,
      p_shipping_info: { shipping_fee: 0, delivery_method: 'pickup' },
    });
  });
});
