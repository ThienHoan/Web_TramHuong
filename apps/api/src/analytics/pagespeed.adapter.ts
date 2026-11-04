export const PAGESPEED_TARGETS = Object.freeze(
  [
    { id: 'home_vi', path: '/vi', kind: 'home', locale: 'vi' },
    { id: 'home_en', path: '/en', kind: 'home', locale: 'en' },
    { id: 'catalog_vi', path: '/vi/products', kind: 'catalog', locale: 'vi' },
    { id: 'catalog_en', path: '/en/products', kind: 'catalog', locale: 'en' },
    {
      id: 'product_vi',
      path: '/vi/products/analytics-fixture',
      kind: 'product',
      locale: 'vi',
    },
    {
      id: 'product_en',
      path: '/en/products/analytics-fixture',
      kind: 'product',
      locale: 'en',
    },
  ].map((target) =>
    Object.freeze({
      ...target,
      url: 'https://mock.example.invalid' + target.path,
    }),
  ),
);
export const PAGESPEED_CATEGORIES = [
  'performance',
  'accessibility',
  'best-practices',
  'seo',
] as const;
export type AuditStrategy = 'mobile' | 'desktop';
export interface PagespeedRequest {
  url: string;
  strategy: AuditStrategy;
  categories: typeof PAGESPEED_CATEGORIES;
}
export interface PagespeedMockAdapter {
  audit(request: PagespeedRequest, signal: AbortSignal): Promise<unknown>;
}

// Pure synthetic response. This adapter has no network client or API key.
export class MockPagespeedAdapter implements PagespeedMockAdapter {
  constructor(private readonly now: () => number = Date.now) {}
  audit(request: PagespeedRequest, signal: AbortSignal): Promise<unknown> {
    if (signal.aborted) return Promise.reject(new Error('ABORTED'));
    const drift = Math.floor(this.now() / 86400000) % 2;
    const mobile = request.strategy === 'mobile';
    return Promise.resolve({
      captchaResult: 'CAPTCHA_NOT_NEEDED',
      lighthouseResult: {
        requestedUrl: request.url,
        finalUrl: request.url,
        lighthouseVersion: '13.0.0-mock',
        fetchTime: new Date(this.now()).toISOString(),
        configSettings: { formFactor: request.strategy },
        categories: {
          performance: { score: (mobile ? 0.86 : 0.96) - drift * 0.15 },
          accessibility: { score: 0.95 },
          'best-practices': { score: 0.96 },
          seo: { score: 0.98 },
        },
        audits: {
          'largest-contentful-paint': {
            numericValue: (mobile ? 2200 : 1200) + drift * 800,
            numericUnit: 'millisecond',
          },
          'cumulative-layout-shift': {
            numericValue: 0.04 + drift * 0.08,
            numericUnit: 'unitless',
          },
          'total-blocking-time': {
            numericValue: (mobile ? 160 : 70) + drift * 250,
            numericUnit: 'millisecond',
          },
        },
      },
    });
  }
}
