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
    params
}: {
    params: Promise<{ locale: string }>;
}) {
    const { locale } = await params;
    const products = await getProducts(locale);

    if (locale === 'vi') {
        return <TraditionalProductList products={products} />;
    }

    return <ZenProductList products={products} />;
}
