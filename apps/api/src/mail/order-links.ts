export function storefrontOrigin(base = process.env.FRONTEND_URL || 'https://tramhuongthienphuchue.com'): string | undefined {
  try {
    const url = new URL(base);
    return ['https:', 'http:'].includes(url.protocol) ? url.origin : undefined;
  } catch { return undefined; }
}
export function reorderUrl(id: string, base?: string): string | undefined {
  if (!/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i.test(id)) return undefined;
  const origin = storefrontOrigin(base);
  return origin ? `${origin}/vi/account/orders/${encodeURIComponent(id)}` : undefined;
}

/** A guest email can rebuild a selection without exposing an order or contact details. */
export function reorderSelectionUrl(items: readonly unknown[], base?: string): string | undefined {
  const origin = storefrontOrigin(base);
  if (!origin || !items.length || items.length > 100) return undefined;
  const selection: { productId: string; quantity: number; variantId?: string }[] = [];
  for (const raw of items) {
    if (!raw || typeof raw !== 'object') return undefined;
    const item = raw as Record<string, unknown>;
    const productId = item.productId || item.product_id || item.id;
    const variant = item.variantId || item.variant_id || item.variantName || item.variant_name;
    if (typeof productId !== 'string' || !/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i.test(productId) || !Number.isInteger(item.quantity) || Number(item.quantity) < 1 || Number(item.quantity) > 100 || (variant && (typeof variant !== 'string' || variant.length > 200))) return undefined;
    selection.push({ productId, quantity: Number(item.quantity), ...(variant ? { variantId: String(variant) } : {}) });
  }
  const url = `${origin}/vi/reorder?items=${encodeURIComponent(JSON.stringify(selection))}`;
  return url.length <= 7500 ? url : undefined;
}
