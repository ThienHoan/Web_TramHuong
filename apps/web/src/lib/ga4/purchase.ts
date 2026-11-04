import type { AnalyticsTracker } from "./tracker";

export type PurchaseResult =
  | { source: "none"; status: "suppressed" | "unavailable" }
  | { source: "mock"; status: "not_eligible" }
  | { source: "mock"; status: "recorded" | "duplicate"; transactionId: string };

// One backend collection path. No purchase payload or amount is accepted from
// the page/cart; duplicate detection is durable SQL, not browser storage.
export async function captureServerPurchase(
  tracker: AnalyticsTracker,
  orderId: string,
  accessToken?: string,
  options: { transport?: typeof fetch; signal?: AbortSignal } = {},
): Promise<PurchaseResult> {
  const suppressed: PurchaseResult = { source: "none", status: "suppressed" };
  if (
    !tracker.isCollecting() ||
    !tracker.getSnapshot().purchaseEnabled ||
    !accessToken ||
    accessToken.length > 8192 ||
    !/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(
      orderId,
    ) ||
    options.signal?.aborted
  )
    return suppressed;
  try {
    const signal = options.signal
      ? AbortSignal.any([options.signal, AbortSignal.timeout(5000)])
      : AbortSignal.timeout(5000);
    const response = await (options.transport ?? fetch)(
      "/api/analytics/purchases/" + orderId,
      {
        method: "POST",
        cache: "no-store",
        signal,
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + accessToken,
        },
        body: JSON.stringify({ consent: "granted" }),
      },
    );
    if (!response.ok) throw new Error();
    const value: unknown = await response.json();
    if (
      !tracker.isCollecting() ||
      !tracker.getSnapshot().purchaseEnabled ||
      options.signal?.aborted
    )
      return suppressed;
    if (
      value &&
      typeof value === "object" &&
      "source" in value &&
      value.source === "none" &&
      "status" in value &&
      value.status === "disabled"
    )
      return suppressed;
    if (
      value &&
      typeof value === "object" &&
      "source" in value &&
      value.source === "mock" &&
      "status" in value
    ) {
      if (value.status === "not_eligible")
        return { source: "mock", status: "not_eligible" };
      if (
        (value.status === "recorded" || value.status === "duplicate") &&
        "transactionId" in value &&
        typeof value.transactionId === "string" &&
        /^gp_mock_v1_[a-f0-9]{64}$/.test(value.transactionId)
      )
        return {
          source: "mock",
          status: value.status,
          transactionId: value.transactionId,
        };
    }
  } catch {
    /* An optional analytics failure never interrupts checkout. */
  }
  return tracker.isCollecting() &&
    tracker.getSnapshot().purchaseEnabled &&
    !options.signal?.aborted
    ? { source: "none", status: "unavailable" }
    : suppressed;
}
