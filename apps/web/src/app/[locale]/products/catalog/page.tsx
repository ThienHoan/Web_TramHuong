
import { getProducts } from '@/lib/api-client';
import TraditionalProductCatalog from '@/components/traditional/TraditionalProductCatalog';
import ZenProductList from '@/components/zen/ZenProductList'; // Fallback or use Zen catalog if exists

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

    // Map sort param to API format
    let apiSort = 'created_at:desc'; // Default
    if (sortParam === 'price-asc') apiSort = 'price:asc';
    else if (sortParam === 'price-desc') apiSort = 'price:desc';
    else if (sortParam === 'name-asc') apiSort = 'slug:asc';
    else if (sortParam === 'newest') apiSort = 'created_at:desc';

    const products = await getProducts(locale, {
        categoryId,
        sort: apiSort,
        min_price: minPrice,
        max_price: maxPrice,
        limit: 100
    });

    if (locale === 'vi') {
        return <TraditionalProductCatalog products={products} />;
    }

    // Fallback to Zen list for now or separate catalog if needed
    return <ZenProductList products={products} />;
}
