import { reorderUrl, reorderSelectionUrl } from './order-links';
const id = '00000000-0000-4000-8000-000000000001';
describe('order email links', () => {
  it('links to the authenticated order page using the configured storefront origin', () => {
    expect(reorderUrl(id, 'https://shop.example.org/en')).toBe(
      `https://shop.example.org/vi/account/orders/${id}`,
    );
  });
  it.each(['invalid', '../admin', '-'.repeat(36)])(
    'rejects malformed order IDs',
    (value) => {
      expect(reorderUrl(value, 'https://shop.example.org')).toBeUndefined();
    },
  );
  it.each(['javascript:alert(1)', 'invalid'])(
    'rejects non-web or invalid storefront URLs',
    (value) => {
      expect(reorderUrl(id, value)).toBeUndefined();
    },
  );
});

describe('guest reorder email links', () => {
  it('contains only product selection, excluding order/contact details and historical prices', () => {
    const result = reorderSelectionUrl(
      [
        {
          productId: id,
          quantity: 2,
          price: 1,
          email: 'private@example.invalid',
          phone: 'private',
          variant_name: 'Hộp 20',
        },
      ],
      'https://shop.example.org',
    );
    const url = new URL(result!);
    expect(url.pathname).toBe('/vi/reorder');
    expect(JSON.parse(url.searchParams.get('items')!)).toEqual([
      { productId: id, quantity: 2, variantId: 'Hộp 20' },
    ]);
    expect(result).not.toContain('private');
  });
  it('does not generate a partial or invalid selection', () => {
    expect(
      reorderSelectionUrl([{ productId: id, quantity: 0 }]),
    ).toBeUndefined();
    expect(
      reorderSelectionUrl([{ productId: 'invalid', quantity: 1 }]),
    ).toBeUndefined();
  });
});
