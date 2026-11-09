import { useLocale } from 'next-intl';

export const useCurrency = () => {
    const locale = useLocale();
    // Orders are charged in VND; show the payable currency in every language.
    const formatPrice = (amount: number) => new Intl.NumberFormat(locale === 'vi' ? 'vi-VN' : 'en-US', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(amount);
    return { formatPrice, convertPrice: (amount: number) => amount, currency: 'VND' };
};
