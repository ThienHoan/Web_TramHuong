"use client";

import { useEffect } from "react";
import { useAuth } from "@/components/providers/AuthProvider";
import { useAnalyticsSnapshot, useAnalyticsTracker } from "./AnalyticsProvider";
import { captureServerPurchase } from "@/lib/ga4/purchase";

export function PurchaseCapture({ orderId }: { orderId?: string | null }) {
  const { session } = useAuth();
  const tracker = useAnalyticsTracker();
  const { mode, consent, purchaseEnabled } = useAnalyticsSnapshot();
  const token = session?.access_token;
  useEffect(() => {
    if (
      !tracker ||
      !orderId ||
      !token ||
      mode !== "mock" ||
      !purchaseEnabled ||
      consent !== "granted"
    )
      return;
    const controller = new AbortController();
    void captureServerPurchase(tracker, orderId, token, {
      signal: controller.signal,
    });
    return () => controller.abort();
  }, [tracker, orderId, token, mode, consent, purchaseEnabled]);
  return null;
}
