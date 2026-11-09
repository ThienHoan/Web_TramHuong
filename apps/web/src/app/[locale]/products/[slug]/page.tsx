import { getProduct, getProducts, getReviews } from '@/lib/api-client';
import TraditionalProductDetail from '@/components/traditional/TraditionalProductDetail';
import BreadcrumbJsonLd from '@/components/seo/BreadcrumbJsonLd';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { cache } from 'react';
import { firstAvailableVariant, variantKey } from '@/lib/commerce';
import { plainDescription } from '@/lib/seo';

const loadProduct=cache(getProduct);
type Props={params:Promise<{locale:string;slug:string}>;searchParams:Promise<{variant?:string}>};
export async function generateMetadata({params}:Props):Promise<Metadata> {
  const {locale,slug}=await params, product=await loadProduct(slug,locale);
  if(!product)return {title:locale==='vi'?'Không tìm thấy sản phẩm':'Product not found',robots:{index:false,follow:true}};
  const title=product.translation?.title || product.title || 'Thiên Phúc';
  const description=plainDescription(product.translation?.short_description || product.translation?.description,locale==='vi'?`Xem hình ảnh, giá bán và phân loại ${title} tại Thiên Phúc. Tư vấn trước khi mua, đặt hàng không cần tài khoản.`:`Explore photos, prices and options for ${title} at Thien Phuc. Ask for advice and checkout without an account.`);
  return {title,description,openGraph:{title,description,url:`/${locale}/products/${slug}`,images:product.images?.[0]?[{url:product.images[0],alt:title}]:undefined},alternates:{canonical:`/${locale}/products/${slug}`,languages:{vi:`/vi/products/${slug}`,en:`/en/products/${slug}`}}};
}
export default async function ProductPage({params,searchParams}:Props) {
  const {locale,slug}=await params, product=await loadProduct(slug,locale);
  if(!product || product.is_active===false)notFound();
  const [{variant:requested},reviews,related]=await Promise.all([searchParams,getReviews(product.id),getProducts(locale,{categoryId:product.category_id,limit:5})]);
  const match=product.variants?.findIndex((v,index)=>variantKey(v,index)===requested) ?? -1;
  const variantIndex=match>=0?match:firstAvailableVariant(product);
  const ratedProduct={...product,rating_average:Number(reviews.meta?.average||0),review_count:reviews.meta?.total||0};
  return <><BreadcrumbJsonLd locale={locale} items={[{name:locale==='vi'?'Trang chủ':'Home',item:`/${locale}`},{name:locale==='vi'?'Sản phẩm':'Products',item:`/${locale}/products`},{name:product.translation?.title||product.title||'Thiên Phúc',item:`/${locale}/products/${slug}`}]}/><TraditionalProductDetail key={`${product.id}-${requested||''}`} product={ratedProduct} relatedProducts={related.filter(p=>p.id!==product.id).slice(0,4)} initialReviews={reviews} initialVariantIndex={variantIndex}/></>;
}
