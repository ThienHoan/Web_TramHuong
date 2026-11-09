import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getCategories } from '@/lib/api-client';
import ProductsPage from '../../page';
import { parseCatalogFilters, type SearchValues } from '@/lib/catalog';
import { plainDescription } from '@/lib/seo';

type Props={params:Promise<{locale:string;category:string}>;searchParams:Promise<SearchValues>};
export async function generateMetadata({params,searchParams}:Props):Promise<Metadata> {
  const {locale,category:slug}=await params, categories=await getCategories(locale), category=categories.find(c=>c.slug===slug&&c.is_active);
  if(!category)return {title:'Thiên Phúc',robots:{index:false,follow:true}};
  const f=parseCatalogFilters(await searchParams), en=locale!=='vi', name=category.translation?.name || slug;
  const suffix=f.page>1?`?page=${f.page}`:'';
  return {title:`${name} · ${en?'Photos, options & prices':'Hình ảnh, phân loại & giá bán'}${f.page>1?` · ${en?'Page':'Trang'} ${f.page}`:''}`,description:plainDescription(category.translation?.description,en?`Explore ${name} at Thien Phuc. View photos, compare prices and get advice before buying.`:`Khám phá ${name} tại Thiên Phúc. Xem ảnh, so sánh giá, lựa chọn phân loại và nhận tư vấn trước khi mua.`),alternates:{canonical:`/${locale}/products/category/${slug}${suffix}`,languages:{vi:`/vi/products/category/${slug}${suffix}`,en:`/en/products/category/${slug}${suffix}`}},robots:(f.search||f.min_price||f.max_price||f.sort!=='recommended')?{index:false,follow:true}:undefined};
}
export default async function CategoryPage({params,searchParams}:Props) {
  const {locale,category:slug}=await params, categories=await getCategories(locale);
  if(!categories.some(c=>c.slug===slug&&c.is_active))notFound();
  return ProductsPage({params:Promise.resolve({locale}),searchParams:Promise.resolve({...await searchParams,category:slug})});
}
