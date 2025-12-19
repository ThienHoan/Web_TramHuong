import { getProduct } from '@/lib/api-client';
import ZenProductDetail from '@/components/zen/ZenProductDetail';
import TraditionalProductDetail from '@/components/traditional/TraditionalProductDetail';
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

    const title = product.translation.title;
    const description = product.translation.description;
    const imageUrl = product.images[0] || '/placeholder.jpg';

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

    if (locale === 'vi') {
        return <TraditionalProductDetail product={product} />;
    }

    return <ZenProductDetail product={product} />;
}
