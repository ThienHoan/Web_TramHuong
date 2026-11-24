/** Stage-one delivery pricing. Shared by the public status and order calculation. */
export const FLAT_RATE_POLICY = {
  fee: 30000,
  freeFrom: 300000,
  thresholdBasis: 'subtotal_before_voucher' as const,
  currency: 'VND' as const,
};
export function flatRateShippingFee(subtotal: number): number {
  return subtotal >= FLAT_RATE_POLICY.freeFrom ? 0 : FLAT_RATE_POLICY.fee;
}
