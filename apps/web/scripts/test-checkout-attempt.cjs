// Client side of checkout idempotency: one key per buyer intent, kept across
// retries until the API confirms the order. Run: node scripts/test-checkout-attempt.cjs
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const { webcrypto } = require('node:crypto');

const transpile = (file) =>
  ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src', file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;

class MemoryStorage {
  constructor() { this.map = new Map(); this.failWrites = false; }
  getItem(k) { return this.map.has(k) ? this.map.get(k) : null; }
  setItem(k, v) { if (this.failWrites) throw new Error('QuotaExceededError'); this.map.set(k, String(v)); }
  removeItem(k) { this.map.delete(k); }
}

function load({ fetchImpl, pathname = '/vi/checkout' } = {}) {
  const sessionStorage = new MemoryStorage();
  const context = {
    window: { sessionStorage, location: { pathname } },
    crypto: webcrypto, TextEncoder, Uint8Array, Promise, Map, JSON, Error, TypeError, Array, Set, console,
    fetch: fetchImpl,
  };
  context.globalThis = context;
  vm.createContext(context);
  const run = (code, requireMap) => {
    const module = { exports: {} };
    vm.runInContext(`(function (exports, require, module) {${code}\n})`, context)(module.exports, (id) => {
      if (id in requireMap) return requireMap[id];
      throw new Error('UNEXPECTED_REQUIRE:' + id);
    }, module);
    return module.exports;
  };
  const attempt = run(transpile('lib/checkout-attempt.ts'), {});
  const service = run(transpile('services/order-service.ts'), {
    './base-http': { getHeaders: () => ({ 'Content-Type': 'application/json' }), API_URL: 'http://api.test/api' },
    '../types/order': {},
    '../lib/checkout-attempt': attempt,
  });
  return { attempt, orderService: service.orderService, sessionStorage };
}

const order = (over = {}) => ({
  items: [{ productId: '00000000-0000-4000-8000-000000000011', quantity: 1 }],
  shipping_info: { name: 'A', phone: '0900000000', address: 'Street', city: 'Huế' },
  paymentMethod: 'cod',
  legalAcceptance: { accepted: true, version: 'v1' },
  ...over,
});
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

test('same buyer intent reuses one key; a different intent gets a new key', async () => {
  const { attempt, sessionStorage } = load();
  const a = await attempt.prepareCheckoutAttempt(order(), null, sessionStorage, webcrypto);
  const b = await attempt.prepareCheckoutAttempt(order(), null, sessionStorage, webcrypto);
  assert.match(a, UUID);
  assert.equal(b, a);
  const reordered = order({ items: [
    { productId: '00000000-0000-4000-8000-000000000012', quantity: 2 },
    { productId: '00000000-0000-4000-8000-000000000011', quantity: 1 },
  ] });
  const swapped = order({ items: [...reordered.items].reverse() });
  const c = await attempt.prepareCheckoutAttempt(reordered, null, sessionStorage, webcrypto);
  assert.notEqual(c, a);
  assert.equal(await attempt.prepareCheckoutAttempt(swapped, null, sessionStorage, webcrypto), c);
  assert.notEqual(await attempt.prepareCheckoutAttempt(order({ voucherCode: 'SALE' }), null, sessionStorage, webcrypto), a);
  assert.notEqual(await attempt.prepareCheckoutAttempt(order(), '00000000-0000-4000-8000-000000000021', sessionStorage, webcrypto), a);
});

test('a new checkout replaces completed attempts but keeps uncertain ones', async () => {
  const { attempt, sessionStorage } = load();
  const done = await attempt.prepareCheckoutAttempt(order(), null, sessionStorage, webcrypto);
  const uncertain = await attempt.prepareCheckoutAttempt(order({ paymentMethod: 'sepay' }), null, sessionStorage, webcrypto);
  attempt.completeCheckoutAttempt(done, sessionStorage);
  attempt.beginCheckoutAttempt(sessionStorage);
  const again = await attempt.prepareCheckoutAttempt(order(), null, sessionStorage, webcrypto);
  assert.notEqual(again, done, 'buying the same cart again after a confirmed order needs a fresh key');
  assert.equal(await attempt.prepareCheckoutAttempt(order({ paymentMethod: 'sepay' }), null, sessionStorage, webcrypto), uncertain);
});

