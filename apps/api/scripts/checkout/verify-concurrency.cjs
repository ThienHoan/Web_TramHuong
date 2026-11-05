// Explicit local Docker acceptance, no .env, hosted DB or host port. The only
// writable database belongs to a fresh --rm PostgreSQL container with no network.
const {spawn}=require('node:child_process');
const {randomUUID}=require('node:crypto');
const assert=require('node:assert/strict');
const {SCHEMA,file,id,line,args}=require('./fixture.cjs');
const container='tramhuong-checkout-test-'+randomUUID().slice(0,8);
function processRun(command,arguments_,input) {
  const child=spawn(command,arguments_,{stdio:['pipe','pipe','pipe']});
  let out='',err='';const waiters=[];
  child.stdout.on('data',chunk=>{out+=chunk;for(const [marker,resolve] of waiters)if(out.includes(marker))resolve();});
  child.stderr.on('data',chunk=>{err+=chunk;});
  const done=new Promise((resolve,reject)=>{
    child.on('error',reject);child.on('close',code=>resolve({code,out,err}));
  });
  if(input!==undefined)child.stdin.end(input);
  return {child,done,marker:text=>out.includes(text)?Promise.resolve():Promise.race([
    new Promise(resolve=>waiters.push([text,resolve])),
    done.then(()=>{throw new Error('SQL_CLIENT_ENDED_BEFORE_MARKER');}),
    new Promise((_,reject)=>setTimeout(()=>reject(new Error('SQL_MARKER_TIMEOUT')),10000).unref()),
  ])};
}
async function docker(arguments_,input) {
  const r=await processRun('docker',arguments_,input).done;
  if(r.code!==0)throw new Error('DOCKER_FIXTURE_COMMAND_FAILED');return r.out.trim();
}
function client(name,input) {return processRun('docker',['exec','-i','-e','PGAPPNAME='+name,container,'psql','-X','-q','-A','-t','-v','ON_ERROR_STOP=1','-U','postgres','-d','checkout_test'],input);}
async function query(sql){const r=await client('checkout_probe',sql).done;if(r.code!==0)throw new Error('SQL_FIXTURE_QUERY_FAILED: '+r.err.slice(0,800));return r.out.trim();}
const literal=value=>value===null?'NULL':typeof value==='number'?String(value):"'"+String(typeof value==='object'?JSON.stringify(value):value).replaceAll("'","''")+"'";
const statement=a=>'SELECT checkout_create_order('+Object.values(a).map(literal).join(',')+');';
async function overlap(first,second) {
  const a=client('checkout_a');a.child.stdin.write('BEGIN;'+statement(first)+"SELECT 'A_LOCKED';\n");
  await a.marker('A_LOCKED');
  const b=client('checkout_b',statement(second));
  let blocked=false;
  try {
    for(let attempt=0;attempt<30;attempt++) {
      blocked=(await query("SELECT EXISTS(SELECT 1 FROM pg_stat_activity WHERE application_name='checkout_b' AND wait_event_type='Lock');"))==='t';
      if(blocked)break;await new Promise(resolve=>setTimeout(resolve,30));
    }
    assert.equal(blocked,true,'second independent PostgreSQL connection must be waiting on a lock');
  } finally {a.child.stdin.end('COMMIT;\n');}
  return {a:await a.done,b:await b.done,blocked};
}
async function reset(stock=1){await query('TRUNCATE checkout_requests,orders,products,vouchers CASCADE;'+
  'INSERT INTO products(id,price,quantity) VALUES('+literal(id(1))+',200000,'+stock+'),('+literal(id(2))+',200000,'+stock+');');}
