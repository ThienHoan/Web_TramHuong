// Minimal GA4 ecommerce allowlist: never pass through cart/order/form objects.
export const FUNNEL_EVENTS = [
  "view_item_list",
  "select_item",
  "view_item",
  "add_to_cart",
  "remove_from_cart",
  "begin_checkout",
  "add_shipping_info",
  "add_payment_info",
] as const;
export type FunnelEvent = (typeof FUNNEL_EVENTS)[number];
export interface AnalyticsItem {
  item_id: string;
  price: number;
  quantity: number;
  item_variant?: string;
}
export interface EcommerceParameters {
  currency: "VND";
  value: number;
  items: readonly Readonly<AnalyticsItem>[];
  item_list_id?: "catalog" | "related" | "featured";
  shipping_tier?: "delivery" | "showroom";
  payment_type?: "cod" | "sepay" | "showroom";
}

const record = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === "object" && !Array.isArray(value);
const identifier = (value: unknown): value is string =>
  typeof value === "string" &&
  (/^[a-f\d]{8}-(?:[a-f\d]{4}-){3}[a-f\d]{12}$/i.test(value) ||
    /^[a-z][a-z\d_-]{0,63}$/i.test(value));
const money = (value: unknown): value is number =>
  typeof value === "number" &&
  Number.isFinite(value) &&
  value >= 0 &&
  value <= 1e12;

export function ecommerceParameters(
  name: unknown,
  input: unknown,
): Readonly<EcommerceParameters> | null {
  if (
    !FUNNEL_EVENTS.includes(name as FunnelEvent) ||
    !record(input) ||
    (input.currency !== undefined && input.currency !== "VND") ||
    !Array.isArray(input.items) ||
    !input.items.length ||
    input.items.length > 200 ||
    (name === "select_item" && input.items.length !== 1)
  )
    return null;
  const items: Readonly<AnalyticsItem>[] = [];
  for (const raw of input.items) {
    if (
      !record(raw) ||
      !identifier(raw.item_id) ||
      !money(raw.price) ||
      !Number.isInteger(raw.quantity) ||
      Number(raw.quantity) < 1 ||
      Number(raw.quantity) > 999 ||
      (raw.item_variant !== undefined && !identifier(raw.item_variant))
    )
      return null;
    items.push(
      Object.freeze({
        item_id: raw.item_id,
        price: raw.price,
        quantity: Number(raw.quantity),
        ...(raw.item_variant
          ? { item_variant: raw.item_variant as string }
          : {}),
      }),
    );
  }
  const value =
    Math.round(
      items.reduce((sum, item) => sum + item.price * item.quantity, 0) * 100,
    ) / 100;
  if (!money(value) || (input.value !== undefined && input.value !== value))
    return null;
  const params: EcommerceParameters = {
    currency: "VND",
    value,
    items: Object.freeze(items),
  };
  if (
    ["view_item_list", "select_item"].includes(String(name)) &&
    ["catalog", "related", "featured"].includes(String(input.item_list_id))
  )
    params.item_list_id =
      input.item_list_id as EcommerceParameters["item_list_id"];
  if (
    name === "add_shipping_info" &&
    ["delivery", "showroom"].includes(String(input.shipping_tier))
  )
    params.shipping_tier =
      input.shipping_tier as EcommerceParameters["shipping_tier"];
  if (
    name === "add_payment_info" &&
    ["cod", "sepay", "showroom"].includes(String(input.payment_type))
  )
    params.payment_type =
      input.payment_type as EcommerceParameters["payment_type"];
  return Object.freeze(params);
}

// Explicit picks only. Human names, images, slugs, voucher codes and addresses
// never enter the event; item_id is stable product ID across both themes.
export function cartAnalyticsItems(
  items: readonly {
    id: string;
    price: number;
    quantity: number;
    variantId?: string | null;
  }[],
): AnalyticsItem[] {
  return items.map((item) => ({
    item_id: item.id,
    price: item.price,
    quantity: item.quantity,
    ...(item.variantId ? { item_variant: item.variantId } : {}),
  }));
}
