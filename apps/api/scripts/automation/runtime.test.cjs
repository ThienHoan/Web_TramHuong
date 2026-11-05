const test = require('node:test'),
  assert = require('node:assert/strict');
const fs = require('node:fs/promises'),
  os = require('node:os'),
  path = require('node:path');
const { randomBytes, randomUUID } = require('node:crypto');
const { Readable } = require('node:stream');
const {
  config,
  dispatch,
  drain,
  monitor,
  readJson,
  atomicJson,
  withLock,
  observe,
  safeUrl,
} = require('./runtime.cjs');
const {
  backup,
  verifyRun,
  extractRun,
  backupFresh,
  encryptionKey,
} = require('./backup.cjs');
const event = () => ({
  id: randomUUID(),
  kind: 'contact.created',
  sourceId: randomUUID(),
  createdAt: new Date().toISOString(),
  leaseToken: randomUUID(),
  email: 'must-not-export@example.invalid',
  message: 'private',
});
const local = (dir) =>
  config({ AUTOMATION_API_TOKEN: 't'.repeat(43), AUTOMATION_STATE_DIR: dir });
async function fixture(fn) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'ops-test-'));
  try {
    return await fn(dir);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
}
test('configuration fails closed for outbound, weak/same secrets and untrusted HTTP', () => {
  const base = { AUTOMATION_API_TOKEN: 't'.repeat(43) };
  assert.equal(config(base).mode, 'local');
  assert.throws(() => config({ ...base, AUTOMATION_TRANSPORT: 'webhook' }));
  assert.throws(() => config({ ...base, AUTOMATION_INTERNAL_HTTP: 'yes' }));
  assert.throws(() =>
    config({
      ...base,
      AUTOMATION_TRANSPORT: 'webhook',
      AUTOMATION_WEBHOOK_ENABLED: 'true',
      AUTOMATION_WEBHOOK_TOKEN: base.AUTOMATION_API_TOKEN,
    }),
  );
  for (const url of [
    'http://external.example',
    'https://user:secret@example.invalid',
    'https://example.invalid/?token=x',
    'file:///tmp/data',
  ])
    assert.throws(() => safeUrl(url));
  assert.equal(
    safeUrl('http://n8n:5678/webhook/test', true),
    'http://n8n:5678/webhook/test',
  );
  assert.throws(() => encryptionKey('weak'));
});
test('local capture is idempotent and contains no customer fields or lease', () =>
  fixture(async (dir) => {
    const e = event(),
      cfg = local(dir);
    let network = 0;
    const noNetwork = () => {
      network++;
      throw new Error('forbidden');
    };
    assert.equal(await dispatch(e, cfg, noNetwork), 'CAPTURED');
    assert.equal(await dispatch(e, cfg, noNetwork), 'CAPTURED');
    assert.equal(network, 0);
    const saved = await fs.readFile(
      path.join(dir, 'captures', e.id + '.json'),
      'utf8',
    );
    for (const banned of ['must-not-export', 'private', 'leaseToken'])
      assert.equal(saved.includes(banned), false);
    assert.equal((await fs.readdir(path.join(dir, 'captures'))).length, 1);
  }));
test('webhook needs matching acknowledgement; timeout and server failure remain UNKNOWN', () =>
  fixture(async (dir) => {
    const cfg = {
      ...local(dir),
      mode: 'webhook',
      webhook: 'https://example.invalid/hook',
      webhookToken: 'w'.repeat(43),
    };
    const e = event();
    let calls = 0;
    assert.equal(
      await dispatch(e, cfg, async (_url, init) => {
        calls++;
        const payload = JSON.parse(init.body);
        assert.equal(payload.email, undefined);
        return Response.json({ accepted: true, eventId: e.id });
      }),
      'ACCEPTED',
    );
    assert.equal(
      await dispatch(e, cfg, async () =>
        Response.json({ accepted: true, eventId: randomUUID() }),
      ),
      'UNKNOWN',
    );
    assert.equal(
      await dispatch(e, cfg, async () => new Response('bad', { status: 503 })),
      'UNKNOWN',
    );
    assert.equal(
      await dispatch(e, cfg, async () => {
        throw new Error('secret timeout');
      }),
      'UNKNOWN',
    );
    assert.equal(
      await dispatch(
        e,
        cfg,
        async () => new Response('rejected', { status: 401 }),
      ),
      'DEAD',
    );
    assert.equal(calls, 1);
  }));
test('queue drain bounded to 20; failed finish stops without another send', () =>
  fixture(async (dir) => {
    const e = event();
    let claims = 0,
      finishes = 0;
    const cfg = local(dir),
      transport = async (url, init) => {
        if (url.endsWith('/claim')) {
          claims++;
          return Response.json({ event: { ...e, id: randomUUID() } });
        }
        finishes++;
        const body = JSON.parse(init.body);
        return Response.json({ id: body.id, state: body.outcome });
      };
    assert.equal((await drain(cfg, transport)).processed, 20);
    assert.equal(claims, 20);
    assert.equal(finishes, 20);
    claims = 0;
    await assert.rejects(
      () =>
        drain(cfg, async (url) => {
          if (url.endsWith('/claim')) {
            claims++;
            return Response.json({ event: e });
          }
          return Response.json({ error: 'failed' }, { status: 503 });
        }),
      /API_UNAVAILABLE/,
    );
    assert.equal(claims, 1);
  }));
