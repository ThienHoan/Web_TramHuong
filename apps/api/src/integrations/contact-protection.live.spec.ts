import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { Logger, type INestApplication } from '@nestjs/common';
import type { Server } from 'node:http';
import request from 'supertest';
import { loadIntegrationRegistry } from './integrations.config';
import { IntegrationExecutor } from './integration-executor';
import {
  ContactProtectionService,
  turnstileLiveConfig,
} from './contact-protection.service';
import type {
  TurnstileAdapter,
  TurnstileVerification,
} from './turnstile.adapter';
import { ContactsModule } from '../contacts/contacts.module';
import { TURNSTILE_TRANSPORT } from './integrations.module';
import { ContactsService } from '../contacts/contacts.service';
import { SupabaseService } from '../supabase/supabase.service';

const TEST_SITE = '1x00000000000000000000AA';
const TEST_SECRET = '1x0000000000000000000000000000000AA';
const REAL_SITE = '0x4AAAAAAAREALSITEKEY000';
const REAL_SECRET = '0x4AAAAAAAREALSECRETKEY_SENTINEL_value';
const NOW = Date.parse('2026-11-05T10:00:00Z');
const base = {
  NODE_ENV: 'development',
  INTEGRATIONS_ENV: 'staging',
  FEATURE_TURNSTILE_ENABLED: 'true',
  TURNSTILE_SITE_KEY: TEST_SITE,
  TURNSTILE_SECRET_KEY: TEST_SECRET,
};

function make(
  values: Record<string, string>,
  verify: (token: string) => Promise<TurnstileVerification>,
  clock = { now: NOW },
) {
  const config = new ConfigService(values);
  const registry = loadIntegrationRegistry(config);
  const live = turnstileLiveConfig(config);
  const verifyMock = jest.fn(verify);
  const adapter: TurnstileAdapter = { verify: verifyMock };
  const service = new ContactProtectionService(
    registry,
    values.NODE_ENV ?? '',
    new IntegrationExecutor(registry),
    undefined,
    () => clock.now,
    { config: live, adapter: live.state === 'ready' ? adapter : undefined },
  );
  return { service, verifyMock };
}
const ok = (over: Partial<TurnstileVerification> = {}) =>
  Promise.resolve({
    success: true,
    action: 'test',
    hostname: 'localhost',
    challenge_ts: '2022-02-28T15:14:30.096Z',
    'error-codes': [],
    ...over,
  });

describe('Turnstile live configuration (names/reasons only)', () => {
  it.each([
    [{}, 'absent'],
    [{ TURNSTILE_SITE_KEY: TEST_SITE }, 'KEYS_INCOMPLETE'],
    [
      { TURNSTILE_SITE_KEY: 'bad key!', TURNSTILE_SECRET_KEY: TEST_SECRET },
      'KEY_FORMAT',
    ],
    [
      { TURNSTILE_SITE_KEY: TEST_SITE, TURNSTILE_SECRET_KEY: REAL_SECRET },
      'KEY_KIND_MISMATCH',
    ],
    [
      { TURNSTILE_SITE_KEY: REAL_SITE, TURNSTILE_SECRET_KEY: REAL_SECRET },
      'ALLOWED_HOSTNAMES_REQUIRED',
    ],
    [
      {
        TURNSTILE_SITE_KEY: REAL_SITE,
        TURNSTILE_SECRET_KEY: REAL_SECRET,
        TURNSTILE_ALLOWED_HOSTNAMES: 'https://shop.vn',
      },
      'ALLOWED_HOSTNAMES_FORMAT',
    ],
  ])('%j → %s', (values, expected) => {
    const result = turnstileLiveConfig(new ConfigService(values));
    expect(result.state === 'invalid' ? result.reason : result.state).toBe(
      expected,
    );
    expect(JSON.stringify(result)).not.toContain('SENTINEL');
  });
  it('accepts a documented test pair and a real pair with hostnames', () => {
    expect(turnstileLiveConfig(new ConfigService(base))).toMatchObject({
      state: 'ready',
      testKeys: true,
    });
    expect(
      turnstileLiveConfig(
        new ConfigService({
          TURNSTILE_SITE_KEY: REAL_SITE,
          TURNSTILE_SECRET_KEY: REAL_SECRET,
          TURNSTILE_ALLOWED_HOSTNAMES: 'Shop.example.vn, www.shop.example.vn',
        }),
      ),
    ).toMatchObject({
      state: 'ready',
      testKeys: false,
      allowedHostnames: ['shop.example.vn', 'www.shop.example.vn'],
    });
  });
});

