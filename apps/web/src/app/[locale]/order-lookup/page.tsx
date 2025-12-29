'use client';

import { usePathname } from 'next/navigation';
import ZenOrderLookup from '@/components/zen/ZenOrderLookup';
import TraditionalOrderLookup from '@/components/traditional/TraditionalOrderLookup';

export default function OrderLookupPage() {
    const pathname = usePathname();
    const isVietnamese = pathname.startsWith('/vi');

    if (isVietnamese) {
        return <TraditionalOrderLookup />;
    }

    return <ZenOrderLookup />;
}
