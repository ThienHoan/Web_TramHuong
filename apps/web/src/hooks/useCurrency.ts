import { useLocale } from 'next-intl';

export const useCurrency = () => {
    const locale = useLocale();
    const EXCHANGE_RATE = 25000;

    const formatPrice = (amountInVND: number) => {
        if (locale === 'vi') {
            return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amountInVND);
        }
        // Convert VND to USD
        const amountInUSD = amountInVND / EXCHANGE_RATE;
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amountInUSD);
    };

    const convertPrice = (amountInVND: number) => {
        if (locale === 'vi') {
            return amountInVND;
        }
        return amountInVND / EXCHANGE_RATE;
    };

    return {
        formatPrice,
        convertPrice,
        currency: locale === 'vi' ? 'VND' : 'USD'
    };
};
