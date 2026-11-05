import { BadRequestException } from '@nestjs/common';
import { createHash } from 'node:crypto';

export interface CheckoutItem {
  productId: string;
  quantity: number;
  variantId?: string;
  variantName?: string;
}
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function checkoutIntent(
  key: string | undefined,
  userId: string | null,
  items: CheckoutItem[],
  info: Record<string, unknown>,
  method: string,
  voucher?: string,
) {
  if (
    !key ||
    !UUID.test(key) ||
    (userId !== null && !UUID.test(userId)) ||
    !['cod', 'sepay', 'showroom'].includes(method) ||
    !Array.isArray(items) ||
    items.length < 1 ||
    items.length > 100 ||
    !info ||
    typeof info !== 'object'
  ) {
    throw new BadRequestException('CHECKOUT_INVALID_REQUEST');
  }
  const lines = new Map<
    string,
    { productId: string; variantId: string; quantity: number }
  >();
  for (const item of items) {
    if (
      !item ||
      !UUID.test(item.productId) ||
      !Number.isSafeInteger(item.quantity) ||
      item.quantity < 1 ||
      item.quantity > 100 ||
      (item.variantId !== undefined &&
        (typeof item.variantId !== 'string' || item.variantId.length > 200))
    )
      throw new BadRequestException('CHECKOUT_INVALID_ITEMS');
    const variantId = item.variantId || '',
      id = JSON.stringify([item.productId.toLowerCase(), variantId]);
    const row = lines.get(id) || {
      productId: item.productId.toLowerCase(),
      variantId,
      quantity: 0,
    };
    row.quantity += item.quantity;
    if (row.quantity > 100)
      throw new BadRequestException('CHECKOUT_INVALID_ITEMS');
    lines.set(id, row);
  }
  const canonical = [...lines.values()].sort((a, b) =>
    JSON.stringify(a).localeCompare(JSON.stringify(b)),
  );
  const receipt = info.legal_acceptance as Record<string, unknown> | undefined;
  // Only buyer intent, never prices, computed shipping fees or receipt timestamps.
  const fingerprint = createHash('sha256')
    .update(
      JSON.stringify({
        version: 1,
        userId,
        items: canonical,
        shipping: {
          name: info.name,
          phone: info.phone,
          address: info.address,
          city: info.city,
          email: info.email || null,
          full_address: info.full_address || null,
          legal: receipt
            ? {
                accepted: receipt.accepted,
                version: receipt.version,
                purpose: receipt.purpose,
              }
            : null,
        },
        method,
        voucher: voucher?.trim().toUpperCase() || null,
      }),
    )
    .digest('hex');
  return {
    key: key.toLowerCase(),
    fingerprint,
    items: canonical.map((row) => ({
      productId: row.productId,
      quantity: row.quantity,
      ...(row.variantId ? { variantId: row.variantId } : {}),
    })),
  };
}
