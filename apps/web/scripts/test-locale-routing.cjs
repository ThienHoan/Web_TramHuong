// Exercise the real middleware and next-intl without Supabase credentials or network.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');
const ts = require('typescript');
const { NextRequest } = require('next/server');

const cache = new Map();
let authCalls = 0;

// Compile local TS and next-intl's ESM with the same Next module resolution.
// Everything else, including NextRequest/NextResponse and bot detection, is real.
function load(filename) {
  if (cache.has(filename)) return cache.get(filename);
  const exports = {};
  cache.set(filename, exports);
  const requireFromFile = createRequire(filename);
  const localRequire = (name) => {
    if (name === '@supabase/ssr') return {
      createServerClient: (_url, _key, { cookies }) => ({
        auth: { getUser: async () => {
          authCalls++;
          cookies.setAll([{ name: 'test-session', value: 'refreshed', options: { path: '/', httpOnly: true } }]);
          return { data: { user: null } };
        } },
      }),
    };
    const resolved = name.startsWith('.') && fs.existsSync(path.resolve(path.dirname(filename), `${name}.ts`))
      ? path.resolve(path.dirname(filename), `${name}.ts`)
      : requireFromFile.resolve(name);
    return resolved.endsWith('.ts') || resolved.includes('/next-intl/dist/esm/')
      ? load(resolved)
      : requireFromFile(name);
  };
  const source = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  new Function('require', 'exports', source)(localRequire, exports);
  return exports;
}

const { middleware } = load(path.join(__dirname, '../src/middleware.ts'));
const { routing } = load(path.join(__dirname, '../src/i18n/routing.ts'));
const syncLocaleCookie = load(path.join(path.dirname(require.resolve('next-intl/middleware')), 'navigation/shared/syncLocaleCookie.js')).default;

function request(pathname, language, cookie, agent = 'Mozilla/5.0') {
  const headers = { 'user-agent': agent };
  if (language !== null) headers['accept-language'] = language;
  if (cookie) headers.cookie = cookie;
  return new NextRequest(`https://shop.example${pathname}`, { headers });
}

const rootCases = [
  ['Vietnamese first', 'vi-VN,vi;q=0.9,en;q=0.8', null, 'vi'],
  ['Vietnamese after English', 'en-US,en;q=0.9,vi;q=0.1', null, 'vi'],
  ['mixed-case Vietnamese region', 'en, VI-vn;q=0.2', null, 'vi'],
  ['English only', 'en-US,en;q=0.9', null, 'en'],
  ['another language', 'fr-FR,fr;q=0.9', null, 'en'],
  ['missing language header', null, null, 'en'],
  ['Vietnamese explicitly rejected', 'en,vi;q=0', null, 'en'],
  ['invalid Vietnamese quality', 'en,vi;q=oops', null, 'en'],
  ['saved English overrides Vietnamese', 'vi,en;q=0.5', 'NEXT_LOCALE=en', 'en'],
  ['saved Vietnamese overrides English', 'en-US', 'NEXT_LOCALE=vi', 'vi'],
  ['invalid cookie falls back to language', 'en-US', 'NEXT_LOCALE=fr', 'en'],
];

for (const [name, language, cookie, expected] of rootCases) {
  test(`homepage: ${name}`, async () => {
    const callsBefore = authCalls;
    const response = await middleware(request('/?utm_source=test', language, cookie));
    assert.equal(response.status, 307);
    assert.equal(response.headers.get('location'), `https://shop.example/${expected}?utm_source=test`);
    assert.equal(response.headers.get('cache-control'), 'private, no-store');
    for (const header of ['Accept-Language', 'Cookie', 'User-Agent']) {
      assert.ok(response.headers.get('vary').includes(header));
    }
    assert.equal(authCalls, callsBefore, 'homepage redirect must not wait on authentication');
  });
}

for (const agent of [
  'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
  'Googlebot-Image/1.0',
  'Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)',
]) {
  test(`crawler defaults to Vietnamese: ${agent}`, async () => {
    const response = await middleware(request('/', 'en-US', 'NEXT_LOCALE=en', agent));
    assert.equal(response.headers.get('location'), 'https://shop.example/vi');
  });
}

test('explicit locales keep their language despite conflicting preferences', async () => {
  for (const [locale, other] of [['vi', 'en'], ['en', 'vi']]) {
    for (const pathname of [`/${locale}`, `/${locale}/products?sort=price`]) {
      const response = await middleware(request(pathname, other, `NEXT_LOCALE=${other}`));
      assert.equal(response.headers.get('location'), null);
      assert.equal(response.status, 200);
      assert.equal(response.headers.get('x-middleware-request-x-pathname'), pathname.split('?')[0]);
      assert.equal(response.cookies.get('test-session').value, 'refreshed');
    }
  }
});

test('legacy unprefixed pages retain permanent Vietnamese redirects', async () => {
  for (const pathname of ['/products?sort=price', '/policies/privacy']) {
    const response = await middleware(request(pathname, 'en', 'NEXT_LOCALE=en'));
    assert.equal(response.status, 308);
    assert.equal(response.headers.get('location'), `https://shop.example/vi${pathname}`);
    assert.equal(response.cookies.get('test-session').value, 'refreshed');
  }
});

test('OAuth routes bypass language redirects', async () => {
  for (const pathname of ['/auth/callback?code=test', '/auth/auth-code-error']) {
    const response = await middleware(request(pathname, 'en', null));
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('location'), null);
  }
});

test('language switch cookie persists for a year and controls the next homepage visit', async () => {
  const originalDocument = global.document;
  const originalWindow = global.window;
  global.document = { cookie: '' };
  global.window = { location: { pathname: '/vi/products' } };
  try {
    syncLocaleCookie(routing.localeCookie, '/vi/products', 'vi', 'en');
    assert.match(global.document.cookie, /^NEXT_LOCALE=en;/);
    assert.match(global.document.cookie, /max-age=31536000;/);
    assert.match(global.document.cookie, /path=\/;/);
    const cookie = global.document.cookie.split(';')[0];
    const response = await middleware(request('/', 'vi', cookie));
    assert.equal(response.headers.get('location'), 'https://shop.example/en');
  } finally {
    global.document = originalDocument;
    global.window = originalWindow;
  }
});
