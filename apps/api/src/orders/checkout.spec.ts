import {
  BadRequestException,
  ConflictException,
  GoneException,
  HttpException,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { checkoutIntent } from './checkout-intent';
import { CheckoutRepository } from './checkout.repository';
import { OrdersService } from './orders.service';
import { SupabaseService } from '../supabase/supabase.service';
import { CartService } from '../cart/cart.service';
import { MailService } from '../mail/mail.service';
import { VouchersService } from '../vouchers/vouchers.service';
import { ShippingQuoteService } from '../shipping/quote.service';

const P1 = '00000000-0000-4000-8000-000000000011';
const P2 = '00000000-0000-4000-8000-000000000012';
const USER = '00000000-0000-4000-8000-000000000021';
const KEY = '00000000-0000-4000-8000-0000000000aa';
const info = (extra: Record<string, unknown> = {}) => ({
  name: 'Fixture',
  phone: '+84900000000',
  address: 'Fixture street',
  city: 'Province',
  ...extra,
});

describe('checkoutIntent (idempotency fingerprint)', () => {
  it('merges duplicate lines and ignores line order and key case', () => {
    const a = checkoutIntent(
      KEY,
      USER,
      [
        { productId: P2, quantity: 1 },
        { productId: P1, quantity: 1 },
        { productId: P1, quantity: 2 },
      ],
      info(),
      'cod',
    );
    const b = checkoutIntent(
      KEY.toUpperCase(),
      USER,
      [
        { productId: P1.toUpperCase(), quantity: 3 },
        { productId: P2, quantity: 1 },
      ],
      info(),
      'cod',
    );
    expect(a.fingerprint).toMatch(/^[a-f0-9]{64}$/);
    expect(b.fingerprint).toBe(a.fingerprint);
    expect(b.key).toBe(KEY);
    expect(a.items).toEqual([
      { productId: P1, quantity: 3 },
      { productId: P2, quantity: 1 },
    ]);
  });
  it('changes when buyer intent changes, not when receipt time changes', () => {
    const fp = (
      userId: string | null,
      shipping: Record<string, unknown>,
      method: string,
      voucher?: string,
    ) =>
      checkoutIntent(
        KEY,
        userId,
        [{ productId: P1, quantity: 1 }],
        shipping,
        method,
        voucher,
      ).fingerprint;
    const original = fp(USER, info(), 'cod');
    expect(fp(null, info(), 'cod')).not.toBe(original);
    expect(fp(USER, info({ address: 'Other street' }), 'cod')).not.toBe(
      original,
    );
    expect(fp(USER, info(), 'sepay')).not.toBe(original);
    expect(fp(USER, info(), 'cod', 'SALE')).not.toBe(original);
    expect(fp(USER, info(), 'cod', ' sale ')).toBe(
      fp(USER, info(), 'cod', 'SALE'),
    );
    const receipt = (at: string) => ({
      legal_acceptance: {
        accepted: true,
        version: 'v1',
        purpose: 'order_fulfilment_and_terms',
        recorded_at: at,
      },
    });
    expect(fp(USER, info(receipt('2026-11-06T01:00:00Z')), 'cod')).toBe(
      fp(USER, info(receipt('2026-11-06T02:00:00Z')), 'cod'),
    );
  });
  it.each([
    ['missing key', undefined, 'CHECKOUT_INVALID_REQUEST'],
    ['non-uuid key', 'retry-1', 'CHECKOUT_INVALID_REQUEST'],
  ])('rejects %s', (_label, key, code) => {
    expect(() =>
      checkoutIntent(
        key,
        null,
        [{ productId: P1, quantity: 1 }],
        info(),
        'cod',
      ),
    ).toThrow(code);
  });
  it('rejects unknown payment methods, bad product ids and merged quantity above 100', () => {
    expect(() =>
      checkoutIntent(
        KEY,
        null,
        [{ productId: P1, quantity: 1 }],
        info(),
        'card',
      ),
    ).toThrow('CHECKOUT_INVALID_REQUEST');
    expect(() =>
      checkoutIntent(
        KEY,
        null,
        [{ productId: 'abc', quantity: 1 }],
        info(),
        'cod',
      ),
    ).toThrow('CHECKOUT_INVALID_ITEMS');
    expect(() =>
      checkoutIntent(
        KEY,
        null,
        [
          { productId: P1, quantity: 60 },
          { productId: P1, quantity: 41 },
        ],
        info(),
        'cod',
      ),
    ).toThrow('CHECKOUT_INVALID_ITEMS');
  });
});

describe('CheckoutRepository (database result mapping)', () => {
  const repo = (result: unknown, fail = false) =>
    new CheckoutRepository({
      getClient: () => ({
        rpc: () =>
          fail
            ? Promise.reject(new Error('socket hang up'))
            : Promise.resolve(result),
      }),
    } as unknown as SupabaseService);
  const order = { id: 'o1', items: [], total: 230000 };
  it('returns null when no earlier attempt exists and the order on success', async () => {
    await expect(
      repo({ data: null, error: null }).lookup(KEY, null, 'a'.repeat(64)),
    ).resolves.toBeNull();
    await expect(
      repo({ data: { order, replayed: false }, error: null }).create({}),
    ).resolves.toEqual({ order, replayed: false });
  });
  it.each([
    [
      { code: 'PT409', message: 'CHECKOUT_OUT_OF_STOCK' },
      ConflictException,
      'CHECKOUT_OUT_OF_STOCK',
    ],
    [
      { code: 'PT409', message: 'CHECKOUT_VOUCHER_UNAVAILABLE' },
      ConflictException,
      'CHECKOUT_VOUCHER_UNAVAILABLE',
    ],
    [
      { code: 'PT409', message: 'CHECKOUT_KEY_CONFLICT' },
      ConflictException,
      'CHECKOUT_KEY_CONFLICT',
    ],
    [
      { code: 'PT409', message: 'something else' },
      ServiceUnavailableException,
      'CHECKOUT_RESULT_UNKNOWN',
    ],
    [
      { code: 'PT410', message: 'x' },
      GoneException,
      'CHECKOUT_ORDER_UNAVAILABLE',
    ],
    [
      { code: '22023', message: 'x' },
      BadRequestException,
      'CHECKOUT_INVALID_REQUEST',
    ],
    [
      { code: 'PGRST202', message: 'x' },
      ServiceUnavailableException,
      'CHECKOUT_DATABASE_NOT_READY',
    ],
    [
      { code: '42501', message: 'x' },
      ServiceUnavailableException,
      'CHECKOUT_DATABASE_NOT_READY',
    ],
    [
      { code: '57014', message: 'timeout' },
      ServiceUnavailableException,
      'CHECKOUT_RESULT_UNKNOWN',
    ],
  ])('maps database error %j', async (error, type, message) => {
    const result = repo({ data: null, error }).create({});
    await expect(result).rejects.toBeInstanceOf(type);
    await expect(repo({ data: null, error }).create({})).rejects.toThrow(
      message,
    );
  });
  it('treats a lost connection or malformed reply as an unknown result', async () => {
    await expect(repo(null, true).create({})).rejects.toThrow(
      'CHECKOUT_RESULT_UNKNOWN',
    );
    for (const data of [
      { order: { id: 'o1', items: [], total: -1 }, replayed: false },
      { order: { id: 'o1', items: 'x', total: 1 }, replayed: false },
      { order: { id: 'o1', items: [], total: 1 } },
      { replayed: false },
    ])
      await expect(repo({ data, error: null }).create({})).rejects.toThrow(
        'CHECKOUT_RESULT_UNKNOWN',
      );
    await expect(repo({ data: null, error: null }).create({})).rejects.toThrow(
      'CHECKOUT_RESULT_UNKNOWN',
    );
  });
});

describe('OrdersService checkout replay', () => {
  const rpc = jest.fn(),
    productsIn = jest.fn(),
    clearCart = jest.fn(),
    validateVoucher = jest.fn(),
    revalidate = jest.fn();
  const order = { id: 'o1', items: [], total: 230000, status: 'PENDING' };
  let service: OrdersService;
  beforeEach(() => {
    rpc.mockReset();
    productsIn.mockReset().mockResolvedValue({
      data: [
        {
          id: P1,
          price: 200000,
          quantity: 1,
          is_active: true,
          images: [],
          slug: 'p1',
          variants: [],
          discount_percentage: 0,
          translations: [],
        },
      ],
      error: null,
    });
    clearCart.mockReset().mockResolvedValue(undefined);
    validateVoucher.mockReset();
    revalidate.mockReset();
    const db = {
      from: () => ({ select: () => ({ in: productsIn }) }),
      rpc,
    };
    service = new OrdersService(
      { getClient: () => db } as unknown as SupabaseService,
      { clearCart } as unknown as CartService,
      {} as MailService,
      { validateVoucher } as unknown as VouchersService,
      {
        requiresQuote: () => false,
        revalidate,
      } as unknown as ShippingQuoteService,
    );
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
  });
  afterEach(() => jest.restoreAllMocks());
  const create = () =>
    service.create(
      USER,
      [{ productId: P1, quantity: 1 }],
      info(),
      'cod',
      'SALE',
      undefined,
      KEY,
    );

  it('returns a committed order before re-checking stock, voucher or quote', async () => {
    rpc.mockResolvedValue({ data: { order, replayed: true }, error: null });
    await expect(create()).resolves.toEqual(order);
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc).toHaveBeenCalledWith(
      'checkout_lookup_request',
      expect.objectContaining({ p_key: KEY, p_user_id: USER }),
    );
    expect(productsIn).not.toHaveBeenCalled();
    expect(validateVoucher).not.toHaveBeenCalled();
    expect(revalidate).not.toHaveBeenCalled();
    expect(clearCart).not.toHaveBeenCalled();
  });
  it('clears the cart only for a newly committed order', async () => {
    validateVoucher.mockResolvedValue({
      isValid: true,
      discountAmount: 0,
      voucher: { code: 'SALE' },
    });
    rpc.mockImplementation((name: string) =>
      Promise.resolve(
        name === 'checkout_lookup_request'
          ? { data: null, error: null }
          : { data: { order, replayed: true }, error: null },
      ),
    );
    await expect(create()).resolves.toEqual(order);
    expect(clearCart).not.toHaveBeenCalled();
    rpc.mockImplementation((name: string) =>
      Promise.resolve(
        name === 'checkout_lookup_request'
          ? { data: null, error: null }
          : { data: { order, replayed: false }, error: null },
      ),
    );
    await create();
    expect(clearCart).toHaveBeenCalledTimes(1);
  });
  it('rejects a request without an idempotency key before touching the database', async () => {
    await expect(
      service.create(USER, [{ productId: P1, quantity: 1 }], info(), 'cod'),
    ).rejects.toThrow('CHECKOUT_INVALID_REQUEST');
    expect(rpc).not.toHaveBeenCalled();
    expect(productsIn).not.toHaveBeenCalled();
  });
  it('passes database conflicts through and hides unexpected failures', async () => {
    validateVoucher.mockResolvedValue({
      isValid: true,
      discountAmount: 0,
      voucher: { code: 'SALE' },
    });
    rpc.mockImplementation((name: string) =>
      Promise.resolve(
        name === 'checkout_lookup_request'
          ? { data: null, error: null }
          : {
              data: null,
              error: { code: 'PT409', message: 'CHECKOUT_OUT_OF_STOCK' },
            },
      ),
    );
    await expect(create()).rejects.toBeInstanceOf(ConflictException);
    productsIn.mockRejectedValue(
      new Error('relation "products" does not exist'),
    );
    rpc.mockResolvedValue({ data: null, error: null });
    const failure = await create().catch((error: unknown) => error);
    expect(failure).toBeInstanceOf(HttpException);
    expect((failure as HttpException).getStatus()).toBe(500);
    expect((failure as HttpException).message).toBe('CHECKOUT_RESULT_UNKNOWN');
    expect(clearCart).not.toHaveBeenCalled();
  });
});
