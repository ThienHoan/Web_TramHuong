#!/usr/bin/env node
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { Readable } = require('node:stream');
const { randomBytes, randomUUID } = require('node:crypto');
const {
  config,
  withLock,
  drain,
  monitor,
  apiRequest,
  readJson,
} = require('./runtime.cjs');
const {
  backup,
  encryptionKey,
  verifyRun,
  extractRun,
  pgDump,
} = require('./backup.cjs');

async function demo() {
  const stateDir = await fs.mkdtemp(
    path.join(os.tmpdir(), 'tramhuong-automation-demo-'),
  );
  const cfg = config({
    AUTOMATION_API_TOKEN: 't'.repeat(43),
    AUTOMATION_STATE_DIR: stateDir,
  });
  const event = {
    id: randomUUID(),
    kind: 'order.created',
    sourceId: randomUUID(),
    createdAt: new Date().toISOString(),
    leaseToken: randomUUID(),
  };
  let claimed = false,
    healthy = false;
  const transport = async (url, init = {}) => {
    if (url.endsWith('/events/claim')) {
      const result = claimed ? null : event;
      claimed = true;
      return Response.json({ event: result });
    }
    if (url.endsWith('/events/finish')) {
      const body = JSON.parse(init.body);
      return Response.json({ id: body.id, state: body.outcome });
    }
    if (url.endsWith('/automation/ready') || url.endsWith('/automation/live'))
      return Response.json(
        { status: healthy ? 'ok' : 'error' },
        { status: healthy ? 200 : 503 },
      );
    return new Response('fixture', { status: healthy ? 200 : 503 });
  };
  const queue = await drain(cfg, transport);
  await monitor(cfg, transport);
  await monitor(cfg, transport);
  healthy = true;
  await monitor(cfg, transport);
  const root = path.join(stateDir, 'backups'),
    key = randomBytes(32);
  const storage = {
    from: () => ({
      list: async () => ({
        data: [
          { name: 'sample.webp', id: randomUUID(), metadata: { size: 13 } },
        ],
        error: null,
      }),
      download: async () => ({
        data: new Blob(['fixture image']),
        error: null,
      }),
    }),
  };
  const receipt = await backup({
    root,
    key,
    storage,
    buckets: ['product-images'],
    dump: async () => ({
      stream: Readable.from(['PGDMP-synthetic-demo-only']),
      done: Promise.resolve(),
    }),
  });
  await verifyRun(path.join(root, receipt.runId), key);
  const captured = await fs.readdir(path.join(stateDir, 'captures'));
  // The demo key is kept only in its private temporary directory for repeat QA.
  await fs.writeFile(
    path.join(stateDir, 'demo-backup.key'),
    key.toString('base64'),
    { mode: 0o600, flag: 'wx' },
  );
  console.log(
    JSON.stringify(
      {
        result: 'PASS',
        mode: 'synthetic_local',
        stateDir,
        queue,
        capturedAlerts: captured.length,
        backup: { status: receipt.status, objects: receipt.objects },
        remoteRequests: 0,
        hostedWrites: 0,
        realMessages: 0,
        postgresRestoreTested: false,
      },
      null,
      2,
    ),
  );
}
async function main(argv = process.argv.slice(2), env = process.env) {
  const command = argv[0] || 'plan';
  if (command === 'demo') return demo();
  if (
    ![
      'plan',
      'status',
      'monitor',
      'events',
      'cycle',
      'backup',
      'verify-backup',
      'unpack-backup',
    ].includes(command)
  )
    throw new Error('AUTOMATION_UNKNOWN_COMMAND');
  if (!argv.includes('--execute')) {
    console.log(
      JSON.stringify({
        mode: 'dry_run',
        command,
        actions: [],
        message:
          'No env files loaded, network requests or backups made. Use demo for a synthetic local run; see docs/automation/README.md before --execute.',
      }),
    );
    return;
  }
  if (command === 'plan') throw new Error('AUTOMATION_SELECT_COMMAND');
  if (['backup', 'verify-backup', 'unpack-backup'].includes(command)) {
    const root = env.AUTOMATION_BACKUP_DIR;
    if (!root || !path.isAbsolute(root))
      throw new Error('BACKUP_ABSOLUTE_DIRECTORY_REQUIRED');
    const key = encryptionKey(env.AUTOMATION_BACKUP_KEY);
    return withLock(path.join(root, '.lock'), async () => {
      if (command === 'verify-backup' || command === 'unpack-backup') {
        const receipt = await readJson(
          path.join(root, 'last-success.json'),
          null,
        );
        if (!receipt || !/^[0-9a-f-]{36}$/.test(receipt.runId))
          throw new Error('BACKUP_RECEIPT_REQUIRED');
        if (command === 'unpack-backup') {
          const target = env.AUTOMATION_RESTORE_DIR;
          if (!target || !path.isAbsolute(target))
            throw new Error('BACKUP_RESTORE_DIRECTORY_REQUIRED');
          console.log(
            JSON.stringify(
              await extractRun(path.join(root, receipt.runId), key, target),
            ),
          );
          return;
        }
        const manifest = await verifyRun(path.join(root, receipt.runId), key);
        console.log(
          JSON.stringify({
            status: 'verified',
            runId: receipt.runId,
            artifacts: manifest.entries.length,
            postgresRestoreTested: false,
          }),
        );
        return;
      }
      if (
        !/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(env.SUPABASE_URL || '') ||
        !env.SUPABASE_SERVICE_ROLE_KEY
      )
        throw new Error('BACKUP_STORAGE_CONFIG_REQUIRED');
      const { createClient } = require('@supabase/supabase-js');
      const client = createClient(
        env.SUPABASE_URL,
        env.SUPABASE_SERVICE_ROLE_KEY,
        {
          auth: { persistSession: false, autoRefreshToken: false },
          global: {
            fetch: (url, init) =>
              fetch(url, {
                ...init,
                signal: AbortSignal.timeout(30000),
                redirect: 'error',
              }),
          },
        },
      );
      const result = await backup({
        root,
        key,
        storage: client.storage,
        buckets: (env.AUTOMATION_BACKUP_BUCKETS || 'product-images')
          .split(',')
          .map((b) => b.trim()),
        dump: () => pgDump(env),
      });
      console.log(
        JSON.stringify({
          status: result.status,
          runId: result.runId,
          objects: result.objects,
          postgresRestoreTested: false,
        }),
      );
    });
  }
  const cfg = config(env);
  return withLock(cfg.stateDir, async () => {
    if (command === 'status')
      console.log(JSON.stringify(await apiRequest(cfg, 'ready')));
    if (command === 'monitor' || command === 'cycle')
      console.log(JSON.stringify({ monitor: await monitor(cfg) }));
    if (command === 'events' || command === 'cycle')
      console.log(JSON.stringify({ events: await drain(cfg) }));
  });
}
module.exports = { main, demo };
if (require.main === module)
  void main().catch(() => {
    console.error(
      'AUTOMATION_FAILED: check configuration, private queue/state and runbook. No credentials or provider errors are printed.',
    );
    process.exitCode = 1;
  });
