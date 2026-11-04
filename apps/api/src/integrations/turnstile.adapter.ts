import { createHash, randomBytes } from 'node:crypto';

export interface TurnstileVerification {
  success: boolean;
  challenge_ts?: string;
  hostname?: string;
  action?: string;
  'error-codes'?: string[];
}
export interface TurnstileAdapter {
  verify(token: string): Promise<TurnstileVerification>;
}

// Local-only simulation, not Cloudflare bot detection. Tokens never persist.
export class MockTurnstileAdapter implements TurnstileAdapter {
  private readonly tokens = new Map<
    string,
    { issued: number; hostname: string; action: string }
  >();
  constructor(private readonly now = Date.now) {}

  issue(hostname: string, action: string) {
    for (const [key, value] of this.tokens)
      if (this.now() - value.issued >= 300000) this.tokens.delete(key);
    if (this.tokens.size >= 1000) throw new Error('MOCK_CHALLENGE_CAPACITY');
    const token = `mock_${randomBytes(32).toString('base64url')}`;
    this.tokens.set(this.hash(token), { issued: this.now(), hostname, action });
    return { token, expiresAt: new Date(this.now() + 300000).toISOString() };
  }

  verify(token: string): Promise<TurnstileVerification> {
    const key = this.hash(token);
    const entry = this.tokens.get(key);
    this.tokens.delete(key); // consume before any await; cannot win two requests
    if (!entry || this.now() - entry.issued >= 300000) {
      return Promise.resolve({
        success: false,
        'error-codes': ['timeout-or-duplicate'],
      });
    }
    return Promise.resolve({
      success: true,
      challenge_ts: new Date(entry.issued).toISOString(),
      hostname: entry.hostname,
      action: entry.action,
      'error-codes': [],
    });
  }
  private hash(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }
}

// Future opt-in provider adapter. Never registered or called by the app in this
// release. Transport is mandatory injection; tests supply a fake, not fetch.
export class SiteverifyTurnstileAdapter implements TurnstileAdapter {
  constructor(
    private readonly secret: string,
    private readonly transport: typeof fetch,
    private readonly timeoutMs = 8000,
  ) {
    if (
      !secret ||
      !Number.isSafeInteger(timeoutMs) ||
      timeoutMs < 1 ||
      timeoutMs > 30000
    )
      throw new Error('INVALID_TURNSTILE_CONFIG');
  }
  async verify(token: string): Promise<TurnstileVerification> {
    if (!token || token.length > 2048) return { success: false };
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const deadline = new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        reject(new Error('TURNSTILE_UNAVAILABLE'));
        controller.abort();
      }, this.timeoutMs);
    });
    const request = async () => {
      const response = await this.transport(
        'https://challenges.cloudflare.com/turnstile/v0/siteverify',
        {
          method: 'POST',
          redirect: 'error',
          signal: controller.signal,
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({ secret: this.secret, response: token }),
        },
      );
      if (!response.ok) {
        await response.body?.cancel().catch(() => undefined);
        throw new Error('TURNSTILE_UNAVAILABLE');
      }
      const reader = response.body?.getReader();
      if (!reader) throw new Error('TURNSTILE_UNAVAILABLE');
      const chunks: Uint8Array[] = [];
      let size = 0;
      try {
        for (;;) {
          const chunk = await reader.read();
          if (chunk.done) break;
          size += chunk.value.byteLength;
          if (size > 16384) {
            await reader.cancel();
            throw new Error('TURNSTILE_UNAVAILABLE');
          }
          chunks.push(chunk.value);
        }
      } finally {
        reader.releaseLock();
      }
      const value: unknown = JSON.parse(Buffer.concat(chunks).toString('utf8'));
      if (
        !value ||
        typeof value !== 'object' ||
        !('success' in value) ||
        typeof value.success !== 'boolean'
      )
        throw new Error('TURNSTILE_UNAVAILABLE');
      for (const field of ['hostname', 'action', 'challenge_ts'] as const) {
        if (
          field in value &&
          (typeof (value as Record<string, unknown>)[field] !== 'string' ||
            String((value as Record<string, unknown>)[field]).length > 255)
        )
          throw new Error('TURNSTILE_UNAVAILABLE');
      }
      return value as TurnstileVerification;
    };
    try {
      return await Promise.race([request(), deadline]);
    } catch {
      throw new Error('TURNSTILE_UNAVAILABLE');
    } finally {
      clearTimeout(timer);
    }
  }
}
