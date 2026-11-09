export type CatalogFilters = { search: string; category: string; min_price: string; max_price: string; sort: string; page: number };
export type SearchValues = Record<string, string | string[] | undefined>;
export function parseCatalogFilters(params: SearchValues): CatalogFilters {
  const text=(key:string)=>typeof params[key]==='string' ? params[key].trim() : '';
  const money=(key:string)=>text(key) && Number.isFinite(Number(text(key))) && Number(text(key))>=0 ? String(Number(text(key))) : '';
  const page=Number(text('page'));
  let min=money('min_price'), max=money('max_price');
  if(min && max && Number(min)>Number(max)) [min,max]=[max,min];
  return {search:text('search').slice(0,160), category:text('category')==='all'?'':text('category'), min_price:min,max_price:max,sort:['newest','price-asc','price-desc'].includes(text('sort'))?text('sort'):'recommended', page:Number.isSafeInteger(page)&&page>0?Math.min(page,10000):1};
}
/** Vietnamese /products with no filters is the chapter overview, so the flat list needs a sort. */
export function allProductsHref(locale: string) {
  return locale === 'vi' ? '/products?sort=newest' : '/products';
}
export function catalogHref(filters: CatalogFilters, changes: Partial<CatalogFilters> = {}) {
  const value={...filters,...changes}, query=new URLSearchParams();
  for(const key of ['search','category','min_price','max_price','sort'] as const) if(value[key] && value[key]!=='recommended') query.set(key,value[key]);
  if(value.page>1) query.set('page',String(value.page));
  return `/products${query.size?`?${query}`:''}`;
}
