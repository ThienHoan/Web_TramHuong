'use client';

import { Link } from '@/i18n/routing';
import ProductImage from '../ui/ProductImage';
import { ProductPrice } from '@/components/ui/ProductPrice';
import { Product } from '@/types/product';

interface ZenProductCardProps {
    product: any; // Using any for now to match list, but should be Product
}

export default function ZenProductCard({ product }: ZenProductCardProps) {
    return (
        <Link href={`/products/${product.slug}`} className="group flex flex-col gap-4 cursor-pointer">
            <div className="relative w-full aspect-[3/4] overflow-hidden rounded-lg bg-zen-green-100">
                <div className="absolute inset-0">
                    <ProductImage
                        src={product.images?.[0]}
                        alt={product.translation?.title}
                        className="w-full h-full object-cover object-center transition-transform duration-[2000ms] ease-out group-hover:scale-105"
                    />
                </div>

                {/* Badges */}
                {product.is_featured && (
                    <div className="absolute top-3 left-3 flex flex-col gap-2">
                        <span className="bg-zen-green-50/80 backdrop-blur-sm border border-zen-green-200 px-2 py-1 text-[10px] font-bold tracking-[0.1em] uppercase text-zen-green-text rounded-sm">
                            Featured
                        </span>
                    </div>
                )}

                {/* Quick Add Button (Hover) */}
                <button className="absolute bottom-4 left-1/2 -translate-x-1/2 opacity-0 translate-y-4 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-500 bg-zen-green-text text-zen-green-50 hover:bg-zen-green-primary hover:text-white px-6 py-3 rounded-full text-xs font-bold tracking-[0.2em] uppercase shadow-xl shadow-zen-green-200/50 whitespace-nowrap">
                    View Details
                </button>
            </div>

            <div className="text-center md:text-left space-y-1">
                <h3 className="text-base font-light tracking-[0.15em] uppercase text-zen-green-text group-hover:text-zen-green-primary transition-colors">
                    {product.translation?.title}
                </h3>
                <div className="flex items-center justify-center md:justify-start gap-3">
                    <ProductPrice product={product} size="sm" theme="zen" />
                    {product.stock_status === 'out_of_stock' && (
                        <span className="text-[10px] uppercase tracking-widest text-red-400 border-l border-zen-green-200 pl-3">Sold Out</span>
                    )}
                    {product.stock_status !== 'out_of_stock' && (
                        <span className="text-[10px] uppercase tracking-widest text-zen-green-text/40 border-l border-zen-green-200 pl-3">
                            {product.category?.translation?.name || 'Collection'}
                        </span>
                    )}
                </div>
            </div>
        </Link>
    );
}
