import { MetadataRoute } from 'next';
import { getProducts, getPosts } from '@/lib/api-client';

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://tramhuongthienphuchue.com';
const locales = ['vi', 'en'];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const sitemapEntries: MetadataRoute.Sitemap = [];

    // 1. Static Routes
    const staticPaths = [
        '/',
        '/about',
        '/products',
        '/products/catalog',
        '/blog',
        '/contact'
    ];

    for (const locale of locales) {
        for (const path of staticPaths) {
            const url = `${baseUrl}/${locale}${path === '/' ? '' : path}`;

            sitemapEntries.push({
                url,
                lastModified: new Date(),
                changeFrequency: path.includes('products') ? 'weekly' : 'monthly',
                priority: path === '/' ? 1 : 0.8,
            });
        }
    }

    try {
        // 2. Dynamic Products
        for (const locale of locales) {
            const products = await getProducts(locale).catch(() => []);
            if (Array.isArray(products)) {
                products.forEach((product) => {
                    const productImages = product.images ? product.images.map(img =>
                        img.startsWith('http') ? img : `${baseUrl}${img}`
                    ) : undefined;

                    sitemapEntries.push({
                        url: `${baseUrl}/${locale}/products/${product.slug}`,
                        lastModified: product.updated_at ? new Date(product.updated_at) : new Date(),
                        changeFrequency: 'weekly',
                        priority: 0.9,
                        images: productImages
                    });
                });
            }
        }

        // 3. Dynamic Posts
        const postsResponse = await getPosts({ limit: 100 }).catch(() => null);
        const posts = postsResponse?.data || [];

        if (Array.isArray(posts)) {
            for (const locale of locales) {
                posts.forEach((post) => {
                    sitemapEntries.push({
                        url: `${baseUrl}/${locale}/blog/${post.slug}`,
                        lastModified: post.published_at ? new Date(post.published_at) : (post.created_at ? new Date(post.created_at) : new Date()),
                        changeFrequency: 'weekly',
                        priority: 0.7,
                    });
                });
            }
        }

    } catch (error) {
        console.error('Sitemap generation error:', error);
    }

    return sitemapEntries;
}
