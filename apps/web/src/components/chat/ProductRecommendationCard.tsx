'use client';

import React from 'react';
import Image from 'next/image';
import { Link } from '@/i18n/routing';
import { useCurrency } from '@/hooks/useCurrency';

interface ProductCardProps {
    product: {
        id: string;
        slug: string;
        title: string;
        price: number;
        reason?: string;
    };
}

export default function ProductRecommendationCard({ product }: ProductCardProps) {
    const { formatPrice } = useCurrency();

    return (
        <div className="flex gap-3 bg-white p-3 rounded-xl border border-border shadow-sm hover:shadow-md transition-all max-w-[300px] my-2">
            <div className="relative w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100">
                {/* Fallback image if real image is missing in limited context, but context usually has none. 
                    In a real app, we might need to fetch the image or use a placeholder.
                    For now, use a generic placeholder or try to infer from slug if possible.
                */}
                <div className="w-full h-full bg-zen-50 flex items-center justify-center text-zen-400">
                    <span className="material-symbols-outlined !text-[24px]">spa</span>
                </div>
            </div>
            <div className="flex flex-col flex-1 min-w-0 justify-between">
                <div>
                    <h4 className="font-semibold text-sm text-foreground truncate" title={product.title}>
                        {product.title}
                    </h4>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                        {product.reason}
                    </p>
                </div>
                <div className="flex items-center justify-between mt-2">
                    <span className="text-sm font-bold text-primary">
                        {formatPrice(product.price)}
                    </span>
                    <Link
                        href={`/products/${product.slug}`}
                        className="text-xs font-medium bg-primary/10 text-primary px-2 py-1 rounded hover:bg-primary hover:text-white transition-colors"
                    >
                        Xem
                    </Link>
                </div>
            </div>
        </div>
    );
}
