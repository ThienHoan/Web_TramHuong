const test = require('node:test'),
  assert = require('node:assert/strict'),
  fs = require('node:fs'),
  path = require('node:path'),
  vm = require('node:vm');
test('inactive n8n inbox requires auth and strictly projects event metadata', () => {
  const workflow = JSON.parse(
    fs.readFileSync(
      path.join(
        __dirname,
        '../../../../docs/automation/n8n/owner-inbox.workflow.json',
      ),
      'utf8',
    ),
  );
  assert.equal(workflow.active, false);
  const hook = workflow.nodes.find((n) => n.type === 'n8n-nodes-base.webhook');
  assert.equal(hook.parameters.authentication, 'headerAuth');
  assert.equal(hook.parameters.responseMode, 'responseNode');
  assert.equal(
    workflow.nodes.some((n) => n.credentials),
    false,
  );
  const code = workflow.nodes.find((n) => n.type === 'n8n-nodes-base.code')
    .parameters.jsCode;
  const body = {
    schemaVersion: 1,
    id: '20000000-0000-4000-8000-000000000001',
    kind: 'contact.created',
    sourceId: '20000000-0000-4000-8000-000000000002',
    createdAt: '2026-11-06T00:00:00Z',
    email: 'must-not-export',
    leaseToken: 'private',
  };
  const run = (value) =>
    vm.runInNewContext(
      '(function(){' + code + '})()',
      { $json: { body: value } },
      { timeout: 1000 },
    );
  const projected = JSON.parse(JSON.stringify(run(body)))[0].json;
  assert.deepEqual(Object.keys(projected), [
    'schemaVersion',
    'id',
    'kind',
    'sourceId',
    'createdAt',
  ]);
  assert.throws(() => run({ ...body, kind: 'payment.force' }));
  assert.throws(() => run({ ...body, sourceId: 'https://untrusted.invalid' }));
});
