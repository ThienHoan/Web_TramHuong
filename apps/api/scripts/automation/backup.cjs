// Encrypted PostgreSQL + Storage backup. Nothing runs until the CLI opts in.
const fs = require('node:fs/promises');
const { createReadStream, createWriteStream } = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');
const {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
  randomUUID,
} = require('node:crypto');
const { Readable, Transform, Writable } = require('node:stream');
const { pipeline } = require('node:stream/promises');
const { atomicJson, readJson } = require('./runtime.cjs');
const MAGIC = Buffer.from('TPBAK001');
const MAX_OBJECT = 25 * 1024 * 1024;
function encryptionKey(raw) {
  if (typeof raw !== 'string' || !/^[A-Za-z0-9+/]{43}=$/.test(raw))
    throw new Error('BACKUP_KEY_REQUIRED');
  const key = Buffer.from(raw, 'base64');
  if (key.length !== 32 || key.toString('base64') !== raw)
    throw new Error('BACKUP_KEY_REQUIRED');
  return key;
}
async function encrypt(source, file, key, maxBytes = 50 * 1024 * 1024 * 1024) {
  const iv = randomBytes(12),
    cipher = createCipheriv('aes-256-gcm', key, iv),
    hash = createHash('sha256');
  const header = Buffer.concat([MAGIC, iv]);
  cipher.setAAD(header);
  let bytes = 0;
  const counter = new Transform({
    transform(chunk, _encoding, done) {
      bytes += chunk.length;
      hash.update(chunk);
      done(bytes > maxBytes ? new Error('BACKUP_SIZE_LIMIT') : null, chunk);
    },
  });
  await fs.writeFile(file, header, { flag: 'wx', mode: 0o600 });
  await pipeline(
    source,
    counter,
    cipher,
    createWriteStream(file, { flags: 'a', mode: 0o600 }),
  );
  await fs.appendFile(file, cipher.getAuthTag());
  return { file: path.basename(file), bytes, sha256: hash.digest('hex') };
}
async function decryptTo(source, key, destination) {
  const stat = await fs.stat(source);
  if (stat.size < 36) throw new Error('BACKUP_INVALID_ARCHIVE');
  const handle = await fs.open(source, 'r');
  const header = Buffer.alloc(20),
    tag = Buffer.alloc(16);
  try {
    await handle.read(header, 0, 20, 0);
    await handle.read(tag, 0, 16, stat.size - 16);
  } finally {
    await handle.close();
  }
  if (!header.subarray(0, 8).equals(MAGIC))
    throw new Error('BACKUP_INVALID_ARCHIVE');
  const cipher = createDecipheriv('aes-256-gcm', key, header.subarray(8));
  cipher.setAAD(header);
  cipher.setAuthTag(tag);
  await pipeline(
    stat.size === 36
      ? Readable.from([])
      : createReadStream(source, { start: 20, end: stat.size - 17 }),
    cipher,
    destination,
  );
}
async function verifyRun(dir, key) {
  const chunks = [];
  let total = 0;
  await decryptTo(
    path.join(dir, 'manifest.enc'),
    key,
    new Writable({
      write(chunk, _e, cb) {
        total += chunk.length;
        if (total > 8 * 1024 * 1024)
          return cb(new Error('BACKUP_MANIFEST_TOO_LARGE'));
        chunks.push(chunk);
        cb();
      },
    }),
  );
  let manifest;
  try {
    manifest = JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    throw new Error('BACKUP_INVALID_MANIFEST');
  }
  if (
    manifest?.version !== 1 ||
    !Array.isArray(manifest.entries) ||
    manifest.entries.length < 1 ||
    manifest.entries.length > 20001
  )
    throw new Error('BACKUP_INVALID_MANIFEST');
  for (const entry of manifest.entries) {
    if (
      !/^[a-f0-9]{64}\.enc$/.test(entry.file) ||
      !/^[a-f0-9]{64}$/.test(entry.sha256) ||
      !Number.isSafeInteger(entry.bytes) ||
      entry.bytes < 0
    )
      throw new Error('BACKUP_INVALID_MANIFEST');
    const hash = createHash('sha256');
    let bytes = 0;
    await decryptTo(
      path.join(dir, entry.file),
      key,
      new Writable({
        write(chunk, _e, cb) {
          bytes += chunk.length;
          hash.update(chunk);
          cb();
        },
      }),
    );
    if (bytes !== entry.bytes || hash.digest('hex') !== entry.sha256)
      throw new Error('BACKUP_CHECKSUM_MISMATCH');
  }
  return manifest;
}
async function extractRun(dir, key, target) {
  const manifest = await verifyRun(dir, key);
  const outputs = manifest.entries.map((entry) => {
    if (entry.kind === 'postgres') return { entry, relative: 'database.dump' };
    if (
      entry.kind !== 'storage' ||
      !/^[a-zA-Z0-9_-]{1,100}$/.test(entry.bucket) ||
      typeof entry.path !== 'string' ||
      entry.path.length > 1024 ||
      entry.path
        .split('/')
        .some((p) => !p || p === '.' || p === '..' || /[\\\x00-\x1f]/.test(p))
    )
      throw new Error('BACKUP_INVALID_RESTORE_PATH');
    return { entry, relative: path.join('storage', entry.bucket, entry.path) };
  });
  if (new Set(outputs.map((o) => o.relative)).size !== outputs.length)
    throw new Error('BACKUP_INVALID_MANIFEST');
  // Refuse an existing directory. Never overwrite or restore into a live DB.
  await fs.mkdir(target, { mode: 0o700 });
  for (const { entry, relative } of outputs) {
    const destination = path.join(target, relative);
    await fs.mkdir(path.dirname(destination), { recursive: true, mode: 0o700 });
    await decryptTo(
      path.join(dir, entry.file),
      key,
      createWriteStream(destination, { flags: 'wx', mode: 0o600 }),
    );
  }
  return { artifacts: outputs.length, postgresRestoreTested: false };
}
function pgDump(env) {
  if (
    !env.PGHOST ||
    !env.PGUSER ||
    !env.PGDATABASE ||
    !env.PGPASSWORD ||
    env.PGSSLMODE !== 'verify-full' ||
    !env.PGSSLROOTCERT
  )
    throw new Error('BACKUP_POSTGRES_CONFIG_REQUIRED');
  // Credentials only through child env. No shell, URL or password in argv/logs.
  const child = spawn(
    'pg_dump',
    ['--format=custom', '--no-owner', '--no-acl', '--no-password'],
    {
      env: {
        PATH: process.env.PATH,
        PGHOST: env.PGHOST,
        PGPORT: env.PGPORT || '5432',
        PGUSER: env.PGUSER,
        PGDATABASE: env.PGDATABASE,
        PGPASSWORD: env.PGPASSWORD,
        PGSSLMODE: env.PGSSLMODE,
        PGSSLROOTCERT: env.PGSSLROOTCERT,
        PGCONNECT_TIMEOUT: '10',
      },
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: 20 * 60000,
    },
  );
  // Never echo provider errors: they can contain connection identifiers.
  child.stderr.resume();
  const done = new Promise((resolve, reject) => {
    child.on('error', () => reject(new Error('BACKUP_PG_DUMP_UNAVAILABLE')));
    child.on('close', (code) =>
      code === 0 ? resolve() : reject(new Error('BACKUP_PG_DUMP_FAILED')),
    );
  });
  // Prevent unhandled rejection if stream encryption fails before awaiting done.
  void done.catch(() => {});
  return { stream: child.stdout, done, cancel: () => child.kill('SIGTERM') };
}
async function backup({
  root,
  key,
  storage,
  buckets,
  dump,
  now = () => new Date(),
}) {
  if (
    !Array.isArray(buckets) ||
    buckets.length < 1 ||
    buckets.length > 20 ||
    new Set(buckets).size !== buckets.length ||
    !buckets.every((b) => /^[a-zA-Z0-9_-]{1,100}$/.test(b))
  )
    throw new Error('BACKUP_BUCKETS_REQUIRED');
  await fs.mkdir(root, { recursive: true, mode: 0o700 });
  const runId = randomUUID(),
    dir = path.join(root, runId);
  await fs.mkdir(dir, { mode: 0o700 });
  const manifest = {
    version: 1,
    runId,
    startedAt: now().toISOString(),
    scope: {
      postgres: 'full database pg_dump; no server roles',
      storageBuckets: buckets,
    },
    entries: [],
  };
  let activeDump;
  try {
    activeDump = await dump();
    void activeDump.done.catch(() => {});
    const dbFile =
      createHash('sha256').update('database').digest('hex') + '.enc';
    const entry = await encrypt(
      activeDump.stream,
      path.join(dir, dbFile),
      key,
      2 * 1024 * 1024 * 1024,
    );
    await activeDump.done;
    if (entry.bytes < 5) throw new Error('BACKUP_EMPTY_DATABASE');
    manifest.entries.push({ ...entry, kind: 'postgres' });
    for (const bucket of buckets) {
      const folders = [''];
      const seen = new Set();
      let visited = 0;
      while (folders.length) {
        const prefix = folders.shift();
        if (seen.has(prefix)) throw new Error('BACKUP_STORAGE_CYCLE');
        seen.add(prefix);
        for (let offset = 0; ; offset += 100) {
          const { data, error } = await storage.from(bucket).list(prefix, {
            limit: 100,
            offset,
            sortBy: { column: 'name', order: 'asc' },
          });
          if (error || !Array.isArray(data))
            throw new Error('BACKUP_STORAGE_LIST_FAILED');
          for (const object of data) {
            if (++visited > 20000) throw new Error('BACKUP_OBJECT_LIMIT');
            if (
              typeof object.name !== 'string' ||
              !object.name ||
              object.name.includes('/') ||
              object.name === '.' ||
              object.name === '..' ||
              /[\x00-\x1f]/.test(object.name)
            )
              throw new Error('BACKUP_INVALID_OBJECT');
            const objectPath = prefix
              ? prefix + '/' + object.name
              : object.name;
            if (objectPath.length > 1024)
              throw new Error('BACKUP_INVALID_OBJECT');
            if (object.id === null && object.metadata === null) {
              folders.push(objectPath);
              continue;
            }
            if (
              !object.id ||
              !Number.isFinite(object.metadata?.size) ||
              object.metadata.size < 0 ||
              object.metadata.size > MAX_OBJECT
            )
              throw new Error('BACKUP_OBJECT_SIZE_LIMIT');
            const download = await storage.from(bucket).download(objectPath);
            if (
              download.error ||
              !download.data ||
              download.data.size > MAX_OBJECT ||
              download.data.size !== object.metadata.size
            )
              throw new Error('BACKUP_STORAGE_DOWNLOAD_FAILED');
            const file =
              createHash('sha256')
                .update(bucket + '\0' + objectPath)
                .digest('hex') + '.enc';
            if (
              manifest.entries.reduce((sum, e) => sum + e.bytes, 0) +
                object.metadata.size >
              4 * 1024 * 1024 * 1024
            )
              throw new Error('BACKUP_TOTAL_SIZE_LIMIT');
            const result = await encrypt(
              Readable.fromWeb(download.data.stream()),
              path.join(dir, file),
              key,
              MAX_OBJECT,
            );
            manifest.entries.push({
              ...result,
              kind: 'storage',
              bucket,
              path: objectPath,
            });
          }
          if (data.length < 100) break;
        }
      }
    }
    manifest.completedAt = now().toISOString();
    await encrypt(
      Readable.from([Buffer.from(JSON.stringify(manifest))]),
      path.join(dir, 'manifest.enc'),
      key,
      8 * 1024 * 1024,
    );
    await verifyRun(dir, key);
    const receipt = {
      version: 1,
      status: 'verified',
      runId,
      completedAt: manifest.completedAt,
      postgres: true,
      storageBuckets: buckets.length,
      objects: manifest.entries.length - 1,
      artifacts: await Promise.all(
        ['manifest.enc', ...manifest.entries.map((e) => e.file)].map(
          async (file) => ({
            file,
            size: (await fs.stat(path.join(dir, file))).size,
          }),
        ),
      ),
    };
    await atomicJson(path.join(root, 'last-attempt.json'), {
      version: 1,
      status: 'verified',
      runId,
      completedAt: manifest.completedAt,
    });
    // Only publish success after EVERY artifact has passed decryption/checksum.
    await atomicJson(path.join(root, 'last-success.json'), receipt);
    return receipt;
  } catch {
    activeDump?.cancel?.();
    await atomicJson(path.join(dir, 'failed.json'), {
      version: 1,
      status: 'failed',
      runId,
      failedAt: now().toISOString(),
    });
    await atomicJson(path.join(root, 'last-attempt.json'), {
      version: 1,
      status: 'failed',
      runId,
      completedAt: now().toISOString(),
    });
    throw new Error('BACKUP_FAILED');
  }
}
async function backupFresh(root, now = Date.now()) {
  const receipt = await readJson(path.join(root, 'last-success.json'), null);
  const attempt = await readJson(path.join(root, 'last-attempt.json'), null);
  if (
    attempt?.status === 'failed' &&
    Date.parse(attempt.completedAt) >= Date.parse(receipt?.completedAt)
  )
    return false;
  if (
    !receipt ||
    receipt.status !== 'verified' ||
    !/^[0-9a-f-]{36}$/.test(receipt.runId) ||
    !Array.isArray(receipt.artifacts) ||
    receipt.artifacts.length < 2 ||
    receipt.artifacts.length > 20002
  )
    return false;
  const age = now - Date.parse(receipt.completedAt);
  if (!Number.isFinite(age) || age < 0 || age >= 36 * 3600000) return false;
  for (const item of receipt.artifacts) {
    if (
      !(item.file === 'manifest.enc' || /^[a-f0-9]{64}\.enc$/.test(item.file))
    )
      return false;
    const stat = await fs.lstat(path.join(root, receipt.runId, item.file));
    if (!stat.isFile() || stat.size !== item.size) return false;
  }
  return true;
}
module.exports = {
  encryptionKey,
  encrypt,
  decryptTo,
  verifyRun,
  extractRun,
  pgDump,
  backup,
  backupFresh,
};
