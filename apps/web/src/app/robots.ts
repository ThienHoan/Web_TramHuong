import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://tramhuongthienphuchue.com';

    return {
        rules: [
            {
                userAgent: '*',
                allow: '/',
                disallow: '/admin/',
            },
            // Block AI training bots
            {
                userAgent: 'GPTBot',
                disallow: '/',
            },
            {
                userAgent: 'ChatGPT-User',
                disallow: '/',
            },
            {
                userAgent: 'Google-Extended',
                disallow: '/',
            },
            {
                userAgent: 'CCBot',
                disallow: '/',
            },
            {
                userAgent: 'anthropic-ai',
                disallow: '/',
            },
            {
                userAgent: 'ClaudeBot',
                disallow: '/',
            },
            {
                userAgent: 'Bytespider',
                disallow: '/',
            },
            {
                userAgent: 'Applebot-Extended',
                disallow: '/',
            },
            {
                userAgent: 'AmazonBot',
                disallow: '/',
            },
        ],
        sitemap: `${baseUrl}/sitemap.xml`,
    };
}
