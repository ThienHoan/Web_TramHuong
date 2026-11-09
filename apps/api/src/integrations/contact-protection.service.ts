import {
  ForbiddenException,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import type { ConfigReader, IntegrationRegistry } from './integrations.config';
import { IntegrationExecutor } from './integration-executor';
import {
  MockTurnstileAdapter,
  type TurnstileAdapter,
  type TurnstileVerification,
} from './turnstile.adapter';

// Cloudflare's documented dummy keys (Turnstile → Troubleshooting → Testing,
// read 05/11/2026). They always pass/fail and return fixed action/hostname.
const TEST_SITE_KEYS = [
  '1x00000000000000000000AA',
  '2x00000000000000000000AB',
  '1x00000000000000000000BB',
  '2x00000000000000000000BB',
  '3x00000000000000000000FF',
];
const TEST_SECRET_KEYS = [
  '1x0000000000000000000000000000000AA',
  '2x0000000000000000000000000000000AA',
  '3x0000000000000000000000000000000AA',
];
const HOSTNAME =
  /^(?:localhost|(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63})$/;

export type TurnstileLiveConfig =
  | { state: 'absent' }
  | { state: 'invalid'; reason: string }
  | {
      state: 'ready';
      siteKey: string;
      secret: string;
      testKeys: boolean;
      allowedHostnames: string[];
    };

/** Validates live keys; reason codes only, never echoes values. */
export function turnstileLiveConfig(config: ConfigReader): TurnstileLiveConfig {
  const value = (name: string) => {
    const raw = config.get(name);
    return typeof raw === 'string' ? raw.trim() : '';
  };
  const siteKey = value('TURNSTILE_SITE_KEY');
  const secret = value('TURNSTILE_SECRET_KEY');
  if (!siteKey && !secret) return { state: 'absent' };
  if (!siteKey || !secret)
    return { state: 'invalid', reason: 'KEYS_INCOMPLETE' };
  if (
    !/^[0-9A-Za-z_-]{10,100}$/.test(siteKey) ||
    !/^[0-9A-Za-z_-]{10,200}$/.test(secret)
  )
    return { state: 'invalid', reason: 'KEY_FORMAT' };
  const testKeys = TEST_SITE_KEYS.includes(siteKey);
  if (testKeys !== TEST_SECRET_KEYS.includes(secret))
    return { state: 'invalid', reason: 'KEY_KIND_MISMATCH' };
  const allowedHostnames = value('TURNSTILE_ALLOWED_HOSTNAMES')
    .split(',')
    .map((h) => h.trim().toLowerCase())
    .filter(Boolean);
  if (
    allowedHostnames.length > 10 ||
    allowedHostnames.some((h) => !HOSTNAME.test(h))
  )
    return { state: 'invalid', reason: 'ALLOWED_HOSTNAMES_FORMAT' };
  if (!testKeys && allowedHostnames.length === 0)
    return { state: 'invalid', reason: 'ALLOWED_HOSTNAMES_REQUIRED' };
  return { state: 'ready', siteKey, secret, testKeys, allowedHostnames };
}

export interface TurnstileLive {
  config: TurnstileLiveConfig;
  adapter?: TurnstileAdapter;
}

// Cloudflare binds each token to the action it was issued for, so a token from
// one form cannot be spent on another.
export type ProtectedAction = 'contact' | 'checkout';

export type ContactProtectionStatus =
  | { mode: 'disabled' | 'mock' | 'unavailable' }
  | { mode: 'cloudflare'; siteKey: string; testKeys: boolean };

// Process-local bounds for real siteverify calls (route throttle applies too).
class LiveBudget {
  private inFlight = 0;
  private minute = -1;
  private minuteUsed = 0;
  private day = -1;
  private dayUsed = 0;
  constructor(private readonly now: () => number) {}
  take() {
    const now = this.now();
    const minute = Math.floor(now / 60000),
      day = Math.floor(now / 86400000);
    if (minute !== this.minute) [this.minute, this.minuteUsed] = [minute, 0];
    if (day !== this.day) [this.day, this.dayUsed] = [day, 0];
    // Checkout depends on this too: garbage tokens must not be able to exhaust it.
    if (this.inFlight >= 16 || this.minuteUsed >= 300 || this.dayUsed >= 20000)
      return false;
    this.inFlight++;
    this.minuteUsed++;
    this.dayUsed++;
    return true;
  }
  release() {
    this.inFlight = Math.max(0, this.inFlight - 1);
  }
}

export class ContactProtectionService {
  private readonly logger = new Logger(ContactProtectionService.name);
  private readonly budget: LiveBudget;
  constructor(
    private readonly registry: IntegrationRegistry,
    private readonly environment: string,
    private readonly executor: IntegrationExecutor,
    private readonly adapter = new MockTurnstileAdapter(),
    private readonly now = Date.now,
    // Real Cloudflare siteverify; only reachable through the cloudflare gate.
    private readonly live: TurnstileLive = { config: { state: 'absent' } },
  ) {
    this.budget = new LiveBudget(now);
  }

  status(): ContactProtectionStatus {
    const policy = this.registry.turnstile;
    const local = ['development', 'test'].includes(this.environment);
    if (policy.mode === 'disabled') return { mode: 'disabled' };
    if (policy.mode === 'mock') return { mode: local ? 'mock' : 'unavailable' };
    // Real outbound work: never under INTEGRATIONS_ENV=mock. Production additionally
    // needs real keys, because Cloudflare's test keys always pass and stop nothing.
    const config = this.live.config;
    if (config.state === 'ready' && this.live.adapter) {
      const staging = policy.environment === 'staging' && local;
      const production =
        policy.environment === 'production' &&
        this.environment === 'production' &&
        !config.testKeys;
      if (staging || production)
        return {
          mode: 'cloudflare',
          siteKey: config.siteKey,
          testKeys: config.testKeys,
        };
    }
    return { mode: 'unavailable' };
  }

  issue(origin?: string, action: ProtectedAction = 'contact') {
    this.requireMock();
    const hostname = this.localHostname(origin);
    try {
      return {
        mode: 'mock' as const,
        ...this.adapter.issue(hostname, action),
      };
    } catch {
      throw this.unavailable();
    }
  }

  async verify(
    token: string | undefined,
    origin?: string,
    action: ProtectedAction = 'contact',
  ) {
    const status = this.status();
    if (status.mode === 'disabled') return;
    if (status.mode === 'cloudflare') return this.verifyLive(token, action);
    this.requireMock();
    const hostname = this.localHostname(origin);
    if (!token || token.length > 2048) throw this.rejected();
    let result;
    try {
      result = (
        await this.executor.runMock(
          'turnstile',
          'verify_contact',
          'mutation',
          () => this.adapter.verify(token),
        )
      ).data;
    } catch {
      throw this.unavailable();
    }
    const age = this.now() - Date.parse(result.challenge_ts ?? '');
    if (
      !result.success ||
      result.hostname !== hostname ||
      result.action !== action ||
      !Number.isFinite(age) ||
      age < -30000 ||
      age >= 300000
    )
      throw this.rejected();
  }

  private async verifyLive(token: string | undefined, action: ProtectedAction) {
    const config = this.live.config;
    const adapter = this.live.adapter;
    if (config.state !== 'ready' || !adapter) throw this.unavailable();
    // Malformed tokens never reach Cloudflare.
    if (typeof token !== 'string' || !token || token.length > 2048)
      throw this.rejected();
    if (!this.budget.take()) throw this.unavailable();
    let result: TurnstileVerification;
    try {
      // Single-use token: no retry. Unknown/timeout → 503, nothing saved.
      result = await adapter.verify(token);
    } catch {
      this.logger.warn({ event: 'turnstile_verify', outcome: 'unavailable' });
      throw this.unavailable();
    } finally {
      this.budget.release();
    }
    const codes = (
      Array.isArray(result['error-codes']) ? result['error-codes'] : []
    )
      .filter((c) => typeof c === 'string' && /^[a-z-]{1,40}$/.test(c))
      .slice(0, 5);
    let accepted = result.success === true;
    if (accepted && !config.testKeys) {
      // Real keys: action, hostname and freshness are enforced (Cloudflare docs).
      const age = this.now() - Date.parse(result.challenge_ts ?? '');
      accepted =
        result.action === action &&
        config.allowedHostnames.includes(
          String(result.hostname ?? '').toLowerCase(),
        ) &&
        Number.isFinite(age) &&
        age >= -30000 &&
        age < 330000;
    }
    this.logger.log({
      event: 'turnstile_verify',
      outcome: accepted ? 'accepted' : 'rejected',
      testKeys: config.testKeys,
      codes,
    });
    if (!accepted) throw this.rejected();
  }

  private requireMock() {
    if (this.status().mode !== 'mock') throw this.unavailable();
  }
  private localHostname(origin?: string): string {
    try {
      const url = new URL(origin ?? '');
      if (
        !['http:', 'https:'].includes(url.protocol) ||
        url.origin !== origin ||
        !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)
      )
        throw new Error();
      return url.hostname;
    } catch {
      throw this.rejected();
    }
  }
  private unavailable() {
    return new ServiceUnavailableException(
      'Xác minh đang tạm gián đoạn. Vui lòng thử lại sau.',
    );
  }
  private rejected() {
    return new ForbiddenException(
      'Vui lòng xác minh lại trước khi gửi lời nhắn.',
    );
  }
}