describe('Turnstile live gate and verification', () => {
  // Restore only these spies: a global restoreAllMocks once removed another
  // block's transport fake and let a test reach the network (see 31 doc).
  let spies: jest.SpyInstance[] = [];
  beforeAll(() => {
    spies = [
      jest.spyOn(Logger.prototype, 'log').mockImplementation(() => {}),
      jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => {}),
    ];
  });
  afterAll(() => spies.forEach((spy) => spy.mockRestore()));

  it.each([
    [{ ...base, FEATURE_TURNSTILE_ENABLED: 'false' }, 'disabled'],
    [{ ...base, INTEGRATIONS_KILL_SWITCH: 'true' }, 'disabled'],
    [{ ...base, INTEGRATIONS_ENV: 'mock' }, 'mock'],
    [{ ...base, NODE_ENV: 'production' }, 'unavailable'],
    [{ ...base, INTEGRATIONS_ENV: 'production' }, 'unavailable'],
    [{ ...base, TURNSTILE_SECRET_KEY: '' }, 'unavailable'],
    [{ ...base, TURNSTILE_SECRET_KEY: REAL_SECRET }, 'unavailable'],
    [base, 'cloudflare'],
  ] as [Record<string, string>, string][])('gate %j → %s', (values, mode) => {
    expect(make(values, () => ok()).service.status().mode).toBe(mode);
  });

  it('status exposes only the public site key and test-key label', () => {
    const status = make(base, () => ok()).service.status();
    expect(status).toEqual({
      mode: 'cloudflare',
      siteKey: TEST_SITE,
      testKeys: true,
    });
    expect(JSON.stringify(status)).not.toContain(TEST_SECRET);
  });

  it('test keys: Cloudflare fixed action/hostname/old timestamp are accepted', async () => {
    const { service, verifyMock } = make(base, () => ok());
    await expect(
      service.verify('XXXX.DUMMY.TOKEN.XXXX'),
    ).resolves.toBeUndefined();
    expect(verifyMock).toHaveBeenCalledWith('XXXX.DUMMY.TOKEN.XXXX');
  });

  it.each([
    [
      'success false',
      () => ok({ success: false, 'error-codes': ['timeout-or-duplicate'] }),
      403,
    ],
    [
      'transport failure',
      () => Promise.reject(new Error('TURNSTILE_UNAVAILABLE')),
      503,
    ],
  ])(
    'test keys: %s → %d, single call, no retry',
    async (_name, verify, status) => {
      const { service, verifyMock } = make(
        base,
        verify as () => Promise<TurnstileVerification>,
      );
      await expect(
        service.verify('XXXX.DUMMY.TOKEN.XXXX'),
      ).rejects.toMatchObject({ status });
      expect(verifyMock).toHaveBeenCalledTimes(1);
    },
  );

  it.each([undefined, '', 'x'.repeat(2049)])(
    'malformed token %# never reaches Cloudflare',
    async (token) => {
      const { service, verifyMock } = make(base, () => ok());
      await expect(service.verify(token)).rejects.toMatchObject({
        status: 403,
      });
      expect(verifyMock).not.toHaveBeenCalled();
    },
  );

  describe('real keys enforce action, allowlisted hostname and freshness', () => {
    const real = {
      ...base,
      TURNSTILE_SITE_KEY: REAL_SITE,
      TURNSTILE_SECRET_KEY: REAL_SECRET,
      TURNSTILE_ALLOWED_HOSTNAMES: 'shop.example.vn',
    };
    const fresh = new Date(NOW - 20000).toISOString();
    it('accepts the expected widget', async () => {
      const { service } = make(real, () =>
        ok({
          action: 'contact',
          hostname: 'shop.example.vn',
          challenge_ts: fresh,
        }),
      );
      await expect(service.verify('real-token')).resolves.toBeUndefined();
      expect(service.status()).toMatchObject({
        mode: 'cloudflare',
        testKeys: false,
      });
    });
    it.each([
      [
        'wrong action',
        { action: 'login', hostname: 'shop.example.vn', challenge_ts: fresh },
      ],
      [
        'foreign hostname',
        { action: 'contact', hostname: 'evil.example', challenge_ts: fresh },
      ],
      [
        'stale challenge',
        {
          action: 'contact',
          hostname: 'shop.example.vn',
          challenge_ts: new Date(NOW - 400000).toISOString(),
        },
      ],
      [
        'missing timestamp',
        {
          action: 'contact',
          hostname: 'shop.example.vn',
          challenge_ts: undefined,
        },
      ],
    ])('rejects %s', async (_name, over) => {
      const { service } = make(real, () => ok(over));
      await expect(service.verify('real-token')).rejects.toMatchObject({
        status: 403,
      });
    });
  });

  it('bounds: 300 calls per minute, then 503 without calling Cloudflare', async () => {
    const clock = { now: NOW };
    const { service, verifyMock } = make(base, () => ok(), clock);
    for (let i = 0; i < 300; i++) await service.verify('XXXX.DUMMY.TOKEN.XXXX');
    await expect(service.verify('XXXX.DUMMY.TOKEN.XXXX')).rejects.toMatchObject(
      { status: 503 },
    );
    expect(verifyMock).toHaveBeenCalledTimes(300);
    clock.now += 60000;
    await expect(
      service.verify('XXXX.DUMMY.TOKEN.XXXX'),
    ).resolves.toBeUndefined();
  });

  it('bounds: at most 16 in flight', async () => {
    let release!: () => void;
    const gate = new Promise<void>((r) => (release = r));
    const { service, verifyMock } = make(base, async () => {
      await gate;
      return ok();
    });
    const pending = Array.from({ length: 16 }, () =>
      service.verify('XXXX.DUMMY.TOKEN.XXXX'),
    );
    await expect(service.verify('XXXX.DUMMY.TOKEN.XXXX')).rejects.toMatchObject(
      { status: 503 },
    );
    release();
    await Promise.all(pending);
    expect(verifyMock).toHaveBeenCalledTimes(16);
  });

  describe('production', () => {
    const production = {
      ...base,
      NODE_ENV: 'production',
      INTEGRATIONS_ENV: 'production',
      TURNSTILE_SITE_KEY: REAL_SITE,
      TURNSTILE_SECRET_KEY: REAL_SECRET,
      TURNSTILE_ALLOWED_HOSTNAMES: 'shop.example.vn',
    };
    const fresh = new Date(NOW - 20000).toISOString();
    const result = (action: string) => () =>
      ok({ action, hostname: 'shop.example.vn', challenge_ts: fresh });

    it('runs with real keys and an allowed hostname', () => {
      expect(make(production, () => ok()).service.status()).toMatchObject({
        mode: 'cloudflare',
        testKeys: false,
      });
    });
    it('stays closed with test keys, which always pass', () => {
      const { service } = make(
        {
          ...production,
          TURNSTILE_SITE_KEY: TEST_SITE,
          TURNSTILE_SECRET_KEY: TEST_SECRET,
        },
        () => ok(),
      );
      expect(service.status()).toEqual({ mode: 'unavailable' });
    });
    it('stays closed without an allowed hostname', () => {
      const { service } = make(
        { ...production, TURNSTILE_ALLOWED_HOSTNAMES: '' },
        () => ok(),
      );
      expect(service.status()).toEqual({ mode: 'unavailable' });
    });
    it('is off under the kill switch', () => {
      const { service } = make(
        { ...production, INTEGRATIONS_KILL_SWITCH: 'true' },
        () => ok(),
      );
      expect(service.status()).toEqual({ mode: 'disabled' });
    });
    it('accepts a checkout token for checkout', async () => {
      const { service } = make(production, result('checkout'));
      await expect(
        service.verify('real-token', undefined, 'checkout'),
      ).resolves.toBeUndefined();
    });
    it('refuses a token issued for a different form', async () => {
      const { service } = make(production, result('contact'));
      await expect(
        service.verify('real-token', undefined, 'checkout'),
      ).rejects.toMatchObject({ status: 403 });
    });
  });

  it('mock challenge issuing is refused in cloudflare mode', () => {
    expect(() =>
      make(base, () => ok()).service.issue('http://localhost:4400'),
    ).toThrow();
  });

  it('logs outcome and Cloudflare codes only — never token or secret', async () => {
    const log = jest.spyOn(Logger.prototype, 'log');
    const { service } = make(
      {
        ...base,
        TURNSTILE_SITE_KEY: REAL_SITE,
        TURNSTILE_SECRET_KEY: REAL_SECRET,
        TURNSTILE_ALLOWED_HOSTNAMES: 'shop.example.vn',
      },
      () =>
        ok({
          success: false,
          'error-codes': ['invalid-input-response', 'Raw <script> TEXT'],
        }),
    );
    await expect(
      service.verify('PRIVATE_TOKEN_SENTINEL'),
    ).rejects.toMatchObject({ status: 403 });
    const logged = JSON.stringify(log.mock.calls);
    expect(logged).toContain('invalid-input-response');
    expect(logged).not.toMatch(/SENTINEL|Raw <script>/);
  });
});

