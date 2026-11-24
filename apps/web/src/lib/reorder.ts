import type { Product } from '@/types/product';
import { discountPrice, productStock, variantKey } from './commerce';
export interface ReorderLine {
  productId?: string;
  product_id?: string;
  id?: string;
  quantity: number;
  variantId?: string | null;
  variant_id?: string | null;
  variantName?: string | null;
  variant_name?: string | null;
}
/** Resolves the exact original variant against today's catalog. Never substitutes one. */
export function resolveReorderLine(line: ReorderLine, product: Product, alreadyInCart = 0) {
  if (product.is_active === false || !Number.isInteger(line.quantity) || line.quantity < 1) return null;
  const requested = line.variantId || line.variant_id || line.variantName || line.variant_name;
  const variants = product.variants || [];
  const index = variants.findIndex((v, i) => [v.id, v.sku, v.name, variantKey(v, i)].includes(requested || ''));
  if (requested ? index < 0 : variants.length > 0) return null;
  const variant = index >= 0 ? variants[index] : undefined;
  const quantity = Math.min(line.quantity, Math.max(0, productStock(product, variant) - alreadyInCart), 100 - alreadyInCart);
  if (quantity <= 0) return null;
  const original = Number(variant?.price ?? product.price);
  if (!Number.isFinite(original) || original < 0) return null;
  const price = discountPrice(product, original);
  return {
    id: product.id, slug: product.slug,
    title: product.translation?.title || product.title || product.slug,
    price, original_price: original, discount_amount: original - price,
    image: product.images?.[0] || '', quantity,
    variantId: variant ? variantKey(variant, index) : undefined,
    variantName: variant?.name,
  };
}

export function parseReorderSelection(value: string | undefined): ReorderLine[] {
  if (!value || value.length > 7500) return [];
  try {
    const lines: unknown = JSON.parse(value);
    if (!Array.isArray(lines) || !lines.length || lines.length > 100) return [];
    const result: ReorderLine[] = [];
    for (const raw of lines) {
      if (!raw || typeof raw !== 'object') return [];
      const line = raw as Record<string, unknown>;
      if (typeof line.productId !== 'string' || !/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i.test(line.productId) || !Number.isInteger(line.quantity) || Number(line.quantity) < 1 || Number(line.quantity) > 100 || (line.variantId !== undefined && (typeof line.variantId !== 'string' || line.variantId.length > 200))) return [];
      result.push({ productId: line.productId, quantity: Number(line.quantity), ...(typeof line.variantId === 'string' ? { variantId: line.variantId } : {}) });
    }
    return result;
  } catch { return []; }
}
