'use client';

import { Link } from '@/i18n/routing';
import ProductImage from '../ui/ProductImage';
import { ProductPrice } from '@/components/ui/ProductPrice';
import { useProductDiscount } from '@/hooks/useProductDiscount';
import { useWishlist } from '@/components/providers/WishlistProvider';
import { useCart } from '@/components/providers/CartProvider';
import { toast } from 'sonner';
import { Alert } from '@/components/ui/alert';
import { Product } from '@/types/product';

interface TraditionalProductGridItemProps {
    product: Product;
}

export default function TraditionalProductGridItem({ product }: TraditionalProductGridItemProps) {
    const { addItem } = useCart();
    const { items: wishlistItems, toggle: toggleWishlist } = useWishlist();
    const { finalPrice, originalPrice, isActive, discountPercent, savings } = useProductDiscount(product);

    const handleAddToCart = () => {
        addItem({
            id: product.id,
            slug: product.slug,
            title: product.translation?.title || product.title || 'Product',
            price: finalPrice,
            original_price: originalPrice,
            discount_amount: savings, // Mapping savings to discount_amount for cart
            image: product.images?.[0] || 'placeholder',
            quantity: 1
        });
        toast.custom((t) => (
            <Alert
                variant="success"
                size="sm"
                title="Thành Công"
                className="w-[300px] bg-white border-none shadow-xl"
                onClose={() => toast.dismiss(t)}
            >
                Đã thêm sản phẩm vào giỏ hàng!
            </Alert>
        ));
    };

    return (
        <div className="rounded-xl border border-trad-border-warm bg-white text-trad-text-main shadow-sm hover:shadow-md transition-all duration-300 group flex flex-col overflow-hidden">
            <div className="relative aspect-[4/5] w-full overflow-hidden bg-trad-bg-warm">
                {isActive && (
                    <span className="absolute left-2 top-2 z-10 rounded bg-trad-red-900 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-white shadow">
                        -{discountPercent}%
                    </span>
                )}
                <ProductImage
                    src={product.images?.[0] || 'https://lh3.googleusercontent.com/aida-public/AB6AXuBwD0foJUP_hTJwAfMEq8pczGOEqf3yl0c5rIvOIkLcsLSMaPRa3lWPo26cFQBDBiCaJPywFlQOhci8vHtJJHGF5_KLpC6FSyTIL4BBKvfs3jVPh0mAjq8N_BqiFEchwW6m3euXU_i600Fz7RGb1QHZXZlf023XpCfsJ5jKHbwpkpHNzAvKbCb7m3ojkdPOFWSEGkjHsFI_c_EZtzzRC2bIRffXiev81bLAJt3qEqYLbAwY6Np0doM5PO_iNx5-zBZMGBUSuFOg1rcg'}
                    alt={product.translation?.title || product.title || 'Product'}
                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-3 opacity-0 translate-y-4 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300">
                    <Link href={`/products/${product.slug}`}>
                        <button className="h-10 w-10 rounded-full bg-white text-trad-text-main hover:text-trad-primary hover:bg-trad-bg-warm shadow-lg flex items-center justify-center transition-colors" title="Xem chi tiết">
                            <span className="material-symbols-outlined text-[20px]">visibility</span>
                        </button>
                    </Link>
                    <button
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            const isAdding = !wishlistItems.has(product.id);
                            toggleWishlist(product.id);
                            if (isAdding) {
                                toast.custom((t) => (
                                    <Alert
                                        variant="success"
                                        size="sm"
                                        title="Yêu Thích"
                                        className="w-[300px] bg-white border-none shadow-xl"
                                        onClose={() => toast.dismiss(t)}
                                    >
                                        Đã thêm vào danh sách yêu thích!
                                    </Alert>
                                ));
                            } else {
                                toast.info("Đã xóa khỏi danh sách yêu thích");
                            }
                        }}
                        className={`h-10 w-10 rounded-full bg-white shadow-lg flex items-center justify-center transition-colors ${wishlistItems.has(product.id) ? 'text-trad-red-900' : 'text-trad-text-main hover:text-trad-primary hover:bg-trad-bg-warm'}`}
                        title="Yêu thích"
                    >
                        <span className={`material-symbols-outlined text-[20px] ${wishlistItems.has(product.id) ? 'filled' : ''}`}>favorite</span>
                    </button>
                </div>
            </div>
            <div className="flex flex-1 flex-col p-3 md:p-5">
                <div className="mb-1 md:mb-2 flex text-trad-primary text-[12px] md:text-[14px]">
                    {[1, 2, 3, 4, 5].map(i => (
                        <span key={i} className="material-symbols-outlined filled text-[14px] md:text-[16px]">star</span>
                    ))}
                </div>
                <h3 className="mb-1 md:mb-2 text-sm md:text-lg font-bold font-display leading-tight text-trad-text-main group-hover:text-trad-primary transition-colors line-clamp-2">
                    <Link href={`/products/${product.slug}`}>{product.translation?.title || product.title || 'Product'}</Link>
                </h3>
                <div className="mt-auto pt-2 md:pt-3 flex flex-col gap-2 md:gap-3">
                    <ProductPrice product={product} size="md" theme="traditional" />
                    <button
                        onClick={(e) => {
                            e.preventDefault();
                            handleAddToCart();
                        }}
                        className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-trad-primary text-white shadow bg-trad-primary hover:bg-trad-primary-dark h-11 px-4 py-2 uppercase tracking-wide w-full gap-2 group-hover:bg-trad-bg-warm group-hover:text-trad-primary border border-transparent group-hover:border-trad-primary"
                    >
                        <span className="material-symbols-outlined text-[18px]">add_shopping_cart</span>
                        Thêm vào giỏ
                    </button>
                </div>
            </div>
        </div>
    );
}
