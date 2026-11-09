const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'), path=require('node:path'), vm=require('node:vm'), ts=require('typescript');
function load(file,imports={}) {
  const source=ts.transpileModule(fs.readFileSync(path.join(__dirname,'../src',file),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;
  const module={exports:{}};
  vm.runInNewContext(source,{module,exports:module.exports,require:name=>imports[name]||require(name),process,URL,URLSearchParams,console,Date,Intl,Set});
  return module.exports;
}
const commerce=load('lib/commerce.ts'), catalog=load('lib/catalog.ts'), seo=load('lib/seo.ts');
const collections=load('lib/collections.ts');
const ProductJsonLd=load('components/seo/ProductJsonLd.tsx',{'@/lib/commerce':commerce,'@/lib/seo':seo}).default;
const product={id:'product-1',slug:'nhang-tram',price:100000,quantity:8,stock:8,is_active:true,discount_percentage:20,images:['/product.jpg'],translation:{title:'Nhang trầm',description:'Hương gỗ'},variants:[{name:'Loại nhỏ',price:50000},{name:'Loại lớn',price:100000,stock:0}]};

test('legacy named variants inherit shared stock; explicit sold-out variants remain sold out',()=>{
 assert.equal(commerce.productStock(product,product.variants[0]),8);
 assert.equal(commerce.productStock(product,product.variants[1]),0);
 assert.equal(commerce.productStock({...product,quantity:0}, {...product.variants[0],stock:99}),0);
 assert.equal(commerce.variantKey(product.variants[0],0),'Loại nhỏ');
 assert.equal(commerce.firstAvailableVariant(product),0);
});
test('display range uses active discounts and scheduled discounts expire',()=>{
 assert.equal(commerce.priceRange(product).min,40000);
 assert.equal(commerce.priceRange(product).max,80000);
 assert.equal(commerce.discountPrice({...product,discount_end_date:'2020-01-01'},50000,new Date('2026-11-09')),50000);
});
test('invalid catalog parameters cannot send NaN, negative budgets or negative pages',()=>{
 const result=catalog.parseCatalogFilters({page:'-1',min_price:'NaN',max_price:'-3',sort:'price:drop',category:'all',search:['untrusted']});
 assert.equal(result.page,1);assert.equal(result.min_price,'');assert.equal(result.max_price,'');assert.equal(result.search,'');assert.equal(result.category,'');assert.equal(result.sort,'recommended');
 const range=catalog.parseCatalogFilters({min_price:'200000',max_price:'50000'});assert.equal(range.min_price,'50000');assert.equal(range.max_price,'200000');
});
test('pagination preserves search and category with crawlable query URLs',()=>{
 const filters=catalog.parseCatalogFilters({search:'nhang trầm',category:'nhang-bot'});
 const url=new URL(catalog.catalogHref(filters,{page:2}),'https://example.test');
 assert.equal(url.pathname,'/products');assert.equal(url.searchParams.get('search'),'nhang trầm');assert.equal(url.searchParams.get('category'),'nhang-bot');assert.equal(url.searchParams.get('page'),'2');
});
test('collection story remains the default; filters, category pages and pagination keep showing results',()=>{
 assert.equal(collections.isCollectionOverview('vi',catalog.parseCatalogFilters({})),true);
 for(const query of [{search:'nhang'},{category:'nhang-bot'},{min_price:'0'},{max_price:'0'},{sort:'newest'},{page:'2'}]) {
  assert.equal(collections.isCollectionOverview('vi',catalog.parseCatalogFilters(query)),false);
 }
 assert.equal(collections.isCollectionOverview('en',catalog.parseCatalogFilters({})),false);
});
test('chapter assignments win and every active unassigned product remains discoverable',()=>{
 const items=[
  {...product,id:'assigned',featured_section:'chapter_2',is_featured:true,category:{slug:'qua-tang'}},
  {...product,id:'gift',category:{slug:'qua-tang'}},
  {...product,id:'featured',is_featured:true},
  {...product,id:'unassigned',price:30000},
  {...product,id:'hidden',is_active:false},
 ];
 const chapters=collections.collectionChapters(items);
 assert.equal(chapters.chapter_1[0].id,'featured');
 assert.equal(chapters.chapter_3[0].id,'gift');
 assert.equal(chapters.chapter_2.map(p=>p.id).join(','),'assigned,unassigned');
 const ids=Object.values(chapters).flat().map(p=>p.id);
 assert.equal(new Set(ids).size,4);
 assert.equal(ids.includes('hidden'),false);
});
test('product markup matches payable VND price, selected option, localized URL and availability',()=>{
 const read=(props)=>JSON.parse(ProductJsonLd(props).props.dangerouslySetInnerHTML.__html);
 const schema=read({product,locale:'en',variantIndex:0});
 assert.equal(schema.offers.price,40000);assert.equal(schema.offers.priceCurrency,'VND');
 assert.equal(new URL(schema.offers.url).pathname,'/en/products/nhang-tram');assert.equal(new URL(schema.offers.url).searchParams.get('variant'),'Loại nhỏ');
 assert.equal(schema.offers.availability,'https://schema.org/InStock');
 assert.equal(schema.offers.shippingDetails,undefined);assert.equal(schema.offers.hasMerchantReturnPolicy,undefined);assert.equal(schema.aggregateRating,undefined);
 assert.equal(read({product,variantIndex:1}).offers.availability,'https://schema.org/OutOfStock');
 assert.equal(read({product:{...product,rating_average:4.5,review_count:2}}).aggregateRating.reviewCount,2);
});
test('JSON-LD escapes product text so content cannot terminate its script',()=>{
 const html=ProductJsonLd({product:{...product,translation:{title:'</script><script>alert(1)</script>'}}}).props.dangerouslySetInnerHTML.__html;
 assert.equal(html.includes('</script>'),false);assert.equal(JSON.parse(html).name,'</script><script>alert(1)</script>');
});
test('API catalog normalization keeps server stock and translated category information',async()=>{
 const service=load('services/product-service.ts',{'./base-http':{buildUrl:()=>'/fixture',fetchWithAuth:async()=>({data:[{...product,quantity:undefined,category:{id:'cat',slug:'incense',translations:[{locale:'en',name:'Incense'}]}}]})}}).productService;
 const {data}=await service.getProductsPaginated('en');assert.equal(data[0].stock,8);assert.equal(data[0].category.translation.name,'Incense');
});
const results=load('lib/catalog-results.ts',{'./commerce':commerce}).catalogResults;
test('Vietnamese unaccented search and budgets match discounted variants rather than the parent price',()=>{
 const f=catalog.parseCatalogFilters({search:'nhang tram',max_price:'45000'});
 const result=results([product],f);assert.equal(result.meta.total,1);assert.equal(result.data[0].id,'product-1');
 assert.equal(results([product],catalog.parseCatalogFilters({min_price:'50000',max_price:'70000'})).meta.total,0);
});