async function main(){
  if(!process.argv.includes('--run-docker')) {console.log(JSON.stringify({mode:'dry_run',actions:[],message:'Use --run-docker; optional --allow-image-pull for official postgres:17-alpine.'}));return;}
  let started=false;
  try {
    await docker(['run','--detach','--rm','--name',container,'--network','none','--cpus','1','--memory','384m','--pids-limit','128',
      '--tmpfs','/var/lib/postgresql/data:rw,size=256m','--env','POSTGRES_HOST_AUTH_METHOD=trust','--env','POSTGRES_DB=checkout_test',
      process.argv.includes('--allow-image-pull')?'--pull=missing':'--pull=never','postgres:17-alpine']);started=true;
    let ready=false;
    for(let attempt=0;attempt<80;attempt++) {
      const r=await processRun('docker',['exec',container,'pg_isready','-h','127.0.0.1','-U','postgres','-d','checkout_test'],'').done;
      if(r.code===0){ready=true;break;}await new Promise(resolve=>setTimeout(resolve,100));
    }
    assert.equal(ready,true,'temporary PostgreSQL must become ready');
    await query(SCHEMA+await file('admin-order-integrity.sql')+await file('checkout-atomic.sql'));
    const results=[];
    await reset(1);
    const stock=await overlap(args(id(100)),args(id(101)));
    assert.equal(stock.a.code,0);assert.notEqual(stock.b.code,0);assert.match(stock.b.err,/CHECKOUT_OUT_OF_STOCK/);
    assert.equal(await query('SELECT count(*) FROM orders'),'1');assert.equal(await query('SELECT quantity FROM products WHERE id='+literal(id(1))),'0');
    results.push('last_item_one_order_lock_wait_observed');
    await reset(2);
    const same=await overlap(args(id(100)),args(id(100)));
    assert.equal(same.a.code,0);assert.equal(same.b.code,0);
    const first=JSON.parse(same.a.out.split('\n').find(text=>text.startsWith('{'))),replay=JSON.parse(same.b.out.trim());
    assert.equal(first.order.id,replay.order.id);assert.equal(replay.replayed,true);assert.equal(await query('SELECT count(*) FROM orders'),'1');
    assert.equal(await query('SELECT quantity FROM products WHERE id='+literal(id(1))),'1');results.push('same_key_parallel_one_commit');
    await reset(2);await query("INSERT INTO vouchers(id,code,discount_amount,usage_limit) VALUES("+literal(id(9))+",'LAST',20000,1)");
    const va=args(id(100),{p_voucher_code:'LAST',p_expected_discount:20000});
    const vb=args(id(101),{p_items:[line(id(2))],p_voucher_code:'LAST',p_expected_discount:20000});
    const voucher=await overlap(va,vb);
    assert.equal(voucher.a.code,0);assert.notEqual(voucher.b.code,0);assert.match(voucher.b.err,/CHECKOUT_VOUCHER_UNAVAILABLE/);
    assert.equal(await query('SELECT usage_count FROM vouchers'),'1');assert.equal(await query('SELECT quantity FROM products WHERE id='+literal(id(2))),'2');
    results.push('last_voucher_different_products_one_use_lock_wait_observed');
    await reset(2);
    const ma=args(id(100),{p_items:[line(id(2)),line(id(1))],p_expected_subtotal:400000,p_shipping_fee:0});
    const mb=args(id(101),{p_items:[line(id(1)),line(id(2))],p_expected_subtotal:400000,p_shipping_fee:0});
    const multi=await overlap(ma,mb);assert.equal(multi.a.code,0);assert.equal(multi.b.code,0);
    assert.equal(await query('SELECT sum(quantity) FROM products'),'0');results.push('opposite_cart_order_no_deadlock');
    console.log(JSON.stringify({result:'PASS',engine:'PostgreSQL 17, two independent psql sessions',scenarios:results,hostedWrites:0,hostPorts:0,businessProviderCalls:0}));
  } finally {if(started)await docker(['stop',container]);}
}
void main().catch(error=>{console.error('CHECKOUT_CONCURRENCY_FAILED',error.code==='ERR_ASSERTION'?error.message:error.message==='DOCKER_FIXTURE_COMMAND_FAILED'?'Docker/image unavailable. Start Docker or explicitly allow the official test image pull.':error.message);process.exitCode=1;});
