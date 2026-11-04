// Independent server boundary; mirrors the existing browser's explicit picks.
// Never trust the client's normalizer or pass through arbitrary GA4 parameters.
export const LOCAL_FUNNEL_EVENTS = [
  'view_item_list',
  'select_item',
  'view_item',
  'add_to_cart',
  'remove_from_cart',
  'begin_checkout',
  'add_shipping_info',
  'add_payment_info',
] as const;
const object = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === 'object' && !Array.isArray(v);
const id = (v: unknown): v is string =>
  typeof v === 'string' &&
  (/^[a-f\d]{8}-(?:[a-f\d]{4}-){3}[a-f\d]{12}$/i.test(v) ||
    /^[a-z][a-z\d_-]{0,63}$/i.test(v));
const money = (v: unknown): v is number =>
  typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 1e12;
export function localFunnelParameters(
  name: string,
  input: unknown,
): Record<string, unknown> | null {
  if (
    !LOCAL_FUNNEL_EVENTS.includes(
      name as (typeof LOCAL_FUNNEL_EVENTS)[number],
    ) ||
    !object(input) ||
    input.currency !== 'VND' ||
    !money(input.value) ||
    !Array.isArray(input.items) ||
    !input.items.length ||
    input.items.length > 200 ||
    (name === 'select_item' && input.items.length !== 1)
  )
    return null;
  const optional: Record<string, readonly string[]> = {};
  if (['view_item_list', 'select_item'].includes(name))
    optional.item_list_id = ['catalog', 'related', 'featured'];
  if (name === 'add_shipping_info')
    optional.shipping_tier = ['delivery', 'showroom'];
  if (name === 'add_payment_info')
    optional.payment_type = ['cod', 'sepay', 'showroom'];
  if (
    Object.keys(input).some(
      (key) =>
        !['currency', 'value', 'items', ...Object.keys(optional)].includes(key),
    )
  )
    return null;
  for (const [key, allowed] of Object.entries(optional))
    if (
      key in input &&
      (typeof input[key] !== 'string' || !allowed.includes(input[key]))
    )
      return null;
  const items: {
    item_id: string;
    price: number;
    quantity: number;
    item_variant?: string;
  }[] = [];
  for (const item of input.items) {
    if (
      !object(item) ||
      Object.keys(item).some(
        (key) =>
          !['item_id', 'price', 'quantity', 'item_variant'].includes(key),
      ) ||
      !id(item.item_id) ||
      !money(item.price) ||
      typeof item.quantity !== 'number' ||
      !Number.isInteger(item.quantity) ||
      item.quantity < 1 ||
      item.quantity > 999 ||
      ('item_variant' in item && !id(item.item_variant))
    )
      return null;
    items.push({
      item_id: item.item_id,
      price: item.price,
      quantity: item.quantity,
      ...(typeof item.item_variant === 'string'
        ? { item_variant: item.item_variant }
        : {}),
    });
  }
  const value =
    Math.round(
      items.reduce((sum, item) => sum + item.price * item.quantity, 0) * 100,
    ) / 100;
  if (!money(value) || input.value !== value) return null;
  return {
    currency: 'VND',
    value,
    items,
    ...Object.fromEntries(
      Object.keys(optional)
        .filter((key) => key in input)
        .map((key) => [key, input[key]]),
    ),
  };
}
