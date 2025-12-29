'use client';

import { useLocale } from 'next-intl';
import TraditionalCheckout from '@/components/traditional/checkout/TraditionalCheckout';
import ZenCheckout from '@/components/zen/ZenCheckout';

export default function CheckoutPage() {
    const locale = useLocale();

    if (locale === 'vi') {
        return <TraditionalCheckout />;
    }

    // Default to Zen for other locales
    return <ZenCheckout />;
}