test('monitor waits for two failures, alerts once, emits recovery, and survives restart', () =>
  fixture(async (dir) => {
    const cfg = local(dir);
    let healthy = false;
    const transport = async () =>
      Response.json(
        { status: healthy ? 'ok' : 'bad' },
        { status: healthy ? 200 : 503 },
      );
    await monitor(cfg, transport);
    assert.equal(
      (await readJson(path.join(dir, 'monitor.json'))).alerts.length,
      0,
    );
    await monitor(cfg, transport);
    await monitor(cfg, transport);
    assert.equal(
      (await readJson(path.join(dir, 'monitor.json'))).alerts.length,
      3,
    );
    healthy = true;
    await monitor(cfg, transport);
    await monitor(cfg, transport);
    const state = await readJson(path.join(dir, 'monitor.json'));
    assert.equal(state.alerts.length, 6);
    assert.equal(
      state.alerts.every((a) => a.state === 'CAPTURED'),
      true,
    );
    state.alerts.push({ event: event(), state: 'WORKING' });
    await atomicJson(path.join(dir, 'monitor.json'), state);
    assert.equal((await monitor(cfg, transport)).unresolved, 1);
    assert.equal(
      (await readJson(path.join(dir, 'monitor.json'))).alerts.at(-1).state,
      'UNKNOWN',
    );
    assert.equal(observe({ failures: 2, down: true }, false).transition, null);
  }));
test('exclusive runner lock refuses a second process; release allows next cycle', () =>
  fixture(async (dir) => {
    await withLock(dir, async () => {
      await assert.rejects(
        () => withLock(dir, async () => {}),
        /RUNNER_LOCKED/,
      );
    });
    assert.equal(await withLock(dir, async () => 42), 42);
  }));
const storageFixture = () => ({
  from: () => ({
    list: async (prefix) => ({
      data:
        prefix === ''
          ? [{ name: 'folder', id: null, metadata: null }]
          : [
              { name: 'image.webp', id: 'object-1', metadata: { size: 13 } },
              { name: 'empty', id: 'object-2', metadata: { size: 0 } },
            ],
      error: null,
    }),
    download: async (name) => ({
      data: new Blob([name.endsWith('empty') ? '' : 'fixture image']),
      error: null,
    }),
  }),
});
const dumpFixture = async () => ({
  stream: Readable.from(['PGDMP-fixture-no-customer-data']),
  done: Promise.resolve(),
});
test('backup encrypts nested and empty objects, verifies authentication, and detects tampering', () =>
  fixture(async (root) => {
    const key = randomBytes(32),
      receipt = await backup({
        root,
        key,
        storage: storageFixture(),
        buckets: ['product-images'],
        dump: dumpFixture,
      });
    assert.equal(receipt.objects, 2);
    assert.equal(await backupFresh(root), true);
    const dir = path.join(root, receipt.runId),
      manifest = await verifyRun(dir, key);
    assert.equal(manifest.entries.length, 3);
    const storageEntry = manifest.entries.find(
      (e) => e.path === 'folder/image.webp',
    );
    assert.ok(storageEntry);
    const restore = path.join(root, 'restore-test');
    await extractRun(dir, key, restore);
    assert.equal(
      await fs.readFile(
        path.join(restore, 'storage/product-images/folder/image.webp'),
        'utf8',
      ),
      'fixture image',
    );
    await assert.rejects(() => extractRun(dir, key, restore));
    const ciphertext = await fs.readFile(path.join(dir, storageEntry.file));
    assert.equal(ciphertext.includes(Buffer.from('fixture image')), false);
    await assert.rejects(() => verifyRun(dir, randomBytes(32)));
    ciphertext[25] ^= 1;
    await fs.writeFile(path.join(dir, storageEntry.file), ciphertext);
    await assert.rejects(() => verifyRun(dir, key));
    await fs.unlink(path.join(dir, storageEntry.file));
    await assert.rejects(() => backupFresh(root));
  }));
test('failed backup never overwrites the prior verified receipt', () =>
  fixture(async (root) => {
    const key = randomBytes(32),
      good = await backup({
        root,
        key,
        storage: storageFixture(),
        buckets: ['product-images'],
        dump: dumpFixture,
      });
    await assert.rejects(
      () =>
        backup({
          root,
          key,
          storage: {
            from: () => ({
              list: async () => ({ error: { message: 'private' } }),
            }),
          },
          buckets: ['product-images'],
          dump: dumpFixture,
        }),
      /BACKUP_FAILED/,
    );
    assert.equal(
      (await readJson(path.join(root, 'last-success.json'))).runId,
      good.runId,
    );
    assert.equal(await backupFresh(root), false);
    assert.equal(
      await backupFresh(root, Date.parse(good.completedAt) + 36 * 3600000),
      false,
    );
  }));
test('oversized object and database process failure cannot publish a successful backup', () =>
  fixture(async (root) => {
    const key = randomBytes(32);
    await assert.rejects(
      () =>
        backup({
          root,
          key,
          storage: {
            from: () => ({
              list: async () => ({
                data: [
                  {
                    id: 'x',
                    name: 'large',
                    metadata: { size: 26 * 1024 * 1024 },
                  },
                ],
              }),
            }),
          },
          buckets: ['product-images'],
          dump: dumpFixture,
        }),
      /BACKUP_FAILED/,
    );
    assert.equal(
      await readJson(path.join(root, 'last-success.json'), null),
      null,
    );
    await assert.rejects(
      () =>
        backup({
          root,
          key,
          storage: storageFixture(),
          buckets: ['product-images'],
          dump: async () => ({
            stream: Readable.from(['PGDMP-fixture']),
            done: Promise.reject(new Error('private connection')),
          }),
        }),
      /BACKUP_FAILED/,
    );
    assert.equal(
      await readJson(path.join(root, 'last-success.json'), null),
      null,
    );
  }));
