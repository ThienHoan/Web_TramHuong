export interface ShippingPromotion {
  active: boolean;
  minSubtotal: number;
  maxSubsidy: number;
  minMargin: number;
}
// Additional promotions are opt-in. The existing >=300k free-shipping rule
// is retained separately; unknown unit costs never qualify for extra subsidy.
export function promotionSubsidy(
  rule: ShippingPromotion,
  subtotal: number,
  voucherDiscount: number,
  cost: number | null,
  carrierFee: number,
): number {
  if (!rule.active || cost === null || subtotal < rule.minSubtotal) return 0;
  return Math.max(
    0,
    Math.min(
      carrierFee,
      rule.maxSubsidy,
      subtotal - voucherDiscount - cost - rule.minMargin,
    ),
  );
}
