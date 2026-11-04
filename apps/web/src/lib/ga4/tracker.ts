import {
  ecommerceParameters,
  type EcommerceParameters,
  type FunnelEvent,
} from "./contract";

export type CollectionMode = "disabled" | "mock" | "unavailable";
export type AnalyticsConsent = "unknown" | "granted" | "denied";
export interface MockAnalyticsEvent {
  readonly source: "mock";
  readonly name: FunnelEvent;
  readonly parameters: Readonly<EcommerceParameters>;
  readonly recordedAt: string;
}
export interface TrackerSnapshot {
  readonly purchaseEnabled: boolean;
  readonly mode: CollectionMode;
  readonly consent: AnalyticsConsent;
  readonly privacySignal: boolean;
  readonly events: readonly MockAnalyticsEvent[];
}
type PreferenceStorage = Pick<Storage, "getItem" | "setItem">;
export const CONSENT_KEY = "tram.analytics-consent.v1";
const MAX_AGE = 180 * 86400000;
const INITIAL: TrackerSnapshot = Object.freeze({
  purchaseEnabled: false,
  mode: "disabled",
  consent: "unknown",
  privacySignal: false,
  events: Object.freeze([]),
});

// Mock diagnostics are local. Optional subscribers can handle new events only;
// no transport, script or cookies are added here. Buffered events stay mock.
export class AnalyticsTracker {
  private snapshot = INITIAL;
  private listeners = new Set<() => void>();
  private eventListeners = new Set<(event: MockAnalyticsEvent) => void>();
  private seen = new Set<string>();
  private minute = -1;
  private minuteUsed = 0;
  private day = -1;
  private dayUsed = 0;
  private consentExpiresAt = 0;
  constructor(
    private readonly storage?: () => PreferenceStorage,
    private readonly now = Date.now,
  ) {}
  getSnapshot = () => this.snapshot;
  getServerSnapshot = () => INITIAL;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  // New events only: subscribing never replays the mock diagnostics buffer.
  subscribeEvents = (listener: (event: MockAnalyticsEvent) => void) => {
    this.eventListeners.add(listener);
    return () => {
      this.eventListeners.delete(listener);
    };
  };

  configure(
    mode: CollectionMode,
    privacySignal = false,
    purchaseEnabled = false,
  ) {
    if (!["disabled", "mock", "unavailable"].includes(mode))
      mode = "unavailable";
    const consent =
      mode !== "mock"
        ? "unknown"
        : privacySignal
          ? "denied"
          : this.readConsent();
    this.seen.clear();
    this.update({
      mode,
      privacySignal,
      consent,
      purchaseEnabled: mode === "mock" && purchaseEnabled === true,
      events: Object.freeze([]),
    });
  }
  syncConsent() {
    if (this.snapshot.mode !== "mock") return;
    const consent = this.snapshot.privacySignal ? "denied" : this.readConsent();
    if (consent !== this.snapshot.consent) {
      this.seen.clear();
      this.update({ ...this.snapshot, consent, events: Object.freeze([]) });
    }
  }
  setConsent(choice: "granted" | "denied"): boolean {
    if (
      this.snapshot.mode !== "mock" ||
      !["granted", "denied"].includes(choice)
    )
      return false;
    const consent = this.snapshot.privacySignal ? "denied" : choice;
    const expiresAt = this.now() + MAX_AGE;
    try {
      if (!this.storage) throw new Error();
      this.storage().setItem(
        CONSENT_KEY,
        JSON.stringify({ version: 1, choice: consent, expiresAt }),
      );
    } catch {
      this.seen.clear();
      this.update({
        ...this.snapshot,
        consent: "denied",
        events: Object.freeze([]),
      });
      return false;
    }
    if (consent === "denied") this.seen.clear();
    this.consentExpiresAt = expiresAt;
    this.update({
      ...this.snapshot,
      consent,
      ...(consent === "denied" ? { events: Object.freeze([]) } : {}),
    });
    return consent === choice;
  }
  isCollecting(): boolean {
    if (
      this.snapshot.consent === "granted" &&
      this.now() >= this.consentExpiresAt
    )
      this.syncConsent();
    if (
      this.snapshot.mode !== "mock" ||
      this.snapshot.consent !== "granted" ||
      this.snapshot.privacySignal
    )
      return false;
    return true;
  }
  // onceKey is local-only. It is never included in parameters/diagnostics.
  track(name: FunnelEvent, input: unknown, onceKey?: string): boolean {
    if (!this.isCollecting()) return false;
    const parameters = ecommerceParameters(name, input);
    if (!parameters) return false; // includes purchase/refund rejection at runtime
    const dedupe = onceKey ? `${name}:${onceKey}` : undefined;
    if (dedupe && this.seen.has(dedupe)) return false;
    const now = this.now(),
      minute = Math.floor(now / 60000),
      day = Math.floor(now / 86400000);
    if (this.minute !== minute) {
      this.minute = minute;
      this.minuteUsed = 0;
    }
    if (this.day !== day) {
      this.day = day;
      this.dayUsed = 0;
    }
    if (
      this.minuteUsed >= 60 ||
      this.dayUsed >= 500 ||
      (dedupe && this.seen.size >= 1000)
    )
      return false;
    this.minuteUsed++;
    this.dayUsed++;
    if (dedupe) this.seen.add(dedupe);
    const event = Object.freeze({
      source: "mock" as const,
      name,
      parameters,
      recordedAt: new Date(now).toISOString(),
    });
    this.update({
      ...this.snapshot,
      events: Object.freeze([...this.snapshot.events.slice(-199), event]),
    });
    for (const listener of this.eventListeners) {
      try {
        listener(event);
      } catch {
        /* optional delivery cannot affect shopping */
      }
    }
    return true;
  }
  private readConsent(): AnalyticsConsent {
    this.consentExpiresAt = 0;
    try {
      const value: unknown = JSON.parse(
        this.storage?.().getItem(CONSENT_KEY) ?? "null",
      );
      if (!value || typeof value !== "object") return "unknown";
      const item = value as Record<string, unknown>;
      if (
        item.version === 1 &&
        ["granted", "denied"].includes(String(item.choice)) &&
        typeof item.expiresAt === "number" &&
        item.expiresAt > this.now() &&
        item.expiresAt <= this.now() + MAX_AGE
      ) {
        this.consentExpiresAt = item.expiresAt;
        return item.choice as AnalyticsConsent;
      }
      return "unknown";
    } catch {
      return "unknown";
    }
  }
  private update(value: TrackerSnapshot) {
    this.snapshot = Object.freeze(value);
    for (const listener of this.listeners) {
      try {
        listener();
      } catch {
        /* diagnostics cannot interrupt shopping */
      }
    }
  }
}
