import { MetadataRoute } from 'next';
import { getProducts, getPosts } from '@/lib/api-client';

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://tramhuongthienphuchue.com';
const locales = ['vi', 'en'];

// Helper to escape XML special characters
function escapeXml(unsafe: string): string {
    return unsafe.replace(/[<>&'"]/g, (c) => {
        switch (c) {
            case '<': return '&lt;';
            case '>': return '&gt;';
            case '&': return '&amp;';
            case '\'': return '&apos;';
            case '"': return '&quot;';
            default: return c;
        }
    });
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const sitemapEntries: MetadataRoute.Sitemap = [];

    // 1. Static Routes
    const staticPaths = [
        '/',
        '/about',
        '/products',
        '/products/catalog', // Added catalog
        '/blog',
        '/contact'
    ];

    for (const locale of locales) {
        for (const path of staticPaths) {
            // Root path handling: /vi, /en (or / for default?)
            // Usually sitemap includes full paths: /vi, /en/about...
            // Note: If default locale is prefix-less, handle that. 
            // Assuming next-intl strategy puts all under prefix except maybe default.
            // Safe bet: explicit prefixes for all as per standard sitemap logic for i18n.
            // Actually, best practice is to have the localized URL.

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
        // We need to fetch products. Ideally fetch for each locale to get localized slugs if they differ.
        // If slugs are shared (e.g. IDs or same slug), we iterate locales.
        // Assuming getProducts returns products with 'slug' property.

        for (const locale of locales) {
            const products = await getProducts(locale).catch(() => []);
            if (Array.isArray(products)) {
                products.forEach((product) => {
                    const productImages = product.images ? product.images.map(img => {
                        const imgUrl = img.startsWith('http') ? img : `${baseUrl}${img}`;
                        return escapeXml(imgUrl);
                    }) : undefined;

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
        // Fetch posts for each locale (if content differs) or once if shared.
        // Looking at blog-service, getPosts accepts query params but no locale explicitly in interface? 
        // Wait, base-http sends locale? No, API usually handles locale. 
        // Let's assume posts are shared or we fetch once.
        // Usually blog posts might have localized slugs.
        // For now, iterate locales and assume slugs work for both or fetch implicitly.
        // To be safe, let's just generate for both locales assuming slug validity.

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
