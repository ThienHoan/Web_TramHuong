// Runs exact migration + benchmark in PostgreSQL memory. No env/network client.
const { PGlite } = require('@electric-sql/pglite');
const { readFileSync, writeFileSync } = require('node:fs');
const { join } = require('node:path');
const assert = require('node:assert/strict');
const { performance } = require('node:perf_hooks');
const sql = readFileSync(join(__dirname, '../migrations/catalog-full-text-search.sql'), 'utf8');
const pause = readFileSync(join(__dirname, '../migrations/catalog-full-text-search.pause.sql'), 'utf8');
const checker = readFileSync(join(__dirname, '../../../docs/integrations/verify-installed-catalog-search.sql'), 'utf8');
const id = n => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const fixture = `
CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
GRANT USAGE ON SCHEMA public TO anon,authenticated,service_role;
CREATE TABLE products(id uuid PRIMARY KEY,slug text,price numeric,quantity integer,is_active boolean,category_id uuid,variants jsonb,
 discount_percentage numeric DEFAULT 0,discount_start_date timestamptz,discount_end_date timestamptz,wholesale_cost numeric);
CREATE TABLE product_translations(id serial PRIMARY KEY,product_id uuid REFERENCES products(id),locale text,title text,description text,story text);
GRANT ALL ON products,product_translations TO service_role;
GRANT USAGE,SELECT ON SEQUENCE product_translations_id_seq TO service_role;
`;
(async () => {
  const db = new PGlite(); let checks = 0;
  const equal = (a,b) => { assert.deepEqual(a,b); checks++; };
  const denied = async (fn,code) => { await assert.rejects(fn,e => e.code===code); checks++; };
  const search = async (query,locale='vi',min=0,max=1e12,category=null,limit=20) =>
    (await db.query('SELECT public.catalog_search($1,$2,$3,$4,$5,$6) AS result',[query,locale,min,max,category,limit])).rows[0].result;
  const add = async (n,title,locale='vi',overrides={}) => {
    await db.query(`INSERT INTO products(id,slug,price,quantity,is_active,category_id,variants,discount_percentage,wholesale_cost)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,1)`,[id(n),`fixture-${n}`,overrides.price??200000,overrides.quantity??5,overrides.active??true,id(900),overrides.variants??null,overrides.discount??0]);
    await db.query('INSERT INTO product_translations(product_id,locale,title,description,story) VALUES($1,$2,$3,$4,$5)',[id(n),locale,title,overrides.description??'Sản phẩm mẫu', 'PRIVATE_STORY_SENTINEL']);
  };
  try {
    await db.exec(fixture);
    equal((await db.query(checker)).rows.map(r=>r.status),['CHUA_CAI','CHUA_CAI','CHUA_CAI']);
    await db.exec(sql); checks++;
    equal((await db.query(checker)).rows.map(r=>r.status),['PASS','PASS','PASS']);
    for(let n=1;n<=150;n++) await add(n,`Sản phẩm phổ thông ${n}`);
    await add(200,'Vòng tay trầm cao cấp','vi',{discount:10});
    await add(201,'Nhang trầm hương','vi',{price:100000});
    await add(202,'Nụ trầm xông nhà','vi',{price:150000});
    await add(203,'Agarwood bracelet','en');
    await add(204,'Agarwood incense','en');
    await add(205,'Gift box premium agarwood','en');
    await add(206,'Vòng tay trầm ẩn','vi',{active:false});
    await add(207,'Vòng tay hết hàng','vi',{quantity:0});
    await add(208,'Vòng tay biến thể','vi',{variants:[{name:'size',price:2}]});
    await add(209,'Vòng tay catalog','fr');
    await add(210,'Tác phẩm trưng bày','vi',{description:'<p>Vòng tay mô tả riêng</p>'});
    await db.exec('SET ROLE service_role');
    const cases = [
      ['accent_vi','VÒNG TAY','vi',[id(200),id(210)]],
      ['unaccent_vi','vong tay','vi',[id(200),id(210)]],
      ['nfd_vi','Vòng tay'.normalize('NFD'),'vi',[id(200),id(210)]],
      ['natural_vi','tôi muốn mua vòng tay','vi',[id(200),id(210)]],
      ['incense_vi','nhang trầm','vi',[id(201)]],
      ['cone_vi','nụ xông','vi',[id(202)]],
      ['bracelet_en','agarwood bracelet','en',[id(203)]],
      ['incense_en','agarwood incense','en',[id(204)]],
      ['gift_en','gift box','en',[id(205)]],
      ['absent','unfindable','vi',[]],
      ['literal_operators','nhang OR bracelet','vi',[]],
      ['no_stemming_claim','bracelets','en',[]],
    ];
    const benchmark=[];
    for(const [name,query,locale,expected] of cases){
      const rows=await search(query,locale);
      equal(rows.map(r=>r.id),expected);
      const durations=[];
      for(let run=0;run<3;run++){const start=performance.now();await search(query,locale);durations.push(performance.now()-start);}
      benchmark.push({name,locale,expectedIds:expected,returnedIds:rows.map(r=>r.id),top5Recall:expected.length?expected.filter(x=>rows.slice(0,5).some(r=>r.id===x)).length/expected.length:null,durationMs:durations.map(x=>Number(x.toFixed(3)))});
    }
    const projected=(await search('vong tay'))[0];
    equal(projected.price,200000); equal(projected.discount_percentage,10);
    equal(Object.hasOwn(projected,'wholesale_cost'),false);
    equal(Object.hasOwn(projected.translation,'story'),false);
    equal(JSON.stringify(projected).includes('PRIVATE_STORY_SENTINEL'),false);
    // Run the actual TypeScript repository + advisor against this exact RPC.
    // A fake Supabase transport only maps RPC parameters to memory SQL.
    require('ts-node/register/transpile-only');
    const { ConfigService }=require('@nestjs/config');
    const { CatalogSearchRepository }=require('../src/products/catalog-search.repository');
    const { CatalogAdvisorService }=require('../src/chat/catalog-advisor.service');
    const { IntegrationExecutor }=require('../src/integrations/integration-executor');
    const { loadIntegrationRegistry }=require('../src/integrations/integrations.config');
    const config=new ConfigService({CATALOG_FTS_ENABLED:'true',NODE_ENV:'test',INTEGRATIONS_ENV:'mock',INTEGRATIONS_KILL_SWITCH:'false',FEATURE_GEMINI_ADVISOR_ENABLED:'false'});
    let rpcReads=0;
    const client={rpc:(name,args)=>{
      assert.equal(name,'catalog_search');rpcReads++;
      return {abortSignal:async signal=>{assert.equal(signal.aborted,false);return {data:await search(args.p_query,args.p_locale,args.p_min_price,args.p_max_price,args.p_category_id,args.p_limit),error:null};}};
    }};
    const repository=new CatalogSearchRepository({getClient:()=>client},config);
    const registry=loadIntegrationRegistry(config);
    const advisor=new CatalogAdvisorService({findAll:()=>{throw new Error('BOUNDED_FALLBACK_SHOULD_NOT_RUN');}},registry,new IntegrationExecutor(registry),'test',undefined,repository);
    const advice=await advisor.advise({query:'vong tay',locale:'vi',maxPrice:180000});
    equal(advice.searchEngine,'postgres_fts');equal(advice.searchFallbackReason,null);
    equal(advice.recommendations.map(p=>({id:p.id,price:p.price})),[{id:id(200),price:180000}]);
    equal(rpcReads,1);
    equal((await search('vong tay','vi',180000,180000)).map(r=>r.id),[id(200)]);
    equal((await search('vong tay','vi',0,179999)).length,0);
    equal((await search('vong tay','vi',0,1e12,id(901))).length,0);
    equal((await search('vong tay','en')).length,0);
    equal((await search('vong tay','vi',0,1e12,null,1)).map(r=>r.id),[id(200)]);
    await db.query("UPDATE products SET discount_start_date=now()+interval '1 day' WHERE id=$1",[id(200)]);
    equal((await search('vong tay','vi',180000,180000)).length,0);
    await db.query("UPDATE products SET discount_start_date=NULL,discount_end_date=now()-interval '1 day' WHERE id=$1",[id(200)]);
    equal((await search('vong tay','vi',200000,200000)).map(r=>r.id),[id(200),id(210)]);
    await db.query('UPDATE products SET is_active=false WHERE id=$1',[id(200)]);
    equal((await search('vong tay')).map(r=>r.id),[id(210)]);
    await db.query('UPDATE product_translations SET title=$1 WHERE product_id=$2',['Từkhóamới',id(201)]);
    equal((await search('tukhoamoi')).map(r=>r.id),[id(201)]);
    equal((await search("'); DROP TABLE products; --")).length,0);
    equal((await db.query('SELECT count(*)::int AS n FROM products')).rows[0].n,161);
    for(let n=300;n<325;n++) await add(n,'Vòng tay lọc ngân sách','vi',{price:1000000000});
    await add(500,'Mặt hàng ngân sách riêng','vi',{price:150000,description:'Vòng tay'});
    equal((await search('vong tay','vi',0,150000)).map(r=>r.id),[id(500)]);
    for(const args of [[null,'vi'],['a','vi'],['ok','fr'],['ok','vi',0,1e12,null,21],['ok','vi',-1],['ok','vi',1.5],['ok','vi',2,1],['ok','vi',0,1e12,'bad/']])
      await denied(()=>search(...args),'22023');
    await db.exec('RESET ROLE; SET enable_seqscan=off');
    const plan=(await db.query("EXPLAIN SELECT id FROM product_translations WHERE locale IN ('vi','en') AND catalog_search_vector(title,description) @@ plainto_tsquery('simple','vong tay')")).rows.map(r=>r['QUERY PLAN']).join('\n');
    equal(plan.includes('catalog_translation_fts_v1'),true);
    await db.exec('SET enable_seqscan=on; SET ROLE anon');
    await denied(()=>search('vong tay'),'42501');
    await denied(()=>db.query("SELECT catalog_search_normalize('ĐẶC BIỆT') AS s"),'42501');
    await db.exec('RESET ROLE; SET ROLE authenticated');
    await denied(()=>search('vong tay'),'42501');
    equal((await db.query("SELECT catalog_search_normalize('ĐẶC BIỆT') AS s")).rows[0].s,'dac biet');
    await db.exec('RESET ROLE; GRANT INSERT ON product_translations TO authenticated; SET ROLE authenticated');
    await db.query('INSERT INTO product_translations(id,product_id,locale,title,description) VALUES(1000,$1,$2,$3,$4)',[id(200),'en','Indexed source write','Fixture']); checks++;
    await db.exec('RESET ROLE');
    const count=(await db.query('SELECT count(*)::int AS n FROM products')).rows[0].n;
    await denied(()=>db.exec(sql),'42723'); await db.exec('ROLLBACK');
    equal((await db.query('SELECT count(*)::int AS n FROM products')).rows[0].n,count);
    await db.exec(pause); checks++;
    equal((await db.query(checker)).rows.map(r=>r.status),['FAIL','PASS','PASS']);
    await db.exec('SET ROLE service_role'); await denied(()=>search('vong tay'),'42501');
    const interrupted=new PGlite();
    try {
      await interrupted.exec(fixture);
      await interrupted.exec("CREATE FUNCTION catalog_search(text,text,numeric,numeric,text,integer) RETURNS jsonb LANGUAGE sql AS $$SELECT '[]'::jsonb$$");
      await denied(()=>interrupted.exec(sql),'42723'); await interrupted.exec('ROLLBACK');
      equal((await interrupted.query("SELECT to_regprocedure('public.catalog_search_normalize(text)') AS helper,to_regclass('public.catalog_translation_fts_v1') AS idx")).rows[0],{helper:null,idx:null});
      equal((await interrupted.query("SELECT to_regprocedure('public.catalog_search(text,text,numeric,numeric,text,integer)') IS NOT NULL AS retained")).rows[0].retained,true);
    } finally {await interrupted.close();}
    const report={batch:'P5-02a',engine:'in-memory PostgreSQL',checks,benchmark,allExpectedResults:true,indexEligible:true,indexPlan:plan,latencyScope:'synthetic_single_engine_not_hosted_load',remoteRequests:0,hostedWrites:0,schema:'PASS',pause:'PASS'};
    if(process.argv[2]) writeFileSync(process.argv[2],JSON.stringify(report,null,2)+'\n');
    console.log(JSON.stringify({...report,benchmark:benchmark.map(x=>({name:x.name,top5Recall:x.top5Recall}))}));
  } finally { await db.close(); }
})().catch(error=>{console.error(error.message);process.exitCode=1;});
