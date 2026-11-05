// Exact additive migration on a synthetic in-memory contacts table only.
const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path');
const { PGlite } = require('@electric-sql/pglite');
test('contact consent migration preserves old rows, RLS, grants and accepts evidence atomically', async () => {
  const db = new PGlite();
  try {
    await db.exec("CREATE ROLE anon; CREATE ROLE service_role; CREATE TABLE contacts(id int PRIMARY KEY,message text); INSERT INTO contacts VALUES(1,'original'); ALTER TABLE contacts ENABLE ROW LEVEL SECURITY; GRANT INSERT ON contacts TO service_role;");
    const sql = fs.readFileSync(path.join(__dirname, '../migrations/contacts-legal-acceptance.sql'), 'utf8');
    await db.exec(sql);
    await db.exec(sql);
    assert.deepEqual((await db.query('SELECT id,message,legal_acceptance FROM contacts WHERE id=1')).rows, [{ id: 1, message: 'original', legal_acceptance: null }]);
    assert.equal((await db.query("SELECT relrowsecurity FROM pg_class WHERE oid='contacts'::regclass")).rows[0].relrowsecurity, true);
    assert.equal((await db.query("SELECT has_table_privilege('anon','contacts','SELECT') AS allowed")).rows[0].allowed, false);
    assert.equal((await db.query("SELECT has_table_privilege('service_role','contacts','INSERT') AS allowed")).rows[0].allowed, true);
    await db.query('INSERT INTO contacts VALUES(2,$1,$2)', ['synthetic', { accepted: true, version: 'test-only', purpose: 'contact_response', recorded_at: '2026-11-06T00:00:00Z' }]);
    assert.equal((await db.query('SELECT legal_acceptance FROM contacts WHERE id=2')).rows[0].legal_acceptance.accepted, true);
  } finally { await db.close(); }
});
