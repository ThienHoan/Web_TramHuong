import { permanentRedirect } from 'next/navigation';
import { catalogHref, parseCatalogFilters, type SearchValues } from '@/lib/catalog';
import { getCategories } from '@/lib/api-client';

export default async function LegacyCatalog({params,searchParams}:{params:Promise<{locale:string}>;searchParams:Promise<SearchValues>}) {
  const {locale}=await params, filters=parseCatalogFilters(await searchParams);
  if(filters.category){const categories=await getCategories(locale);filters.category=categories.find(c=>c.id===filters.category)?.slug || filters.category;}
  permanentRedirect(`/${locale}${catalogHref(filters)}`);
}
