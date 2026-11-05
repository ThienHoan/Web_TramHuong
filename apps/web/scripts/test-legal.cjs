// Render actual policy routes and controls with only routing/locale facades.
const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const ts = require('typescript'), React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
let locale = 'vi';
const cache = new Map();
function load(relative) {
  if (cache.has(relative)) return cache.get(relative);
  const file = path.join(__dirname, '../src', relative);
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  vm.runInNewContext(code, { exports, require(name) {
    if (name === 'next-intl') return { useLocale: () => locale };
    if (name === 'next/navigation') return { notFound: () => { throw new Error('NOT_FOUND'); } };
    if (name === '@/i18n/routing') return { Link: ({ children, ...props }) => React.createElement('a', props, children) };
    if (name === '@/components/brand/BrandIdentity') return { BrandLockup: () => React.createElement('span', {}, 'Thiên Phúc') };
    if (name === '@/lib/legal') return load('lib/legal.ts');
    if (name === '@/components/legal/LegalLinks') return load('components/legal/LegalLinks.tsx');
    return require(name);
  } });
  cache.set(relative, exports); return exports;
}
const content = load('lib/legal.ts');
const page = load('app/[locale]/policies/[policy]/page.tsx');
for (const language of ['vi', 'en']) {
  for (const policy of content.POLICY_KEYS) {
    test(`${language}/${policy} renders a truthful draft with request and policy links`, async () => {
      locale = language;
      const html = renderToStaticMarkup(await page.default({ params: Promise.resolve({ locale: language, policy }) }));
      assert.ok(html.includes(content.POLICY_TITLES[policy][language]));
      assert.ok(html.includes(content.LEGAL_POLICY_VERSION));
      assert.match(html, language === 'vi' ? /Bản nháp/ : /Draft for local review/);
      assert.match(html, /href="\/contact"/);
      for (const key of content.POLICY_KEYS) assert.ok(html.includes(`/policies/${key}`));
      assert.equal(page.metadata.robots.index, false);
    });
  }
}
test('unknown policy routes return 404 instead of arbitrary content', async () => {
  await assert.rejects(page.default({ params: Promise.resolve({ locale: 'vi', policy: 'unapproved' }) }), /NOT_FOUND/);
});
for (const purpose of ['contact', 'order', 'account', 'partnership']) {
  test(`${purpose}: explicit unchecked consent, separate purpose and accessible privacy link`, () => {
    locale = 'en';
    const { LegalConsent } = load('components/legal/LegalConsent.tsx');
    const html = renderToStaticMarkup(React.createElement(LegalConsent, { purpose, checked: false, onChange() {} }));
    assert.match(html, /type="checkbox"/);
    assert.match(html, /required=""/);
    assert.doesNotMatch(html, /checked=""/);
    assert.match(html, /does not subscribe you/);
    assert.match(html, /href="\/policies\/privacy"/);
    assert.ok(html.includes(`for="legal-${purpose}"`));
  });
}
test('web and API enforce the same policy version', () => {
  const server = fs.readFileSync(path.join(__dirname, '../../api/src/legal/legal-acceptance.ts'), 'utf8');
  const version = server.match(/LEGAL_POLICY_VERSION\s*=\s*['"]([^'"]+)['"]/)[1];
  assert.equal(content.legalAcceptance().version, version);
  assert.equal(content.legalAcceptance().accepted, true);
});
