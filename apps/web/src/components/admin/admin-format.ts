// Store bookkeeping remains in VND in every admin language.
export const adminMoney = (value: number, locale: string) =>
  new Intl.NumberFormat(locale === "vi" ? "vi-VN" : "en-US", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value);