describe('Contacts HTTP with real DI and a fake Cloudflare transport', () => {
  let app: INestApplication;
  let server: Server;
  const create = jest
    .fn<Promise<unknown>, [Record<string, unknown>]>()
    .mockResolvedValue({ success: true });
  // Fake Cloudflare injected through DI; the global Jest guard blocks real fetch.
  const fetchSpy = jest.fn(
    (_url: string | URL | Request, init?: RequestInit) => {
      const body = new URLSearchParams(
        (init?.body as URLSearchParams).toString(),
      );
      const success = body.get('response') === 'XXXX.DUMMY.TOKEN.XXXX';
      return Promise.resolve(
        new Response(
          JSON.stringify({
            success,
            action: 'test',
            hostname: 'localhost',
            'error-codes': success ? [] : ['invalid-input-response'],
          }),
          { status: 200 },
        ),
      );
    },
  );
  beforeAll(async () => {
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
    const module = await Test.createTestingModule({ imports: [ContactsModule] })
      .overrideProvider(TURNSTILE_TRANSPORT)
      .useValue(fetchSpy)
      .overrideProvider(ConfigService)
      .useValue(new ConfigService(base))
      .overrideProvider(ContactsService)
      .useValue({ create })
      .overrideProvider(SupabaseService)
      .useValue({ getClient: () => ({}) })
      .compile();
    app = module.createNestApplication({ logger: false });
    await app.listen(0, '127.0.0.1');
    server = app.getHttpServer() as Server;
  });
  afterAll(async () => {
    await app.close();
  });
  const form = {
    full_name: 'Khách thử',
    email: 'qa@example.invalid',
    message: 'Nội dung thử nghiệm đủ dài.',
  };

  it('status advertises cloudflare with the public test site key only', async () => {
    const res = await request(server).get('/contacts/protection').expect(200);
    expect(res.body).toEqual({
      mode: 'cloudflare',
      siteKey: TEST_SITE,
      testKeys: true,
    });
  });
  it('valid dummy token: one siteverify POST with secret+response only, then saved', async () => {
    fetchSpy.mockClear();
    await request(server)
      .post('/contacts')
      .send({ ...form, turnstileToken: 'XXXX.DUMMY.TOKEN.XXXX' })
      .expect(201);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(
      'https://challenges.cloudflare.com/turnstile/v0/siteverify',
    );
    expect(
      [
        ...new URLSearchParams(
          (init.body as URLSearchParams).toString(),
        ).keys(),
      ].sort(),
    ).toEqual(['response', 'secret']);
    expect(init.redirect).toBe('error');
    expect(create).toHaveBeenCalledTimes(1);
    expect(create.mock.calls[0][0]).not.toHaveProperty('turnstileToken');
  });
  it('rejected or missing token: 403 and nothing saved', async () => {
    create.mockClear();
    await request(server)
      .post('/contacts')
      .send({ ...form, turnstileToken: 'forged' })
      .expect(403);
    await request(server).post('/contacts').send(form).expect(403);
    expect(create).not.toHaveBeenCalled();
  });
  it('mock challenge route is closed in cloudflare mode', async () => {
    await request(server)
      .post('/contacts/protection/challenge')
      .set('Origin', 'http://localhost:4400')
      .expect(503);
  });
});

describe('Jest network guard', () => {
  it('blocks any real fetch outside loopback before a socket opens', async () => {
    await expect(
      fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
        method: 'POST',
      }),
    ).rejects.toThrow('TEST_EXTERNAL_FETCH_BLOCKED:challenges.cloudflare.com');
  });
});
