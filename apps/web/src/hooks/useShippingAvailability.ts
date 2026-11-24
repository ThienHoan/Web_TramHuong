"use client";
import useSWR from "swr";
import { buildUrl, fetchWithAuth } from "@/services/base-http";
export interface ShippingStatus {
  checkoutEnabled: boolean;
  flatRate: { fee: number; freeFrom: number; thresholdBasis: 'subtotal_before_voucher'; currency: 'VND' };
}
export function useShippingPolicy(active = true) {
  return useSWR(active ? buildUrl('/shipping/status') : null, async url => {
    const data = await fetchWithAuth<ShippingStatus>(url);
    if (typeof data.checkoutEnabled !== 'boolean' || !Number.isFinite(data.flatRate?.fee) || data.flatRate.fee < 0 || !Number.isFinite(data.flatRate?.freeFrom) || data.flatRate.freeFrom <= 0 || data.flatRate.thresholdBasis !== 'subtotal_before_voucher' || data.flatRate.currency !== 'VND') throw new Error('Invalid shipping policy');
    return data;
  }, { revalidateOnFocus: false, dedupingInterval: 60000 });
}
export function flatRateFee(status: ShippingStatus | undefined, subtotal: number): number | null {
  return !status || status.checkoutEnabled ? null : subtotal >= status.flatRate.freeFrom ? 0 : status.flatRate.fee;
}
/** Undefined during the first check; manual addresses remain available on an API error. */
export function useShippingAvailability(): boolean | undefined {
  const { data, error } = useShippingPolicy();
  return error ? false : data?.checkoutEnabled;
}
