import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateOrderDto } from './dto/create-order.dto';
import {
  FLAT_RATE_POLICY,
  flatRateShippingFee,
} from '../shipping/flat-rate-policy';
const fixture = (email?: unknown) =>
  plainToInstance(CreateOrderDto, {
    idempotencyKey: '00000000-0000-4000-8000-000000000001',
    items: [{ productId: '00000000-0000-4000-8000-000000000002', quantity: 1 }],
    shipping_info: {
      name: 'Khách thử',
      phone: '+84912345678',
      address: '153 Lý Thái Tổ',
      city: 'Thành phố Huế',
      ...(email === undefined ? {} : { email }),
    },
    paymentMethod: 'cod',
  });
describe('checkout upgrade', () => {
  it.each([
    undefined,
    '',
    '   ',
    'customer@example.com',
    ' customer@example.com ',
  ])('accepts optional or valid guest email %p', async (email) => {
    expect(await validate(fixture(email))).toEqual([]);
  });
  it.each(['invalid', 'a@', 'a@example', 123, ['a@example.com']])(
    'rejects malformed guest email %p',
    async (email) => {
      const errors = await validate(fixture(email));
      expect(
        errors.some(
          (e) =>
            e.property === 'shipping_info' &&
            e.children?.some((c) => c.property === 'email'),
        ),
      ).toBe(true);
    },
  );
  it('normalizes blank emails away and trims valid emails', () => {
    expect(fixture(' ').shipping_info.email).toBeUndefined();
    expect(fixture(' a@example.com ').shipping_info.email).toBe(
      'a@example.com',
    );
  });
  it('accepts two-level addresses without a district', async () => {
    expect(await validate(fixture())).toEqual([]);
  });
  it('prices delivery using the same advertised threshold at its boundary', () => {
    expect(flatRateShippingFee(FLAT_RATE_POLICY.freeFrom - 1)).toBe(
      FLAT_RATE_POLICY.fee,
    );
    expect(flatRateShippingFee(FLAT_RATE_POLICY.freeFrom)).toBe(0);
    expect(flatRateShippingFee(FLAT_RATE_POLICY.freeFrom + 1)).toBe(0);
  });
});
