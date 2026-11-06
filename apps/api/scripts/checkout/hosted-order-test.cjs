// One synthetic COD order through the REAL OrdersService against the Supabase TEST
// project in apps/api/.env, then a same-key replay, a changed-details conflict and a
// cancel that restores stock. Default is a dry run with zero requests.
//   node scripts/checkout/hosted-order-test.cjs                        (plan only)
//   node scripts/checkout/hosted-order-test.cjs --allow-test-db-writes (real run)
// Never prints the project URL, keys or raw database messages. No SePay/GHN/email call:
// COD, no voucher, no shipping quote, guest buyer with an @example.invalid address.
require('ts-node/register/transpile-only');
const crypto = require('node:crypto');
const { Logger } = require('@nestjs/common');
const { OrdersService } = require('../../src/orders/orders.service');

const MAX_REQUESTS = 16;
const PLAN = [
  'read: one active product with stock >= 2 (id, quantity only)',
  'write: create 1 COD guest order through OrdersService.create (stock -1)',
  'read: stock after create',
  'read-only replay: same key returns the same order, no new write',
  'read-only conflict: same key with a changed address is refused (409)',
  'write: transition_order -> CANCELED (stock +1 via the order trigger)',
  'read: stock after cancel equals the starting stock',
];
const shipping = (address = 'Địa chỉ kiểm thử checkout') => ({
  name: 'Kiểm thử Checkout (tự động)',
  phone: '0900000000',
  address,
  city: 'Thành phố Huế',
  email: 'checkout-test@example.invalid',
});
const code = (error) => {
  const c = String(error?.response?.message ?? error?.message ?? error?.code ?? '');
  return /^[A-Z][A-Z0-9_]{2,60}$/.test(c) ? c : 'ERR';
};

async function run({ client, allowWrites, log = console.log, randomUUID = () => crypto.randomUUID() }) {
  if (!allowWrites) {
    log(JSON.stringify({ mode: 'dry_run', requests: 0, writes: 0, plan: PLAN, enable: '--allow-test-db-writes' }));
    return { result: 'DRY_RUN', requests: 0 };
  }
  let requests = 0;
  const count = () => {
    if (++requests > MAX_REQUESTS) throw new Error('REQUEST_CAP_REACHED');
  };
  const db = {
    from: (...a) => (count(), client.from(...a)),
    rpc: (...a) => (count(), client.rpc(...a)),
  };
  const results = [];
  const check = (name, ok, detail) => results.push({ check: name, status: ok ? 'PASS' : 'FAIL', ...(detail ? { detail } : {}) });
  const stock = async (id) => {
    const r = await db.from('products').select('quantity').eq('id', id).single();
    if (r.error || !r.data) throw new Error('STOCK_READ_FAILED');
    return Number(r.data.quantity);
  };
  const created = new Set();
  let canceled = 0;
  Logger.overrideLogger(false);
  const service = new OrdersService(
    { getClient: () => db },
    { clearCart: () => Promise.resolve() },
    {},
    { validateVoucher: () => Promise.reject(new Error('VOUCHER_NOT_USED')) },
    undefined,
  );
  let start;
  let productId;
  const steps = async () => {
    const pick = await db
      .from('products')
      .select('id,quantity')
      .eq('is_active', true)
      .gte('quantity', 2)
      .order('quantity', { ascending: false })
      .limit(1);
    productId = pick.data?.[0]?.id;
    if (pick.error || !productId) {
      check('pick_product', false, 'NO_ACTIVE_PRODUCT_WITH_STOCK');
      return;
    }
    start = Number(pick.data[0].quantity);
    check('pick_product', true);
    const key = randomUUID();
    const items = () => [{ productId, quantity: 1 }];

    const order = await service.create(null, items(), shipping(), 'cod', undefined, undefined, key);
    created.add(order.id);
    check('create_order', order.status === 'PENDING' && order.payment_method === 'cod' && Number(order.total) > 0);
    check('stock_minus_one', (await stock(productId)) === start - 1);

    const replay = await service.create(null, items(), shipping(), 'cod', undefined, undefined, key);
    created.add(replay.id);
    check('replay_same_order', replay.id === order.id);
    check('replay_no_second_deduction', (await stock(productId)) === start - 1);

    const conflict = await service
      .create(null, items(), shipping('Địa chỉ khác'), 'cod', undefined, undefined, key)
      .then(
        (unexpected) => (created.add(unexpected.id), 'ALLOWED'),
        (e) => code(e),
      );
    check('changed_details_refused', conflict === 'CHECKOUT_KEY_CONFLICT', conflict);
  };
  try {
    await steps();
  } catch (error) {
    check('unexpected_error', false, code(error));
  } finally {
    for (const id of created) {
      try {
        const r = await db.rpc('transition_order', { p_id: id, p_status: 'CANCELED', p_expected_status: 'PENDING' });
        if (!r.error) canceled++;
        else check('cancel_order', false, /^[A-Z0-9]{5}$/.test(String(r.error.code)) ? r.error.code : 'ERR');
      } catch (error) {
        check('cancel_order', false, code(error));
      }
    }
    if (created.size) {
      check('cancel_all_created', canceled === created.size, `${canceled}/${created.size}`);
      try {
        check('stock_restored', (await stock(productId)) === start);
      } catch (error) {
        check('stock_restored', false, code(error));
      }
    }
  }
  return finish();

  function finish() {
    for (const r of results) log(`${r.status}  ${r.check}${r.detail ? '  ' + r.detail : ''}`);
    const failed = results.filter((r) => r.status !== 'PASS').length;
    const summary = {
      result: failed ? 'FAIL' : 'PASS', checks: results.length, failed, requests,
      ordersCreated: created.size, ordersCanceled: canceled, project: '(hidden)',
    };
    log(JSON.stringify(summary));
    return summary;
  }
}

module.exports = { run, PLAN, MAX_REQUESTS };

if (require.main === module) {
  (async () => {
    const allowWrites = process.argv.includes('--allow-test-db-writes');
    if (!allowWrites) return void (await run({ client: null, allowWrites }));
    const fs = require('node:fs');
    const path = require('node:path');
    const dotenv = require('dotenv');
    const { createClient } = require('@supabase/supabase-js');
    const file = path.join(__dirname, '../../.env');
    const env = fs.existsSync(file) ? dotenv.parse(fs.readFileSync(file)) : {};
    const missing = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'].filter((v) => !String(env[v] ?? '').trim());
    if (missing.length) {
      console.log(`REFUSED: apps/api/.env missing ${missing.join(',')}`);
      process.exitCode = 2;
      return;
    }
    const client = createClient(env.SUPABASE_URL.trim(), env.SUPABASE_SERVICE_ROLE_KEY.trim(), {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
    const summary = await run({ client, allowWrites });
    if (summary.result !== 'PASS') process.exitCode = 1;
  })().catch(() => {
    console.log('HOSTED_ORDER_TEST_ERROR (details hidden)');
    process.exitCode = 1;
  });
}
