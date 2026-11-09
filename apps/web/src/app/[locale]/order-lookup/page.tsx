import { Suspense } from 'react';
import OrderLookup from '@/components/shop/OrderLookup';

export default function OrderLookupPage() {
    return (
        <Suspense>
            <OrderLookup />
        </Suspense>
    );
}