test('storage problems stop checkout before any order request', async () => {
  const { attempt, sessionStorage } = load();
  sessionStorage.setItem('tp.checkout.attempts.v1', '{"not":"a list"}');
  await assert.rejects(() => attempt.prepareCheckoutAttempt(order(), null, sessionStorage, webcrypto), /CHECKOUT_STORAGE_UNAVAILABLE/);
  const full = load();
  for (let i = 0; i < 50; i++)
    await full.attempt.prepareCheckoutAttempt(order({ shipping_info: { ...order().shipping_info, name: 'N' + i } }), null, full.sessionStorage, webcrypto);
  await assert.rejects(() => full.attempt.prepareCheckoutAttempt(order(), null, full.sessionStorage, webcrypto), /CHECKOUT_STORAGE_UNAVAILABLE/);
  const blocked = load();
  blocked.sessionStorage.failWrites = true;
  await assert.rejects(() => blocked.attempt.prepareCheckoutAttempt(order(), null, blocked.sessionStorage, webcrypto));
});

test('double submit sends one request; a network failure keeps the key for a safe retry', async () => {
  const bodies = [];
  let mode = 'hang';
  let release;
  const fetchImpl = (url, init) => {
    bodies.push(JSON.parse(init.body));
    if (mode === 'network') return Promise.reject(new TypeError('Failed to fetch'));
    if (mode === 'conflict') return Promise.resolve({ ok: false, json: () => Promise.resolve({ message: 'CHECKOUT_OUT_OF_STOCK' }) });
    return new Promise((resolve) => { release = () => resolve({ ok: true, json: () => Promise.resolve({ id: 'order-1' }) }); });
  };
  const { orderService, sessionStorage } = load({ fetchImpl });
  const first = orderService.createOrder(order(), null);
  const second = orderService.createOrder(order(), null);
  await new Promise((r) => setTimeout(r, 20));
  assert.equal(bodies.length, 1, 'second click must join the in-flight request');
  release();
  assert.deepEqual(await first, { id: 'order-1' });
  assert.deepEqual(await second, { id: 'order-1' });
  assert.match(bodies[0].idempotencyKey, UUID);

  mode = 'network';
  await assert.rejects(() => orderService.createOrder(order({ paymentMethod: 'sepay' }), null), /Chưa xác nhận được kết quả đặt hàng/);
  mode = 'conflict';
  await assert.rejects(() => orderService.createOrder(order({ paymentMethod: 'sepay' }), null), /vừa hết hàng/);
  assert.equal(bodies[2].idempotencyKey, bodies[1].idempotencyKey, 'retry after an unknown result must reuse the key');
  const stored = JSON.parse(sessionStorage.getItem('tp.checkout.attempts.v1'));
  assert.equal(stored.find((d) => d.key === bodies[0].idempotencyKey).completed, true);
  assert.equal(stored.find((d) => d.key === bodies[1].idempotencyKey).completed, false);
});

test('error codes become customer messages in both languages', () => {
  const { attempt } = load();
  assert.match(attempt.checkoutErrorMessage('CHECKOUT_VOUCHER_UNAVAILABLE'), /Mã ưu đãi/);
  assert.match(attempt.checkoutErrorMessage('CHECKOUT_VOUCHER_UNAVAILABLE', true), /voucher/);
  assert.match(attempt.checkoutErrorMessage('CHECKOUT_RESULT_UNKNOWN', true), /Retry with the same details/);
  assert.equal(attempt.checkoutErrorMessage('SOMETHING_NEW'), 'SOMETHING_NEW');
});
