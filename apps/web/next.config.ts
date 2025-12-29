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
                hostname: 'rzbcqbbkjbylvdpoixhp.supabase.co',
            },
        ],
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
