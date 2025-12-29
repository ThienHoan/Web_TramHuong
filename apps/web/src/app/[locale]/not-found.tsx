'use client';

import { usePathname } from 'next/navigation';
import ZenNotFound from '@/components/zen/ZenNotFound';
import TraditionalNotFound from '@/components/traditional/TraditionalNotFound';

export default function NotFound() {
    // Determine locale from pathname
    // Since this is a client component, usePathname works.
    const pathname = usePathname();
    const isVietnamese = pathname.startsWith('/vi');

    if (isVietnamese) {
        return <TraditionalNotFound />;
    }

    return <ZenNotFound />;
}
