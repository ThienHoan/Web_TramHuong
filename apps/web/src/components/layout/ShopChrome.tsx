'use client';

import { useLocale } from 'next-intl';
import TraditionalHeader from '@/components/traditional/TraditionalHeader';
import TraditionalFooter from '@/components/traditional/TraditionalFooter';
import ZenFooter from '@/components/zen/ZenFooter';

/**
 * For pages shared by both languages. The root layout already renders the fixed
 * ZenHeader on English pages, so those only need space reserved beneath it.
 */
export function ShopHeader() {
    return useLocale() === 'vi' ? <TraditionalHeader /> : <div className="h-24 shrink-0" aria-hidden="true" />;
}

export function ShopFooter() {
    return useLocale() === 'vi' ? <TraditionalFooter /> : <ZenFooter />;
}
