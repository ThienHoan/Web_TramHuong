import type { AnalyticsTracker, MockAnalyticsEvent } from "./tracker";
export type LocalFunnelStopReason =
  | "manual"
  | "consent"
  | "expired"
  | "auth"
  | "disabled"
  | "session_limit"
  | "server_limit"
  | "quota"
  | "busy"
  | "rejected"
  | "network"
  | "unknown";
export interface LocalFunnelSnapshot {
  active: boolean;
  stopReason: LocalFunnelStopReason | null;
  sessionId: number | null;
  blocked: number;
  attempted: number;
  accepted: number;
  unknown: number;
  dropped: number;
}
const INITIAL: LocalFunnelSnapshot = Object.freeze({
  active: false,
  stopReason: null,
  sessionId: null,
  blocked: 0,
  attempted: 0,
  accepted: 0,
  unknown: 0,
  dropped: 0,
});
interface Pending {
  event: MockAnalyticsEvent;
  createdAt: number;
}
// Disposable ADMIN QA only. Never persist identity/token/queue or replay history.
export class LocalFunnelSession {
  private snapshot = INITIAL;
  private enabled = false;
  private listeners = new Set<() => void>();
  private queue: Pending[] = [];
  private identity: {
    token: string;
    clientId: string;
    sessionId: number;
    expiresAt: number;
  } | null = null;
  private current: AbortController | null = null;
  private timer?: ReturnType<typeof setTimeout>;
  private detach?: () => void;
  private detachEvents?: () => void;
  constructor(
    private readonly tracker: AnalyticsTracker,
    private readonly transport: typeof fetch = fetch,
    private readonly now = Date.now,
  ) {}
  getSnapshot = () => this.snapshot;
  getServerSnapshot = () => INITIAL;
  subscribe = (fn: () => void) => {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  };
  setEnabled(enabled: boolean) {
    this.enabled = enabled;
    if (!enabled) this.stop("disabled");
  }
  authChanged(token: string) {
    if (this.identity && token !== this.identity.token) this.stop("auth");
  }
  start(token: string): boolean {
    if (
      !this.enabled ||
      this.snapshot.stopReason === "server_limit" ||
      !token ||
      token.length > 8192 ||
      !this.tracker.isCollecting() ||
      this.snapshot.active
    )
      return false;
    this.stop();
    try {
      const words = crypto.getRandomValues(new Uint32Array(2));
      this.identity = {
        token,
        clientId: `${words[0] + 1}.${words[1] + 1}`,
        sessionId: Math.floor(this.now() / 1000),
        expiresAt: this.now() + 15 * 60000,
      };
    } catch {
      return false;
    }
    this.update({
      ...INITIAL,
      active: true,
      sessionId: this.identity.sessionId,
    });
    this.detach = this.tracker.subscribe(() => {
      if (!this.tracker.isCollecting()) this.stop("consent");
    });
    this.detachEvents = this.tracker.subscribeEvents((event) => {
      if (!this.valid()) return;
      if (
        this.queue.length >= 10 ||
        this.snapshot.attempted + this.queue.length >= 20
      ) {
        this.update({ ...this.snapshot, dropped: this.snapshot.dropped + 1 });
        return;
      }
      this.queue.push({ event, createdAt: this.now() });
      void this.pump();
    });
    this.timer = setTimeout(() => this.stop("expired"), 15 * 60000);
    return true;
  }
  stop(reason: LocalFunnelStopReason = "manual") {
    this.detach?.();
    this.detach = undefined;
    this.detachEvents?.();
    this.detachEvents = undefined;
    if (this.timer) clearTimeout(this.timer);
    this.current?.abort();
    this.current = null;
    this.identity = null;
    const dropped = this.queue.length;
    this.queue = [];
    if (this.snapshot.active || dropped)
      this.update({
        ...this.snapshot,
        active: false,
        stopReason: reason,
        dropped: this.snapshot.dropped + dropped,
      });
  }
  private valid(): boolean {
    if (!this.identity) return false;
    if (!this.enabled) {
      this.stop("disabled");
      return false;
    }
    if (this.now() >= this.identity.expiresAt) {
      this.stop("expired");
      return false;
    }
    if (!this.tracker.isCollecting()) {
      this.stop("consent");
      return false;
    }
    return true;
  }
  private async pump() {
    if (this.current || !this.valid()) return;
    const pending = this.queue.shift(),
      identity = this.identity;
    if (!pending || !identity) return;
    if (this.now() - pending.createdAt > 30000) {
      this.update({ ...this.snapshot, dropped: this.snapshot.dropped + 1 });
      void this.pump();
      return;
    }
    const controller = new AbortController();
    this.current = controller;
    const timer = setTimeout(() => {
      if (this.identity === identity) {
        this.update({ ...this.snapshot, unknown: this.snapshot.unknown + 1 });
        this.stop("network");
      }
    }, 12000);
    this.update({ ...this.snapshot, attempted: this.snapshot.attempted + 1 });
    try {
      const transport = this.transport;
      const response = await transport(
        "/api/analytics/local-debug-event/funnel",
        {
          method: "POST",
          cache: "no-store",
          signal: controller.signal,
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer " + identity.token,
          },
          body: JSON.stringify({
            consent: "granted",
            eventId: crypto.randomUUID(),
            clientId: identity.clientId,
            sessionId: identity.sessionId,
            name: pending.event.name,
            parameters: pending.event.parameters,
          }),
        },
      );
      if (!response.ok) {
        if (
          this.identity !== identity ||
          controller.signal.aborted ||
          !this.valid()
        )
          return;
        const known = [400, 401, 403, 409, 429, 503].includes(response.status);
        this.update({
          ...this.snapshot,
          blocked: this.snapshot.blocked + (known ? 1 : 0),
          unknown: this.snapshot.unknown + (known ? 0 : 1),
        });
        this.stop(
          response.status === 429
            ? "quota"
            : response.status === 409
              ? "busy"
              : [401, 403].includes(response.status)
                ? "auth"
                : response.status === 503
                  ? "disabled"
                  : response.status === 400
                    ? "rejected"
                    : "unknown",
        );
        return;
      }
      const value: unknown = await response.json();
      if (
        this.identity !== identity ||
        controller.signal.aborted ||
        !this.valid()
      )
        return;
      if (
        value &&
        typeof value === "object" &&
        "source" in value &&
        value.source === "google_measurement_protocol" &&
        "status" in value &&
        value.status === "blocked" &&
        "reason" in value &&
        value.reason === "test_limit"
      ) {
        this.update({ ...this.snapshot, blocked: this.snapshot.blocked + 1 });
        this.stop("server_limit");
        return;
      }
      const accepted =
        !!value &&
        typeof value === "object" &&
        "source" in value &&
        value.source === "google_measurement_protocol" &&
        "status" in value &&
        value.status === "accepted";
      this.update({
        ...this.snapshot,
        accepted: this.snapshot.accepted + (accepted ? 1 : 0),
        unknown: this.snapshot.unknown + (accepted ? 0 : 1),
      });
      // Stale auth, disabled backend, overload or unknown result closes QA session.
      if (!accepted) this.stop("unknown");
    } catch {
      if (this.identity === identity) {
        this.update({ ...this.snapshot, unknown: this.snapshot.unknown + 1 });
        this.stop("network");
      }
    } finally {
      clearTimeout(timer);
      if (this.current === controller) {
        this.current = null;
        if (this.snapshot.attempted >= 20) this.stop("session_limit");
        else void this.pump();
      }
    }
  }
  private update(value: LocalFunnelSnapshot) {
    this.snapshot = Object.freeze(value);
    for (const listener of this.listeners) listener();
  }
}
