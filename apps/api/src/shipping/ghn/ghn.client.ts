import { Inject, Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import { GHN_CONFIG, type GhnConfig } from './ghn.config';
import { ShippingError } from './ghn.error';
import { GHN_OPERATIONS, type GhnOperation } from './ghn.operations';

export const GHN_FETCH = Symbol('GHN_FETCH');
export const GHN_WAIT = Symbol('GHN_WAIT');
export type GhnPayload = Record<string, unknown>;
export type Decoder<T> = (value: unknown) => T;
const MAX_RESPONSE_BYTES = 1024 * 1024;

@Injectable()
export class GhnClient {
  private readonly logger = new Logger(GhnClient.name);

  constructor(
    @Inject(GHN_CONFIG) private readonly config: GhnConfig,
    @Inject(GHN_FETCH) private readonly transport: typeof fetch,
    @Inject(GHN_WAIT) private readonly wait: (ms: number) => Promise<void>,
  ) {}

  forShop(shopId: number): GhnClient {
    if (!Number.isSafeInteger(shopId) || shopId <= 0)
      throw new Error('SHIPPING_SHOP_INVALID');
    return new GhnClient({ ...this.config, shopId }, this.transport, this.wait);
  }

  async request<T>(
    operation: GhnOperation,
    payload: GhnPayload | FormData,
    decode: Decoder<T>,
  ): Promise<T> {
    const correlationId = randomUUID();
    if (!this.config.enabled)
      throw new ShippingError('SHIPPING_DISABLED', correlationId);
    const spec = Object.hasOwn(GHN_OPERATIONS, operation)
      ? GHN_OPERATIONS[operation]
      : null;
    if (!spec)
      throw new ShippingError('SHIPPING_VALIDATION_FAILED', correlationId);
    if ('form' in spec && spec.form && !(payload instanceof FormData))
      throw new ShippingError('SHIPPING_VALIDATION_FAILED', correlationId);
    // Production fulfillment is a separate release/authorization gate. No env
    // variable can silently bypass it in this implementation.
    if (
      'mutation' in spec &&
      spec.mutation &&
      this.config.environment === 'production'
    )
      throw new ShippingError('SHIPPING_VALIDATION_FAILED', correlationId);
    const url = new URL(`/shiip/public-api${spec.path}`, this.config.origin);
    if (spec.method === 'GET') {
      for (const [key, value] of Object.entries(payload))
        url.searchParams.set(key, String(value));
    }
    const retries = spec.retry ? this.config.readRetries : 0;
    for (let attempt = 0; ; attempt++) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.config.timeoutMs);
      let failure: ShippingError;
      let status: number | undefined;
      try {
        const response = await this.transport(url, {
          method: spec.method,
          headers: {
            Token: this.config.token,
            ShopId: String(this.config.shopId),
            ...(payload instanceof FormData
              ? {}
              : { 'Content-Type': 'application/json' }),
            'X-Request-ID': correlationId,
          },
          body:
            spec.method === 'POST'
              ? payload instanceof FormData
                ? payload
                : JSON.stringify(payload)
              : undefined,
          signal: controller.signal,
          redirect: 'error', // Never forward credentials on a redirect.
        });
        status = response.status;
        if (!response.ok) {
          await response.body?.cancel().catch(() => undefined);
          throw this.fromStatus(status, correlationId);
        }
        const envelope = await this.readEnvelope(response, correlationId);
        if (envelope.code !== 200) {
          throw this.fromStatus(envelope.code, correlationId);
        }
        let result: T;
        try {
          result = decode(envelope.data);
        } catch {
          throw new ShippingError('SHIPPING_INVALID_RESPONSE', correlationId);
        }
        this.logger.log({
          event: 'ghn_request',
          operation,
          correlationId,
          attempt: attempt + 1,
          status,
        });
        return result;
      } catch (error: unknown) {
        failure = controller.signal.aborted
          ? new ShippingError('SHIPPING_TIMEOUT', correlationId, true)
          : error instanceof ShippingError
            ? error
            : new ShippingError('SHIPPING_UNAVAILABLE', correlationId, true);
      } finally {
        clearTimeout(timer);
      }
      this.logger.warn({
        event: 'ghn_request_failed',
        operation,
        correlationId,
        attempt: attempt + 1,
        status,
        code: failure.code,
      });
      if (!failure.retryable || attempt >= retries) throw failure;
      // Application policy: at most 2 retries, exponential backoff + jitter.
      await this.wait(200 * 2 ** attempt + Math.floor(Math.random() * 100));
    }
  }

  private fromStatus(status: number, id: string): ShippingError {
    if ([401, 403].includes(status))
      return new ShippingError('SHIPPING_AUTH_FAILED', id);
    if (status === 429)
      return new ShippingError('SHIPPING_RATE_LIMITED', id, true);
    if ([502, 503, 504].includes(status))
      return new ShippingError('SHIPPING_UNAVAILABLE', id, true);
    if (status >= 400 && status < 500)
      return new ShippingError('SHIPPING_VALIDATION_FAILED', id);
    return new ShippingError('SHIPPING_INVALID_RESPONSE', id);
  }

  private async readEnvelope(
    response: Response,
    id: string,
  ): Promise<{ code: number; data: unknown }> {
    if (Number(response.headers.get('content-length')) > MAX_RESPONSE_BYTES) {
      await response.body?.cancel();
      throw new ShippingError('SHIPPING_INVALID_RESPONSE', id);
    }
    const reader = response.body?.getReader();
    if (!reader) throw new ShippingError('SHIPPING_INVALID_RESPONSE', id);
    let bytes = 0;
    const chunks: Uint8Array[] = [];
    try {
      for (;;) {
        const chunk = await reader.read();
        if (chunk.done) break;
        bytes += chunk.value.byteLength;
        if (bytes > MAX_RESPONSE_BYTES) {
          await reader.cancel();
          throw new ShippingError('SHIPPING_INVALID_RESPONSE', id);
        }
        chunks.push(chunk.value);
      }
      const result: unknown = JSON.parse(
        Buffer.concat(chunks).toString('utf8'),
      );
      if (
        result &&
        typeof result === 'object' &&
        'code' in result &&
        typeof result.code === 'number' &&
        'data' in result
      ) {
        return result as { code: number; data: unknown };
      }
    } catch (error: unknown) {
      if (
        error instanceof ShippingError ||
        (error instanceof Error && error.name === 'AbortError')
      )
        throw error;
    } finally {
      reader.releaseLock();
    }
    throw new ShippingError('SHIPPING_INVALID_RESPONSE', id);
  }
}

export const ghnTransportProviders = [
  {
    provide: GHN_FETCH,
    useValue: (...args: Parameters<typeof fetch>) => fetch(...args),
  },
  {
    provide: GHN_WAIT,
    useValue: async (ms: number): Promise<void> => {
      await delay(ms);
    },
  },
];
