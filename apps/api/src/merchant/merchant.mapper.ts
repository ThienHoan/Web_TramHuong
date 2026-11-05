import { isIP } from 'node:net';
import { productPrice } from '../common/commerce-pricing';
import type { Database } from '../common/types/database.types';

type Product = Database['public']['Tables']['products']['Row'];
export type MerchantCatalogProduct = Pick<
  Product,
  | 'id'
  | 'slug'
  | 'price'
  | 'quantity'
  | 'is_active'
  | 'images'
  | 'variants'
  | 'discount_percentage'
  | 'discount_start_date'
  | 'discount_end_date'
> & {
  translation?: { title?: string; description?: string | null };
};

function publicHttps(value: string) {
  const url = new URL(value);
  if (
    url.protocol !== 'https:' ||
    url.username ||
    url.password ||
    url.port ||
    url.hash ||
    !url.hostname.includes('.') ||
    isIP(url.hostname.replace(/^\[|\]$/g, '')) ||
    /(^|\.)(localhost|local|internal|test|invalid)$/.test(url.hostname)
  )
    throw new Error('MERCHANT_PUBLIC_URL_REQUIRED');
  return url;
}

function text(value: unknown, max: number): string {
  if (typeof value !== 'string') throw new Error('MERCHANT_TEXT_REQUIRED');
  const cleaned = value
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!cleaned || cleaned.length > max)
    throw new Error('MERCHANT_TEXT_INVALID');
  return cleaned;
}

// Pure products/v1 input construction. No account/write/approval inferred.
export function mapMerchantProduct(
  product: MerchantCatalogProduct,
  baseUrl: string,
  now = new Date(),
) {
  if (
    product.is_active !== true ||
    typeof product.id !== 'string' ||
    typeof product.slug !== 'string' ||
    !/^[a-zA-Z0-9_-]{1,50}$/.test(product.id) ||
    !/^[a-zA-Z0-9_-]{1,200}$/.test(product.slug) ||
    !Number.isSafeInteger(product.price) ||
    product.price <= 0 ||
    !Number.isSafeInteger(product.quantity) ||
    product.quantity < 0 ||
    !Number.isFinite(product.discount_percentage) ||
    product.discount_percentage < 0 ||
    product.discount_percentage > 100 ||
    (product.variants !== null &&
      (!Array.isArray(product.variants) || product.variants.length > 0))
  )
    throw new Error('MERCHANT_SOURCE_INELIGIBLE');
  for (const date of [product.discount_start_date, product.discount_end_date])
    if (date !== null && !Number.isFinite(Date.parse(date)))
      throw new Error('MERCHANT_DATE_INVALID');
  if (
    product.discount_start_date &&
    product.discount_end_date &&
    Date.parse(product.discount_start_date) >
      Date.parse(product.discount_end_date)
  )
    throw new Error('MERCHANT_DATE_INVALID');
  const origin = publicHttps(baseUrl);
  if (origin.pathname !== '/' || origin.search)
    throw new Error('MERCHANT_ORIGIN_REQUIRED');
  if (!Array.isArray(product.images) || typeof product.images[0] !== 'string')
    throw new Error('MERCHANT_IMAGE_REQUIRED');
  const image = publicHttps(product.images[0]);
  const { price } = productPrice(product, undefined, now);
  if (!Number.isSafeInteger(price) || price <= 0)
    throw new Error('MERCHANT_PRICE_INVALID');
  return {
    offerId: product.id,
    contentLanguage: 'vi',
    feedLabel: 'VN',
    productAttributes: {
      title: text(product.translation?.title, 150),
      description: text(product.translation?.description, 5000),
      link: new URL(`/vi/products/${product.slug}`, origin).href,
      imageLink: image.href,
      availability: product.quantity > 0 ? 'IN_STOCK' : 'OUT_OF_STOCK',
      price: {
        amountMicros: (BigInt(price) * 1000000n).toString(),
        currencyCode: 'VND',
      },
    },
  };
}
