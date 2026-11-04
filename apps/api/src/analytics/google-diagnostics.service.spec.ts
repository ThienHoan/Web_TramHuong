import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'node:crypto';
import { loadIntegrationRegistry } from '../integrations/integrations.config';
import {
  GoogleDiagnosticsService,
  encryptGoogleRefreshToken,
  decryptGoogleRefreshToken,
} from './google-diagnostics.service';
import { MockPagespeedAdapter } from './pagespeed.adapter';
const NOW = Date.parse('2026-11-04T12:00:00Z');
const key = randomBytes(32).toString('base64');
const base = {
  NODE_ENV: 'test',
  INTEGRATIONS_ENV: 'staging',
  GOOGLE_DIAGNOSTICS_ENABLED: 'true',
  FEATURE_PAGESPEED_AUDIT_ENABLED: 'true',
  FEATURE_SEARCH_CONSOLE_SYNC_ENABLED: 'true',
  FEATURE_GA4_ENABLED: 'true',
  GOOGLE_APPROVED_PUBLIC_ORIGIN: 'https://shop.example.org',
  PAGESPEED_API_KEY: 'SECRET_KEY',
  GA4_MEASUREMENT_ID: 'G-TEST1234',
  GA4_API_SECRET: 'SECRET_GA4',
  GOOGLE_SEARCH_CONSOLE_SITE_URL: 'https://shop.example.org/',
  GOOGLE_OAUTH_CLIENT_ID: 'test-client',
  GOOGLE_OAUTH_CLIENT_SECRET: 'SECRET_CLIENT',
  GOOGLE_TOKEN_KEY_ID: 'key1',
  GOOGLE_TOKEN_ENCRYPTION_KEY: key,
  GOOGLE_SEARCH_CONSOLE_REFRESH_TOKEN_ENCRYPTED: encryptGoogleRefreshToken(
    'SECRET_REFRESH',
    key,
    'key1',
    'web-tramhuong:gsc:test-client:https://shop.example.org/',
  ),
};
function fixture(
  patch: Record<string, unknown> = {},
  transport = jest.fn<ReturnType<typeof fetch>, Parameters<typeof fetch>>(),
  timeout = 1000,
) {
  const config = new ConfigService({ ...base, ...patch });
  return {
    service: new GoogleDiagnosticsService(
      config,
      loadIntegrationRegistry(config),
      transport,
      () => NOW,
      timeout,
    ),
    transport,
  };
}
const json = (value: unknown) =>
  new Response(JSON.stringify(value), { status: 200 });
