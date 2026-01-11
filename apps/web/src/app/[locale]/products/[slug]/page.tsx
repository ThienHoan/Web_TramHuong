import { getProduct, getProducts } from '@/lib/api-client';
import ZenProductDetail from '@/components/zen/ZenProductDetail';
import TraditionalProductDetail from '@/components/traditional/TraditionalProductDetail';
// import ReviewsSection from '@/components/reviews/ReviewsSection';
import { notFound } from 'next/navigation';
import { Metadata } from 'next';

export async function generateMetadata({ params }: { params: Promise<{ locale: string; slug: string }> }): Promise<Metadata> {
    const { locale, slug } = await params;
    const product = await getProduct(slug, locale);

    if (!product) {
        return {
            title: 'Product Not Found',
        };
    }

    const title = product.translation?.title || 'Trầm Hương';
    const description = product.translation?.description || '';
    const imageUrl = product.images?.[0] || '/placeholder.jpg';

    return {
        title,
        description,
        openGraph: {
            title,
            description,
            images: [{ url: imageUrl }],
        },
        alternates: {
            canonical: `/${locale}/products/${slug}`
        }
    };
}

import ProductJsonLd from '@/components/seo/ProductJsonLd';
import BreadcrumbJsonLd from '@/components/seo/BreadcrumbJsonLd';

export default async function ProductPage({
    params
}: {
    params: Promise<{ locale: string; slug: string }>;
}) {
    const { locale, slug } = await params;
    const product = await getProduct(slug, locale);

    if (!product) {
        notFound();
    }

    // Fetch related products for Zen layout (Other Treasures)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: fix type
    let relatedProducts: any[] = [];

    // Try fetching by category first
    if (product.category_id) {
        const allRelated = await getProducts(locale, { categoryId: product.category_id, limit: 6 });
        // Filter out current product
        relatedProducts = allRelated.filter(p => p.id !== product.id);
    }

    // If we don't have enough related products, fetch more general products
    if (relatedProducts.length < 4) {
        const moreProducts = await getProducts(locale, { limit: 8 });
        // Filter out current product and any we already have
        const existingIds = new Set(relatedProducts.map(p => p.id));
        existingIds.add(product.id);

        const additional = moreProducts.filter(p => !existingIds.has(p.id));
        relatedProducts = [...relatedProducts, ...additional];
    }

    // Take top 4
    relatedProducts = relatedProducts.slice(0, 4);

    if (locale === 'vi') {
        return (
            <>
                <ProductJsonLd product={product} />
                <BreadcrumbJsonLd
                    items={[
                        { name: locale === 'vi' ? 'Trang chủ' : 'Home', item: '/' },
                        { name: locale === 'vi' ? 'Sản phẩm' : 'Products', item: '/products' },
                        { name: product.translation?.title || product.title || 'Sản phẩm', item: `/products/${product.slug}` }
                    ]}
                />
                <TraditionalProductDetail product={product} />
                {/* <ReviewsSection productId={product.id} /> REMOVED to avoid duplication with UI in TraditionalProductDetail */}
            </>
        );
    }

    return (
        <>
            <ProductJsonLd product={product} />
            <BreadcrumbJsonLd
                items={[
                    { name: locale === 'vi' ? 'Trang chủ' : 'Home', item: '/' },
                    { name: locale === 'vi' ? 'Sản phẩm' : 'Products', item: '/products' },
                    { name: product.translation?.title || product.title || 'Product', item: `/products/${product.slug}` }
                ]}
            />
            <ZenProductDetail product={product} relatedProducts={relatedProducts} />
        </>
    );
}
