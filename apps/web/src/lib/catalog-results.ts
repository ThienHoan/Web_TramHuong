import type { Product } from '@/types/product';
import { discountPrice, priceRange } from './commerce';
import type { CatalogFilters } from './catalog';

const searchable=(value:string)=>value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').replace(/Đ/g,'D').toLowerCase().replace(/[-_]/g,' ');
export function catalogResults(products:Product[], filters:CatalogFilters, limit=12) {
  const words=searchable(filters.search).split(/\s+/).filter(Boolean);
  const matched=products.filter(product=>{
    if(product.is_active===false)return false;
    const text=searchable([product.slug,product.translation?.title,product.title,product.translation?.short_description,product.category?.translation?.name].filter(Boolean).join(' '));
    if(!words.every(word=>text.includes(word)))return false;
    const prices=product.variants?.length?product.variants.map(v=>discountPrice(product,Number(v.price))):[discountPrice(product)];
    return prices.some(price=>(!filters.min_price||price>=Number(filters.min_price))&&(!filters.max_price||price<=Number(filters.max_price)));
  });
  if(filters.sort==='price-asc'||filters.sort==='price-desc')matched.sort((a,b)=>(priceRange(a).min-priceRange(b).min)*(filters.sort==='price-desc'?-1:1));
  const total=matched.length;
  return {data:matched.slice((filters.page-1)*limit,filters.page*limit),meta:{total,page:filters.page,limit,last_page:Math.max(1,Math.ceil(total/limit))}};
}
