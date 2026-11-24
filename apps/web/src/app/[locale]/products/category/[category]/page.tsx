import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getCategories, getProductsPaginated } from '@/lib/api-client';
import ProductsPage from '../../page';
import { parseCatalogFilters, type SearchValues } from '@/lib/catalog';
import { plainDescription } from '@/lib/seo';

type Props={params:Promise<{locale:string;category:string}>;searchParams:Promise<SearchValues>};
export async function generateMetadata({params,searchParams}:Props):Promise<Metadata> {
  const {locale,category:slug}=await params, categories=await getCategories(locale), category=categories.find(c=>c.slug===slug&&c.is_active);
  if(!category)return {title:'Thiên Phúc',robots:{index:false,follow:true}};
  const f=parseCatalogFilters(await searchParams), en=locale!=='vi', name=category.translation?.name || slug;
  const {data: products}=await getProductsPaginated(locale,{category:slug,limit:1,page:1});
  const rawDescription=category.translation?.description || '';
  const description=rawDescription.length>=80?rawDescription:en?`${rawDescription} View photos, prices and options for ${name} at Thien Phuc Hue.`:`${rawDescription} Xem ảnh thật, giá bán và phân loại ${name} tại Thiên Phúc Huế.`;
  const suffix=f.page>1?`?page=${f.page}`:'';
  return {title:`${name} · ${en?'Photos, options & prices':'Hình ảnh, phân loại & giá bán'}${f.page>1?` · ${en?'Page':'Trang'} ${f.page}`:''}`,description:plainDescription(description),alternates:{canonical:`/${locale}/products/category/${slug}${suffix}`,languages:{'x-default':`/vi/products/category/${slug}${suffix}`,vi:`/vi/products/category/${slug}${suffix}`,en:`/en/products/category/${slug}${suffix}`}},robots:(!products.some(p=>p.is_active!==false)||f.search||f.min_price||f.max_price||f.sort!=='recommended')?{index:false,follow:true}:undefined};
}
export default async function CategoryPage({params,searchParams}:Props) {
  const {locale,category:slug}=await params, categories=await getCategories(locale);
  if(!categories.some(c=>c.slug===slug&&c.is_active))notFound();
  return ProductsPage({params:Promise.resolve({locale}),searchParams:Promise.resolve({...await searchParams,category:slug})});
}
