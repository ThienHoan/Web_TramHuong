'use client';

import { Link } from '@/i18n/routing';
import ProductImage from '../ui/ProductImage';
import { ProductPrice } from '@/components/ui/ProductPrice'; // Corrected to named import
import { useCurrency } from '@/hooks/useCurrency';
import { useProductDiscount } from '@/hooks/useProductDiscount';
import { toast } from 'sonner';

interface TraditionalProductCardProps {
    product: any;
}

export default function TraditionalProductCard({ product }: TraditionalProductCardProps) {
    const { formatPrice } = useCurrency();
    const { finalPrice, isActive, discountPercent, originalPrice } = useProductDiscount(product);

    return (
        <div className="group relative w-full overflow-hidden rounded-lg bg-white shadow-sm hover:shadow-xl will-change-transform transition-all duration-300 border border-trad-border-warm">
            <div className="relative aspect-[4/5] overflow-hidden bg-trad-bg-warm">
                <ProductImage
                    src={product.images?.[0] || 'https://lh3.googleusercontent.com/aida-public/AB6AXuBwD0foJUP_hTJwAfMEq8pczGOEqf3yl0c5rIvOIkLcsLSMaPRa3lWPo26cFQBDBiCaJPywFlQOhci8vHtJJHGF5_KLpC6FSyTIL4BBKvfs3jVPh0mAjq8N_BqiFEchwW6m3euXU_i600Fz7RGb1QHZXZlf023XpCfsJ5jKHbwpkpHNzAvKbCb7m3ojkdPOFWSEGkjHsFI_c_EZtzzRC2bIRffXiev81bLAJt3qEqYLbAwY6Np0doM5PO_iNx5-zBZMGBUSuFOg1rcg'}
                    alt={product.translation?.title}
                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                // ... inside component ...
                <div className="absolute top-3 right-3 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <button
                        className="bg-white/90 backdrop-blur-sm p-2 rounded-full shadow-md text-trad-text-muted hover:text-trad-red-900 transition-all duration-200 active:scale-90 hover:scale-110"
                        onClick={(e) => {
                            e.preventDefault();
                            toast.success('Đã thêm vào danh sách yêu thích');
                        }}
                    >
                        <span className="material-symbols-outlined text-[18px]">favorite</span>
                    </button>
                </div>
                {isActive && (
                    <span className="absolute left-3 top-3 rounded bg-trad-red-900 px-2 py-1 text-xs font-bold uppercase text-white shadow-md z-10">
                        -{discountPercent}%
                    </span>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <div className="absolute bottom-4 left-4 right-4 translate-y-4 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
                    <Link href={`/products/${product.slug}`}>
                        <button
                            className="w-full rounded bg-white py-3 text-xs font-bold uppercase tracking-widest text-trad-text-main shadow-lg hover:bg-trad-primary hover:text-white transition-all duration-100 active:scale-95"
                            onClick={(e) => {
                                // Note: Link wrap will handle navigation, but if this was a direct Add to Cart:
                                // e.preventDefault();
                                // addToCart(product);
                                // toast.success('Đã thêm vào giỏ hàng');
                            }}
                        >
                            Thêm vào giỏ
                        </button>
                    </Link>
                </div>
            </div>
            <div className="flex flex-1 flex-col p-5">
                <div className="mb-2 flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-trad-text-muted">Hộp gỗ sơn mài</span>
                    <div className="flex text-trad-primary">
                        <span className="material-symbols-outlined text-[14px] filled">star</span>
                        <span className="material-symbols-outlined text-[14px] filled">star</span>
                        <span className="material-symbols-outlined text-[14px] filled">star</span>
                        <span className="material-symbols-outlined text-[14px] filled">star</span>
                        <span className="material-symbols-outlined text-[14px] filled">star</span>
                    </div>
                </div>
                <h3 className="font-display text-lg font-bold text-trad-text-main hover:text-trad-primary transition-colors">
                    <Link href={`/products/${product.slug}`}>{product.translation?.title}</Link>
                </h3>
                <div className="mt-auto pt-4 flex items-center justify-between gap-2">
                    <ProductPrice product={product} size="md" theme="traditional" />
                </div>
            </div>
        </div>
    );
}
