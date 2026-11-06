// Offline test for hosted-order-test.cjs: runs it against an in-memory PostgreSQL
// (PGlite) with the real checkout migrations behind a minimal Supabase-client fake.
//   node --test scripts/checkout/verify-hosted-order-test.cjs
const test = require('node:test');
const assert = require('node:assert/strict');
const { createDB, id } = require('./fixture.cjs');
const { run, MAX_REQUESTS } = require('./hosted-order-test.cjs');

const NUMERIC = new Set(['price', 'quantity', 'discount_percentage', 'total']);
function fakeClient(db, { loseIdempotency = false } = {}) {
  const from = (table) => {
    const q = { filters: [], order: null, limit: null, single: false };
    const exec = async () => {
      const params = [];
      const where = q.filters.map(([col, op, value]) => {
        params.push(value);
        return op === '= ANY' ? `${col} = ANY($${params.length})` : `${col} ${op} $${params.length}`;
      });
      const sql = `SELECT * FROM ${table}${where.length ? ' WHERE ' + where.join(' AND ') : ''}` +
        `${q.order ? ` ORDER BY ${q.order[0]} ${q.order[1] ? 'ASC' : 'DESC'}` : ''}${q.limit ? ` LIMIT ${q.limit}` : ''}`;
      try {
        const rows = (await db.query(sql, params)).rows.map((row) => {
          const out = { ...row, translations: [] };
          for (const key of Object.keys(out)) if (NUMERIC.has(key) && typeof out[key] === 'string') out[key] = Number(out[key]);
          return out;
        });
        if (q.single) return rows.length === 1 ? { data: rows[0], error: null } : { data: null, error: { code: 'PGRST116' } };
        return { data: rows, error: null };
      } catch (error) {
        return { data: null, error: { code: error.code, message: error.message } };
      }
    };
    const builder = {
      select: () => builder,
      eq: (c, v) => (q.filters.push([c, '=', v]), builder),
      gte: (c, v) => (q.filters.push([c, '>=', v]), builder),
      in: (c, v) => (q.filters.push([c, '= ANY', v]), builder),
      order: (c, o) => ((q.order = [c, o?.ascending !== false]), builder),
      limit: (n) => ((q.limit = n), builder),
      single: () => ((q.single = true), builder),
      then: (resolve, reject) => exec().then(resolve, reject),
    };
    return builder;
  };
  const rpc = async (name, args) => {
    const a = { ...args };
    if (loseIdempotency && name === 'checkout_create_order') a.p_key = crypto.randomUUID();
    if (loseIdempotency && name === 'checkout_lookup_request') return { data: null, error: null };
    const keys = Object.keys(a);
    const values = keys.map((k) => (a[k] !== null && typeof a[k] === 'object' ? JSON.stringify(a[k]) : a[k]));
    try {
      const r = await db.query(`SELECT ${name}(${keys.map((k, i) => `${k} => $${i + 1}`).join(',')}) AS r`, values);
      return { data: r.rows[0].r, error: null };
    } catch (error) {
      return { data: null, error: { code: error.code, message: error.message } };
    }
  };
  return { from, rpc };
}
const counts = async (db) =>
  (await db.query(`SELECT (SELECT count(*)::int FROM orders) orders,
    (SELECT count(*)::int FROM orders WHERE status='CANCELED') canceled,
    (SELECT count(*)::int FROM checkout_requests) requests,
    (SELECT quantity FROM products WHERE id=$1) stock`, [id(1)])).rows[0];
const quiet = () => {};

test('dry run sends nothing', async () => {
  const client = new Proxy({}, { get: () => { throw new Error('CLIENT_USED_IN_DRY_RUN'); } });
  assert.equal((await run({ client, allowWrites: false, log: quiet })).requests, 0);
});

test('healthy database: one order, replayed, conflict refused, canceled, stock restored', async () => {
  const db = await createDB();
  await db.query('INSERT INTO products(id,price,quantity) VALUES($1,200000,5)', [id(1)]);
  const lines = [];
  const summary = await run({ client: fakeClient(db), allowWrites: true, log: (l) => lines.push(l) });
  assert.equal(summary.result, 'PASS', lines.join('\n'));
  assert.equal(summary.ordersCreated, 1);
  assert.equal(summary.ordersCanceled, 1);
  assert.ok(summary.requests <= MAX_REQUESTS);
  assert.deepEqual(await counts(db), { orders: 1, canceled: 1, requests: 1, stock: 5 });
});

test('lost idempotency is reported as FAIL and every created order is still canceled', async () => {
  const db = await createDB();
  await db.query('INSERT INTO products(id,price,quantity) VALUES($1,200000,5)', [id(1)]);
  const summary = await run({ client: fakeClient(db, { loseIdempotency: true }), allowWrites: true, log: quiet });
  assert.equal(summary.result, 'FAIL');
  assert.ok(summary.ordersCreated >= 2);
  assert.equal(summary.ordersCanceled, summary.ordersCreated);
  const c = await counts(db);
  assert.equal(c.orders, c.canceled);
  assert.equal(c.stock, 5, 'stock must be back to the start');
});

test('no product with stock: FAIL without any write', async () => {
  const db = await createDB();
  await db.query('INSERT INTO products(id,price,quantity) VALUES($1,200000,1)', [id(1)]);
  const summary = await run({ client: fakeClient(db), allowWrites: true, log: quiet });
  assert.equal(summary.result, 'FAIL');
  assert.equal(summary.ordersCreated, 0);
  assert.deepEqual(await counts(db), { orders: 0, canceled: 0, requests: 0, stock: 1 });
});
