'use client';

import { Link } from '@/i18n/routing';
import ProductImage from '../ui/ProductImage';
import { useCurrency } from '@/hooks/useCurrency';
import { useProductDiscount } from '@/hooks/useProductDiscount';

interface TraditionalProductCardProps {
    product: any;
}

export default function TraditionalProductCard({ product }: TraditionalProductCardProps) {
    const { formatPrice } = useCurrency();
    const { finalPrice, isActive, discountPercent, originalPrice } = useProductDiscount(product);

    return (
        <div className="group relative flex flex-col overflow-hidden rounded-md bg-white shadow-sm hover:shadow-xl transition-all duration-300 border border-trad-border-warm">
            <div className="relative aspect-[4/5] overflow-hidden bg-trad-bg-warm">
                <ProductImage
                    src={product.images?.[0] || 'https://lh3.googleusercontent.com/aida-public/AB6AXuBwD0foJUP_hTJwAfMEq8pczGOEqf3yl0c5rIvOIkLcsLSMaPRa3lWPo26cFQBDBiCaJPywFlQOhci8vHtJJHGF5_KLpC6FSyTIL4BBKvfs3jVPh0mAjq8N_BqiFEchwW6m3euXU_i600Fz7RGb1QHZXZlf023XpCfsJ5jKHbwpkpHNzAvKbCb7m3ojkdPOFWSEGkjHsFI_c_EZtzzRC2bIRffXiev81bLAJt3qEqYLbAwY6Np0doM5PO_iNx5-zBZMGBUSuFOg1rcg'}
                    alt={product.translation?.title}
                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                {isActive && (
                    <span className="absolute right-3 top-3 rounded bg-trad-red-900 px-2 py-1 text-xs font-bold uppercase text-white shadow-md">
                        -{discountPercent}%
                    </span>
                )}
            </div>
            <Link href={`/products/${product.slug}`} className="flex flex-1 flex-col p-4">
                <h3 className="mb-2 text-base font-bold text-trad-text-main group-hover:text-trad-primary transition-colors line-clamp-2">
                    {product.translation?.title}
                </h3>
                <div className="mt-auto pt-2">
                    {isActive ? (
                        <div className="flex flex-col gap-1">
                            <span className="text-sm text-gray-500 line-through">{formatPrice(originalPrice)}</span>
                            <div className="flex items-center gap-2">
                                <span className="text-lg font-bold text-red-600">{formatPrice(finalPrice)}</span>
                                <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded">-{discountPercent}%</span>
                            </div>
                        </div>
                    ) : (
                        <span className="text-lg font-bold text-trad-primary">{formatPrice(finalPrice)}</span>
                    )}
                </div>
            </Link>
        </div>
    );
}
