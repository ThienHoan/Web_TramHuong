const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
function load(file, imports = {}) {
  const module = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src', file), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  new Function('require', 'module', 'exports', code)(id => { if (!(id in imports)) throw Error(id); return imports[id]; }, module, module.exports);
  return module.exports;
}
const commerce = load('lib/commerce.ts');
const { resolveReorderLine, parseReorderSelection } = load('lib/reorder.ts', { './commerce': commerce });
const product = { id: 'p1', slug: 'incense', price: 200000, is_active: true, quantity: 5, images: ['/image.webp'], translation: { title: 'Nụ trầm' }, variants: [] };
test('reorder uses current catalog prices and active discounts, never historical prices', () => {
  const result = resolveReorderLine({ productId: 'p1', quantity: 2, price: 1 }, { ...product, discount_percentage: 10 });
  assert.equal(result.price, 180000); assert.equal(result.original_price, 200000); assert.equal(result.quantity, 2);
});
test('reorder respects stock, quantities already in the cart and missing variants', () => {
  assert.equal(resolveReorderLine({ quantity: 10 }, product, 3).quantity, 2);
  assert.equal(resolveReorderLine({ quantity: 1 }, product, 5), null);
  assert.equal(resolveReorderLine({ quantity: 1, variantName: 'deleted' }, product), null);
  assert.equal(resolveReorderLine({ quantity: 1 }, { ...product, is_active: false }), null);
  assert.equal(resolveReorderLine({ quantity: 1.5 }, product), null);
});
test('reorder matches the exact variant and current variant price/stock', () => {
  const variantProduct = { ...product, variants: [{ id: 'v1', name: 'Hộp 20', price: 350000, stock: 2 }] };
  const result = resolveReorderLine({ quantity: 3, variant_id: 'v1' }, variantProduct);
  assert.equal(result.variantId, 'Hộp 20'); assert.equal(result.price, 350000); assert.equal(result.quantity, 2);
  assert.equal(resolveReorderLine({ quantity: 1 }, variantProduct), null);
});
test('same-origin address snapshot is complete, consistent and unique', () => {
  const dir = path.join(__dirname, '../public/data/addresses/v2');
  const provinces = JSON.parse(fs.readFileSync(path.join(dir, 'provinces.json')));
  const manifest = JSON.parse(fs.readFileSync(path.join(dir, 'manifest.json')));
  assert.equal(provinces.length, 34);
  assert.equal(new Set(provinces.map(p => p.code)).size, 34);
  const codes = new Set();
  for (const p of provinces) {
    assert(p.name);
    const wards = JSON.parse(fs.readFileSync(path.join(dir, `${p.code}.json`)));
    assert(wards.length > 0);
    for (const ward of wards) { assert(ward.name); assert(!codes.has(ward.code)); codes.add(ward.code); }
  }
  assert.equal(codes.size, manifest.wardCount);
});

test('guest reorder links accept only bounded product selections and discard forged fields', () => {
  const id = '00000000-0000-4000-8000-000000000001';
  assert.deepEqual(parseReorderSelection(JSON.stringify([{productId: id, quantity: 2, price: 1, email: 'private'}])), [{productId: id, quantity: 2}]);
  assert.deepEqual(parseReorderSelection(JSON.stringify([{productId: id, quantity: 0}])), []);
  assert.deepEqual(parseReorderSelection('invalid'), []);
  assert.deepEqual(parseReorderSelection('x'.repeat(7501)), []);
});
