// Execute exact SQL against synthetic memory tables. Never load .env/AppModule.
const test = require('node:test'),
  assert = require('node:assert/strict');
const fs = require('node:fs/promises'),
  path = require('node:path');
const { PGlite } = require('@electric-sql/pglite');
const id = (n) => '20000000-0000-4000-8000-' + String(n).padStart(12, '0');
const sql = (name) =>
  fs.readFile(path.join(__dirname, '../../migrations', name), 'utf8');
test('disabled producers, atomic source, private bounded claims, leases and pause', async () => {
  const db = new PGlite();
  try {
    await db.exec(
      'CREATE ROLE anon;CREATE ROLE authenticated;CREATE ROLE service_role;CREATE TABLE orders(id uuid PRIMARY KEY,shipping_info jsonb,status text);CREATE TABLE contacts(id uuid PRIMARY KEY,email text,message text);GRANT ALL ON orders,contacts TO service_role;',
    );
    await db.exec(await sql('ops-automation.sql'));
    await db.query('INSERT INTO orders(id) VALUES($1)', [id(1)]);
    assert.equal(
      (await db.query('SELECT count(*)::int n FROM ops_automation_events'))
        .rows[0].n,
      0,
    );
    await db.exec(await sql('ops-automation.enable.sql'));
    await db.exec('BEGIN');
    await db.query('INSERT INTO orders(id) VALUES($1)', [id(2)]);
    await db.exec('ROLLBACK');
    assert.equal(
      (await db.query('SELECT count(*)::int n FROM ops_automation_events'))
        .rows[0].n,
      0,
    );
    await db.query('INSERT INTO orders(id,shipping_info) VALUES($1,$2)', [
      id(3),
      { email: 'never-export@example.invalid', phone: 'private' },
    ]);
    await db.query('INSERT INTO contacts(id,email,message) VALUES($1,$2,$3)', [
      id(4),
      'private@example.invalid',
      'private message',
    ]);
    assert.equal(
      JSON.stringify(
        (await db.query('SELECT * FROM ops_automation_events')).rows,
      ).includes('private'),
      false,
    );
    await db.exec("UPDATE orders SET status='PAID'");
    assert.equal(
      (await db.query('SELECT count(*)::int n FROM ops_automation_events'))
        .rows[0].n,
      2,
    );
    for (const role of ['anon', 'authenticated']) {
      await db.exec('SET ROLE ' + role);
      await assert.rejects(
        () => db.query('SELECT * FROM ops_automation_events'),
        (e) => e.code === '42501',
      );
      await assert.rejects(
        () => db.query('SELECT ops_automation_claim()'),
        (e) => e.code === '42501',
      );
      await db.exec('RESET ROLE');
    }
    await db.exec('SET ROLE service_role');
    const claim = async () =>
      (await db.query('SELECT ops_automation_claim() r')).rows[0].r;
    const first = await claim(),
      second = await claim();
    assert.notEqual(first.id, second.id);
    assert.equal(await claim(), null);
    await assert.rejects(
      () =>
        db.query("SELECT ops_automation_finish($1,$2,'ACCEPTED')", [
          first.id,
          id(99),
        ]),
      (e) => e.code === 'PT409',
    );
    const receipt = (
      await db.query("SELECT ops_automation_finish($1,$2,'CAPTURED') r", [
        first.id,
        first.leaseToken,
      ])
    ).rows[0].r;
    assert.equal(receipt.state, 'CAPTURED');
    await assert.rejects(
      () =>
        db.query("SELECT ops_automation_finish($1,$2,'ACCEPTED')", [
          first.id,
          first.leaseToken,
        ]),
      (e) => e.code === 'PT409',
    );
    await db.exec('RESET ROLE');
    await db.query(
      "UPDATE ops_automation_events SET lease_until=now()-interval '1 second' WHERE id=$1",
      [second.id],
    );
    assert.equal(await claim(), null);
    assert.equal(
      (
        await db.query('SELECT state FROM ops_automation_events WHERE id=$1', [
          second.id,
        ])
      ).rows[0].state,
      'UNKNOWN',
    );
    await db.exec(await sql('ops-automation.pause.sql'));
    await db.query('INSERT INTO contacts(id) VALUES($1)', [id(5)]);
    assert.equal(
      (await db.query('SELECT count(*)::int n FROM ops_automation_events'))
        .rows[0].n,
      2,
    );
    // Existing transaction fails rather than silently losing its opted-in event.
    await db.exec(await sql('ops-automation.enable.sql'));
    await db.exec(
      "CREATE FUNCTION fail_ops_fixture() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'fixture unavailable'; END $$;CREATE TRIGGER fail_fixture BEFORE INSERT ON ops_automation_events FOR EACH ROW EXECUTE FUNCTION fail_ops_fixture();",
    );
    await assert.rejects(() =>
      db.query('INSERT INTO orders(id) VALUES($1)', [id(6)]),
    );
    assert.equal(
      (
        await db.query('SELECT count(*)::int n FROM orders WHERE id=$1', [
          id(6),
        ])
      ).rows[0].n,
      0,
    );
  } finally {
    await db.close();
  }
});
