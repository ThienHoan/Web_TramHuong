"use client";
import useSWR from "swr";
import { buildUrl, fetchWithAuth } from "@/services/base-http";
export function useShippingAvailability() {
  const { data } = useSWR(
    buildUrl("/shipping/status"),
    (url) => fetchWithAuth<{ checkoutEnabled: boolean }>(url),
    { revalidateOnFocus: false },
  );
  return data?.checkoutEnabled === true;
}
