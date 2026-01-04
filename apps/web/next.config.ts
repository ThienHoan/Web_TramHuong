import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin();

const nextConfig: import('next').NextConfig = {
    output: 'standalone',
    images: {
        remotePatterns: [
            {
                protocol: 'https' as const,
                hostname: 'ui-avatars.com',
            },
            {
                protocol: 'https' as const,
                hostname: 'lh3.googleusercontent.com',
            },
            {
                protocol: 'https' as const,
                hostname: 'images.unsplash.com',
            },
            {
                protocol: 'https' as const,
                hostname: 'plus.unsplash.com',
            },
            {
                protocol: 'https' as const,
                hostname: 'rzbcqbbkjbylvdpoixhp.supabase.co',
            },
        ],
        // Modern image formats for better compression
        formats: ['image/avif', 'image/webp'],
        // Configured quality levels used in the application
        qualities: [70, 75, 80, 85, 90],
        // Optimized responsive breakpoints
        deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
        imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
        // Cache images for 1 year
        minimumCacheTTL: 60 * 60 * 24 * 365,
    },
    async redirects() {
        return [
            {
                source: '/:locale(vi|en)/traditional',
                destination: '/:locale',
                permanent: true,
            },
            {
                source: '/:locale(vi|en)/zen',
                destination: '/:locale',
                permanent: true,
            },
            {
                source: '/traditional',
                destination: '/vi',
                permanent: true,
            },
            {
                source: '/zen',
                destination: '/en',
                permanent: true,
            }
        ];
    },
    async rewrites() {
        return [
            {
                source: '/api/:path*',
                destination: `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/:path*`,
            },
        ];
    },
};

export default withNextIntl(nextConfig);
