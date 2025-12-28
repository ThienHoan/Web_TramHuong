'use client';

import { useEffect, useState } from 'react';
import { getWishlist, getProducts } from '@/lib/api-client';
import { useAuth } from '@/components/providers/AuthProvider';
import { useWishlist } from '@/components/providers/WishlistProvider';
import { Link } from '@/i18n/routing';
import ProductImage from '@/components/ui/ProductImage';
import WishlistButton from '@/components/product/WishlistButton';
import { useCurrency } from '@/hooks/useCurrency';
import TraditionalHeader from '@/components/traditional/TraditionalHeader';
import TraditionalFooter from '@/components/traditional/TraditionalFooter';
import { motion } from 'framer-motion';

export default function WishlistPage() {
    const { session, loading: authLoading } = useAuth();
    const { items: likedItems } = useWishlist();
    const [wishlistProducts, setWishlistProducts] = useState<any[]>([]);
    const [suggestedProducts, setSuggestedProducts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const { formatPrice } = useCurrency();

    useEffect(() => {
        if (!session && !authLoading) {
            setLoading(false);
            return;
        }

        if (session) {
            // Fetch both wishlist and potential suggestions in parallel
            Promise.all([
                getWishlist(),
                getProducts('vi', { limit: 12 }) // Fetch enough to filter
            ])
                .then(([wishlistData, productsData]) => {
                    const wishlist = wishlistData || [];
                    setWishlistProducts(wishlist);

                    // Filter suggestions: Exclude items already in wishlist
                    const wishlistIds = new Set(wishlist.map((item: any) => item.product_id));
                    const filteredSuggestions = productsData
                        .filter((p: any) => !wishlistIds.has(p.id))
                        .slice(0, 3); // Take top 3

                    setSuggestedProducts(filteredSuggestions);
                })
                .catch(console.error)
                .finally(() => setLoading(false));
        }
    }, [session, authLoading]);

    // Live filter: Ensure we match the global wishlist context state
    const displayedProducts = wishlistProducts.filter(p => likedItems.has(p.product_id));
    const isEmpty = displayedProducts.length === 0;

    if (authLoading || loading) {
        return (
            <div className="bg-trad-bg-light min-h-screen flex flex-col font-display selection:bg-trad-primary selection:text-white">
                <TraditionalHeader />
                <main className="flex-grow flex items-center justify-center">
                    <div className="w-12 h-12 border-4 border-trad-border-warm border-t-trad-primary rounded-full animate-spin"></div>
                </main>
                <TraditionalFooter />
            </div>
        );
    }

    if (!session) {
        return (
            <div className="bg-trad-bg-light min-h-screen flex flex-col font-display selection:bg-trad-primary selection:text-white">
                <TraditionalHeader />
                <main className="flex-grow flex flex-col items-center justify-center p-8 text-center">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="max-w-md space-y-6"
                    >
                        <div className="w-24 h-24 bg-trad-bg-warm rounded-full mx-auto flex items-center justify-center border border-trad-border-warm">
                            <span className="material-symbols-outlined text-4xl text-trad-text-muted">lock</span>
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold text-trad-red-900 mb-2 font-display">Đăng nhập để lưu giữ</h1>
                            <p className="text-trad-text-muted text-lg font-serif italic">"Để những món quà tinh thần không bị lãng quên."</p>
                        </div>
                        <Link href="/login?redirect=/account/wishlist" className="inline-flex items-center justify-center bg-trad-primary hover:bg-trad-red-900 text-white font-bold py-3 px-8 rounded-full transition-all shadow-lg hover:shadow-xl hover:-translate-y-1">
                            Đăng nhập ngay
                        </Link>
                    </motion.div>
                </main>
                <TraditionalFooter />
            </div>
        );
    }

    return (
        <div className="bg-trad-bg-light text-trad-text-main font-display min-h-screen flex flex-col relative overflow-hidden">
            {/* Artistic Background */}
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/cream-paper.png')] z-0"></div>
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-b from-trad-gold/10 to-transparent rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>

            <TraditionalHeader />

            <main className="flex-grow flex flex-col relative z-10 px-4 py-16 md:py-24">
                <div className="max-w-7xl w-full mx-auto">

                    {/* Poetic Header */}
                    <div className="text-center mb-16 md:mb-24">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.8 }}
                        >
                            <span className="text-trad-primary font-bold tracking-[0.2em] uppercase text-xs md:text-sm mb-4 block">Bộ Sưu Tập Cá Nhân</span>
                            <h1 className="font-serif text-4xl md:text-6xl text-trad-red-900 mb-6 drop-shadow-sm">
                                Danh Sách Yêu Thích
                            </h1>
                            <div className="flex items-center justify-center gap-4 text-trad-gold/60 mb-8">
                                <div className="h-px w-12 bg-current"></div>
                                <span className="material-symbols-outlined text-xl">spa</span>
                                <div className="h-px w-12 bg-current"></div>
                            </div>
                            <p className="font-serif text-lg md:text-xl text-trad-text-muted max-w-2xl mx-auto leading-relaxed italic">
                                "Nơi cất giữ những rung động đầu tiên,<br className="hidden md:block" /> chờ ngày hữu duyên được sở hữu."
                            </p>
                        </motion.div>
                    </div>

                    {isEmpty ? (
                        /* Empty State - Storytelling */
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.3, duration: 0.8 }}
                            className="text-center py-12 max-w-3xl mx-auto"
                        >
                            <div className="relative inline-block mb-10">
                                <div className="absolute inset-0 bg-trad-gold/20 blur-2xl rounded-full"></div>
                                <div className="relative w-32 h-32 md:w-40 md:h-40 bg-white border border-trad-border-warm rounded-full flex items-center justify-center mx-auto shadow-sm">
                                    <span className="material-symbols-outlined text-5xl md:text-6xl text-trad-text-muted/50">bookmark_border</span>
                                </div>
                            </div>
                            <h2 className="font-display font-bold text-2xl md:text-3xl text-trad-text-main mb-4">
                                Chưa có gì ở đây cả
                            </h2>
                            <p className="text-trad-text-muted text-lg mb-10 font-light">
                                Hãy dạo quanh cửa hàng và lưu lại những sản phẩm<br />khiến trái tim bạn rung động.
                            </p>
                            <Link href="/products" className="group relative inline-flex items-center justify-center px-10 py-4 font-display font-medium tracking-wide text-white bg-trad-red-900 rounded-full shadow-lg hover:shadow-xl hover:bg-trad-primary transition-all duration-500 overflow-hidden">
                                <span className="relative z-10 flex items-center gap-2">
                                    Khám Phá Cửa Hàng
                                    <span className="material-symbols-outlined text-lg group-hover:translate-x-1 transition-transform">arrow_forward</span>
                                </span>
                            </Link>
                        </motion.div>
                    ) : (
                        /* Product Grid - Minimalist & Elegant */
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.2 }}
                            className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8 md:gap-y-12"
                        >
                            {displayedProducts.map((item, index) => (
                                <motion.div
                                    key={item.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: index * 0.1 }}
                                    className="group flex flex-col"
                                >
                                    <div className="relative aspect-[3/4] overflow-hidden bg-trad-bg-warm mb-6 rounded-sm">
                                        {item.product && (
                                            <>
                                                <ProductImage
                                                    src={item.product.images?.[0]}
                                                    alt={item.product_title}
                                                    className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
                                                />
                                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors duration-500"></div>

                                                {/* Floating Actions */}
                                                <div className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 transform translate-y-2 group-hover:translate-y-0">
                                                    <WishlistButton
                                                        productId={item.product.id}
                                                        className="bg-white text-trad-red-600 shadow-md hover:bg-trad-red-50 w-10 h-10 flex items-center justify-center rounded-full"
                                                    />
                                                </div>

                                                <Link href={`/products/${item.product.slug}`} className="absolute inset-x-4 bottom-4 z-10 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                                                    <div className="bg-white/95 backdrop-blur text-trad-red-900 text-center text-sm font-bold uppercase tracking-widest py-3 hover:bg-trad-primary hover:text-white transition-colors shadow-lg rounded-sm">
                                                        Xem Chi Tiết
                                                    </div>
                                                </Link>
                                                <Link href={`/products/${item.product.slug}`} className="absolute inset-0 z-0" />
                                            </>
                                        )}
                                    </div>
                                    <div className="text-center">
                                        <h3 className="font-serif text-xl text-trad-text-main mb-2 hover:text-trad-primary transition-colors cursor-pointer">
                                            <Link href={`/products/${item.product?.slug}`}>{item.product_title}</Link>
                                        </h3>
                                        <div className="flex items-center justify-center gap-2">
                                            <span className="text-sm font-bold text-trad-red-900">{formatPrice(Number(item.product?.price || 0))}</span>
                                        </div>
                                        <p className="text-xs text-trad-text-muted mt-3 italic opacity-60">
                                            Đã lưu vào {new Date(item.created_at).toLocaleDateString('vi-VN')}
                                        </p>
                                    </div>
                                </motion.div>
                            ))}
                        </motion.div>
                    )}
                </div>
            </main>

            {/* Real Suggested Products Section */}
            {suggestedProducts.length > 0 && (
                <section className="relative z-10 w-full py-20 border-t border-trad-border-warm/50">
                    <div className="max-w-7xl mx-auto px-6">
                        <div className="text-center mb-12">
                            <h3 className="font-serif text-3xl text-trad-red-900 mb-3">Gợi ý dành riêng cho bạn</h3>
                            <p className="text-trad-text-muted italic">"Những tuyệt phẩm có thể bạn sẽ thích"</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            {suggestedProducts.map((product) => (
                                <div key={product.id} className="group relative">
                                    <div className="relative aspect-square overflow-hidden rounded-full border border-trad-border-warm mx-auto w-4/5 md:w-full mb-6 bg-trad-bg-warm">
                                        <ProductImage
                                            src={product.images?.[0]}
                                            alt={product.name}
                                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                                        />
                                        <Link href={`/products/${product.slug}`} className="absolute inset-0 z-10" />

                                        {/* Minimalist Overlay */}
                                        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-4">
                                            <WishlistButton
                                                productId={product.id}
                                                className="bg-white text-trad-text-main hover:text-red-600 w-12 h-12 rounded-full flex items-center justify-center shadow-lg transform scale-0 group-hover:scale-100 transition-transform duration-300 delay-100"
                                            />
                                            <Link href={`/products/${product.slug}`} className="bg-white text-trad-text-main hover:text-trad-primary w-12 h-12 rounded-full flex items-center justify-center shadow-lg transform scale-0 group-hover:scale-100 transition-transform duration-300 delay-75">
                                                <span className="material-symbols-outlined">visibility</span>
                                            </Link>
                                        </div>
                                    </div>
                                    <div className="text-center">
                                        <h4 className="font-display font-bold text-lg text-trad-text-main mb-1 group-hover:text-trad-primary transition-colors">
                                            <Link href={`/products/${product.slug}`}>{product.name}</Link>
                                        </h4>
                                        <p className="font-serif text-trad-red-900">{formatPrice(product.price)}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>
            )}

            <TraditionalFooter />
        </div>
    );
}
