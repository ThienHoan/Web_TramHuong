'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { ChevronDown, Search, SlidersHorizontal } from 'lucide-react';
import { Link } from '@/i18n/routing';
import { catalogHref, type CatalogFilters } from '@/lib/catalog';
import type { Category } from '@/types/product';
import { Sheet, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from '@/components/ui/sheet';

type FilterProps = { categories: Category[]; filters: CatalogFilters; locale: string };

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

export default function ShopCatalogFilters({ filters, locale, resultCount }: Omit<FilterProps, 'categories'> & { resultCount?: number }) {
  const t = (vi: string, en: string) => locale === 'vi' ? vi : en;
  const [open, setOpen] = useState(false);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const id = useId();
  useEffect(() => {
    const desktop = window.matchMedia('(min-width: 768px)');
    const changed = () => { if (desktop.matches) setOpen(false); };
    desktop.addEventListener('change', changed);
    return () => desktop.removeEventListener('change', changed);
  }, []);
  const sorts = [
    ['recommended', t('Gợi ý từ cửa hàng', 'Recommended')],
    ['newest', t('Mới nhất', 'Newest')],
    ['price-asc', t('Giá thấp đến cao', 'Price: low to high')],
    ['price-desc', t('Giá cao đến thấp', 'Price: high to low')],
  ];
  // Vietnamese "all products" uses newest as its default; "recommended" with no other
  // filter is the chapter overview, so resetting must not jump there.
  const defaultSort = locale === 'vi' ? 'newest' : 'recommended';
  const active = Number(!!(filters.min_price || filters.max_price)) + Number(filters.sort !== 'recommended' && filters.sort !== defaultSort);
  const clearHref = catalogHref(filters, { min_price: '', max_price: '', sort: defaultSort, page: 1 });
  const action = `/${locale}/products`;
  return <>
    <form action={action} method="get" className="shop-catalog-form shop-catalog-desktop" role="search">
      {filters.category && <input type="hidden" name="category" value={filters.category} />}
      <div className="shop-search-field">
        <label htmlFor={`${id}-desktop-search`} className="sr-only">{t('Tìm sản phẩm', 'Find a product')}</label>
        <Search size={18} aria-hidden="true" />
        <input data-bare id={`${id}-desktop-search`} name="search" type="search" defaultValue={filters.search} placeholder={t('Tìm sản phẩm', 'Product name')} />
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
        <label htmlFor={`${id}-desktop-sort`}>{t('Sắp xếp', 'Sort by')}</label>
        <select data-bare id={`${id}-desktop-sort`} name="sort" defaultValue={filters.sort}>{sorts.map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select>
      </div>
      <button className="shop-btn" type="submit">{t('Tìm kiếm', 'Search')}</button>
    </form>
    <div className="shop-catalog-mobile">
      <form action={action} method="get" className="shop-mobile-search" role="search">
        {filters.category && <input type="hidden" name="category" value={filters.category} />}
        {!!filters.min_price && <input type="hidden" name="min_price" value={filters.min_price} />}
        {!!filters.max_price && <input type="hidden" name="max_price" value={filters.max_price} />}
        <input type="hidden" name="sort" value={filters.sort} />
        <label htmlFor={`${id}-mobile-search`} className="sr-only">{t('Tìm sản phẩm', 'Find a product')}</label>
        <input data-bare id={`${id}-mobile-search`} name="search" type="search" defaultValue={filters.search} placeholder={t('Tìm sản phẩm…', 'Find products…')} />
        <button data-bare type="submit" aria-label={t('Tìm kiếm', 'Search')}><Search size={20} aria-hidden="true"/></button>
      </form>
      <div className="shop-mobile-toolbar">
        {resultCount !== undefined ? <p role="status">{resultCount} {t('sản phẩm', 'products')}</p> : <span>{sorts.find(([value]) => value === filters.sort)?.[1]}</span>}
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild><button type="button" className="shop-mobile-filter-trigger"><SlidersHorizontal size={18} aria-hidden="true"/>{t('Lọc & sắp xếp', 'Filter & sort')}{active>0 && <span>{active}</span>}</button></SheetTrigger>
          <SheetContent side="bottom" className="shop-filter-sheet" onOpenAutoFocus={event => { event.preventDefault(); titleRef.current?.focus(); }}>
            <header><SheetTitle ref={titleRef} tabIndex={-1}>{t('Bộ lọc sản phẩm', 'Filter products')}</SheetTitle><SheetDescription>{t('Chọn ngân sách và cách sắp xếp.', 'Choose your budget and sort order.')}</SheetDescription></header>
            <form action={action} method="get" className="shop-filter-sheet-form">
              {filters.category && <input type="hidden" name="category" value={filters.category} />}
              {filters.search && <input type="hidden" name="search" value={filters.search} />}
              <div className="shop-filter-sheet-body">
                <fieldset className="shop-filter-budget"><legend>{t('Ngân sách', 'Budget')}</legend><div>
                  <label htmlFor={`${id}-min`}>{t('Giá từ (₫)', 'Minimum (VND)')}<input id={`${id}-min`} name="min_price" type="number" min="0" inputMode="numeric" defaultValue={filters.min_price} placeholder="0" /></label>
                  <label htmlFor={`${id}-max`}>{t('Đến (₫)', 'Maximum (VND)')}<input id={`${id}-max`} name="max_price" type="number" min="0" inputMode="numeric" defaultValue={filters.max_price} placeholder={t('Tùy chọn', 'Optional')} /></label>
                </div></fieldset>
                <fieldset className="shop-filter-sort"><legend>{t('Sắp xếp', 'Sort by')}</legend>{sorts.map(([value,label]) => <label key={value}><input type="radio" name="sort" value={value} defaultChecked={filters.sort===value}/><span>{label}</span></label>)}</fieldset>
              </div>
              <footer><Link href={clearHref} className="shop-btn shop-btn-secondary">{t('Xóa bộ lọc', 'Reset filters')}</Link><button type="submit" className="shop-btn">{t('Áp dụng', 'Apply')}</button></footer>
            </form>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  </>;
}
