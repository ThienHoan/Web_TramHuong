// Isolated localhost lab: memory PostgreSQL, synthetic sources, no .env loading.
require('ts-node/register/transpile-only');
const http = require('node:http'),
  fs = require('node:fs/promises'),
  path = require('node:path'),
  os = require('node:os');
const { randomBytes, randomUUID } = require('node:crypto');
const { Readable } = require('node:stream');
const { Test } = require('@nestjs/testing');
const { ConfigService } = require('@nestjs/config');
const { ValidationPipe } = require('@nestjs/common');
const { PGlite } = require('@electric-sql/pglite');
const {
  AutomationController,
} = require('../../src/automation/automation.controller');
const {
  AutomationRepository,
} = require('../../src/automation/automation.repository');
const { AutomationGuard } = require('../../src/automation/automation.guard');
const { SupabaseService } = require('../../src/supabase/supabase.service');
const { config, drain, monitor, readJson, withLock } = require('./runtime.cjs');
const { backup, backupFresh } = require('./backup.cjs');
async function startDemo(port = 4500) {
  const stateDir = await fs.mkdtemp(
    path.join(os.tmpdir(), 'tramhuong-automation-lab-'),
  );
  const db = new PGlite(),
    token = randomBytes(32).toString('base64url'),
    key = randomBytes(32);
  await db.exec(
    'CREATE ROLE anon;CREATE ROLE authenticated;CREATE ROLE service_role;CREATE TABLE orders(id uuid PRIMARY KEY);CREATE TABLE contacts(id uuid PRIMARY KEY);',
  );
  for (const name of ['ops-automation.sql', 'ops-automation.enable.sql'])
    await db.exec(
      await fs.readFile(path.join(__dirname, '../../migrations', name), 'utf8'),
    );
  const rpc = async (name, args) => {
    try {
      const result =
        name === 'ops_automation_claim'
          ? await db.query('SELECT ops_automation_claim() r')
          : name === 'ops_automation_finish'
            ? await db.query('SELECT ops_automation_finish($1,$2,$3) r', [
                args.p_id,
                args.p_lease_token,
                args.p_outcome,
              ])
            : null;
      if (!result) throw new Error('fixture RPC denied');
      return { data: result.rows[0].r, error: null };
    } catch (e) {
      return { data: null, error: { code: e.code } };
    }
  };
  const module = await Test.createTestingModule({
    controllers: [AutomationController],
    providers: [
      AutomationRepository,
      AutomationGuard,
      {
        provide: ConfigService,
        useValue: {
          get: (name) => (name === 'AUTOMATION_ENABLED' ? 'true' : token),
        },
      },
      {
        provide: SupabaseService,
        useValue: {
          getClient: () => ({
            rpc,
            from: () => ({
              select: () => ({
                limit: () => ({ abortSignal: async () => ({ error: null }) }),
              }),
            }),
          }),
        },
      },
    ],
  }).compile();
  const api = module.createNestApplication({ logger: false });
  api.setGlobalPrefix('api');
  api.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  await api.listen(0, '127.0.0.1');
  const apiPort = api.getHttpServer().address().port;
  const cfg = config({
    AUTOMATION_API_TOKEN: token,
    AUTOMATION_API_URL: 'http://127.0.0.1:' + apiPort + '/api',
    AUTOMATION_STATE_DIR: stateDir,
  });
  let healthy = true,
    busy = false,
    backupState = null,
    lastMessage = 'Sẵn sàng chạy thử. Chưa có tác vụ nào được tạo.';
  const probe = async () =>
    Response.json(
      { status: healthy ? 'ok' : 'error' },
      { status: healthy ? 200 : 503 },
    );
  const storage = {
    from: () => ({
      list: async () => ({
        data: [
          {
            name: 'demo-product.webp',
            id: randomUUID(),
            metadata: { size: 13 },
          },
        ],
        error: null,
      }),
      download: async () => ({
        data: new Blob(['fixture image']),
        error: null,
      }),
    }),
  };
  const state = async () => {
    const queue = (
      await db.query(
        'SELECT id,kind,source_id,created_at,state FROM ops_automation_events ORDER BY created_at DESC LIMIT 20',
      )
    ).rows;
    const m = await readJson(path.join(stateDir, 'monitor.json'), {
      checks: {},
      alerts: [],
    });
    return {
      mode: 'local_fixture',
      healthy,
      busy,
      lastMessage,
      queue,
      checks: m.checks,
      alerts: m.alerts
        .slice(-20)
        .reverse()
        .map((a) => ({
          id: a.event.id,
          kind: a.event.kind,
          source: a.event.sourceId,
          state: a.state,
          createdAt: a.event.createdAt,
        })),
      backup: backupState,
      counts: {
        orders: (await db.query('SELECT count(*)::int n FROM orders')).rows[0]
          .n,
        contacts: (await db.query('SELECT count(*)::int n FROM contacts'))
          .rows[0].n,
      },
      realMessages: 0,
      remoteRequests: 0,
      hostedWrites: 0,
    };
  };
  const html = await fs.readFile(
    path.join(__dirname, '../../../..', 'ops/automation/demo.html'),
  );
  const server = http.createServer((req, res) => {
    void (async () => {
      res.setHeader('Cache-Control', 'no-store');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader(
        'Content-Security-Policy',
        "default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self'; base-uri 'none'; frame-ancestors 'none'",
      );
      if (req.method === 'GET' && req.url === '/') {
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.end(html);
        return;
      }
      if (req.method === 'GET' && ['/demo.css', '/demo.js'].includes(req.url)) {
        res.setHeader(
          'Content-Type',
          req.url.endsWith('.css') ? 'text/css' : 'text/javascript',
        );
        res.end(
          await fs.readFile(
            path.join(
              __dirname,
              '../../../..',
              'ops/automation',
              req.url.slice(1),
            ),
          ),
        );
        return;
      }
      if (req.method === 'GET' && req.url === '/demo/state') {
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(await state()));
        return;
      }
      if (req.method !== 'POST' || !req.url?.startsWith('/demo/action/')) {
        res.statusCode = 404;
        res.end();
        return;
      }
      const origin = req.headers.origin;
      if (
        !['http://127.0.0.1:' + port, 'http://localhost:' + port].includes(
          origin,
        ) ||
        req.headers['content-type'] !== 'application/json'
      ) {
        res.statusCode = 403;
        res.end();
        return;
      }
      req.resume();
      if (busy) {
        res.statusCode = 409;
        res.end();
        return;
      }
      busy = true;
      try {
        const action = req.url.slice('/demo/action/'.length);
        if (action === 'order' || action === 'contact') {
          await db.query(
            'INSERT INTO ' +
              (action === 'order' ? 'orders' : 'contacts') +
              '(id) VALUES($1)',
            [randomUUID()],
          );
          lastMessage =
            action === 'order'
              ? 'Đã tạo đơn mẫu và ghi sự kiện vào hàng đợi.'
              : 'Đã tạo liên hệ mẫu và ghi sự kiện vào hàng đợi.';
        } else if (action === 'drain') {
          const result = await withLock(stateDir, () => drain(cfg));
          lastMessage =
            'Đã ghi nhận ' +
            result.processed +
            ' thông báo tại máy. Không gửi ra ngoài.';
        } else if (action === 'down' || action === 'recover') {
          healthy = action === 'recover';
          await withLock(stateDir, async () => {
            await monitor(cfg, probe);
            if (!healthy) await monitor(cfg, probe);
          });
          lastMessage = healthy
            ? 'Đã mô phỏng phục hồi và ghi thông báo khôi phục.'
            : 'Đã mô phỏng 2 lần lỗi liên tiếp và ghi cảnh báo.';
        } else if (action === 'backup') {
          const root = path.join(stateDir, 'backups');
          const r = await backup({
            root,
            key,
            storage,
            buckets: ['product-images'],
            dump: async () => ({
              stream: Readable.from(['PGDMP-synthetic-fixture-only']),
              done: Promise.resolve(),
            }),
          });
          backupState = {
            status: r.status,
            objects: r.objects,
            completedAt: r.completedAt,
            fresh: await backupFresh(root),
          };
          lastMessage =
            'Đã mã hóa và kiểm tra toàn vẹn dữ liệu mẫu. Chưa kiểm thử khôi phục PostgreSQL thật.';
        } else {
          res.statusCode = 404;
          res.end();
          return;
        }
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(await state()));
      } finally {
        busy = false;
      }
    })().catch(() => {
      res.statusCode = 500;
      res.end(JSON.stringify({ error: 'DEMO_ACTION_FAILED' }));
    });
  });
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', resolve);
  });
  const close = async () => {
    await new Promise((resolve) => server.close(resolve));
    await api.close();
    await db.close();
  };
  return { url: 'http://127.0.0.1:' + port, stateDir, close };
}
module.exports = { startDemo };
if (require.main === module)
  void startDemo()
    .then((lab) => {
      console.log(
        JSON.stringify({
          url: lab.url,
          mode: 'synthetic_local_only',
          realMessages: 0,
          hostedWrites: 0,
        }),
      );
      for (const signal of ['SIGTERM', 'SIGINT'])
        process.once(signal, () => {
          void lab.close().then(() => process.exit(0));
        });
    })
    .catch(() => {
      console.error('AUTOMATION_DEMO_START_FAILED');
      process.exit(1);
    });