describe('real Google manual diagnostics with injected HTTP only', () => {
  it('encrypts/authenticates tokens and binds them to property/client/key version', () => {
    expect(
      decryptGoogleRefreshToken(
        base.GOOGLE_SEARCH_CONSOLE_REFRESH_TOKEN_ENCRYPTED,
        key,
        'key1',
        'web-tramhuong:gsc:test-client:https://shop.example.org/',
      ),
    ).toBe('SECRET_REFRESH');
    for (const [k, id, aad] of [
      [key, 'key2', 'wrong'],
      [randomBytes(32).toString('base64'), 'key1', 'wrong'],
      [key, 'key1', 'other-property'],
    ]) {
      expect(() =>
        decryptGoogleRefreshToken(
          base.GOOGLE_SEARCH_CONSOLE_REFRESH_TOKEN_ENCRYPTED,
          k,
          id,
          aad,
        ),
      ).toThrow('INVALID_ENCRYPTED_TOKEN');
    }
  });
  it.each([
    { GOOGLE_DIAGNOSTICS_ENABLED: 'false' },
    { INTEGRATIONS_ENV: 'mock' },
    { NODE_ENV: 'production' },
    { INTEGRATIONS_KILL_SWITCH: 'true' },
    { FEATURE_PAGESPEED_AUDIT_ENABLED: 'false' },
    { PAGESPEED_API_KEY: '' },
  ])('fails closed %j before network', async (patch) => {
    const f = fixture(patch);
    await expect(f.service.diagnose('pagespeed')).rejects.toThrow(
      'GOOGLE_DIAGNOSTIC_NOT_READY',
    );
    expect(f.transport).not.toHaveBeenCalled();
  });
  it('status exposes names only, never calls transport, and never claims verified', () => {
    const f = fixture();
    const status = JSON.stringify(f.service.status());
    expect(status).not.toContain('SECRET');
    expect(status).not.toContain(key);
    expect(f.transport).not.toHaveBeenCalled();
    expect(
      f.service.status().providers.every((p) => p.lastVerifiedAt === null),
    ).toBe(true);
  });
  it.each([
    'http://localhost:4400',
    'https://127.0.0.1',
    'https://[::1]',
    'https://shop.local',
    'https://user:pass@shop.example.org',
    'https://shop.example.org/?token=secret',
    'https://shop.example.org/path',
    'https://shop.example.org:8443',
  ])('rejects origin %s', async (origin) => {
    const f = fixture({ GOOGLE_APPROVED_PUBLIC_ORIGIN: origin });
    await expect(f.service.diagnose('pagespeed')).rejects.toThrow();
    expect(f.transport).not.toHaveBeenCalled();
  });
  it('calls actual PSI endpoint with fixed approved URL, all categories and safe normalized output', async () => {
    const raw = await new MockPagespeedAdapter(() => NOW).audit(
      {
        url: 'https://shop.example.org/vi',
        strategy: 'mobile',
        categories: ['performance', 'accessibility', 'best-practices', 'seo'],
      },
      new AbortController().signal,
    );
    const f = fixture();
    f.transport.mockResolvedValue(json(raw));
    const result = await f.service.diagnose('pagespeed');
    expect(result).toMatchObject({
      source: 'google',
      fieldStatus: 'NOT_PARSED',
      persisted: false,
    });
    const [url, options] = f.transport.mock.calls[0];
    const parsed = new URL(url as string);
    expect(parsed.origin + parsed.pathname).toBe(
      'https://www.googleapis.com/pagespeedonline/v5/runPagespeed',
    );
    expect(parsed.searchParams.get('url')).toBe('https://shop.example.org/vi');
    expect(parsed.searchParams.getAll('category')).toHaveLength(4);
    expect(options?.redirect).toBe('error');
    expect(JSON.stringify(result)).not.toContain('SECRET');
  });
  it('decrypts refresh token server-side then queries only date aggregates, without exposing credentials', async () => {
    const f = fixture();
    f.transport
      .mockResolvedValueOnce(
        json({ access_token: 'SECRET_ACCESS', token_type: 'Bearer' }),
      )
      .mockResolvedValueOnce(
        json({
          rows: [
            {
              keys: ['2026-11-01'],
              clicks: 2,
              impressions: 10,
              ctr: 0.2,
              position: 4,
            },
          ],
        }),
      );
    const result = await f.service.diagnose('search_console');
    expect(result).toMatchObject({
      source: 'google',
      metrics: { clicks: 2 },
      persisted: false,
    });
    expect(f.transport.mock.calls[0][0]).toBe(
      'https://oauth2.googleapis.com/token',
    );
    expect(
      new URLSearchParams(f.transport.mock.calls[0][1]?.body as string).get(
        'refresh_token',
      ),
    ).toBe('SECRET_REFRESH');
    expect(
      JSON.parse(f.transport.mock.calls[1][1]?.body as string),
    ).toMatchObject({
      dimensions: ['date'],
      dataState: 'final',
      startRow: 0,
      rowLimit: 100,
    });
    expect(JSON.stringify(result)).not.toContain('SECRET');
  });
  it('does not invent zero traffic when GSC has no day', async () => {
    const f = fixture();
    f.transport
      .mockResolvedValueOnce(
        json({ access_token: 'token', token_type: 'Bearer' }),
      )
      .mockResolvedValueOnce(json({}));
    expect(await f.service.diagnose('search_console')).toHaveProperty(
      'metrics',
      null,
    );
  });
  it('rejects readonly scope mismatch and prevents query call', async () => {
    const f = fixture();
    f.transport.mockResolvedValue(
      json({
        access_token: 'token',
        token_type: 'Bearer',
        scope: 'https://www.googleapis.com/auth/webmasters',
      }),
    );
    await expect(f.service.diagnose('search_console')).rejects.toThrow(
      'GOOGLE_DIAGNOSTIC_FAILED',
    );
    expect(f.transport).toHaveBeenCalledTimes(1);
  });
  it('GA4 uses debug only; valid payload does not verify secret or ingestion', async () => {
    const f = fixture();
    f.transport.mockResolvedValue(json({ validationMessages: [] }));
    expect(await f.service.diagnose('ga4')).toMatchObject({
      source: 'google_validation',
      payloadValid: true,
      credentialsVerified: false,
      reportsIngested: false,
    });
    expect(new URL(f.transport.mock.calls[0][0] as string).pathname).toBe(
      '/debug/mp/collect',
    );
    const body = JSON.parse(f.transport.mock.calls[0][1]?.body as string) as {
      events: { name: string }[];
      client_id: string;
    };
    expect(body.client_id).toMatch(/^[1-9]\d*\.[1-9]\d*$/);
    expect(body.events.map((e) => e.name)).toEqual(['integration_diagnostic']);
    expect(JSON.stringify(body)).not.toMatch(/purchase|payment|email/);
  });
  it('returns safe validation field/code without provider descriptions', async () => {
    const f = fixture();
    f.transport.mockResolvedValue(
      json({
        validationMessages: [
          {
            validationCode: 'VALUE_INVALID',
            fieldPath: 'client_id',
            description: 'SECRET_PROVIDER_DETAIL',
          },
        ],
      }),
    );
    const result = await f.service.diagnose('ga4');
    expect(result).toMatchObject({
      payloadValid: false,
      validationIssues: [{ code: 'VALUE_INVALID', field: 'client_id' }],
    });
    expect(JSON.stringify(result)).not.toContain('SECRET_PROVIDER_DETAIL');
  });
  it.each([
    new Response('SECRET_PROVIDER_BODY', { status: 403 }),
    json({ validationMessages: 'bad' }),
    new Response('{bad'),
  ])('redacts provider failures and does not retry', async (response) => {
    const f = fixture();
    f.transport.mockResolvedValue(response);
    await expect(f.service.diagnose('ga4')).rejects.toThrow(
      'GOOGLE_DIAGNOSTIC_FAILED',
    );
    expect(f.transport).toHaveBeenCalledTimes(1);
  });
  it('bounds response size', async () => {
    const f = fixture();
    f.transport.mockResolvedValue(new Response('x'.repeat(65537)));
    await expect(f.service.diagnose('ga4')).rejects.toThrow(
      'GOOGLE_DIAGNOSTIC_FAILED',
    );
  });
  it('bounds timeout, releases lock and keeps errors safe', async () => {
    const f = fixture(
      {},
      jest
        .fn<ReturnType<typeof fetch>, Parameters<typeof fetch>>()
        .mockImplementation(() => new Promise(() => {})),
      5,
    );
    await expect(f.service.diagnose('ga4')).rejects.toThrow(
      'GOOGLE_DIAGNOSTIC_FAILED',
    );
    f.transport.mockResolvedValue(json({ validationMessages: [] }));
    await expect(f.service.diagnose('ga4')).resolves.toHaveProperty(
      'payloadValid',
      true,
    );
  });
  it('rejects overlap and enforces per-provider minute budget', async () => {
    let release!: (value: Response) => void;
    const f = fixture();
    f.transport.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          release = resolve;
        }),
    );
    const first = f.service.diagnose('ga4');
    await expect(f.service.diagnose('ga4')).rejects.toThrow(
      'GOOGLE_DIAGNOSTIC_IN_PROGRESS',
    );
    release(json({ validationMessages: [] }));
    await first;
    f.transport.mockImplementation(() =>
      Promise.resolve(json({ validationMessages: [] })),
    );
    for (let i = 0; i < 4; i++) await f.service.diagnose('ga4');
    await expect(f.service.diagnose('ga4')).rejects.toMatchObject({
      status: 429,
    });
    expect(f.transport).toHaveBeenCalledTimes(5);
  });
});
