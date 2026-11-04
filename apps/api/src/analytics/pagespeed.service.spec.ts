import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { loadIntegrationRegistry } from '../integrations/integrations.config';
import {
  IntegrationExecutor,
  IntegrationFailure,
} from '../integrations/integration-executor';
import {
  MockPagespeedAdapter,
  PAGESPEED_TARGETS,
  type PagespeedMockAdapter,
  type PagespeedRequest,
} from './pagespeed.adapter';
import { PagespeedService, pagespeedThresholds } from './pagespeed.service';
const DAY = 86400000,
  NOW = Date.parse('2026-11-05T00:00:00Z');
function fixture(
  options: {
    adapter?: PagespeedMockAdapter;
    flags?: Record<string, string>;
    env?: string;
    budget?: number;
  } = {},
) {
  let now = NOW;
  const registry = loadIntegrationRegistry(
    new ConfigService({
      FEATURE_PAGESPEED_AUDIT_ENABLED: 'true',
      ...options.flags,
    }),
  );
  const adapter = options.adapter ?? new MockPagespeedAdapter(() => now);
  const executor = new IntegrationExecutor(
    registry,
    { requestsPerMinute: 1000, mockDailyLimit: options.budget ?? 1000 },
    () => now,
    async () => {},
    () => 0,
  );
  const service = new PagespeedService(
    registry,
    options.env ?? 'test',
    executor,
    adapter,
    () => now,
  );
  return {
    service,
    adapter,
    executor,
    advance: (ms: number) => {
      now += ms;
    },
  };
}
function latest(service: PagespeedService, strategy = 'mobile') {
  return service
    .summary()
    .reports.find((r) => r.targetId === 'home_vi' && r.strategy === strategy)!;
}
describe('PageSpeed bounded mock diagnostics', () => {
  beforeAll(() => {
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
  });
  afterAll(() => jest.restoreAllMocks());
  it.each([
    [{ FEATURE_PAGESPEED_AUDIT_ENABLED: 'false' }, 'test', 'disabled'],
    [{ INTEGRATIONS_KILL_SWITCH: 'true' }, 'test', 'disabled'],
    [{ INTEGRATIONS_ENV: 'staging' }, 'test', 'blocked'],
    [{ INTEGRATIONS_ENV: 'production' }, 'test', 'blocked'],
    [{}, 'production', 'blocked'],
    [{}, '', 'blocked'],
  ])('prevents execution %j %s', async (flags, env, mode) => {
    const audit = jest.fn();
    const { service } = fixture({ adapter: { audit }, flags, env });
    expect(service.summary()).toMatchObject({
      mode,
      schedulerEnabled: false,
      running: false,
    });
    await expect(service.audit('home_vi', 'mobile')).rejects.toThrow(
      'PAGESPEED_NOT_EXECUTABLE',
    );
    expect(audit).not.toHaveBeenCalled();
  });
  it('GET never audits; exactly six fixed safe targets, no private/transaction URLs', () => {
    const audit = jest.fn();
    const report = fixture({ adapter: { audit } }).service.summary();
    expect(report.targets).toHaveLength(6);
    expect(report.reports).toHaveLength(12);
    expect(
      report.reports.every(
        (r) => r.latest === null && r.freshness === 'never_audited',
      ),
    ).toBe(true);
    for (const target of report.targets) {
      expect(new URL(target.url).origin).toBe('https://mock.example.invalid');
      expect(target.url).not.toMatch(
        /[?#@]|checkout|account|order-confirmation|localhost/,
      );
    }
    expect(audit).not.toHaveBeenCalled();
  });
  it.each([
    'https://real.example/',
    'http://127.0.0.1',
    'home_vi?email=secret',
    '../checkout',
    '__proto__',
  ])('rejects nonwhitelist target %s before executor', async (target) => {
    const audit = jest.fn();
    await expect(
      fixture({ adapter: { audit } }).service.audit(target, 'mobile'),
    ).rejects.toThrow('PAGESPEED_TARGET_NOT_ALLOWED');
    expect(audit).not.toHaveBeenCalled();
  });
  it('collects separate mobile/desktop reports with all four explicit categories', async () => {
    const f = fixture();
    const spy = jest.spyOn(f.adapter, 'audit');
    await f.service.audit('home_vi', 'mobile');
    await f.service.audit('home_vi', 'desktop');
    expect(spy.mock.calls[0][0]).toMatchObject({
      strategy: 'mobile',
      categories: ['performance', 'accessibility', 'best-practices', 'seo'],
    });
    expect(latest(f.service).latest?.lab.performanceScore).not.toBe(
      latest(f.service, 'desktop').latest?.lab.performanceScore,
    );
    expect(latest(f.service).latest?.field).toEqual({
      status: 'unavailable',
      lcpMs: null,
      inpMs: null,
      cls: null,
      reason: 'MOCK_HAS_NO_FIELD_DATA',
    });
    expect(latest(f.service).latest?.lab.tbtMs).toBeGreaterThan(0);
    expect(JSON.stringify(f.service.summary())).not.toContain('numericValue');
  });
  it('serves the 24h cache without an extra attempt or history sample', async () => {
    const f = fixture();
    const spy = jest.spyOn(f.adapter, 'audit');
    expect((await f.service.audit('home_vi', 'mobile')).result).toBe(
      'recorded',
    );
    f.advance(DAY - 1);
    expect((await f.service.audit('home_vi', 'mobile')).result).toBe('cached');
    expect(spy).toHaveBeenCalledTimes(1);
    expect(latest(f.service).history).toHaveLength(1);
    f.advance(1);
    expect(latest(f.service).freshness).toBe('stale');
    expect((await f.service.audit('home_vi', 'mobile')).result).toBe(
      'recorded',
    );
    expect(spy).toHaveBeenCalledTimes(2);
  });
  it('compares only consecutive same-strategy/version samples and detects all configured regressions', async () => {
    const f = fixture();
    await f.service.audit('home_vi', 'mobile');
    expect(latest(f.service).comparison.status).toBe('no_baseline');
    f.advance(DAY);
    await f.service.audit('home_vi', 'mobile');
    expect(latest(f.service).comparison.status).toBe('comparable');
    expect(latest(f.service).comparison.alerts.map((a) => a.metric)).toEqual([
      'performanceScore',
      'lcpMs',
      'cls',
      'tbtMs',
    ]);
    expect(latest(f.service, 'desktop').comparison.status).toBe('no_baseline');
  });
  it('caps retained history to 30 samples per pair and restart clears it', async () => {
    const f = fixture();
    for (let i = 0; i < 32; i++) {
      await f.service.audit('home_vi', 'mobile');
      f.advance(DAY);
    }
    expect(latest(f.service).history).toHaveLength(30);
    expect(latest(fixture().service).history).toEqual([]);
  });
  it('does not compare a baseline older than seven days', async () => {
    const f = fixture();
    await f.service.audit('home_vi', 'mobile');
    f.advance(8 * DAY);
    await f.service.audit('home_vi', 'mobile');
    expect(latest(f.service).comparison).toEqual({
      status: 'baseline_too_old',
      alerts: [],
    });
  });
  it('does not compare a changed Lighthouse version', async () => {
    const f = fixture();
    await f.service.audit('home_vi', 'mobile');
    f.advance(DAY);
    const original = f.adapter.audit.bind(f.adapter);
    jest.spyOn(f.adapter, 'audit').mockImplementation(async (req, signal) => {
      const raw = (await original(req, signal)) as {
        lighthouseResult: { lighthouseVersion: string };
      };
      raw.lighthouseResult.lighthouseVersion = '14.0.0-mock';
      return raw;
    });
    await f.service.audit('home_vi', 'mobile');
    expect(latest(f.service).comparison).toEqual({
      status: 'version_changed',
      alerts: [],
    });
  });
  it('missing and errored numeric audits stay null and never fake INP or CWV success', async () => {
    const base = new MockPagespeedAdapter(() => NOW);
    const audit = async (req: PagespeedRequest, signal: AbortSignal) => {
      const raw = (await base.audit(req, signal)) as {
        lighthouseResult: Record<string, unknown>;
        loadingExperience?: unknown;
      };
      raw.lighthouseResult.audits = {
        'total-blocking-time': {
          scoreDisplayMode: 'error',
          errorMessage: 'RAW_ERROR_SENTINEL',
          numericValue: 'bad',
        },
      };
      raw.lighthouseResult.categories = { performance: { score: null } };
      raw.loadingExperience = {
        metrics: { INTERACTION_TO_NEXT_PAINT: { percentile: 10 } },
      }; // ignored until actual PSI field contract accepted
      return raw;
    };
    const { service } = fixture({ adapter: { audit } });
    await service.audit('home_vi', 'mobile');
    expect(latest(service).latest?.lab).toEqual({
      performanceScore: null,
      accessibilityScore: null,
      bestPracticesScore: null,
      seoScore: null,
      lcpMs: null,
      cls: null,
      tbtMs: null,
    });
    expect(latest(service).latest?.field.inpMs).toBeNull();
    expect(JSON.stringify(service.summary())).not.toContain(
      'RAW_ERROR_SENTINEL',
    );
  });
  it('retains previous history and safe error on failed audit', async () => {
    const f = fixture();
    await f.service.audit('home_vi', 'mobile');
    const before = latest(f.service).latest;
    f.advance(DAY);
    jest
      .spyOn(f.adapter, 'audit')
      .mockRejectedValue(new IntegrationFailure('REJECTED'));
    await expect(f.service.audit('home_vi', 'mobile')).rejects.toThrow(
      'PAGESPEED_REJECTED',
    );
    expect(latest(f.service)).toMatchObject({
      latest: before,
      lastError: 'REJECTED',
      freshness: 'stale',
    });
    expect(f.service.summary().running).toBe(false);
  });
  it('prevents overlapping audits and releases lock after completion', async () => {
    let release!: (value: unknown) => void;
    const base = new MockPagespeedAdapter(() => NOW);
    const audit = jest.fn((req: PagespeedRequest, signal: AbortSignal) =>
      base.audit(req, signal),
    );
    audit.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          release = resolve;
        }),
    );
    const { service } = fixture({ adapter: { audit } });
    const first = service.audit('home_vi', 'mobile');
    await expect(service.audit('home_en', 'desktop')).rejects.toThrow(
      'PAGESPEED_AUDIT_IN_PROGRESS',
    );
    release(
      await base.audit(
        {
          url: PAGESPEED_TARGETS[0].url,
          strategy: 'mobile',
          categories: ['performance', 'accessibility', 'best-practices', 'seo'],
        },
        new AbortController().signal,
      ),
    );
    await first;
    await expect(service.audit('home_en', 'desktop')).resolves.toHaveProperty(
      'result',
      'recorded',
    );
  });
  it('retries a transient read once through existing executor', async () => {
    const f = fixture();
    const original = f.adapter.audit.bind(f.adapter);
    const spy = jest
      .spyOn(f.adapter, 'audit')
      .mockRejectedValueOnce(new IntegrationFailure('UNAVAILABLE', true))
      .mockImplementation(original);
    await f.service.audit('home_vi', 'mobile');
    expect(spy).toHaveBeenCalledTimes(2);
  });
  it('enforces hard budget before an uncached audit', async () => {
    const f = fixture({ budget: 1 });
    await f.service.audit('home_vi', 'mobile');
    await expect(f.service.audit('home_en', 'mobile')).rejects.toMatchObject({
      status: 429,
    });
    expect(
      f.service
        .summary()
        .reports.find(
          (r) => r.targetId === 'home_en' && r.strategy === 'mobile',
        ),
    ).toMatchObject({ latest: null, lastError: 'QUOTA_EXCEEDED' });
  });
  it.each([
    'redirect',
    'requested_url',
    'timestamp',
    'future_time',
    'version',
    'strategy',
    'score',
    'numeric',
    'unit',
    'runtime',
    'captcha',
  ])('rejects %s without storing raw payload', async (kind) => {
    const base = new MockPagespeedAdapter(() => NOW);
    const audit = async (req: PagespeedRequest, signal: AbortSignal) => {
      const raw = (await base.audit(req, signal)) as {
        captchaResult: string;
        lighthouseResult: Record<string, unknown>;
      };
      const lhr = raw.lighthouseResult;
      if (kind === 'redirect')
        lhr.finalUrl = 'https://private.invalid/?email=SECRET';
      if (kind === 'requested_url') lhr.requestedUrl = 'http://localhost/';
      if (kind === 'timestamp') lhr.fetchTime = 'bad';
      if (kind === 'future_time')
        lhr.fetchTime = new Date(NOW + DAY).toISOString();
      if (kind === 'version') lhr.lighthouseVersion = 'RAW_ERROR_SENTINEL';
      if (kind === 'strategy') lhr.configSettings = { formFactor: 'desktop' };
      if (kind === 'score') lhr.categories = { performance: { score: 1.1 } };
      if (kind === 'numeric')
        lhr.audits = {
          'largest-contentful-paint': {
            numericValue: NaN,
            numericUnit: 'millisecond',
          },
        };
      if (kind === 'unit')
        lhr.audits = {
          'largest-contentful-paint': {
            numericValue: 3,
            numericUnit: 'second',
          },
        };
      if (kind === 'runtime')
        lhr.runtimeError = {
          code: 'FAILED_DOCUMENT_REQUEST',
          message: 'RAW_ERROR_SENTINEL',
        };
      if (kind === 'captcha') raw.captchaResult = 'CAPTCHA_NEEDED';
      return raw;
    };
    const { service } = fixture({ adapter: { audit } });
    await expect(service.audit('home_vi', 'mobile')).rejects.toThrow(
      'PAGESPEED_INVALID_RESPONSE',
    );
    expect(latest(service).history).toEqual([]);
    expect(JSON.stringify(service.summary())).not.toMatch(
      /SECRET|RAW_ERROR_SENTINEL/,
    );
  });
  it.each(['', 'RAW_ERROR_SENTINEL', '0', '-1', 'Infinity', '101'])(
    'validates threshold input %s without echoing it',
    (value) => {
      expect(() =>
        pagespeedThresholds({
          get: (name) => (name === 'PAGESPEED_SCORE_DROP' ? value : undefined),
        }),
      ).toThrow(
        'PAGESPEED_SCORE_DROP must be a positive number within its allowed range',
      );
    },
  );
  it('accepts explicit configurable thresholds and valid defaults', () => {
    expect(pagespeedThresholds({ get: () => undefined })).toEqual({
      performanceScore: 10,
      lcpMs: 500,
      cls: 0.05,
      tbtMs: 200,
    });
    expect(
      pagespeedThresholds({
        get: (key) => (key === 'PAGESPEED_CLS_INCREASE' ? '0.1' : undefined),
      }).cls,
    ).toBe(0.1);
  });
});
