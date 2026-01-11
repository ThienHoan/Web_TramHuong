import { MetadataRoute } from 'next';
import { getProducts, getPosts } from '@/lib/api-client';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://tramhuongthienphuchue.com';

    // Static routes
    const routes: MetadataRoute.Sitemap = [
        {
            url: `${baseUrl}`,
            lastModified: new Date(),
            changeFrequency: 'daily',
            priority: 1,
        },
        {
            url: `${baseUrl}/about`,
            lastModified: new Date(),
            changeFrequency: 'monthly',
            priority: 0.8,
        },
        {
            url: `${baseUrl}/products`,
            lastModified: new Date(),
            changeFrequency: 'weekly',
            priority: 0.8,
        },
        {
            url: `${baseUrl}/blog`,
            lastModified: new Date(),
            changeFrequency: 'weekly',
            priority: 0.8,
        },
        {
            url: `${baseUrl}/contact`,
            lastModified: new Date(),
            changeFrequency: 'yearly',
            priority: 0.5,
        },
    ];

    try {
        // Fetch products
        // Note: In a real large-scale app, we might need pagination or checking a "sitemap" specific endpoint.
        // For now, fetching a reasonable limit (e.g., 100) or all if the API supports it.
        // Assuming getProducts returns { data: Product[], ... } or Product[] directly depending on implementation.
        // Based on previous analysis, getProducts returns Promise<Product[]>.
        const locale = 'vi'; // Default locale for sitemap links, or we could generate for both en/vi
        const products = await getProducts(locale).catch(() => []);

        const productRoutes: MetadataRoute.Sitemap = Array.isArray(products)
            ? products.map((product) => ({
                url: `${baseUrl}/products/${product.slug}`,
                lastModified: product.updated_at ? new Date(product.updated_at) : new Date(),
                changeFrequency: 'weekly',
                priority: 0.9,
                images: product.images ? product.images.map(img => img.startsWith('http') ? img : `${baseUrl}${img}`) : undefined
            }))
            : [];

        // Fetch posts
        const postsResponse = await getPosts({ limit: 100 }).catch(() => null);
        const posts = postsResponse?.data || [];

        const postRoutes: MetadataRoute.Sitemap = Array.isArray(posts)
            ? posts.map((post) => ({
                url: `${baseUrl}/blog/${post.slug}`,
                lastModified: post.published_at ? new Date(post.published_at) : (post.created_at ? new Date(post.created_at) : new Date()),
                changeFrequency: 'weekly',
                priority: 0.7,
            }))
            : [];

        return [...routes, ...productRoutes, ...postRoutes];
    } catch (error) {
        console.error('Sitemap generation error:', error);
        // Fallback to static routes
        return routes;
    }
}
