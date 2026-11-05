const test=require('node:test'),assert=require('node:assert/strict');
const {id,file,createDB,line,args,call,lookup}=require('./fixture.cjs');
async function fixture(run){const db=await createDB();try{await db.query('INSERT INTO products(id,price,quantity) VALUES($1,200000,10)',[id(1)]);return await run(db);}finally{await db.close();}}
const counts=async db=>(await db.query('SELECT (SELECT count(*)::int FROM orders) orders,(SELECT count(*)::int FROM checkout_requests) requests,(SELECT quantity FROM products LIMIT 1) stock')).rows[0];
test('commits stock/order together; replay survives sold-out stock and cancelled status',()=>fixture(async db=>{
  await db.exec('UPDATE products SET quantity=1');const a=args();const first=await call(db,a);
  assert.equal(first.replayed,false);assert.equal(first.order.total,230000);
  assert.deepEqual(await counts(db),{orders:1,requests:1,stock:0});
  const replay=await call(db,a);assert.equal(replay.replayed,true);assert.equal(replay.order.id,first.order.id);
  assert.deepEqual(await counts(db),{orders:1,requests:1,stock:0});
  await db.query("SELECT transition_order($1,'CANCELED','PENDING')",[first.order.id]);
  assert.equal((await call(db,a)).order.status,'CANCELED');assert.equal((await counts(db)).stock,1);
  await assert.rejects(()=>call(db,args(id(100),{p_fingerprint:'b'.repeat(64)})),e=>e.code==='PT409');
  await assert.rejects(()=>lookup(db,{...a,p_user_id:id(900)}),e=>e.code==='PT409');
}));
test('two overlapping clients request the last item: only one commits in shared memory',()=>fixture(async db=>{
  await db.exec('UPDATE products SET quantity=1');
  const results=await Promise.allSettled([call(db,args(id(100))),call(db,args(id(101)))]);
  assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
  assert.equal(results.filter(r=>r.status==='rejected'&&r.reason.code==='PT409').length,1);
  assert.deepEqual(await counts(db),{orders:1,requests:1,stock:0});
}));
test('same-key parallel calls return one order and one stock deduction',()=>fixture(async db=>{
  const a=args();const results=await Promise.all([call(db,a),call(db,a),call(db,a)]);
  assert.equal(new Set(results.map(r=>r.order.id)).size,1);assert.equal(results.filter(r=>!r.replayed).length,1);
  assert.deepEqual(await counts(db),{orders:1,requests:1,stock:9});
}));
test('last voucher use is serialized; replay does not consume a second use',()=>fixture(async db=>{
  await db.query("INSERT INTO vouchers(id,code,discount_amount,usage_limit) VALUES($1,'LAST',20000,1)",[id(9)]);
  const a=args(id(100),{p_voucher_code:' last ',p_expected_discount:20000});
  const results=await Promise.allSettled([call(db,a),call(db,{...a,p_key:id(101)})]);
  assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
  const good=results.find(r=>r.status==='fulfilled').value;
  assert.equal(good.order.total,210000);assert.equal((await db.query('SELECT usage_count FROM vouchers')).rows[0].usage_count,1);
  const key=results[0].status==='fulfilled'?id(100):id(101);
  assert.equal((await call(db,{...a,p_key:key})).replayed,true);
  assert.equal((await db.query('SELECT usage_count FROM vouchers')).rows[0].usage_count,1);
  assert.deepEqual(await counts(db),{orders:1,requests:1,stock:9});
}));
test('failure after order INSERT rolls back order, stock, voucher and owner alert',()=>fixture(async db=>{
  await db.exec(await file('ops-automation.sql'));await db.exec(await file('ops-automation.enable.sql'));
  await db.query("INSERT INTO vouchers(id,code,discount_amount) VALUES($1,'FAIL',20000)",[id(9)]);
  await db.exec("CREATE FUNCTION fail_voucher_fixture() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'fixture fail after stock'; END $$;CREATE TRIGGER fail_fixture BEFORE UPDATE ON vouchers FOR EACH ROW EXECUTE FUNCTION fail_voucher_fixture();");
  await assert.rejects(()=>call(db,args(id(100),{p_voucher_code:'FAIL',p_expected_discount:20000})));
  assert.deepEqual(await counts(db),{orders:0,requests:0,stock:10});
  assert.equal((await db.query('SELECT usage_count FROM vouchers')).rows[0].usage_count,0);
  assert.equal((await db.query('SELECT count(*)::int n FROM ops_automation_events')).rows[0].n,0);
}));
test('duplicate product/variant lines share stock and insufficient multi-product carts roll back fully',()=>fixture(async db=>{
  await db.exec(`UPDATE products SET quantity=2,variants='[{"name":"A","price":200000},{"name":"B","price":200000}]'`);
  await assert.rejects(()=>call(db,args(id(100),{p_items:[line(id(1),2,200000,'A'),line(id(1),1,200000,'B')],p_expected_subtotal:600000,p_shipping_fee:0})),e=>e.code==='PT409');
  assert.deepEqual(await counts(db),{orders:0,requests:0,stock:2});
  const r=await call(db,args(id(101),{p_items:[line(id(1),1,200000,'A'),line(id(1),1,200000,'B')],p_expected_subtotal:400000,p_shipping_fee:0}));
  assert.equal(r.order.total,400000);assert.equal((await counts(db)).stock,0);
}));
test('rechecks price/discount windows and rejects forged prices and inactive products',()=>fixture(async db=>{
  await db.exec('UPDATE products SET price=750,discount_percentage=93');
  const discounted={...line(id(1),1,53),original_price:750,discount_amount:697};
  await call(db,args(id(100),{p_items:[discounted],p_expected_subtotal:53}));
  await assert.rejects(()=>call(db,args(id(101),{p_items:[{...discounted,price:52}],p_expected_subtotal:52})),e=>e.code==='PT409');
  await db.exec("UPDATE products SET discount_end_date=now()-interval '1 second'");
  await assert.rejects(()=>call(db,args(id(102),{p_items:[discounted],p_expected_subtotal:53})),e=>e.code==='PT409');
  await db.exec('UPDATE products SET is_active=false');
  await assert.rejects(()=>call(db,args(id(103))),e=>e.code==='PT409');
  assert.equal((await counts(db)).orders,1);
}));
test('SePay expiry is assigned by DB and showroom uses COD with zero shipping',()=>fixture(async db=>{
  const pay=await call(db,args(id(100),{p_payment_method:'sepay'}));
  assert.equal(pay.order.status,'AWAITING_PAYMENT');assert.equal(pay.order.payment_status,'pending');
  assert.ok(Date.parse(pay.order.payment_deadline)-Date.now()>14*60000);
  const pickup=await call(db,args(id(101),{p_payment_method:'showroom',p_shipping_fee:0}));
  assert.equal(pickup.order.payment_method,'cod');assert.equal(pickup.order.total,200000);
  await db.query("SELECT transition_order($1,'EXPIRED','AWAITING_PAYMENT')",[pay.order.id]);
  assert.equal((await counts(db)).stock,9);
}));
test('quote ownership, persisted snapshot and expiry are checked at commit; completed replay skips expiry',()=>fixture(async db=>{
  const quote={reference:id(50),subtotal:200000,voucherDiscount:0,customerFee:25000,total:225000,expiresAt:new Date(Date.now()+60000).toISOString()};
  const {reference,...data}=quote;
  await db.query("INSERT INTO shipping_records VALUES($1,'quote','VALID',NULL,$2)",['quote:'+reference,JSON.stringify(data)]);
  const a=args(id(100),{p_quote:quote,p_shipping_fee:25000});const r=await call(db,a);assert.equal(r.order.total,225000);
  await db.exec("UPDATE shipping_records SET data=jsonb_set(data,'{expiresAt}',to_jsonb('2000-01-01T00:00:00Z'::text))");
  assert.equal((await call(db,a)).order.id,r.order.id);
  await assert.rejects(()=>call(db,{...a,p_key:id(101)}),e=>e.code==='PT409');
  assert.equal((await counts(db)).orders,1);
}));
test('browser roles cannot invoke checkout or read dedupe history; service role can',()=>fixture(async db=>{
  for(const role of ['anon','authenticated']) {
    await db.exec('SET ROLE '+role);
    await assert.rejects(()=>call(db,args()),e=>e.code==='42501');
    await assert.rejects(()=>lookup(db,args()),e=>e.code==='42501');
    await assert.rejects(()=>db.query('SELECT * FROM checkout_requests'),e=>e.code==='42501');
    await db.exec('RESET ROLE');
  }
  await db.exec('SET ROLE service_role');await call(db,args());
  await db.exec('RESET ROLE');await db.exec(await file('checkout-atomic.pause.sql'));
  await db.exec('SET ROLE service_role');assert.equal((await lookup(db,args())).replayed,true);
  await assert.rejects(()=>call(db,args(id(101))),e=>e.code==='42501');
}));
