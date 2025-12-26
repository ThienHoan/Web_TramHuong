
import { getProducts } from '@/lib/api-client';
import TraditionalProductCatalog from '@/components/traditional/TraditionalProductCatalog';
import ZenProductList from '@/components/zen/ZenProductList'; // Fallback or use Zen catalog if exists

export default async function ProductCatalogPage({
    params
}: {
    params: Promise<{ locale: string }>;
}) {
    const { locale } = await params;
    const products = await getProducts(locale);

    if (locale === 'vi') {
        return <TraditionalProductCatalog products={products} />;
    }

    // Fallback to Zen list for now or separate catalog if needed
    return <ZenProductList products={products} />;
}
