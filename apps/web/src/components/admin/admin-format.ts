import { formatVnd } from "@/lib/commerce";

// Store bookkeeping remains in VND in every admin language; same format as the storefront.
export const adminMoney = (value: number, locale: string) => formatVnd(value, locale);
