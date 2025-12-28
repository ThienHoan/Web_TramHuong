'use client';

import { Link } from '@/i18n/routing';
import ProductImage from '../ui/ProductImage';
import { useCurrency } from '@/hooks/useCurrency';

interface TraditionalProductCardProps {
    product: any;
}

export default function TraditionalProductCard({ product }: TraditionalProductCardProps) {
    const { formatPrice } = useCurrency();

    return (
        <div className="group relative flex flex-col overflow-hidden rounded-md bg-white shadow-sm hover:shadow-xl transition-all duration-300 border border-trad-border-warm">
            <div className="relative aspect-[4/5] overflow-hidden bg-trad-bg-warm">
                <ProductImage
                    src={product.images?.[0] || 'https://lh3.googleusercontent.com/aida-public/AB6AXuBwD0foJUP_hTJwAfMEq8pczGOEqf3yl0c5rIvOIkLcsLSMaPRa3lWPo26cFQBDBiCaJPywFlQOhci8vHtJJHGF5_KLpC6FSyTIL4BBKvfs3jVPh0mAjq8N_BqiFEchwW6m3euXU_i600Fz7RGb1QHZXZlf023XpCfsJ5jKHbwpkpHNzAvKbCb7m3ojkdPOFWSEGkjHsFI_c_EZtzzRC2bIRffXiev81bLAJt3qEqYLbAwY6Np0doM5PO_iNx5-zBZMGBUSuFOg1rcg'}
                    alt={product.translation?.title}
                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

                {/* Quick Action Button */}
                <div className="absolute bottom-4 left-4 right-4 translate-y-4 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
                    <Link href={`/products/${product.slug}`}>
                        <button className="w-full rounded bg-white py-3 text-xs font-bold uppercase tracking-widest text-trad-text-main shadow-lg hover:bg-trad-primary hover:text-white transition-colors">
                            Xem chi tiết
                        </button>
                    </Link>
                </div>
            </div>
            <div className="flex flex-1 flex-col p-5">
                <div className="mb-2 flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-trad-text-muted">Hương Trầm</span>
                    <div className="flex text-trad-primary">
                        {[1, 2, 3, 4, 5].map((star) => (
                            <span key={star} className="material-symbols-outlined !text-[14px] filled">star</span>
                        ))}
                    </div>
                </div>
                <h3 className="font-display text-lg font-bold text-trad-text-main hover:text-trad-primary transition-colors line-clamp-1">
                    <Link href={`/products/${product.slug}`}>{product.translation?.title}</Link>
                </h3>
                <div className="mt-auto pt-4 flex items-baseline gap-2">
                    <span className="text-lg font-bold text-trad-primary">{formatPrice(product.price)}</span>
                </div>
            </div>
        </div>
    );
}
