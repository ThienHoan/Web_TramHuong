import { getProducts } from '@/lib/api-client';
import ZenProductList from '@/components/zen/ZenProductList';
import TraditionalProductList from '@/components/traditional/TraditionalProductList';
import { Metadata } from 'next';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
    const { locale } = await params;

    const title = locale === 'vi' ? 'Danh Mục Sản Phẩm' : 'Zen Collection';
    const description = locale === 'vi'
        ? 'Khám phá bộ sưu tập trầm hương truyền thống cao cấp.'
        : 'Discover our minimalist collection of agarwood artifacts.';

    return {
        title,
        description,
        alternates: {
            canonical: `/${locale}/products`
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

    // Map sort param to API format (field:direction)
    let apiSort = undefined;
    if (sortParam === 'price-asc') apiSort = 'price:asc';
    else if (sortParam === 'price-desc') apiSort = 'price:desc';
    else if (sortParam === 'newest') apiSort = 'created_at:desc';
    else if (sortParam === 'recommended') apiSort = undefined; // Default

    const products = await getProducts(locale, {
        limit: 100,
        category: category !== 'all' ? category : undefined,
        min_price: minPrice,
        max_price: maxPrice,
        sort: apiSort
    });

    if (locale === 'vi') {
        return <TraditionalProductList products={products} />;
    }

    return <ZenProductList products={products} />;
}
