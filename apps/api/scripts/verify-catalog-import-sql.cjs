// Real PostgreSQL/WASM, in memory only. Never connects to Supabase.
const {PGlite}=require('@electric-sql/pglite');
const {readFileSync}=require('node:fs');
const {randomUUID}=require('node:crypto');
const assert=require('node:assert/strict');
const path=require('node:path');
(async()=>{
 const db=new PGlite();let passed=0;
 try{
  await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
    CREATE TYPE product_style AS ENUM ('zen','traditional','both');
    CREATE TYPE content_locale AS ENUM ('vi','en');
    CREATE TABLE categories(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),slug text UNIQUE NOT NULL,is_active boolean DEFAULT true);
    CREATE TABLE category_translations(id serial PRIMARY KEY,category_id uuid REFERENCES categories(id),locale content_locale,name text NOT NULL,description text,UNIQUE(category_id,locale));
    CREATE TABLE products(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),slug text UNIQUE NOT NULL,price numeric NOT NULL,quantity integer NOT NULL,category_id uuid REFERENCES categories(id),images text[] NOT NULL,is_active boolean DEFAULT true,style product_style DEFAULT 'both',variants jsonb DEFAULT '[]');
    CREATE TABLE product_translations(id serial PRIMARY KEY,product_id uuid REFERENCES products(id),locale content_locale,title text NOT NULL CHECK(title<>'FAIL'),description text,UNIQUE(product_id,locale));`);
  const sql=readFileSync(path.resolve(__dirname,'../migrations/admin-catalog-import.sql'),'utf8');
  await db.exec(sql);await db.exec(sql);passed++;
  const actor=randomUUID();const hash='a'.repeat(64);
  const invoke=async(resource,row,mode='skip',id=randomUUID(),digest=hash)=>{
    const result=await db.query('SELECT public.admin_import_catalog_row($1,$2::jsonb,$3,$4::uuid,$5::uuid,$6) AS result',[resource,JSON.stringify(row),mode,id,actor,digest]);
    return result.rows[0].result;
  };
  await assert.rejects(invoke('__configuration_probe__',{}),/Invalid catalog import input/);passed++;
  const category=await invoke('categories',{slug:'vong-tay',name:'Vòng tay',name_en:'Bracelets',description:'Giữ mô tả',images:[]});
  assert.equal(category.action,'created');assert.equal((await db.query('SELECT * FROM category_translations')).rows.length,2);passed++;
  const product={slug:'vong-8mm',name:'Vòng 8 mm',name_en:'Bracelet',description:'Mô tả gốc',category:'vong-tay',price:850000,quantity:20,images:['https://example.test/photo.webp']};
  const request=randomUUID();const created=await invoke('products',product,'skip',request);
  assert.equal(created.action,'created');assert.equal((await db.query('SELECT * FROM product_translations')).rows.length,2);passed++;
  const replay=await invoke('products',product,'skip',request);assert.equal(replay.id,created.id);assert.equal(replay.replayed,true);passed++;
  await assert.rejects(invoke('products',product,'update',request,'b'.repeat(64)),/different data/);passed++;
  const skipped=await invoke('products',{...product,name:'Không ghi đè'});assert.equal(skipped.action,'skipped');
  assert.equal((await db.query("SELECT title FROM product_translations WHERE locale='vi'")).rows[0].title,'Vòng 8 mm');passed++;
  await db.exec("UPDATE products SET style='zen',variants='[{\"name\":\"size\"}]'");
  const updated=await invoke('products',{slug:'vong-8mm',name:'Tên mới',category:'vong-tay',price:12.5,quantity:9,images:[]},'update');assert.equal(updated.action,'updated');
  const stored=(await db.query('SELECT * FROM products')).rows[0];assert.equal(Number(stored.price),12.5);assert.equal(stored.quantity,9);assert.deepEqual(stored.images,product.images);assert.equal(stored.style,'zen');assert.equal(stored.variants[0].name,'size');
  const vi=(await db.query("SELECT * FROM product_translations WHERE locale='vi'")).rows[0];assert.equal(vi.description,'Mô tả gốc');
  const en=(await db.query("SELECT * FROM product_translations WHERE locale='en'")).rows[0];assert.equal(en.title,'Bracelet');passed++;
  const failedId=randomUUID();await assert.rejects(invoke('products',{...product,slug:'failed-row',name_en:'FAIL'},'skip',failedId));
  assert.equal((await db.query("SELECT count(*)::int AS n FROM products WHERE slug='failed-row'")).rows[0].n,0);
  assert.equal((await db.query('SELECT count(*)::int AS n FROM admin_catalog_imports WHERE request_id=$1',[failedId])).rows[0].n,0);passed++;
  await assert.rejects(invoke('products',{...product,slug:'missing-cat',category:'unknown'}),/Category not found/);passed++;
  const privileges=await db.query("SELECT has_function_privilege('authenticated','public.admin_import_catalog_row(text,jsonb,text,uuid,uuid,text)','EXECUTE') AS execute,has_table_privilege('authenticated','public.admin_catalog_imports','SELECT') AS read");
  assert.equal(privileges.rows[0].execute,false);assert.equal(privileges.rows[0].read,false);passed++;
  console.log(JSON.stringify({postgres:'PGlite in-memory',checksPassed:passed,liveDatabaseChanges:0}));
 }finally{await db.close();}
})().catch(error=>{console.error(error.message);process.exitCode=1;});
