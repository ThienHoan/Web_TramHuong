import { useMemo } from 'react';

export interface ProductDiscount {
    /** Original product price (or variant price if specified) */
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

export interface Product {
    price: number | string;
    discount_percentage?: number;
    discount_start_date?: string | null;
    discount_end_date?: string | null;
}

/**
 * Custom hook to calculate product discount information
 * 
 * @param product - Product object with price and discount fields
 * @param variantPrice - Optional variant price override
 * @param currentDate - Optional current date for testing purposes (defaults to new Date())
 * @returns Discount information including final price, active status, and savings
 * 
 * @example
 * ```tsx
 * // Basic usage
 * const { finalPrice, isActive, discountPercent } = useProductDiscount(product);
 * 
 * // With variant price
 * const discount = useProductDiscount(product, selectedVariant?.price);
 * 
 * // For testing with specific date
 * const discount = useProductDiscount(product, undefined, new Date('2024-01-01'));
 * ```
 */
export function useProductDiscount(
    product: Product,
    variantPrice?: number,
    currentDate?: Date
): ProductDiscount {
    return useMemo(() => {
        // Use variant price if provided, otherwise use product base price
        const originalPrice = variantPrice ?? Number(product.price || 0);
        const hasDiscount = (product.discount_percentage || 0) > 0;
        const now = currentDate || new Date();

        // Check if discount is active based on date range
        const isActive = hasDiscount &&
            (!product.discount_start_date || new Date(product.discount_start_date) <= now) &&
            (!product.discount_end_date || new Date(product.discount_end_date) >= now);

        const discountPercent = product.discount_percentage || 0;
        const finalPrice = isActive
            ? Math.round(originalPrice * (1 - discountPercent / 100))
            : originalPrice;
        const savings = originalPrice - finalPrice;

        return {
            originalPrice,
            finalPrice,
            isActive,
            discountPercent,
            savings
        };
    }, [product.price, variantPrice, product.discount_percentage, product.discount_start_date, product.discount_end_date, currentDate]);
}
