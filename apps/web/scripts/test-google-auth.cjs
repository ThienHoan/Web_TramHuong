// Executes the real callback/return helpers with injected Next/Supabase/cookies.
// No browser, credentials, network, account creation or real session exchange.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
function compile(file) {
  return ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src/', file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
}
const helpers = {};
vm.runInNewContext(compile('lib/oauth-return.ts'), { exports: helpers, URL });
const callbackCode = compile('app/auth/callback/route.ts');
function load(options = {}) {
  const exports = {}, exchanges = [], writes = [], logs = [];
  const env = {
    NODE_ENV: options.nodeEnv ?? 'production', NEXT_PUBLIC_SITE_URL: options.site ?? 'https://shop.example.org',
    NEXT_PUBLIC_SUPABASE_URL: 'https://fixture.example.invalid', NEXT_PUBLIC_SUPABASE_ANON_KEY: 'synthetic-public',
  };
  vm.runInNewContext(callbackCode, {
    exports, URL, process: { env }, console: { error: (...args) => logs.push(args) },
    require: name => {
      if (name === '@/lib/oauth-return') return helpers;
      if (name === 'next/server') return { NextResponse: { redirect: url => ({ location: String(url), status: 307 }) } };
      if (name === 'next/headers') return { cookies: async () => ({
        getAll: () => [{ name: 'pkce', value: 'synthetic-verifier' }],
        set: (...args) => { if (options.cookieError) throw new Error('SECRET_COOKIE_ERROR'); writes.push(args); },
      }) };
      if (name === '@supabase/ssr') return { createServerClient: (_url, _key, config) => ({ auth: {
        exchangeCodeForSession: async code => {
          exchanges.push(code);
          if (options.throwExchange) throw new Error('SECRET_EXCHANGE_ERROR');
          if (options.error) return { data: { session: null }, error: { message: 'SECRET_PROVIDER_ERROR' } };
          config.cookies.setAll([{ name: 'session', value: 'synthetic-session', options: { httpOnly: true, secure: true, sameSite: 'lax', path: '/' } }]);
          return { data: { session: options.noSession ? null : { access_token: 'synthetic-session' } }, error: null };
        },
      } }) };
      throw new Error(`UNEXPECTED_DEPENDENCY:${name}`);
    },
  });
  return { GET: exports.GET, exchanges, writes, logs };
}

for (const value of ['https://outside.example', '//outside.example', '/\\outside.example', '/%2foutside.example', '/%5coutside.example', '/%0d%0aLocation:outside', '/\tout', ' /vi', '/bad%escape']) {
  test(`rejects unsafe OAuth return ${JSON.stringify(value)}`, () => {
    assert.equal(helpers.safeOAuthReturnPath(value, 'vi'), '/vi');
  });
}
test('preserves internal locale/path/query and supports empty-return fallback', () => {
  assert.equal(helpers.safeOAuthReturnPath('/vi/checkout?step=2#payment'), '/vi/checkout?step=2#payment');
  assert.equal(helpers.safeOAuthReturnPath('/en/products/vong-tay'), '/en/products/vong-tay');
  assert.equal(helpers.safeOAuthReturnPath(null), '/en');
  assert.equal(helpers.safeOAuthReturnPath('/' + 'x'.repeat(2048)), '/en');
});
test('builds callback for the active supported locale without a second session system', () => {
  for (const locale of ['vi', 'en', 'unsupported']) {
    const url = new URL(helpers.oauthCallbackUrl('http://localhost:3000', locale));
    assert.equal(url.origin, 'http://localhost:3000');
    assert.equal(url.pathname, '/auth/callback');
    assert.equal(url.searchParams.get('next'), locale === 'vi' ? '/vi' : '/en');
  }
});
test('keeps local development origin and validates production canonical origin', () => {
  assert.equal(helpers.oauthRedirectOrigin('http://localhost:3000/auth/callback', 'https://production.example', 'development'), 'http://localhost:3000');
  for (const invalid of ['http://shop.example.org', 'https://user:pass@shop.example.org', 'https://shop.example.org/path', 'https://shop.example.org?secret=1']) {
    assert.throws(() => helpers.oauthRedirectOrigin('https://internal.example/auth/callback', invalid, 'production'));
  }
});
test('valid PKCE exchange sets original cookie options and ignores forged forwarded origin', async () => {
  const { GET, exchanges, writes } = load();
  const result = await GET(new Request('https://internal.example/auth/callback?code=fixture-code&next=%2Fvi%2Fcheckout', { headers: {
    'x-forwarded-host': 'outside.example', 'x-forwarded-proto': 'http',
  } }));
  assert.equal(result.location, 'https://shop.example.org/vi/checkout');
  assert.deepEqual(exchanges, ['fixture-code']);
  assert.deepEqual(writes, [['session', 'synthetic-session', { httpOnly: true, secure: true, sameSite: 'lax', path: '/' }]]);
});
test('missing code never attempts session exchange', async () => {
  const { GET, exchanges } = load();
  const result = await GET(new Request('https://internal.example/auth/callback'));
  assert.equal(result.location, 'https://shop.example.org/auth/auth-code-error');
  assert.equal(exchanges.length, 0);
});
for (const options of [{ error: true }, { throwExchange: true }, { noSession: true }, { cookieError: true }]) {
  test(`invalid/ambiguous exchange never reports successful login ${JSON.stringify(options)}`, async () => {
    const { GET, exchanges, logs } = load(options);
    const result = await GET(new Request('https://internal.example/auth/callback?code=fixture-code&next=%2Fvi'));
    assert.equal(result.location, 'https://shop.example.org/auth/auth-code-error');
    assert.equal(exchanges.length, 1);
    assert.equal(JSON.stringify(logs).includes('SECRET'), false);
    assert.equal(JSON.stringify(logs).includes('synthetic-session'), false);
  });
}
test('replayed/expired code rejected by Supabase is not retried or accepted', async () => {
  const { GET, exchanges } = load({ error: true });
  const request = new Request('https://internal.example/auth/callback?code=expired-code');
  const result = await GET(request);
  assert.equal(result.location.endsWith('/auth/auth-code-error'), true);
  assert.equal(exchanges.length, 1);
});
