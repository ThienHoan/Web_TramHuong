import { getProductsPaginated } from '@/lib/api-client';
import type { Category } from '@/types/product';

/** IDs of categories that have at least one active product. */
export async function stockedCategoryIds(locale: string): Promise<Set<string>> {
  const ids = new Set<string>();
  const seen = new Set<string>();
  for (let page = 1; ; page++) {
    const { data, meta } = await getProductsPaginated(locale, { limit: 100, page });
    const fresh = data.filter(product => !seen.has(product.id));
    for (const product of fresh) {
      seen.add(product.id);
      if (product.is_active === false) continue;
      if (product.category_id) ids.add(String(product.category_id));
      if (product.category?.id) ids.add(String(product.category.id));
    }
    if (!fresh.length || page >= (meta?.last_page || 1)) break;
  }
  return ids;
}

/**
 * Active categories worth linking to. Empty ones are left out so shoppers and
 * crawlers are not sent to a page with nothing to buy (Search Console reports
 * those as soft 404s). `keep` stays in the list even when empty, e.g. the
 * category page currently being viewed.
 */
export async function linkableCategories(locale: string, categories: Category[], keep?: string): Promise<Category[]> {
  const stocked = await stockedCategoryIds(locale);
  return categories.filter(c => c.is_active !== false && (stocked.has(String(c.id)) || (!!keep && (c.slug === keep || c.id === keep))));
}
