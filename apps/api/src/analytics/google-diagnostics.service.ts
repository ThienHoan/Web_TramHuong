import {
  ConflictException,
  HttpException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import type {
  ConfigReader,
  IntegrationRegistry,
} from '../integrations/integrations.config';
import { normalizePagespeedSample } from './pagespeed.service';
import { searchWindow } from './search-console.service';
export type GoogleDiagnostic = 'pagespeed' | 'search_console' | 'ga4';
const REQUIRED: Record<GoogleDiagnostic, string[]> = {
  pagespeed: ['GOOGLE_APPROVED_PUBLIC_ORIGIN', 'PAGESPEED_API_KEY'],
  search_console: [
    'GOOGLE_APPROVED_PUBLIC_ORIGIN',
    'GOOGLE_SEARCH_CONSOLE_SITE_URL',
    'GOOGLE_OAUTH_CLIENT_ID',
    'GOOGLE_OAUTH_CLIENT_SECRET',
    'GOOGLE_TOKEN_KEY_ID',
    'GOOGLE_TOKEN_ENCRYPTION_KEY',
    'GOOGLE_SEARCH_CONSOLE_REFRESH_TOKEN_ENCRYPTED',
  ],
  ga4: ['GA4_MEASUREMENT_ID', 'GA4_API_SECRET'],
};
const providers = Object.keys(REQUIRED) as GoogleDiagnostic[];
function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('INVALID_RESPONSE');
  return value as Record<string, unknown>;
}
function keyBytes(key: string): Buffer {
  const bytes = Buffer.from(key, 'base64');
  if (bytes.length !== 32 || bytes.toString('base64') !== key)
    throw new Error('INVALID_TOKEN_KEY');
  return bytes;
}
export function encryptGoogleRefreshToken(
  token: string,
  key: string,
  keyId: string,
  aad: string,
): string {
  if (!token || token.length > 8192 || !/^[a-zA-Z0-9_-]{1,32}$/.test(keyId))
    throw new Error('INVALID_TOKEN_INPUT');
  const iv = randomBytes(12),
    cipher = createCipheriv('aes-256-gcm', keyBytes(key), iv);
  cipher.setAAD(Buffer.from(aad));
  const encrypted = Buffer.concat([
    cipher.update(token, 'utf8'),
    cipher.final(),
  ]);
  return [
    'v1',
    keyId,
    iv.toString('base64url'),
    cipher.getAuthTag().toString('base64url'),
    encrypted.toString('base64url'),
  ].join('.');
}
export function decryptGoogleRefreshToken(
  value: string,
  key: string,
  keyId: string,
  aad: string,
): string {
  try {
    const parts = value.split('.');
    if (
      parts.length !== 5 ||
      parts[0] !== 'v1' ||
      parts[1] !== keyId ||
      parts.slice(2).some((p) => !/^[A-Za-z0-9_-]+$/.test(p))
    )
      throw new Error();
    const iv = Buffer.from(parts[2], 'base64url'),
      tag = Buffer.from(parts[3], 'base64url');
    if (iv.length !== 12 || tag.length !== 16 || parts[4].length > 11000)
      throw new Error();
    const cipher = createDecipheriv('aes-256-gcm', keyBytes(key), iv);
    cipher.setAAD(Buffer.from(aad));
    cipher.setAuthTag(tag);
    const token = Buffer.concat([
      cipher.update(Buffer.from(parts[4], 'base64url')),
      cipher.final(),
    ]).toString('utf8');
    if (!token || token.length > 8192) throw new Error();
    return token;
  } catch {
    throw new Error('INVALID_ENCRYPTED_TOKEN');
  }
}
export class GoogleDiagnosticsService {
  private running = false;
  private readonly budget = new Map<
    GoogleDiagnostic,
    { day: number; used: number; minute: number; minuteUsed: number }
  >();
  constructor(
    private readonly config: ConfigReader,
    private readonly registry: IntegrationRegistry,
    private readonly transport: typeof fetch = fetch,
    private readonly now = Date.now,
    private readonly timeoutMs = 30000,
  ) {}
  private value(name: string): string {
    const raw = this.config.get(name);
    return typeof raw === 'string' ? raw.trim() : '';
  }
  private aad() {
    return (
      'web-tramhuong:gsc:' +
      this.value('GOOGLE_OAUTH_CLIENT_ID') +
      ':' +
      this.value('GOOGLE_SEARCH_CONSOLE_SITE_URL')
    );
  }
  private origin() {
    const raw = this.value('GOOGLE_APPROVED_PUBLIC_ORIGIN'),
      url = new URL(raw);
    if (
      url.protocol !== 'https:' ||
      url.origin !== raw ||
      url.port ||
      url.username ||
      url.password ||
      !/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(
        url.hostname,
      ) ||
      /\.(?:localhost|local|internal|invalid|test|example)$/.test(url.hostname)
    )
      throw new Error('INVALID_PUBLIC_ORIGIN');
    return url;
  }
  status() {
    const gate =
      this.value('GOOGLE_DIAGNOSTICS_ENABLED') === 'true' &&
      this.config.get('INTEGRATIONS_ENV') === 'staging' &&
      ['development', 'test'].includes(this.value('NODE_ENV'));
    return {
      source: 'configuration' as const,
      schedulerEnabled: false,
      reportsIngested: false,
      providers: providers.map((provider) => {
        const missing = REQUIRED[provider].filter((name) => !this.value(name));
        let valid = true;
        try {
          if (!missing.length && provider !== 'ga4') this.origin();
          if (
            !missing.length &&
            provider === 'ga4' &&
            !/^G-[A-Z0-9]{4,20}$/.test(this.value('GA4_MEASUREMENT_ID'))
          )
            throw new Error();
          if (!missing.length && provider === 'search_console') {
            const origin = this.origin();
            if (
              ![origin.origin + '/', 'sc-domain:' + origin.hostname].includes(
                this.value('GOOGLE_SEARCH_CONSOLE_SITE_URL'),
              )
            )
              throw new Error();
            decryptGoogleRefreshToken(
              this.value('GOOGLE_SEARCH_CONSOLE_REFRESH_TOKEN_ENCRYPTED'),
              this.value('GOOGLE_TOKEN_ENCRYPTION_KEY'),
              this.value('GOOGLE_TOKEN_KEY_ID'),
              this.aad(),
            );
          }
        } catch {
          valid = false;
        }
        const flag = this.registry[provider];
        return {
          provider,
          ready:
            gate &&
            flag.enabled &&
            flag.mode !== 'disabled' &&
            missing.length === 0 &&
            valid,
          missing,
          configValid: valid,
          reason:
            !gate || !flag.enabled || flag.mode === 'disabled'
              ? 'EXECUTION_DISABLED'
              : missing.length
                ? 'MISSING_CONFIG'
                : !valid
                  ? 'INVALID_CONFIG'
                  : 'READY_FOR_MANUAL_DIAGNOSTIC',
          lastVerifiedAt: null,
        };
      }),
    };
  }
  private reserve(provider: GoogleDiagnostic) {
    const day = Math.floor(this.now() / 86400000),
      minute = Math.floor(this.now() / 60000);
    const previous = this.budget.get(provider);
    const state =
      previous?.day === day
        ? previous
        : { day, used: 0, minute, minuteUsed: 0 };
    if (state.minute !== minute) {
      state.minute = minute;
      state.minuteUsed = 0;
    }
    if (state.used >= 20 || state.minuteUsed >= 5)
      throw new HttpException('GOOGLE_DIAGNOSTIC_QUOTA', 429);
    state.used++;
    state.minuteUsed++;
    this.budget.set(provider, state);
  }
  private async json(
    provider: GoogleDiagnostic,
    url: string,
    init: RequestInit,
    maxBytes = 65536,
  ): Promise<unknown> {
    this.reserve(provider);
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const deadline = new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        controller.abort();
        reject(new Error('TIMEOUT'));
      }, this.timeoutMs);
    });
    const run = async () => {
      const response = await this.transport(url, {
        ...init,
        signal: controller.signal,
        redirect: 'error',
      });
      if (!response.ok) {
        await response.body?.cancel().catch(() => undefined);
        throw new Error('PROVIDER_REJECTED');
      }
      const reader = response.body?.getReader();
      if (!reader) throw new Error('INVALID_RESPONSE');
      const chunks: Uint8Array[] = [];
      let size = 0;
      try {
        for (;;) {
          const chunk = await reader.read();
          if (chunk.done) break;
          size += chunk.value.byteLength;
          if (size > maxBytes) throw new Error('RESPONSE_TOO_LARGE');
          chunks.push(chunk.value);
        }
        return JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown;
      } finally {
        await reader.cancel().catch(() => undefined);
        reader.releaseLock();
      }
    };
    try {
      return await Promise.race([run(), deadline]);
    } finally {
      if (timer) clearTimeout(timer);
    }
  }
  async diagnose(
    provider: GoogleDiagnostic,
    strategy: 'mobile' | 'desktop' = 'mobile',
  ) {
    if (
      !providers.includes(provider) ||
      !['mobile', 'desktop'].includes(strategy) ||
      !this.status().providers.find((p) => p.provider === provider)?.ready
    )
      throw new ServiceUnavailableException('GOOGLE_DIAGNOSTIC_NOT_READY');
    if (this.running)
      throw new ConflictException('GOOGLE_DIAGNOSTIC_IN_PROGRESS');
    this.running = true;
    try {
      if (provider === 'pagespeed') {
        const origin = this.origin().origin,
          target = origin + '/vi';
        const url = new URL(
          'https://www.googleapis.com/pagespeedonline/v5/runPagespeed',
        );
        url.searchParams.set('url', target);
        url.searchParams.set('strategy', strategy);
        url.searchParams.set('key', this.value('PAGESPEED_API_KEY'));
        for (const category of [
          'performance',
          'accessibility',
          'best-practices',
          'seo',
        ])
          url.searchParams.append('category', category);
        const raw = await this.json(
          provider,
          url.href,
          { method: 'GET' },
          5 * 1024 * 1024,
        );
        const sample = normalizePagespeedSample(
          raw,
          'home_vi',
          target,
          strategy,
          this.now(),
        );
        return {
          source: 'google' as const,
          provider,
          verifiedAt: new Date(this.now()).toISOString(),
          measuredAt: sample.measuredAt,
          strategy,
          lab: sample.lab,
          lighthouseVersion: sample.lighthouseVersion,
          fieldStatus: 'NOT_PARSED',
          persisted: false,
        };
      }
      if (provider === 'search_console') {
        const token = decryptGoogleRefreshToken(
          this.value('GOOGLE_SEARCH_CONSOLE_REFRESH_TOKEN_ENCRYPTED'),
          this.value('GOOGLE_TOKEN_ENCRYPTION_KEY'),
          this.value('GOOGLE_TOKEN_KEY_ID'),
          this.aad(),
        );
        const auth = record(
          await this.json(provider, 'https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
              client_id: this.value('GOOGLE_OAUTH_CLIENT_ID'),
              client_secret: this.value('GOOGLE_OAUTH_CLIENT_SECRET'),
              refresh_token: token,
              grant_type: 'refresh_token',
            }).toString(),
          }),
        );
        if (
          typeof auth.access_token !== 'string' ||
          !auth.access_token ||
          auth.access_token.length > 8192 ||
          auth.token_type !== 'Bearer' ||
          (auth.scope !== undefined &&
            (typeof auth.scope !== 'string' ||
              !auth.scope
                .split(' ')
                .includes(
                  'https://www.googleapis.com/auth/webmasters.readonly',
                )))
        )
          throw new Error('OAUTH_REJECTED');
        const date = searchWindow(this.now()).at(-1)!;
        const raw = record(
          await this.json(
            provider,
            'https://www.googleapis.com/webmasters/v3/sites/' +
              encodeURIComponent(this.value('GOOGLE_SEARCH_CONSOLE_SITE_URL')) +
              '/searchAnalytics/query',
            {
              method: 'POST',
              headers: {
                Authorization: 'Bearer ' + auth.access_token,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                startDate: date,
                endDate: date,
                dimensions: ['date'],
                type: 'web',
                dataState: 'final',
                rowLimit: 100,
                startRow: 0,
              }),
            },
          ),
        );
        const rows: unknown[] =
          raw.rows === undefined
            ? []
            : Array.isArray(raw.rows)
              ? raw.rows
              : (() => {
                  throw new Error();
                })();
        if (rows.length > 1) throw new Error();
        const row = rows.length ? record(rows[0]) : null;
        if (
          row &&
          (!Array.isArray(row.keys) ||
            row.keys.length !== 1 ||
            row.keys[0] !== date ||
            ['clicks', 'impressions', 'ctr', 'position'].some(
              (k) =>
                typeof row[k] !== 'number' ||
                !Number.isFinite(row[k]) ||
                Number(row[k]) < 0,
            ) ||
            Number(row.ctr) > 1 ||
            Number(row.clicks) > Number(row.impressions))
        )
          throw new Error();
        return {
          source: 'google' as const,
          provider,
          verifiedAt: new Date(this.now()).toISOString(),
          date,
          scope: 'webmasters.readonly',
          dataState: 'final',
          metrics: row
            ? {
                clicks: row.clicks,
                impressions: row.impressions,
                ctr: row.ctr,
                position: row.position,
              }
            : null,
          persisted: false,
        };
      }
      const url = new URL('https://www.google-analytics.com/debug/mp/collect');
      url.searchParams.set('measurement_id', this.value('GA4_MEASUREMENT_ID'));
      url.searchParams.set('api_secret', this.value('GA4_API_SECRET'));
      const response = record(
        await this.json(provider, url.href, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            client_id: `${randomBytes(6).readUIntBE(0, 6) + 1}.${Math.floor(this.now() / 1000)}`,
            validation_behavior: 'ENFORCE_RECOMMENDATIONS',
            events: [
              {
                name: 'integration_diagnostic',
                params: { engagement_time_msec: 1 },
              },
            ],
          }),
        }),
      );
      if (
        !Array.isArray(response.validationMessages) ||
        response.validationMessages.length > 50
      )
        throw new Error();
      return {
        source: 'google_validation' as const,
        provider,
        validatedAt: new Date(this.now()).toISOString(),
        validationIssueCount: response.validationMessages.length,
        validationIssues: response.validationMessages.map((value: unknown) => {
          const issue = record(value);
          return {
            code:
              typeof issue.validationCode === 'string' &&
              /^[A-Z_]{1,64}$/.test(issue.validationCode)
                ? issue.validationCode
                : 'UNKNOWN',
            field:
              typeof issue.fieldPath === 'string' &&
              /^[A-Za-z0-9_.[\]]{1,120}$/.test(issue.fieldPath)
                ? issue.fieldPath
                : 'unknown',
          };
        }),
        payloadValid: response.validationMessages.length === 0,
        credentialsVerified: false,
        reportsIngested: false,
      };
    } catch (error: unknown) {
      if (error instanceof HttpException) throw error;
      throw new ServiceUnavailableException('GOOGLE_DIAGNOSTIC_FAILED');
    } finally {
      this.running = false;
    }
  }
}
