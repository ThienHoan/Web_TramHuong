
import { getProductsPaginated } from '@/lib/api-client';
import TraditionalProductCatalog from '@/components/traditional/TraditionalProductCatalog';
import ZenProductList from '@/components/zen/ZenProductList'; // Fallback or use Zen catalog if exists
import BreadcrumbJsonLd from '@/components/seo/BreadcrumbJsonLd';
import { Metadata } from 'next';

export async function generateMetadata({
    params,
    searchParams
}: {
    params: Promise<{ locale: string }>;
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}): Promise<Metadata> {
    const { locale } = await params;
    const resolvedSearchParams = await searchParams;
    const page = typeof resolvedSearchParams.page === 'string' ? Number(resolvedSearchParams.page) : 1;

    // Page in title for SEO
    const pageTitle = page > 1
        ? (locale === 'vi' ? ` – Trang ${page}` : ` – Page ${page}`)
        : '';

    const title = locale === 'vi'
        ? `Tất Cả Sản Phẩm${pageTitle}`
        : `All Products${pageTitle}`;

    const description = locale === 'vi'
        ? 'Khám phá bộ sưu tập trầm hương truyền thống cao cấp.'
        : 'Discover our minimalist collection of agarwood artifacts.';

    // Self-referencing canonical with page param if it exists
    let canonical = `/${locale}/products/catalog`;
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

export default async function ProductCatalogPage({
    params,
    searchParams
}: {
    params: Promise<{ locale: string }>;
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
    const { locale } = await params;
    const resolvedSearchParams = await searchParams;

    let categoryId = typeof resolvedSearchParams.category === 'string' ? resolvedSearchParams.category : undefined;
    if (categoryId === 'all') categoryId = undefined;

    // Parse filters
    const minPrice = typeof resolvedSearchParams.min_price === 'string' ? Number(resolvedSearchParams.min_price) : undefined;
    const maxPrice = typeof resolvedSearchParams.max_price === 'string' ? Number(resolvedSearchParams.max_price) : undefined;
    const sortParam = typeof resolvedSearchParams.sort === 'string' ? resolvedSearchParams.sort : undefined;
    const page = typeof resolvedSearchParams.page === 'string' ? Number(resolvedSearchParams.page) : 1;

    // Map sort param to API format
    let apiSort = 'created_at:desc'; // Default
    if (sortParam === 'price-asc') apiSort = 'price:asc';
    else if (sortParam === 'price-desc') apiSort = 'price:desc';
    else if (sortParam === 'name-asc') apiSort = 'slug:asc';
    else if (sortParam === 'newest') apiSort = 'created_at:desc';

    const { data: products, meta } = await getProductsPaginated(locale, {
        categoryId,
        sort: apiSort,
        min_price: minPrice,
        max_price: maxPrice,
        limit: 12, // Reduced limit for better pagination UX
        page
    });

    if (locale === 'vi') {
        return (
            <>
                <BreadcrumbJsonLd
                    items={[
                        { name: 'Trang chủ', item: '/' },
                        { name: 'Sản phẩm', item: '/products' },
                        { name: 'Tất cả', item: '/products/catalog' }
                    ]}
                />
                <TraditionalProductCatalog products={products} pagination={meta} />
            </>
        );
    }

    // Fallback to Zen list for now or separate catalog if needed
    // Fallback to Zen list for now or separate catalog if needed
    return (
        <>
            <BreadcrumbJsonLd
                items={[
                    { name: 'Home', item: '/' },
                    { name: 'Collection', item: '/products' },
                    { name: 'Catalog', item: '/products/catalog' }
                ]}
            />
            <ZenProductList products={products} pagination={meta} />
        </>
    );
}
