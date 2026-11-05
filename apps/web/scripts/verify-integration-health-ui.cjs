// Requires the existing mock-only demo:analytics lab. Does not start AppModule.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const output = path.resolve(__dirname, '../.next/connections-qa');
fs.mkdirSync(output, { recursive: true });
(async () => {
  let browser;
  try { browser = await chromium.launch(); } catch { browser = await chromium.launch({ channel: 'chrome' }); }
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce', serviceWorkers: 'block' });
  const page = await context.newPage();
  const errors = [], external = [];
  let behavior = 'pass', healthRequests = 0;
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (['http:', 'https:'].includes(url.protocol) && !(['localhost', '127.0.0.1'].includes(url.hostname) && ['4400', '4401'].includes(url.port))) {
      external.push(url.origin); return route.abort();
    }
    if (url.pathname === '/api/integrations/admin/health') {
      healthRequests++;
      if (behavior === 'error') return route.fulfill({ status: 503, contentType: 'application/json', body: '{"message":"SYNTHETIC_PRIVATE_ERROR"}' });
      if (behavior === 'delay') await new Promise(resolve => setTimeout(resolve, 1000));
    }
    return route.continue();
  });
  try {
    await page.goto('http://localhost:4400/vi/integration-lab/analytics', { waitUntil: 'networkidle' });
    const panel = page.getByRole('region', { name: 'Kết nối dịch vụ', exact: true });
    await panel.getByRole('heading', { name: 'Cloudflare Turnstile', exact: true }).waitFor();
    assert.equal(await panel.getByRole('listitem').count(), 11);
    assert.equal((await panel.innerText()).includes('SYNTHETIC_PRIVATE_ERROR'), false);
    await panel.screenshot({ path: path.join(output, 'desktop.png') });
    const beforeRefresh = healthRequests;
    await Promise.all([
      page.waitForResponse(response => new URL(response.url()).pathname === '/api/integrations/admin/health'),
      panel.getByRole('button', { name: 'Làm mới', exact: true }).click(),
    ]);
    assert.equal(healthRequests, beforeRefresh + 1);
    await page.setViewportSize({ width: 375, height: 900 });
    await page.waitForTimeout(200);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true);
    assert.ok((await panel.getByRole('button', { name: 'Làm mới', exact: true }).boundingBox()).height >= 44);
    assert.ok(await panel.locator('.admin-status').evaluateAll(nodes => nodes.every(node => parseFloat(getComputedStyle(node).fontSize) >= 12)));
    await panel.screenshot({ path: path.join(output, 'mobile.png') });
    behavior = 'error';
    await panel.getByRole('button', { name: 'Làm mới', exact: true }).click();
    await panel.getByRole('alert').waitFor();
    assert.equal(await panel.getByRole('listitem').count(), 0);
    assert.equal((await panel.innerText()).includes('SYNTHETIC_PRIVATE_ERROR'), false);
    await panel.screenshot({ path: path.join(output, 'error.png') });
    behavior = 'pass';
    await panel.getByRole('button', { name: 'Thử lại', exact: true }).click();
    await panel.getByRole('heading', { name: 'Cloudflare Turnstile', exact: true }).waitFor();
    behavior = 'delay';
    await page.reload({ waitUntil: 'domcontentloaded' });
    await panel.getByRole('status').waitFor();
    assert.equal(await panel.locator('[data-slot="skeleton"]').count(), 11);
    await panel.screenshot({ path: path.join(output, 'loading.png') });
    await panel.getByRole('heading', { name: 'Cloudflare Turnstile', exact: true }).waitFor();
    behavior = 'pass';
    await page.goto('http://localhost:4400/en/integration-lab/analytics', { waitUntil: 'networkidle' });
    const english = page.getByRole('region', { name: 'Service connections', exact: true });
    assert.equal(await english.getByRole('listitem').count(), 11);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true);
    await english.screenshot({ path: path.join(output, 'english-mobile.png') });
    assert.deepEqual(errors, []); assert.deepEqual(external, []);
    const report = { result: 'PASS', viewportWidths: [375, 1440], providers: 11, healthRequests, loadingRows: 11, states: ['ready', 'refresh', 'error', 'retry', 'loading', 'vi', 'en'], horizontalOverflow: false, javascriptErrors: errors, externalRequests: external, providerRequests: 0, hostedDatabaseWrites: 0, fixtureOnly: true };
    fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report));
  } finally { await browser.close(); }
})().catch(error => { console.error(error.message); process.exitCode = 1; });
