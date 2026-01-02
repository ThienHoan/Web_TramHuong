import { useMemo } from 'react';

interface ProductDiscount {
    /** Original product price */
    originalPrice: number;
    /** Final price after discount (if active) */
    finalPrice: number;
    /** Whether discount is currently active */
    isActive: boolean;
    /** Discount percentage (0-100) */
    discountPercent: number;
    /** Amount saved if discount is active */
    savings: number;
}

interface Product {
    price: number | string;
    discount_percentage?: number;
    discount_start_date?: string | null;
    discount_end_date?: string | null;
}

/**
 * Custom hook to calculate product discount information
 * 
 * @param product - Product object with price and discount fields
 * @returns Discount information including final price, active status, and savings
 * 
 * @example
 * ```tsx
 * const { finalPrice, isActive, discountPercent } = useProductDiscount(product);
 * 
 * if (isActive) {
 *   return <div>{formatPrice(finalPrice)} <span>-{discountPercent}%</span></div>
 * }
 * return <div>{formatPrice(originalPrice)}</div>
 * ```
 */
export function useProductDiscount(product: Product): ProductDiscount {
    return useMemo(() => {
        const originalPrice = Number(product.price || 0);
        const hasDiscount = (product.discount_percentage || 0) > 0;
        const now = new Date();

        // Check if discount is active based on date range
        const isActive = hasDiscount &&
            (!product.discount_start_date || new Date(product.discount_start_date) <= now) &&
            (!product.discount_end_date || new Date(product.discount_end_date) >= now);

        const discountPercent = product.discount_percentage || 0;
        const finalPrice = isActive
            ? originalPrice * (1 - discountPercent / 100)
            : originalPrice;
        const savings = originalPrice - finalPrice;

        return {
            originalPrice,
            finalPrice,
            isActive,
            discountPercent,
            savings
        };
    }, [product.price, product.discount_percentage, product.discount_start_date, product.discount_end_date]);
}
