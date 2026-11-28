import { useLocale } from 'next-intl';
import { formatVnd } from '@/lib/commerce';

export const useCurrency = () => {
    const locale = useLocale();
    // Orders are charged in VND; show the payable currency in every language.
    // One formatter for the whole storefront (lib/commerce): "120.000 ₫" in vi, "₫120,000" in en.
    const formatPrice = (amount: number) => formatVnd(amount, locale);
    return { formatPrice, convertPrice: (amount: number) => amount, currency: 'VND' };
};
