"use client";
import useSWR from "swr";
import { buildUrl, fetchWithAuth } from "@/services/base-http";

/** Undefined during the first check, so checkout never shows the wrong address fields. */
export function useShippingAvailability(): boolean | undefined {
  const { data, error } = useSWR(
    buildUrl("/shipping/status"),
    (url) => fetchWithAuth<{ checkoutEnabled: boolean }>(url),
    { revalidateOnFocus: false },
  );
  if (error) return false;
  return data?.checkoutEnabled;
}
