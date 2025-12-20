import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin();

const nextConfig: import('next').NextConfig = {
    images: {
        remotePatterns: [
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
};

export default withNextIntl(nextConfig);
