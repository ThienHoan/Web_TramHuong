import type { Product, ProductVariant } from '@/types/product';

export function discountPrice(product: { price: number | string; discount_percentage?: number; discount_start_date?: string | null; discount_end_date?: string | null }, base = Number(product.price), now = new Date()) {
  const percent = Math.min(100, Math.max(0, Number(product.discount_percentage) || 0));
  const active = percent > 0 && (!product.discount_start_date || new Date(product.discount_start_date) <= now) && (!product.discount_end_date || new Date(product.discount_end_date) >= now);
  return active ? Math.round(base * (1 - percent / 100)) : base;
}
export function productStock(product: Product, variant?: ProductVariant | null) {
  const parent = Math.max(0, Number(product.quantity ?? product.stock) || 0);
  return variant?.stock == null ? parent : Math.min(parent, Math.max(0, Number(variant.stock) || 0));
}
// Checkout resolves the catalog's JSON variants by their name.
export function variantKey(variant: ProductVariant, index: number) {
  return variant.name || variant.id || variant.sku || String(index);
}
export function firstAvailableVariant(product: Product) {
  return Math.max(0, product.variants?.findIndex(v => productStock(product, v) > 0) ?? 0);
}
export function priceRange(product: Product) {
  const prices = product.variants?.length ? product.variants.map(v => discountPrice(product, Number(v.price))) : [discountPrice(product)];
  return { min: Math.min(...prices), max: Math.max(...prices) };
}
export function specifications(raw: unknown): { key: string; value: string }[] {
  if (!raw) return [];
  if (typeof raw === 'object' && !Array.isArray(raw)) return Object.entries(raw).filter(([,v]) => v != null && String(v).trim()).map(([key,value]) => ({ key, value: String(value) }));
  if (typeof raw !== 'string') return [];
  try { const parsed: unknown = JSON.parse(raw); if (parsed && typeof parsed === 'object') return specifications(parsed); } catch { /* Legacy prose specifications. */ }
  return raw.split(/\n|\. (?=[^.:]+:)/).map(line => { const i = line.indexOf(':'); return i > -1 ? {key: line.slice(0,i).trim(), value: line.slice(i+1).trim()} : {key: '', value: line.trim()}; }).filter(row => row.value);
}
export const formatVnd = (value: number, locale = 'vi') => new Intl.NumberFormat(locale === 'vi' ? 'vi-VN' : 'en-US', {style:'currency', currency:'VND', maximumFractionDigits:0}).format(value);
