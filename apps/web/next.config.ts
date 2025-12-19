import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin();

const nextConfig: import('next').NextConfig = {
    images: {
        remotePatterns: [
            {
                protocol: 'https' as const,
                hostname: 'images.unsplash.com',
            },
        ],
    },
};

export default withNextIntl(nextConfig);
