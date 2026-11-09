// Runs the real AuthProvider against a fake Supabase client and a minimal hook runtime.
// No browser, credentials, network or real session.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

const source = ts.transpileModule(
  fs.readFileSync(path.join(__dirname, '../src/components/providers/AuthProvider.tsx'), 'utf8'),
  { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } },
).outputText;

const session = (id, token) => ({ access_token: token, user: { id } });
const admin = async (id) => ({ data: { id, role: 'ADMIN' } });

function mount(lookup = admin) {
  const cells = [], effects = [], timers = [], tokens = [], lookups = [];
  let cursor = 0, emit;
  const supabase = {
    auth: {
      onAuthStateChange(callback) {
        emit = callback;
        return { data: { subscription: { unsubscribe() {} } } };
      },
    },
    from: () => ({
      select: () => ({
        eq: (_column, id) => ({
          single: () => {
            lookups.push(id);
            return lookup(id);
          },
        }),
      }),
    }),
  };
  const modules = {
    react: {
      createContext: () => ({ Provider: 'Provider' }),
      useContext: () => undefined,
      useEffect: (effect) => effects.push(effect),
      useState(initial) {
        const index = cursor++;
        if (!(index in cells)) cells[index] = initial;
        return [
          cells[index],
          (value) => {
            cells[index] = typeof value === 'function' ? value(cells[index]) : value;
          },
        ];
      },
    },
    'react/jsx-runtime': { jsx: (type, props) => ({ type, props }) },
    '@/lib/supabase': { supabase },
    'next/navigation': { useRouter: () => ({}) },
    '@/lib/api-client': { setAccessToken: (token) => tokens.push(token) },
  };
  const exports = {};
  vm.runInNewContext(source, {
    exports,
    require: (name) => modules[name],
    setTimeout: (callback) => timers.push(callback),
    console,
  });
  const render = () => {
    cursor = 0;
    return exports.AuthProvider({ children: null }).props.value;
  };
  render();
  effects[0]();
  return {
    emit: (event, value) => emit(event, value),
    render,
    tokens,
    lookups,
    timers,
    flush: async () => {
      while (timers.length) await timers.shift()();
    },
  };
}

async function signedIn(lookup) {
  const app = mount(lookup);
  const first = session('u1', 't1');
  app.emit('INITIAL_SESSION', first);
  assert.equal(app.render().loading, true);
  await app.flush();
  return { app, first };
}

test('returning to the tab leaves the signed-in admin untouched', async () => {
  const { app, first } = await signedIn();
  assert.equal(app.render().role, 'ADMIN');
  assert.equal(app.render().loading, false);

  app.emit('SIGNED_IN', session('u1', 't1'));

  const after = app.render();
  assert.equal(after.loading, false);
  assert.equal(after.role, 'ADMIN');
  assert.equal(after.session, first, 'pages keyed on session must not refetch');
  assert.equal(app.timers.length, 0);
  assert.deepEqual(app.lookups, ['u1']);
});

test('a token refresh updates the session without reloading the account', async () => {
  const { app } = await signedIn();

  app.emit('TOKEN_REFRESHED', session('u1', 't2'));

  const after = app.render();
  assert.equal(after.session.access_token, 't2');
  assert.equal(after.loading, false);
  assert.equal(after.role, 'ADMIN');
  assert.equal(app.tokens.at(-1), 't2');
  assert.deepEqual(app.lookups, ['u1']);
});

test('a different account clears the old role and ignores a stale lookup', async () => {
  const { app } = await signedIn();
  app.emit('SIGNED_IN', session('u2', 't3'));
  assert.equal(app.render().loading, true);
  assert.equal(app.render().role, null);
  await app.flush();
  assert.equal(app.render().user.id, 'u2');
  assert.equal(app.render().loading, false);
  assert.deepEqual(app.lookups, ['u1', 'u2']);
});

test('a failed role lookup is retried on the next auth event', async () => {
  let fail = true;
  const { app } = await signedIn(async (id) => (fail ? { data: null } : admin(id)));
  assert.equal(app.render().role, null);

  fail = false;
  app.emit('SIGNED_IN', session('u1', 't1'));
  await app.flush();

  assert.equal(app.render().role, 'ADMIN');
  assert.deepEqual(app.lookups, ['u1', 'u1']);
});

test('signing out clears the account and signing back in reloads it', async () => {
  const { app } = await signedIn();
  app.emit('SIGNED_OUT', null);
  assert.equal(app.render().session, null);
  assert.equal(app.render().role, null);
  assert.equal(app.render().loading, false);

  app.emit('SIGNED_IN', session('u1', 't4'));
  await app.flush();

  assert.equal(app.render().role, 'ADMIN');
  assert.deepEqual(app.lookups, ['u1', 'u1']);
});
