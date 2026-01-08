'use client';

import { useState, useEffect } from 'react';
import { useCart } from '../providers/CartProvider';
import { useWishlist } from '../providers/WishlistProvider';
import { useProductDiscount } from '@/hooks/useProductDiscount';
import { ProductPrice } from '@/components/ui/ProductPrice';
import Image from 'next/image';
import TraditionalHeader from './TraditionalHeader';
import TraditionalFooter from './TraditionalFooter';
import { Link } from '@/i18n/routing';

import { toast } from 'sonner';
import { Alert } from '@/components/ui/alert';
import TraditionalProductReviews from '@/components/traditional/TraditionalProductReviews';
import TraditionalProductDescription from './tabs/TraditionalProductDescription';
import TraditionalProductSpecs from './tabs/TraditionalProductSpecs';
import TraditionalProductStory from './tabs/TraditionalProductStory';
import TraditionalProductCard from './TraditionalProductCard';
import { getProducts, getReviews } from '@/lib/api-client';
import { useLocale } from 'next-intl';

import { Product, ProductVariant } from '@/types/product';

export default function TraditionalProductDetail({ product }: { product: Product }) {
    const { addItem } = useCart();
    const { items: wishlistItems, toggle: toggleWishlist } = useWishlist();
    const locale = useLocale();

    // Calculate discount at component level (not inside functions!)
    const { finalPrice, isActive: isDiscountActive, originalPrice } = useProductDiscount(product);

    const [selectedImage, setSelectedImage] = useState(product.images[0]);
    const [quantity, setQuantity] = useState(1);
    const [activeTab, setActiveTab] = useState('description');
    const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
    const [reviewStats, setReviewStats] = useState({ average: 0, total: 0 });
    const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
    const [isAdding, setIsAdding] = useState(false);

    // Initialize variant
    useEffect(() => {
        if (product.variants && Array.isArray(product.variants) && product.variants.length > 0) {
            setSelectedVariant(product.variants[0]);
        }
    }, [product.variants]);

    // Parse Specs for Sidebar
    const specsList = (() => {
        const raw = product.translation?.specifications;
        if (!raw) return [];
        if (typeof raw === 'object') return Object.entries(raw).map(([key, value]) => ({ key, value: String(value) }));
        if (typeof raw === 'string') {
            try { return Object.entries(JSON.parse(raw)).map(([key, value]) => ({ key, value: String(value) })); } catch { }
            return raw.split('. ').map((s: string) => {
                const [k, v] = s.split(':');
                return { key: k?.trim() || '', value: v?.trim() || '' };
            }).filter((x: { key: string; value: string }) => x.key);
        }
        return [];
    })();

    useEffect(() => {
        const loadData = async () => {
            // 1. Fetch Related Products
            // Safe category slug retrieval
            const catSlug = product.category?.slug || (typeof product.category === 'string' ? product.category : undefined);
            const related = await getProducts(locale, {
                category: catSlug,
                limit: 4
            });
            // Filter out current product
            setRelatedProducts(related.filter((p: Product) => p.id !== product.id));

            // 2. Fetch Review Stats
            const { meta } = await getReviews(product.id);
            if (meta) {
                setReviewStats({ average: meta.average || 0, total: meta.total || 0 });
            }
        };
        loadData();
    }, [product.id, locale, product.category]);

    const handleAddToCart = async () => {
        if (isAdding) return;
        setIsAdding(true);
        try {
            // Calculate discount amount for cart
            const discountAmount = isDiscountActive ? (originalPrice - finalPrice) : 0;

            // Use finalPrice calculated at component top level (line 31)
            await addItem({
                id: product.id,
                slug: product.slug,
                title: product.translation?.title || 'Trầm Hương',
                price: finalPrice,  // ✅ Using discounted price from hook
                original_price: originalPrice,  // For discount display in checkout
                discount_amount: discountAmount,  // For discount display in checkout
                image: product.images[0],
                quantity: quantity,
                variantId: selectedVariant?.name || undefined,
                variantName: selectedVariant?.name || undefined
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
        } finally {
            setIsAdding(false);
        }
    };

    const handleWishlist = async () => {
        const isAdding = !wishlistItems.has(product.id);
        await toggleWishlist(product.id);
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
    };

    const handleQuantityChange = (delta: number) => {
        setQuantity(prev => Math.max(1, prev + delta));
    };

    // Render stars helper using dynamic count
    const renderStars = (rating: number) => {
        return (
            <div className="flex text-trad-primary">
                {[...Array(5)].map((_, i) => (
                    <span key={i} className={`material-symbols-outlined !text-[20px] ${i < Math.round(rating) ? 'filled' : ''}`}>
                        {i < Math.round(rating) ? 'star' : 'star_border'}
                    </span>
                ))}
            </div>
        );
    };

    return (
        <div className="bg-trad-bg-light min-h-screen font-display">
            <TraditionalHeader />

            <main className="min-h-screen bg-pattern-lotus pb-20">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
                    {/* Breadcrumbs */}
                    <nav aria-label="Breadcrumb" className="flex mb-8 text-sm">
                        <ol className="inline-flex flex-wrap items-center gap-2">
                            <li className="inline-flex items-center">
                                <Link className="text-trad-text-muted hover:text-trad-primary font-medium transition-colors" href="/">Trang chủ</Link>
                            </li>
                            <li className="text-trad-text-muted">/</li>
                            <li className="inline-flex items-center">
                                <Link className="text-trad-text-muted hover:text-trad-primary font-medium transition-colors" href="/products/catalog">Sản Phẩm</Link>
                            </li>
                            <li className="text-trad-text-muted">/</li>
                            <li aria-current="page">
                                <span className="text-trad-text-main font-semibold truncate max-w-[200px] md:max-w-none text-ellipsis block">{product.translation?.title}</span>
                            </li>
                        </ol>
                    </nav>


                    {/* Product Details Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                        {/* Left Column: Gallery */}
                        <div className="lg:col-span-7 flex flex-col gap-4">
                            {/* Main Image */}
                            <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl bg-trad-bg-warm border border-trad-border-warm group shadow-sm">
                                <div className="relative w-full h-full">
                                    <Image
                                        src={selectedImage || product.images[0]}
                                        alt={product.translation?.title || 'Sản phẩm'}
                                        fill
                                        priority
                                        loading="eager"
                                        sizes="(max-width: 1024px) 100vw, 60vw"
                                        className="object-cover transition-transform duration-500 hover:scale-105"
                                    />
                                </div>
                                <div className="absolute top-4 left-4 bg-trad-primary text-white text-xs font-bold px-3 py-1 rounded-full shadow-md z-10">
                                    Bán chạy nhất
                                </div>
                                <button className="absolute bottom-4 right-4 bg-white/90 p-2 rounded-lg hover:bg-white text-trad-text-main shadow-sm transition-all z-10" title="Phóng to">
                                    <span className="material-symbols-outlined">zoom_in</span>
                                </button>
                            </div>
                            {/* Thumbnails */}
                            <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-trad-border-warm scrollbar-track-transparent snap-x">
                                {product.images.map((img: string, idx: number) => (
                                    <button
                                        key={idx}
                                        onClick={() => setSelectedImage(img)}
                                        className={`relative flex-none w-24 aspect-square rounded-lg overflow-hidden border transition-all snap-start ${selectedImage === img ? 'border-trad-primary ring-2 ring-trad-primary/20 ring-offset-2' : 'border-trad-border-warm hover:border-trad-primary opacity-70 hover:opacity-100'}`}
                                    >
                                        <Image
                                            src={img}
                                            alt={`Prod thumb ${idx}`}
                                            fill
                                            sizes="96px"
                                            className="object-cover"
                                        />
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Right Column: Product Info */}
                        <div className="lg:col-span-5 flex flex-col gap-6">
                            <div>
                                <div className="flex items-center gap-2 text-trad-primary text-sm font-bold uppercase tracking-widest mb-2">Trầm Hương Tự Nhiên</div>
                                <h1 className="text-3xl md:text-4xl font-bold text-trad-text-main mb-4 leading-tight">{product.translation?.title}</h1>

                                {/* Ratings */}
                                <div className="flex items-center gap-4 mb-6">
                                    {renderStars(reviewStats.average)}
                                    <span className="text-trad-text-main text-sm font-medium border-l border-trad-border-warm pl-4 underline decoration-trad-text-muted/50 cursor-pointer">
                                        {reviewStats.total} Đánh giá
                                    </span>
                                    {/* <span className="text-trad-text-muted text-sm border-l border-trad-border-warm pl-4">Đã bán 1.2k</span> */}
                                </div>

                                {/* Price */}
                                <div className="flex items-end gap-3 mb-6 bg-trad-bg-warm p-4 rounded-lg border border-trad-border-warm/50">
                                    <ProductPrice
                                        product={product}
                                        variantPrice={selectedVariant?.price != null ? Number(selectedVariant.price) : undefined}
                                        size="xl"
                                        theme="traditional"
                                    />
                                </div>

                                <p className="text-trad-text-main/80 leading-relaxed mb-8">
                                    {product.translation?.description}
                                </p>
                                <hr className="border-trad-border-warm mb-8" />

                                {/* Options */}
                                <div className="flex flex-col gap-6">
                                    {/* Size Selector - Dynamic */}
                                    {product.variants && Array.isArray(product.variants) && product.variants.length > 0 && (
                                        <div>
                                            <h3 className="text-sm font-bold text-trad-text-main mb-3">Tùy chọn</h3>
                                            <div className="flex flex-wrap gap-3">
                                                {product.variants.map((v: ProductVariant, idx: number) => (
                                                    <label key={idx} className="cursor-pointer">
                                                        <input
                                                            className="peer sr-only"
                                                            name="variant"
                                                            type="radio"
                                                            checked={selectedVariant === v}
                                                            onChange={() => setSelectedVariant(v)}
                                                        />
                                                        <div className={`px-4 py-2 rounded border transition-all text-sm font-medium ${selectedVariant === v ? 'bg-trad-primary text-white border-trad-primary' : 'bg-white text-trad-text-main border-trad-border-warm hover:border-trad-primary'}`}>
                                                            {v.name}
                                                        </div>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Quantity & Add to Cart */}
                                    <div className="flex flex-wrap gap-4 items-stretch pt-4">
                                        <div className="flex items-center border border-trad-border-warm rounded-lg bg-white h-12">
                                            <button onClick={() => handleQuantityChange(-1)} className="px-3 py-1 hover:text-trad-primary transition-colors h-full flex items-center justify-center w-12">
                                                <span className="material-symbols-outlined !text-[18px]">remove</span>
                                            </button>
                                            <input
                                                className="w-12 text-center border-none focus:ring-0 text-trad-text-main font-bold p-0 bg-transparent h-full"
                                                type="text"
                                                value={quantity}
                                                readOnly
                                            />
                                            <button onClick={() => handleQuantityChange(1)} className="px-3 py-1 hover:text-trad-primary transition-colors h-full flex items-center justify-center w-12">
                                                <span className="material-symbols-outlined !text-[18px]">add</span>
                                            </button>
                                        </div>
                                        <button
                                            onClick={handleAddToCart}
                                            disabled={isAdding}
                                            className={`flex-1 bg-trad-primary hover:bg-trad-primary-dark text-white font-bold rounded-lg px-4 md:px-8 h-12 flex items-center justify-center gap-2 transition-colors shadow-md shadow-trad-primary/20 text-sm md:text-base ${isAdding ? 'opacity-75 cursor-wait' : ''}`}
                                        >
                                            <span className="material-symbols-outlined !text-[20px]">shopping_bag</span>
                                            {isAdding ? 'Đang thêm...' : 'Thêm vào giỏ hàng'}
                                        </button>
                                        <button
                                            onClick={handleWishlist}
                                            className={`h-12 w-12 rounded-lg border flex items-center justify-center transition-all ${wishlistItems.has(product.id)
                                                ? 'border-trad-red-900 bg-red-50 text-trad-red-900'
                                                : 'border-trad-border-warm bg-white text-trad-text-muted hover:text-trad-red-900 hover:border-trad-red-900'
                                                }`}
                                        >
                                            <span className={`material-symbols-outlined ${wishlistItems.has(product.id) ? 'filled' : ''}`}>favorite</span>
                                        </button>
                                    </div>
                                </div>

                                {/* Trust Badges */}
                                <div className="grid grid-cols-3 gap-4 mt-8 pt-8 border-t border-trad-border-warm">
                                    <div className="flex flex-col items-center text-center gap-2">
                                        <span className="material-symbols-outlined text-trad-primary !text-[32px]">verified</span>
                                        <span className="text-xs font-medium text-trad-text-main">100% Tự nhiên</span>
                                    </div>
                                    <div className="flex flex-col items-center text-center gap-2">
                                        <span className="material-symbols-outlined text-trad-primary !text-[32px]">local_shipping</span>
                                        <span className="text-xs font-medium text-trad-text-main">Giao hàng nhanh</span>
                                    </div>
                                    <div className="flex flex-col items-center text-center gap-2">
                                        <span className="material-symbols-outlined text-trad-primary !text-[32px]">security</span>
                                        <span className="text-xs font-medium text-trad-text-main">Đổi trả 7 ngày</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Content Tabs Section */}
                    <div className="mt-20">
                        <div className="border-b border-trad-border-warm mb-8">
                            <div className="flex gap-8 overflow-x-auto scrollbar-hide">
                                {['description', 'specs', 'story', 'reviews'].map((tab) => (
                                    <button
                                        key={tab}
                                        onClick={() => setActiveTab(tab)}
                                        className={`pb-4 border-b-2 font-medium text-lg transition-colors whitespace-nowrap px-2 ${activeTab === tab
                                            ? 'text-trad-primary border-trad-primary font-bold'
                                            : 'text-trad-text-muted border-transparent hover:text-trad-primary hover:border-trad-primary/50'
                                            }`}
                                    >
                                        {tab === 'description' && 'Mô tả chi tiết'}
                                        {tab === 'specs' && 'Thông số kỹ thuật'}
                                        {tab === 'story' && 'Câu chuyện sản phẩm'}
                                        {tab === 'reviews' && `Đánh giá (${reviewStats.total})`}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                            {/* Left: Content Area */}
                            <div className="lg:col-span-2 text-trad-text-main/90 leading-loose space-y-6">
                                {activeTab === 'description' && (
                                    <TraditionalProductDescription product={product} />
                                )}

                                {activeTab === 'specs' && (
                                    <TraditionalProductSpecs product={product} />
                                )}

                                {activeTab === 'story' && (
                                    <TraditionalProductStory product={product} />
                                )}

                                {activeTab === 'reviews' && (
                                    <div className="animation-fade-in">
                                        <TraditionalProductReviews productId={product.id} />
                                    </div>
                                )}
                            </div>

                            {/* Right: Specs Table (Always visible or contextual) */}
                            <div className="lg:col-span-1 hidden lg:block">
                                <div className="bg-white p-6 rounded-xl border border-trad-border-warm shadow-sm sticky top-24">
                                    <h3 className="text-xl font-bold text-trad-text-main mb-6 flex items-center gap-2">
                                        <span className="material-symbols-outlined text-trad-primary">analytics</span>
                                        Thông số kỹ thuật
                                    </h3>
                                    <div className="space-y-4">
                                        {specsList.length > 0 ? (
                                            specsList.slice(0, 6).map((item: { key: string; value: string }, idx: number) => (
                                                <div key={idx} className="flex justify-between py-3 border-b border-trad-border-subtle last:border-0 text-sm">
                                                    <span className="text-trad-text-muted">{item.key}</span>
                                                    <span className="font-medium text-trad-text-main text-right break-words max-w-[50%]">{item.value}</span>
                                                </div>
                                            ))
                                        ) : (
                                            <>
                                                <div className="flex justify-between py-3 border-b border-trad-border-subtle">
                                                    <span className="text-trad-text-muted">Xuất xứ</span>
                                                    <span className="font-medium text-trad-text-main">Việt Nam</span>
                                                </div>
                                                <div className="flex justify-between py-3 border-b border-trad-border-subtle">
                                                    <span className="text-trad-text-muted">Thương hiệu</span>
                                                    <span className="font-medium text-trad-text-main">Thiên Phúc</span>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                    <div className="mt-8 bg-trad-bg-warm p-4 rounded-lg border border-trad-primary/20">
                                        <p className="text-sm text-trad-text-muted italic text-center">
                                            &quot;Hương trầm là cầu nối tâm linh, là nét đẹp văn hóa ngàn đời của người Việt.&quot;
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Related Products - UI Placeholder to match design */}
                    <div className="mt-10 mb-20">
                        <div className="flex items-center justify-between mb-8">
                            <h2 className="text-2xl font-bold text-trad-text-main">Sản phẩm liên quan</h2>
                            <Link className="text-trad-primary hover:text-trad-primary-dark font-medium flex items-center gap-1" href="/products">
                                Xem tất cả <span className="material-symbols-outlined">arrow_forward</span>
                            </Link>
                        </div>
                        {/* Related Products Grid */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                            {relatedProducts.length > 0 ? (
                                relatedProducts.map((item) => (
                                    <TraditionalProductCard key={item.id} product={item} />
                                ))
                            ) : (
                                <div className="col-span-full text-center py-10 text-trad-text-muted italic">
                                    Đang cập nhật sản phẩm liên quan...
                                </div>
                            )}
                        </div>
                    </div>

                </div>
            </main>

            <TraditionalFooter />
        </div>
    );
}
