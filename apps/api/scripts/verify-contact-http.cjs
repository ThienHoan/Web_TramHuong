// Only talks to the disposable localhost fixture from demo-contact-protection.cjs.
const assert = require('node:assert/strict');
const base = 'http://127.0.0.1:4401';
const origin = 'http://localhost:4400';
const contact = { full_name: 'HTTP fixture', email: 'fixture@example.invalid', message: 'Synthetic contact regression only.' };
let checks = 0;
async function request(route, body, extra = {}) {
  const response = await fetch(base + route, {
    method: body === undefined ? 'GET' : 'POST',
    headers: { 'Content-Type': 'application/json', Origin: origin, ...extra },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    signal: AbortSignal.timeout(10000),
  });
  return { status: response.status, value: await response.json() };
}
async function control(body) {
  const result = await request('/__qa', body, { 'x-fixture-control': '1' });
  assert.equal(result.status, 200);
  assert.equal(result.value.remoteRequests, 0);
  assert.equal(result.value.databaseWrites, 0);
  return result.value;
}
async function expectStatus(route, body, status, headers) {
  const result = await request(route, body, headers);
  assert.equal(result.status, status, `${route}: ${JSON.stringify(result.value)}`);
  checks++;
  return result.value;
}
(async () => {
  const before = await control({ mode: 'mock', failSave: false, shortExpiry: false });
  try {
    assert.equal((await expectStatus('/api/contacts/protection', undefined, 200)).mode, 'mock');
    await expectStatus('/api/contacts', contact, 403);
    await expectStatus('/api/contacts/protection/challenge', {}, 403, { Origin: 'https://example.invalid' });
    const challenge = await expectStatus('/api/contacts/protection/challenge', {}, 201);
    await expectStatus('/api/contacts', { ...contact, turnstileToken: challenge.token }, 201);
    await expectStatus('/api/contacts', { ...contact, turnstileToken: challenge.token }, 403);
    await expectStatus('/api/contacts', { ...contact, turnstileToken: 'x'.repeat(2049) }, 400);
    await expectStatus('/api/contacts', { ...contact, email: 'invalid' }, 400);
    const bound = await expectStatus('/api/contacts/protection/challenge', {}, 201);
    await expectStatus('/api/contacts', { ...contact, turnstileToken: bound.token }, 403, { Origin: 'http://127.0.0.1:4400' });
    await control({ failSave: true });
    const failed = await expectStatus('/api/contacts/protection/challenge', {}, 201);
    await expectStatus('/api/contacts', { ...contact, turnstileToken: failed.token }, 503);
    await expectStatus('/api/contacts', { ...contact, turnstileToken: failed.token }, 403);
    await control({ mode: 'unavailable' });
    await expectStatus('/api/contacts', contact, 503);
    await expectStatus('/api/contacts/protection/challenge', {}, 503);
    await control({ mode: 'disabled' });
    assert.equal((await expectStatus('/api/contacts/protection', undefined, 200)).mode, 'disabled');
    await expectStatus('/api/contacts', contact, 201);
    const after = await control({ mode: 'mock', failSave: false, shortExpiry: false });
    assert.equal(after.saved - before.saved, 2);
    checks++;
    console.log(`PASS ${checks} HTTP assertions; fixture saves=2, external provider calls=0, database writes=0`);
  } finally {
    await control({ mode: 'mock', failSave: false, shortExpiry: false });
  }
})().catch(error => { console.error(error.message); process.exitCode = 1; });
