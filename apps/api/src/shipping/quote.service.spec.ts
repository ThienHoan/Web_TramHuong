import { ShippingQuoteService } from './quote.service';
import { MemoryLogisticsRepository } from './testing/memory-repository';
import { LogisticsRepository } from './logistics.repository';
import { SupabaseService } from '../supabase/supabase.service';
import { VouchersService } from '../vouchers/vouchers.service';
import { ShippingAddressService } from './address.service';
import { GhnProvider } from './ghn/ghn.provider';
import type { QuoteDto } from './dto/quote.dto';
describe('trusted shipping quotes', () => {
  const input: QuoteDto = {
    items: [{ productId: 'product', quantity: 1 }],
    warehouseId: 'warehouse',
    paymentMethod: 'cod',
    recipient: {
      name: 'Fixture',
      phone: '0900000000',
      address: 'Fixture street',
    },
    destination: { scheme: 'two_level', provinceId: 1, wardCode: '2' },
  };
  let repo: MemoryLogisticsRepository,
    service: ShippingQuoteService,
    preview: jest.Mock;
  const product = {
    id: 'product',
    slug: 'fixture',
    price: 200000,
    is_active: true,
    quantity: 10,
    variants: [],
    discount_percentage: 0,
    discount_start_date: null,
    discount_end_date: null,
  };
  beforeEach(async () => {
    product.quantity = 10;
    product.is_active = true;
    repo = new MemoryLogisticsRepository();
    await repo.write('warehouse:warehouse', 'warehouse', 'ACTIVE', {
      name: 'Fixture',
      shopId: 123,
      districtId: 1,
      active: true,
      tareGrams: 100,
      paddingCm: 1,
    });
    await repo.write('profile:product:', 'profile', 'ACTIVE', {
      productId: 'product',
      variantId: '',
      weightGrams: 100,
      lengthCm: 5,
      widthCm: 5,
      heightCm: 5,
    });
    preview = jest
      .fn()
      .mockResolvedValue({ actualFee: 25000, estimatedDeliveryAt: null });
    const provider = { forShop: () => ({ previewShipment: preview }) };
    const db = {
      from: () => ({
        select: () => ({
          in: () => Promise.resolve({ data: [product], error: null }),
        }),
      }),
    };
    service = new ShippingQuoteService(
      repo as unknown as LogisticsRepository,
      { getClient: () => db } as unknown as SupabaseService,
      {
        validateVoucher: () =>
          Promise.resolve({ isValid: true, discountAmount: 10000 }),
      } as unknown as VouchersService,
      {
        validate: () =>
          Promise.resolve({
            provider: 'ghn',
            scheme: 'two_level',
            province: { name: 'Province' },
            ward: { name: 'Ward' },
          }),
      } as unknown as ShippingAddressService,
      provider as unknown as GhnProvider,
      { checkout: true, jobs: false, fulfillment: false, webhookSecret: '' },
    );
  });
  it('keeps historical order prices and shipping charges even when current stock is exhausted', async () => {
    product.quantity = 0;
    product.is_active = false;
    const result = await service.quote(input, 'owner', false, {
      items: [{ productId: 'product', quantity: 1, price: 150000 }],
      voucherDiscount: 0,
      customerFee: 30000,
      total: 180000,
      paid: false,
    });
    expect(result.subtotal).toBe(150000);
    expect(result.customerFee).toBe(30000);
    expect(result.total).toBe(180000);
    expect(result.preview.codAmount).toBe(180000);
  });
  it('refuses inactive measured-package profiles', async () => {
    const row = await repo.get('profile:product:');
    await repo.write(
      'profile:product:',
      'profile',
      'INACTIVE',
      row!.data,
      row!,
    );
    await expect(service.quote(input, null)).rejects.toThrow(
      'MEASURED_PACKAGE',
    );
    expect(preview).not.toHaveBeenCalled();
  });
  it('coalesces simultaneous same-owner quotes but refreshes completed quotes', async () => {
    const [a, b] = await Promise.all([
      service.quote(input, 'owner'),
      service.quote(input, 'owner'),
    ]);
    expect(a.reference).toBe(b.reference);
    expect((await repo.list('quote')).total).toBe(1);
    const fresh = await service.quote(input, 'owner');
    expect(fresh.reference).not.toBe(a.reference);
    const other = await service.quote(input, 'other');
    expect(other.reference).not.toBe(fresh.reference);
  });
  it('uses measured server packaging/price and distinguishes actual fee, subsidy and final total', async () => {
    const r = await service.quote(input, 'owner');
    expect(r.total).toBe(225000);
    expect(r.preview.parcel.weightGrams).toBe(200);
    expect(r.preview.parcel.heightCm).toBe(7);
    expect(await repo.get(`quote:${r.reference}`)).not.toBeNull();
  });
  it('does not fabricate package data when a profile is missing', async () => {
    repo.rows.delete('profile:product:');
    await expect(service.quote(input, null)).rejects.toThrow(
      'MEASURED_PACKAGE',
    );
    expect(preview).not.toHaveBeenCalled();
  });
  it('rejects unknown variants and excessive quantities', async () => {
    await expect(
      service.quote(
        {
          ...input,
          items: [{ productId: 'product', variantId: 'fake', quantity: 1 }],
        },
        null,
      ),
    ).rejects.toThrow('VARIANT');
    await expect(
      service.quote(
        { ...input, items: [{ productId: 'product', quantity: 101 }] },
        null,
      ),
    ).rejects.toThrow('QUANTITY');
  });
  it('does not collect COD on online payments and validates voucher without consuming usage', async () => {
    const r = await service.quote(
      { ...input, paymentMethod: 'sepay', voucherCode: 'TEST' },
      null,
    );
    expect(r.preview.codAmount).toBe(0);
    expect(r.total).toBe(215000);
  });
  it('checks owner, recipient, cart and expiry before checkout', async () => {
    const r = await service.quote(input, 'owner');
    await expect(
      service.revalidate(
        r.reference,
        'other',
        input.items,
        { ...input.recipient, city: 'Province' },
        'cod',
      ),
    ).rejects.toThrow('OWNER');
    await expect(
      service.revalidate(
        r.reference,
        'owner',
        input.items,
        { ...input.recipient, address: 'Changed', city: 'Province' },
        'cod',
      ),
    ).rejects.toThrow('CHANGED');
    const row = repo.rows.get(`quote:${r.reference}`)!;
    (row.data as { expiresAt: string }).expiresAt = new Date(0).toISOString();
    await expect(
      service.revalidate(
        r.reference,
        'owner',
        input.items,
        { ...input.recipient, city: 'Province' },
        'cod',
      ),
    ).rejects.toThrow('EXPIRED');
  });
  it('rejects changed carrier fees instead of silently charging a different price', async () => {
    const r = await service.quote(input, null);
    preview.mockResolvedValue({ actualFee: 35000, estimatedDeliveryAt: null });
    await expect(
      service.revalidate(
        r.reference,
        null,
        input.items,
        { ...input.recipient, city: 'Province' },
        'cod',
      ),
    ).rejects.toThrow('CHANGED');
  });
});
