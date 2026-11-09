import type { MetadataRoute } from 'next';
import { getProductsPaginated, getPosts, getCategories } from '@/lib/api-client';
import { absoluteUrl } from '@/lib/seo';

const locales=['vi','en'];
const validDate=(value?:string)=>value&&!Number.isNaN(Date.parse(value))?new Date(value):undefined;
export default async function sitemap():Promise<MetadataRoute.Sitemap> {
  const entries:MetadataRoute.Sitemap=[];
  for(const locale of locales){
    for(const path of ['','/products','/blog','/contact','/partnership']) entries.push({url:absoluteUrl(`/${locale}${path}`),alternates:{languages:Object.fromEntries(locales.map(lang=>[lang,absoluteUrl(`/${lang}${path}`)]))}});
    const categories=await getCategories(locale);
    for(const category of categories.filter(c=>c.is_active)) entries.push({url:absoluteUrl(`/${locale}/products/category/${category.slug}`),alternates:{languages:Object.fromEntries(locales.map(lang=>[lang,absoluteUrl(`/${lang}/products/category/${category.slug}`)]))}});
    const seen=new Set<string>();
    for(let page=1;;page++){
      const {data,meta}=await getProductsPaginated(locale,{limit:100,page});
      const fresh=data.filter(p=>p.is_active!==false&&!seen.has(p.id));
      for(const product of fresh){seen.add(product.id);entries.push({url:absoluteUrl(`/${locale}/products/${product.slug}`),lastModified:validDate(product.updated_at),images:product.images?.map(absoluteUrl),alternates:{languages:Object.fromEntries(locales.map(lang=>[lang,absoluteUrl(`/${lang}/products/${product.slug}`)]))}});}
      if(!fresh.length||page>=(meta?.last_page||1))break;
    }
  }
  const seenPosts=new Set<string>();
  for(let page=1;;page++){
    const {data,meta}=await getPosts({status:'published',limit:100,page});
    const fresh=data.filter(post=>!seenPosts.has(post.id));
    for(const post of fresh){seenPosts.add(post.id);for(const locale of locales)entries.push({url:absoluteUrl(`/${locale}/blog/${post.slug}`),lastModified:validDate(post.published_at||post.created_at)});}
    if(!fresh.length||page>=(meta.totalPages||1))break;
  }
  return entries;
}
