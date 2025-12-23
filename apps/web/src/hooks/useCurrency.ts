import { useLocale } from 'next-intl';

export const useCurrency = () => {
    const locale = useLocale();
    const EXCHANGE_RATE = 25000;

    const formatPrice = (amountInUSD: number) => {
        if (locale === 'vi') {
            const amountInVND = amountInUSD * EXCHANGE_RATE;
            return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amountInVND);
        }
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amountInUSD);
    };

    const convertPrice = (amountInUSD: number) => {
        if (locale === 'vi') {
            return amountInUSD * EXCHANGE_RATE;
        }
        return amountInUSD;
    };

    return {
        formatPrice,
        convertPrice,
        currency: locale === 'vi' ? 'VND' : 'USD'
    };
};
