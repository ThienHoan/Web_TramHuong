export interface PricedProduct {
  price: number;
  variants: unknown;
  discount_percentage: number;
  discount_start_date: string | null;
  discount_end_date: string | null;
}
// Shared by checkout order creation and logistics; no browser price is accepted.
export function productPrice(
  product: PricedProduct,
  variantId?: string,
  now = new Date(),
) {
  let originalPrice = Number(product.price);
  if (variantId && Array.isArray(product.variants)) {
    const variant = product.variants.find(
      (value: unknown) =>
        value &&
        typeof value === 'object' &&
        'name' in value &&
        value.name === variantId,
    ) as { price?: number } | undefined;
    if (variant?.price !== undefined) originalPrice = Number(variant.price);
  }
  const active =
    product.discount_percentage > 0 &&
    (!product.discount_start_date ||
      new Date(product.discount_start_date) <= now) &&
    (!product.discount_end_date || new Date(product.discount_end_date) >= now);
  const price = active
    ? Math.round((originalPrice * (100 - product.discount_percentage)) / 100)
    : originalPrice;
  if (!Number.isFinite(price) || price < 0)
    throw new Error('PRODUCT_PRICE_INVALID');
  return { originalPrice, price, discountAmount: originalPrice - price };
}
