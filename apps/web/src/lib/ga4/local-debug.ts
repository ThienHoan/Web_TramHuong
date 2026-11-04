import type { AnalyticsTracker } from "./tracker";
export async function sendLocalDebugEvent(
  tracker: AnalyticsTracker,
  token: string,
  signal?: AbortSignal,
  transport: typeof fetch = fetch,
): Promise<"accepted" | "unknown" | "blocked"> {
  if (!token || !tracker.isCollecting() || signal?.aborted) return "blocked";
  const controller = new AbortController();
  const unsubscribe = tracker.subscribe(() => {
    if (!tracker.isCollecting()) controller.abort();
  });
  const timer = setTimeout(() => controller.abort(), 12000);
  const cancel = () => controller.abort();
  signal?.addEventListener("abort", cancel, { once: true });
  const words = crypto.getRandomValues(new Uint32Array(2));
  try {
    const response = await transport("/api/analytics/local-debug-event", {
      method: "POST",
      cache: "no-store",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + token,
      },
      body: JSON.stringify({
        action: "manual_test",
        consent: "granted",
        eventId: crypto.randomUUID(),
        clientId: `${words[0] + 1}.${words[1] + 1}`,
        sessionId: Math.floor(Date.now() / 1000),
      }),
    });
    if (!response.ok) return "unknown";
    const value: unknown = await response.json();
    if (!tracker.isCollecting() || controller.signal.aborted) return "blocked";
    return value &&
      typeof value === "object" &&
      "source" in value &&
      value.source === "google_measurement_protocol" &&
      "status" in value &&
      value.status === "accepted"
      ? "accepted"
      : "unknown";
  } catch {
    return tracker.isCollecting() && !signal?.aborted ? "unknown" : "blocked";
  } finally {
    unsubscribe();
    clearTimeout(timer);
    signal?.removeEventListener("abort", cancel);
  }
}
