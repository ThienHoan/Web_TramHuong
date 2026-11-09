import type { Metadata } from 'next';
import { getProductsPaginated, getCategories } from '@/lib/api-client';
import ShopCatalog from '@/components/shop/ShopCatalog';
import TraditionalProductList from '@/components/traditional/TraditionalProductList';
import BreadcrumbJsonLd from '@/components/seo/BreadcrumbJsonLd';
import { parseCatalogFilters, type SearchValues } from '@/lib/catalog';
import { catalogResults } from '@/lib/catalog-results';
import type { Product } from '@/types/product';
import { isCollectionOverview } from '@/lib/collections';

type Props={params:Promise<{locale:string}>;searchParams:Promise<SearchValues>};
export async function generateMetadata({params,searchParams}:Props):Promise<Metadata> {
  const {locale}=await params, f=parseCatalogFilters(await searchParams), en=locale!=='vi';
  const filtered=!!(f.search||f.category||f.min_price||f.max_price||f.sort!=='recommended');
  const path=`/${locale}/products${f.page>1?`?page=${f.page}`:''}`;
  return {title:`${en?'Vietnamese Agarwood · Products & Prices':'Sản phẩm trầm hương · Hình ảnh & giá bán'}${f.page>1?` · ${en?'Page':'Trang'} ${f.page}`:''}`,description:en?'Explore Thien Phuc agarwood. Compare photos, prices and product options, and get advice before ordering.':'Khám phá trầm hương Thiên Phúc: xem hình ảnh, giá bán, phân loại và thông số sản phẩm. Tìm sản phẩm theo nhu cầu, ngân sách và nhận tư vấn trước khi mua.',alternates:{canonical:path,languages:{vi:`/vi/products${f.page>1?`?page=${f.page}`:''}`,en:`/en/products${f.page>1?`?page=${f.page}`:''}`}},robots:filtered?{index:false,follow:true}:undefined};
}
export default async function ProductsPage({params,searchParams}:Props) {
  const {locale}=await params, filters=parseCatalogFilters(await searchParams);
  const categories=await getCategories(locale);
  const category=categories.find(c=>c.slug===filters.category || c.id===filters.category);
  const sort=filters.sort==='price-asc'?'price:asc':filters.sort==='price-desc'?'price:desc':filters.sort==='newest'?'created_at:desc':undefined;
  const options={category:category?.slug || filters.category || undefined, sort};
  let result;
  if(filters.search || filters.min_price || filters.max_price || filters.sort.startsWith('price-')) {
    // Cached API pages let search ignore Vietnamese accents and budgets match
    // actual discounted variant prices, rather than the parent's base price.
    const candidates:Product[]=[], seen=new Set<string>();
    for(let page=1;;page++) {
      const response=await getProductsPaginated(locale,{...options,sort:filters.sort==='newest'?'created_at:desc':undefined,limit:100,page});
      const fresh=response.data.filter(p=>!seen.has(p.id));
      fresh.forEach(p=>{seen.add(p.id);candidates.push(p);});
      if(!fresh.length || page>=(response.meta?.last_page || 1))break;
    }
    result=catalogResults(candidates,filters);
  } else result=await getProductsPaginated(locale,{...options,limit:12,page:filters.page});
  const {data:products,meta}=result;
  return <><BreadcrumbJsonLd locale={locale} items={[{name:locale==='vi'?'Trang chủ':'Home',item:`/${locale}`},{name:locale==='vi'?'Bộ sưu tập':'Products',item:`/${locale}/products`},...(category?[{name:category.translation?.name || category.slug,item:`/${locale}/products/category/${category.slug}`}]:[])]}/>{isCollectionOverview(locale,filters) ? <TraditionalProductList products={products} categories={categories}/> : <ShopCatalog products={products} categories={categories} filters={filters} pagination={meta} locale={locale}/>}</>;
}
