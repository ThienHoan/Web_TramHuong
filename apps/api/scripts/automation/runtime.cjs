// Shared by the CLI and hermetic tests. No env files, sockets or timers at import.
const fs = require('node:fs/promises');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const KINDS = new Set([
  'order.created',
  'contact.created',
  'monitor.down',
  'monitor.recovered',
  'backup.stale',
  'backup.recovered',
]);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TOKEN = /^[A-Za-z0-9_-]{43,256}$/;
function flag(value) {
  if (![undefined, '', 'true', 'false'].includes(value))
    throw new Error('AUTOMATION_INVALID_FLAG');
  return value === 'true';
}
function safeUrl(raw, internal = false) {
  let u;
  try {
    u = new URL(raw);
  } catch {
    throw new Error('AUTOMATION_INVALID_URL');
  }
  const hosts = new Set([
    'localhost',
    '127.0.0.1',
    '[::1]',
    ...(internal ? ['api', 'web', 'n8n'] : []),
  ]);
  if (
    u.username ||
    u.password ||
    u.search ||
    u.hash ||
    (u.protocol !== 'https:' &&
      !(u.protocol === 'http:' && hosts.has(u.hostname)))
  )
    throw new Error('AUTOMATION_INVALID_URL');
  return u.href.replace(/\/$/, '');
}
function config(env = process.env) {
  const internal = flag(env.AUTOMATION_INTERNAL_HTTP);
  const mode = env.AUTOMATION_TRANSPORT || 'local';
  if (!['local', 'webhook'].includes(mode))
    throw new Error('AUTOMATION_INVALID_TRANSPORT');
  const webhookEnabled = flag(env.AUTOMATION_WEBHOOK_ENABLED);
  const token = env.AUTOMATION_API_TOKEN || '';
  if (!TOKEN.test(token)) throw new Error('AUTOMATION_API_TOKEN_REQUIRED');
  const webhookToken = env.AUTOMATION_WEBHOOK_TOKEN || '';
  if (
    mode === 'webhook' &&
    (!webhookEnabled || !TOKEN.test(webhookToken) || webhookToken === token)
  )
    throw new Error('AUTOMATION_WEBHOOK_NOT_CONFIGURED');
  return {
    mode,
    token,
    webhookToken,
    api: safeUrl(
      env.AUTOMATION_API_URL || 'http://127.0.0.1:4000/api',
      internal,
    ),
    web: safeUrl(
      env.AUTOMATION_WEB_URL || 'http://127.0.0.1:3000/vi',
      internal,
    ),
    webhook:
      mode === 'webhook' ? safeUrl(env.AUTOMATION_WEBHOOK_URL, internal) : null,
    stateDir: path.resolve(env.AUTOMATION_STATE_DIR || '.automation-data'),
    backupDir: env.AUTOMATION_BACKUP_DIR
      ? path.resolve(env.AUTOMATION_BACKUP_DIR)
      : null,
  };
}
async function jsonRequest(url, options = {}, transport = fetch) {
  const response = await transport(url, {
    ...options,
    redirect: 'error',
    signal: AbortSignal.timeout(8000),
  });
  let bytes = 0;
  const chunks = [];
  if (response.body)
    for await (const chunk of response.body) {
      bytes += chunk.length;
      if (bytes > 32768) throw new Error('AUTOMATION_RESPONSE_TOO_LARGE');
      chunks.push(Buffer.from(chunk));
    }
  let data;
  try {
    data = JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    data = null;
  }
  return { ok: response.ok, status: response.status, data };
}
async function atomicJson(file, data) {
  await fs.mkdir(path.dirname(file), { recursive: true, mode: 0o700 });
  const temp = file + '.' + randomUUID() + '.tmp';
  await fs.writeFile(temp, JSON.stringify(data, null, 2) + '\n', {
    mode: 0o600,
    flag: 'wx',
  });
  await fs.rename(temp, file);
}
async function readJson(file, fallback) {
  try {
    return JSON.parse(await fs.readFile(file, 'utf8'));
  } catch (e) {
    if (e.code === 'ENOENT') return fallback;
    throw new Error('AUTOMATION_STATE_INVALID');
  }
}
async function withLock(dir, run) {
  await fs.mkdir(dir, { recursive: true, mode: 0o700 });
  let handle;
  try {
    handle = await fs.open(path.join(dir, 'runner.lock'), 'wx', 0o600);
  } catch {
    throw new Error('AUTOMATION_RUNNER_LOCKED');
  }
  try {
    await handle.writeFile(String(process.pid));
    return await run();
  } finally {
    await handle.close();
    await fs.unlink(path.join(dir, 'runner.lock'));
  }
}
function publicEvent(event) {
  if (
    !event ||
    !UUID.test(event.id) ||
    !KINDS.has(event.kind) ||
    typeof event.sourceId !== 'string' ||
    !(
      UUID.test(event.sourceId) ||
      ['api', 'web', 'database', 'backup'].includes(event.sourceId)
    ) ||
    typeof event.createdAt !== 'string' ||
    !Number.isFinite(Date.parse(event.createdAt))
  )
    throw new Error('AUTOMATION_INVALID_EVENT');
  return {
    schemaVersion: 1,
    id: event.id,
    kind: event.kind,
    sourceId: event.sourceId,
    createdAt: new Date(event.createdAt).toISOString(),
  };
}
async function dispatch(event, cfg, transport = fetch) {
  const payload = publicEvent(event);
  if (cfg.mode === 'local') {
    const file = path.join(cfg.stateDir, 'captures', payload.id + '.json');
    await fs.mkdir(path.dirname(file), { recursive: true, mode: 0o700 });
    try {
      await fs.writeFile(file, JSON.stringify(payload) + '\n', {
        flag: 'wx',
        mode: 0o600,
      });
    } catch (e) {
      if (
        e.code !== 'EEXIST' ||
        JSON.stringify(await readJson(file)) !== JSON.stringify(payload)
      )
        throw new Error('AUTOMATION_CAPTURE_FAILED');
    }
    return 'CAPTURED';
  }
  // Exactly one network attempt. Ambiguous acceptance is never retried blindly.
  try {
    const r = await jsonRequest(
      cfg.webhook,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + cfg.webhookToken,
          'Idempotency-Key': payload.id,
        },
        body: JSON.stringify(payload),
      },
      transport,
    );
    if (!r.ok) return r.status >= 400 && r.status < 500 ? 'DEAD' : 'UNKNOWN';
    return r.data?.accepted === true && r.data.eventId === payload.id
      ? 'ACCEPTED'
      : 'UNKNOWN';
  } catch {
    return 'UNKNOWN';
  }
}
async function apiRequest(cfg, route, body, transport = fetch) {
  const r = await jsonRequest(
    cfg.api + '/automation/' + route,
    {
      method: body === undefined ? 'GET' : 'POST',
      headers: {
        Authorization: 'Bearer ' + cfg.token,
        'Content-Type': 'application/json',
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    },
    transport,
  );
  if (!r.ok)
    throw new Error(
      r.status === 409
        ? 'AUTOMATION_LEASE_CONFLICT'
        : 'AUTOMATION_API_UNAVAILABLE',
    );
  return r.data;
}
async function drain(cfg, transport = fetch) {
  let processed = 0;
  const outcomes = {};
  for (let i = 0; i < 20; i++) {
    const result = await apiRequest(cfg, 'events/claim', {}, transport);
    if (!result || !Object.hasOwn(result, 'event'))
      throw new Error('AUTOMATION_INVALID_CLAIM');
    if (result.event === null) break;
    const event = result.event;
    publicEvent(event);
    if (!UUID.test(event.leaseToken))
      throw new Error('AUTOMATION_INVALID_LEASE');
    const outcome = await dispatch(event, cfg, transport);
    // A failed finish is left for lease expiry/UNKNOWN. Never resend the event.
    const finished = await apiRequest(
      cfg,
      'events/finish',
      { id: event.id, leaseToken: event.leaseToken, outcome },
      transport,
    );
    if (finished?.id !== event.id || finished.state !== outcome)
      throw new Error('AUTOMATION_INVALID_FINISH');
    outcomes[outcome] = (outcomes[outcome] || 0) + 1;
    processed++;
  }
  return { processed, outcomes };
}
function observe(previous, healthy) {
  const failures = healthy ? 0 : Math.min((previous?.failures || 0) + 1, 2);
  const down = failures >= 2;
  const wasDown = previous?.down === true;
  return {
    failures,
    down: healthy ? false : wasDown || down,
    transition:
      healthy && wasDown ? 'recovered' : down && !wasDown ? 'down' : null,
  };
}
async function monitor(cfg, transport = fetch, now = Date.now()) {
  const probes = {};
  for (const [name, url] of [
    ['api', cfg.api + '/automation/live'],
    ['web', cfg.web],
    ['database', cfg.api + '/automation/ready'],
  ]) {
    try {
      if (name === 'web') {
        const response = await transport(url, {
          method: 'GET',
          redirect: 'error',
          signal: AbortSignal.timeout(5000),
        });
        probes[name] = response.status === 200;
        await response.body?.cancel();
      } else {
        const response = await jsonRequest(
          url,
          {
            headers:
              name === 'database'
                ? { Authorization: 'Bearer ' + cfg.token }
                : {},
          },
          transport,
        );
        probes[name] =
          response.status === 200 && response.data?.status === 'ok';
      }
    } catch {
      probes[name] = false;
    }
  }
  if (cfg.backupDir) {
    try {
      probes.backup = await require('./backup.cjs').backupFresh(
        cfg.backupDir,
        now,
      );
    } catch {
      probes.backup = false;
    }
  }
  const file = path.join(cfg.stateDir, 'monitor.json');
  const state = await readJson(file, { version: 1, checks: {}, alerts: [] });
  if (state.version !== 1 || !Array.isArray(state.alerts) || !state.checks)
    throw new Error('AUTOMATION_STATE_INVALID');
  // A crash during send is an ambiguous send, not a reason to duplicate it.
  for (const alert of state.alerts)
    if (alert.state === 'WORKING') alert.state = 'UNKNOWN';
  for (const [name, healthy] of Object.entries(probes)) {
    const next = observe(state.checks[name], healthy);
    state.checks[name] = next;
    if (next.transition)
      state.alerts.push({
        event: {
          id: randomUUID(),
          kind:
            name === 'backup'
              ? 'backup.' + (next.transition === 'down' ? 'stale' : 'recovered')
              : 'monitor.' + next.transition,
          sourceId: name,
          createdAt: new Date(now).toISOString(),
        },
        state: 'QUEUED',
      });
  }
  await atomicJson(file, state);
  for (const alert of state.alerts
    .filter((a) => a.state === 'QUEUED')
    .slice(0, 10)) {
    alert.state = 'WORKING';
    await atomicJson(file, state);
    alert.state = await dispatch(alert.event, cfg, transport);
    await atomicJson(file, state);
  }
  return {
    checks: probes,
    unresolved: state.alerts.filter((a) =>
      ['UNKNOWN', 'DEAD'].includes(a.state),
    ).length,
  };
}
module.exports = {
  flag,
  config,
  safeUrl,
  jsonRequest,
  atomicJson,
  readJson,
  withLock,
  publicEvent,
  dispatch,
  apiRequest,
  drain,
  observe,
  monitor,
};
