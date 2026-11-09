'use client';

import { useLocale } from 'next-intl';

/** For pages that keep both languages next to each other in the markup. */
export function useBilingual() {
    const en = useLocale() === 'en';
    return { en, t: (vi: string, english: string) => (en ? english : vi) };
}
