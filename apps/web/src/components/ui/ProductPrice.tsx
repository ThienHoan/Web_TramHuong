'use client';

import { useProductDiscount } from '@/hooks/useProductDiscount';
import { useCurrency } from '@/hooks/useCurrency';

interface Product {
    price: number | string;
    discount_percentage?: number;
    discount_start_date?: string | null;
    discount_end_date?: string | null;
}

interface ProductPriceProps {
    product: Product;
    variantPrice?: number;
    size?: 'sm' | 'md' | 'lg' | 'xl';
    showBadge?: boolean;
    badgePosition?: 'inline' | 'bottom';
    className?: string;
    theme?: 'zen' | 'traditional';
}

/**
 * Reusable product price component with discount display
 * 
 * @example
 * ```tsx
 * // Traditional product card
 * <ProductPrice product={product} size="md" theme="traditional" />
 * 
 * // Zen product detail with variant
 * <ProductPrice 
 *   product={product} 
 *   variantPrice={selectedVariant?.price} 
 *   size="xl" 
 *   theme="zen" 
 * />
 * 
 * // Small price without badge
 * <ProductPrice product={product} size="sm" showBadge={false} />
 * ```
 */
export function ProductPrice({
    product,
    variantPrice,
    size = 'md',
    showBadge = true,
    badgePosition = 'inline',
    className = '',
    theme = 'traditional'
}: ProductPriceProps) {
    const { formatPrice } = useCurrency();
    const { finalPrice, originalPrice, isActive, discountPercent } = useProductDiscount(product, variantPrice);

    // Size mappings
    const sizeClasses = {
        sm: {
            price: 'text-sm md:text-base',
            original: 'text-xs',
            badge: 'text-[10px] px-1.5 py-0.5'
        },
        md: {
            price: 'text-base md:text-xl',
            original: 'text-sm',
            badge: 'text-xs px-2 py-1'
        },
        lg: {
            price: 'text-xl md:text-2xl',
            original: 'text-base',
            badge: 'text-sm px-3 py-1'
        },
        xl: {
            price: 'text-2xl md:text-3xl',
            original: 'text-lg',
            badge: 'text-base px-3 py-1.5'
        }
    };

    // Theme-specific styles
    const themeClasses = {
        zen: {
            discountPrice: 'text-red-600',
            normalPrice: 'text-zen-green-text dark:text-gray-200',
            original: 'text-zen-green-text/50 dark:text-gray-500',
            badge: 'bg-red-600 text-white'  // Brighter red for visibility
        },
        traditional: {
            discountPrice: 'text-red-600',
            normalPrice: 'text-trad-primary',
            original: 'text-trad-text-muted',
            badge: 'bg-red-600 text-white'  // Brighter red for visibility
        }
    };

    const sizes = sizeClasses[size];
    const styles = themeClasses[theme];

    return (
        <div className={`flex flex-col gap-1 ${className}`}>
            <p className={`${sizes.original} ${styles.original} ${isActive ? 'line-through' : 'opacity-0 select-none'}`}>
                {formDataPrice(originalPrice)}
            </p>
            <div className={`flex items-center gap-2 ${badgePosition === 'bottom' ? 'flex-col items-start' : ''}`}>
                <p className={`${sizes.price} font-bold ${isActive ? styles.discountPrice : styles.normalPrice}`}>
                    {formatPrice(isActive ? finalPrice : originalPrice)}
                </p>
                {isActive && showBadge && (
                    <span className={`${sizes.badge} ${styles.badge} font-bold rounded`}>
                        -{discountPercent}%
                    </span>
                )}
            </div>
        </div>
    );
}

// Helper to format price for placeholder (just to keep height correct, use originalPrice or 0)
function formDataPrice(price: number | string) {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(price));
}
