"use client";

import {
  createContext,
  useContext,
  useEffect,
  useId,
  useState,
  useSyncExternalStore,
} from "react";
import { AnalyticsTracker, CONSENT_KEY } from "@/lib/ga4/tracker";
import { LocalFunnelSession } from "@/lib/ga4/local-funnel";
import type { FunnelEvent } from "@/lib/ga4/contract";

const LocalFunnelContext = createContext<LocalFunnelSession | null>(null);
export const useLocalFunnelSession = () => useContext(LocalFunnelContext);

const AnalyticsContext = createContext<AnalyticsTracker | null>(null);
const LocalDebugContext = createContext<{
  enabled: true;
  measurementId: string;
  fixture?: boolean;
  funnelEnabled?: boolean;
} | null>(null);
export const useLocalDebugPolicy = () => useContext(LocalDebugContext);

export function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  const [localDebug, setLocalDebug] = useState<{
    enabled: true;
    measurementId: string;
    fixture?: boolean;
    funnelEnabled?: boolean;
  } | null>(null);
  const [tracker] = useState(
    () => new AnalyticsTracker(() => window.localStorage),
  );
  const [funnel] = useState(() => new LocalFunnelSession(tracker));
  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    let active = true;
    fetch("/api/analytics/collection-policy", {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error();
        const value: unknown = await response.json();
        if (
          !value ||
          typeof value !== "object" ||
          !("mode" in value) ||
          !["disabled", "mock", "unavailable"].includes(String(value.mode))
        )
          throw new Error();
        if (active) {
          const debug = "localDebug" in value ? value.localDebug : null;
          setLocalDebug(
            debug &&
              typeof debug === "object" &&
              "enabled" in debug &&
              debug.enabled === true &&
              "measurementId" in debug &&
              debug.measurementId === "G-XJNSBPN8HN"
              ? {
                  enabled: true,
                  measurementId: debug.measurementId,
                  fixture: "fixture" in debug && debug.fixture === true,
                  funnelEnabled:
                    "funnelEnabled" in debug && debug.funnelEnabled === true,
                }
              : null,
          );
          funnel.setEnabled(
            !!debug &&
              typeof debug === "object" &&
              "enabled" in debug &&
              debug.enabled === true &&
              "measurementId" in debug &&
              debug.measurementId === "G-XJNSBPN8HN" &&
              "funnelEnabled" in debug &&
              debug.funnelEnabled === true &&
              value.mode === "mock",
          );
          const privacySignal =
            navigator.doNotTrack === "1" ||
            (navigator as Navigator & { globalPrivacyControl?: boolean })
              .globalPrivacyControl === true;
          tracker.configure(
            value.mode as "disabled" | "mock" | "unavailable",
            privacySignal,
            "purchaseEnabled" in value && value.purchaseEnabled === true,
          );
        }
      })
      .catch(() => {
        if (active) {
          tracker.configure("unavailable");
          setLocalDebug(null);
          funnel.setEnabled(false);
        }
      })
      .finally(() => clearTimeout(timer));
    return () => {
      active = false;
      clearTimeout(timer);
      controller.abort();
      funnel.setEnabled(false);
    };
  }, [tracker, funnel]);
  useEffect(() => {
    const sync = (event: StorageEvent) => {
      if (event.key === CONSENT_KEY || event.key === null)
        tracker.syncConsent();
    };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, [tracker]);
  return (
    <AnalyticsContext.Provider value={tracker}>
      <LocalDebugContext.Provider value={localDebug}>
        <LocalFunnelContext.Provider value={funnel}>
          {children}
        </LocalFunnelContext.Provider>
      </LocalDebugContext.Provider>
    </AnalyticsContext.Provider>
  );
}

export function useAnalyticsTracker() {
  return useContext(AnalyticsContext);
}

export function useAnalyticsSnapshot() {
  const tracker = useAnalyticsTracker();
  // Components using this hook live under AnalyticsProvider in the root layout.
  if (!tracker) throw new Error("AnalyticsProvider is required");
  return useSyncExternalStore(
    tracker.subscribe,
    tracker.getSnapshot,
    tracker.getServerSnapshot,
  );
}

export function useAnalyticsView(
  name: Extract<FunnelEvent, "view_item" | "view_item_list" | "begin_checkout">,
  parameters: unknown,
) {
  const tracker = useAnalyticsTracker();
  const snapshot = useAnalyticsSnapshot();
  const scope = useId();
  const signature = JSON.stringify(parameters);
  useEffect(() => {
    tracker?.track(
      name,
      JSON.parse(signature),
      name === "begin_checkout" ? scope : `${scope}:${signature}`,
    );
  }, [tracker, snapshot.mode, snapshot.consent, name, scope, signature]);
}
