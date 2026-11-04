import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  ServiceUnavailableException,
} from '@nestjs/common';
import type {
  ConfigReader,
  IntegrationRegistry,
} from '../integrations/integrations.config';
import { localFunnelParameters } from './local-funnel.contract';
export interface LocalDebugIntent {
  consent: 'granted';
  action: 'manual_test';
  eventId: string;
  clientId: string;
  sessionId: number;
}
export interface LocalFunnelIntent extends Omit<LocalDebugIntent, 'action'> {
  name: string;
  parameters: Record<string, unknown>;
}
// A trusted local transport guard can prove the attempt never left this process.
export class LocalGa4TestLimitError extends Error {
  constructor() {
    super('LOCAL_GA4_TEST_LIMIT');
  }
}
interface LocalDeliveryEntry {
  signature: string;
  status: 'working' | 'accepted' | 'unknown' | 'blocked';
  reason?: 'test_limit';
}
export class LocalDebugEventService {
  private readonly ledger = new Map<string, LocalDeliveryEntry>();
  private day = -1;
  private count = 0;
  private minute = -1;
  private minuteCount = 0;
  private running = false;
  constructor(
    private readonly config: ConfigReader,
    private readonly registry: IntegrationRegistry,
    private readonly transport: typeof fetch = fetch,
    private readonly now = Date.now,
    private readonly timeoutMs = 10000,
  ) {}
  policy(): { enabled: true; measurementId: string } | undefined {
    const origin = this.config.get('GA4_LOCAL_TEST_ORIGIN');
    if (
      this.config.get('FEATURE_GA4_LOCAL_BROWSER_TEST_ENABLED') !== 'true' ||
      !['development', 'test'].includes(String(this.config.get('NODE_ENV'))) ||
      !this.registry.ga4.enabled ||
      this.registry.ga4.mode !== 'mock' ||
      typeof origin !== 'string' ||
      !/^http:\/\/(?:localhost|127\.0\.0\.1):\d{2,5}$/.test(origin)
    )
      return undefined;
    const id = this.config.get('GA4_MEASUREMENT_ID'),
      secret = this.config.get('GA4_API_SECRET');
    if (
      id !== 'G-XJNSBPN8HN' ||
      typeof secret !== 'string' ||
      !secret ||
      /THAY_BANG|PLACEHOLDER/.test(secret)
    )
      return undefined;
    return { enabled: true, measurementId: id };
  }
  funnelEnabled(): boolean {
    return (
      !!this.policy() &&
      this.config.get('FEATURE_GA4_LOCAL_FUNNEL_ENABLED') === 'true'
    );
  }
  async send(input: LocalDebugIntent, actorId: string, origin?: string) {
    if (input.action !== 'manual_test')
      throw new ForbiddenException('LOCAL_GA4_INTENT_REJECTED');
    return this.dispatch(
      input,
      actorId,
      origin,
      'local_test_action',
      { test_action: 'manual_test' },
      false,
    );
  }
  async sendFunnel(input: LocalFunnelIntent, actorId: string, origin?: string) {
    if (!this.funnelEnabled())
      throw new ServiceUnavailableException('LOCAL_GA4_FUNNEL_DISABLED');
    const parameters = localFunnelParameters(input.name, input.parameters);
    if (!parameters) throw new BadRequestException('LOCAL_GA4_FUNNEL_INVALID');
    return this.dispatch(input, actorId, origin, input.name, parameters, true);
  }
  private async dispatch(
    input: Omit<LocalDebugIntent, 'action'>,
    actorId: string,
    origin: string | undefined,
    name: string,
    parameters: Record<string, unknown>,
    funnel: boolean,
  ) {
    if (!this.policy())
      throw new ServiceUnavailableException('LOCAL_GA4_DISABLED');
    if (origin !== this.config.get('GA4_LOCAL_TEST_ORIGIN'))
      throw new ForbiddenException('LOCAL_GA4_ORIGIN_REJECTED');
    if (
      input.consent !== 'granted' ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        input.eventId,
      ) ||
      !/^[1-9]\d{0,14}\.[1-9]\d{0,14}$/.test(input.clientId) ||
      !Number.isSafeInteger(input.sessionId) ||
      input.sessionId < 1
    )
      throw new ForbiddenException('LOCAL_GA4_INTENT_REJECTED');
    const day = Math.floor(this.now() / 86400000),
      minute = Math.floor(this.now() / 60000);
    if (this.day !== day) {
      this.day = day;
      this.count = 0;
      this.ledger.clear();
    }
    if (this.minute !== minute) {
      this.minute = minute;
      this.minuteCount = 0;
    }
    const key = actorId + ':' + input.eventId,
      signature = JSON.stringify([
        input.clientId,
        input.sessionId,
        name,
        parameters,
      ]);
    const prior = this.ledger.get(key);
    if (prior) {
      if (prior.signature !== signature)
        throw new ConflictException('LOCAL_GA4_EVENT_CONFLICT');
      return {
        source: 'google_measurement_protocol',
        status: prior.status,
        ...(prior.reason ? { reason: prior.reason } : {}),
        duplicate: true,
        ingestionVerified: false,
      };
    }
    if (this.running) throw new ConflictException('LOCAL_GA4_BUSY');
    if (
      this.count >= (funnel ? 100 : 20) ||
      this.minuteCount >= (funnel ? 30 : 5)
    )
      throw new HttpException('LOCAL_GA4_QUOTA', 429);
    this.count++;
    this.minuteCount++;
    this.running = true;
    const entry: LocalDeliveryEntry = { signature, status: 'working' };
    this.ledger.set(key, entry);
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const deadline = new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        controller.abort();
        reject(new Error('TIMEOUT'));
      }, this.timeoutMs);
    });
    try {
      const url = new URL('https://www.google-analytics.com/mp/collect');
      url.searchParams.set(
        'measurement_id',
        String(this.config.get('GA4_MEASUREMENT_ID')),
      );
      url.searchParams.set(
        'api_secret',
        String(this.config.get('GA4_API_SECRET')),
      );
      const request = async () => {
        const response = await this.transport(url.href, {
          method: 'POST',
          redirect: 'error',
          signal: controller.signal,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            client_id: input.clientId,
            events: [
              {
                name,
                params: {
                  ...parameters,
                  debug_mode: true,
                  session_id: input.sessionId,
                  engagement_time_msec: 1,
                },
              },
            ],
            consent: { ad_user_data: 'DENIED', ad_personalization: 'DENIED' },
          }),
        });
        await response.body?.cancel().catch(() => undefined);
        if (!response.ok) throw new Error('REJECTED');
      };
      await Promise.race([request(), deadline]);
      entry.status = 'accepted';
    } catch (error) {
      entry.status =
        error instanceof LocalGa4TestLimitError ? 'blocked' : 'unknown';
      if (entry.status === 'blocked') entry.reason = 'test_limit';
    } finally {
      this.running = false;
      if (timer) clearTimeout(timer);
    }
    return {
      source: 'google_measurement_protocol',
      status: entry.status,
      ...(entry.reason ? { reason: entry.reason } : {}),
      duplicate: false,
      ingestionVerified: false,
    };
  }
}
