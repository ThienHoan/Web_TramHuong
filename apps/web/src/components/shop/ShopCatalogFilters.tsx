import { ChevronDown, Search } from 'lucide-react';
import { Link } from '@/i18n/routing';
import { catalogHref, type CatalogFilters } from '@/lib/catalog';
import type { Category } from '@/types/product';

type FilterProps = {
  categories: Category[];
  filters: CatalogFilters;
  locale: string;
};

/** Category links only: each page wraps them in its own <nav> layout. */
export function ShopCategoryLinks({ categories, filters, locale }: FilterProps) {
  const t = (vi: string, en: string) => locale === 'vi' ? vi : en;
  const category = categories.find(c => c.slug === filters.category || c.id === filters.category);
  const unfiltered = !filters.search && !filters.min_price && !filters.max_price && filters.sort === 'recommended';
  const allHref = catalogHref(filters, { category: '', page: 1, ...(locale === 'vi' && unfiltered ? { sort: 'newest' } : {}) });

  return <>
    <Link href={allHref} aria-current={!filters.category ? 'page' : undefined}>{t('Tất cả sản phẩm', 'All products')}</Link>
    {categories.filter(c => c.is_active !== false).map(c => <Link key={c.id} href={`/products/category/${c.slug}`} aria-current={category?.id === c.id ? 'page' : undefined}>{c.translation?.name || c.slug}</Link>)}
  </>;
}

export default function ShopCatalogFilters({ filters, locale }: Omit<FilterProps, 'categories'>) {
  const t = (vi: string, en: string) => locale === 'vi' ? vi : en;

  return <form action={`/${locale}/products`} method="get" className="shop-catalog-form" role="search">
    {filters.category && <input type="hidden" name="category" value={filters.category} />}
    <div className="shop-search-field">
      <label htmlFor="catalog-search" className="sr-only">{t('Tìm sản phẩm', 'Find a product')}</label>
      <Search size={18} aria-hidden="true" />
      <input data-bare id="catalog-search" name="search" type="search" defaultValue={filters.search} placeholder={t('Tên sản phẩm, loại trầm…', 'Product name or agarwood type…')} />
    </div>
    <details className="shop-price-filters">
      <summary>{t('Ngân sách', 'Budget')}{(filters.min_price || filters.max_price) ? ' · ' + t('Đang áp dụng', 'Applied') : ''}<ChevronDown size={15} aria-hidden="true" /></summary>
      <div>
        <label>{t('Giá từ (₫)', 'Minimum (VND)')}<input name="min_price" type="number" min="0" inputMode="numeric" defaultValue={filters.min_price} placeholder="0" /></label>
        <label>{t('Đến (₫)', 'Maximum (VND)')}<input name="max_price" type="number" min="0" inputMode="numeric" defaultValue={filters.max_price} placeholder={t('Không giới hạn', 'No limit')} /></label>
        <button className="shop-btn shop-btn-secondary" type="submit">{t('Áp dụng giá', 'Apply budget')}</button>
      </div>
    </details>
    <div className="shop-sort-field">
      <label htmlFor="catalog-sort">{t('Sắp xếp', 'Sort by')}</label>
      <select data-bare id="catalog-sort" name="sort" defaultValue={filters.sort}>
        <option value="recommended">{t('Gợi ý từ cửa hàng', 'Recommended')}</option>
        <option value="newest">{t('Mới nhất', 'Newest')}</option>
        <option value="price-asc">{t('Giá thấp đến cao', 'Price: low to high')}</option>
        <option value="price-desc">{t('Giá cao đến thấp', 'Price: high to low')}</option>
      </select>
    </div>
    <button className="shop-btn" type="submit">{t('Tìm kiếm', 'Search')}</button>
  </form>;
}
