import type { Product } from '@/types/product';
import type { CatalogFilters } from './catalog';

export function isCollectionOverview(locale: string, filters: CatalogFilters) {
  return locale === 'vi' && filters.page === 1 && !filters.search && !filters.category &&
    !filters.min_price && !filters.max_price && filters.sort === 'recommended';
}

export function collectionChapters(products: Product[]) {
  const chapters: Record<'chapter_1' | 'chapter_2' | 'chapter_3', Product[]> = {
    chapter_1: [], chapter_2: [], chapter_3: [],
  };
  for (const product of products) {
    if (product.is_active === false) continue;
    const assigned = product.featured_section;
    if (assigned === 'chapter_1' || assigned === 'chapter_2' || assigned === 'chapter_3') {
      chapters[assigned].push(product);
    } else if (/qua-tang|gift/.test(product.category?.slug || '')) {
      chapters.chapter_3.push(product);
    } else if (product.is_featured) {
      chapters.chapter_1.push(product);
    } else {
      // Unassigned products stay discoverable instead of disappearing from all chapters.
      chapters.chapter_2.push(product);
    }
  }
  return chapters;
}
