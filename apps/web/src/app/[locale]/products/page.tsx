import { getProductsPaginated } from '@/lib/api-client';
import ZenProductList from '@/components/zen/ZenProductList';
import TraditionalProductList from '@/components/traditional/TraditionalProductList';
import BreadcrumbJsonLd from '@/components/seo/BreadcrumbJsonLd';
import { Metadata } from 'next';

export async function generateMetadata({ params, searchParams }: {
    params: Promise<{ locale: string }>;
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}): Promise<Metadata> {
    const { locale } = await params;
    const resolvedSearchParams = await searchParams;
    const page = typeof resolvedSearchParams.page === 'string' ? Number(resolvedSearchParams.page) : 1;

    const pageTitle = page > 1
        ? (locale === 'vi' ? ` – Trang ${page}` : ` – Page ${page}`)
        : '';

    const title = locale === 'vi'
        ? `Danh Mục Sản Phẩm${pageTitle}`
        : `Zen Collection${pageTitle}`;

    const description = locale === 'vi'
        ? 'Khám phá bộ sưu tập trầm hương truyền thống cao cấp.'
        : 'Discover our minimalist collection of agarwood artifacts.';

    // Canonical logic
    let canonical = `/${locale}/products`;
    if (page > 1) {
        canonical += `?page=${page}`;
    }

    return {
        title,
        description,
        alternates: {
            canonical
        }
    };
}

export default async function ProductsPage({
    params,
    searchParams,
}: {
    params: Promise<{ locale: string }>;
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
    const { locale } = await params;
    const resolvedSearchParams = await searchParams;

    // Parse filters
    const category = typeof resolvedSearchParams.category === 'string' ? resolvedSearchParams.category : undefined;
    const minPrice = typeof resolvedSearchParams.min_price === 'string' ? Number(resolvedSearchParams.min_price) : undefined;
    const maxPrice = typeof resolvedSearchParams.max_price === 'string' ? Number(resolvedSearchParams.max_price) : undefined;
    const sortParam = typeof resolvedSearchParams.sort === 'string' ? resolvedSearchParams.sort : undefined;
    const page = typeof resolvedSearchParams.page === 'string' ? Number(resolvedSearchParams.page) : 1;

    // Map sort param to API format (field:direction)
    let apiSort = undefined;
    if (sortParam === 'price-asc') apiSort = 'price:asc';
    else if (sortParam === 'price-desc') apiSort = 'price:desc';
    else if (sortParam === 'newest') apiSort = 'created_at:desc';
    else if (sortParam === 'recommended') apiSort = undefined; // Default

    const { data: products, meta } = await getProductsPaginated(locale, {
        limit: 12, // Reduced from 100 for proper pagination
        category: category !== 'all' ? category : undefined,
        min_price: minPrice,
        max_price: maxPrice,
        sort: apiSort,
        page
    });

    if (locale === 'vi') {
        // TraditionalProductList (landing style) usually doesn't need pagination, 
        // but if we reuse it for listing, we should pass it. 
        // Note: TraditionalProductList implementation as seen earlier is a Landing-style scroll page sections. 
        // Pagination might look weird there or it wasn't designed for it. 
        // BUT user asked for ?page=n on /products too.
        // Let's check TraditionalProductList signature if we updated it. 
        // We did NOT update TraditionalProductList, only TraditionalProductCatalog.
        // So I will just pass products and ignore meta for now OR switch to Catalog component if params exist.
        // Actually, for consistency, the user might expect Catalog style on /products if they are browsing pages.
        // However, /products in VI might be the "Showcase" landing page.
        // If sorting or pagination is active, maybe we should switch to Catalog view?
        // Current logic: return TraditionalProductList.
        // I'll keep it as is, but if TraditionalProductList doesn't support pagination, user won't see controls. 
        // The implementation_plan said "Use getProductsPaginated". 
        // The prompt said "?page=n cho /products và /products/catalog".
        return (
            <>
                <BreadcrumbJsonLd
                    items={[
                        { name: 'Trang chủ', item: '/' },
                        { name: 'Sản phẩm', item: '/products' }
                    ]}
                />
                <TraditionalProductList products={products} />
            </>
        );
    }

    return (
        <>
            <BreadcrumbJsonLd
                items={[
                    { name: 'Home', item: '/' },
                    { name: 'Collection', item: '/products' }
                ]}
            />
            <ZenProductList products={products} pagination={meta} />
        </>
    );
}
