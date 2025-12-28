'use client';

import { useEffect, useState } from 'react';
import { getWishlist } from '@/lib/api-client';
import { useAuth } from '@/components/providers/AuthProvider';
import { useWishlist } from '@/components/providers/WishlistProvider';
import { Link } from '@/i18n/routing';
import ProductImage from '@/components/ui/ProductImage';
import WishlistButton from '@/components/product/WishlistButton';
import { useCurrency } from '@/hooks/useCurrency';
import TraditionalHeader from '@/components/traditional/TraditionalHeader';
import TraditionalFooter from '@/components/traditional/TraditionalFooter';

export default function WishlistPage() {
    const { session, loading: authLoading } = useAuth();
    const { items: likedItems } = useWishlist();
    const [products, setProducts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const { formatPrice } = useCurrency();

    useEffect(() => {
        if (!session && !authLoading) {
            setLoading(false);
            return;
        }

        if (session) {
            getWishlist()
                .then(data => {
                    setProducts(data || []);
                })
                .catch(console.error)
                .finally(() => setLoading(false));
        }
    }, [session, authLoading]);

    // Live filter: Only show products that are currently in the likedItems
    const displayedProducts = products.filter(p => likedItems.has(p.product_id));

    // Determine state
    const isEmpty = displayedProducts.length === 0;

    if (authLoading || loading) {
        return (
            <div className="bg-trad-bg-light min-h-screen flex flex-col font-display selection:bg-trad-primary selection:text-white">
                <TraditionalHeader />
                <main className="flex-grow flex items-center justify-center">
                    <div className="w-12 h-12 border-4 border-trad-primary border-t-transparent rounded-full animate-spin"></div>
                </main>
                <TraditionalFooter />
            </div>
        );
    }

    if (!session) {
        // Unauthenticated State (Prompt to Login)
        return (
            <div className="bg-trad-bg-light min-h-screen flex flex-col font-display selection:bg-trad-primary selection:text-white">
                <TraditionalHeader />
                <main className="flex-grow flex items-center justify-center p-8">
                    <div className="text-center max-w-md">
                        <span className="material-symbols-outlined text-6xl text-trad-primary bg-trad-primary/10 p-6 rounded-full mb-6">lock</span>
                        <h1 className="text-3xl font-bold text-trad-text-main mb-4">Đăng nhập để xem Wishlist</h1>
                        <p className="text-trad-text-muted mb-8 text-lg">Vui lòng đăng nhập để đồng bộ và xem các sản phẩm yêu thích của bạn.</p>
                        <Link href="/login?redirect=/account/wishlist" className="inline-block bg-trad-primary hover:bg-trad-red-900 text-white font-bold py-3 px-8 rounded-lg transition-colors shadow-lg shadow-trad-primary/30">
                            Đăng nhập ngay
                        </Link>
                    </div>
                </main>
                <TraditionalFooter />
            </div>
        );
    }

    return (
        <div className="bg-trad-bg-light dark:bg-black text-trad-text-main font-display transition-colors duration-300 min-h-screen flex flex-col relative">
            {/* Background Patterns */}
            <div className="absolute inset-0 opacity-40 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/cream-paper.png')] mix-blend-multiply z-0"></div>
            <div className="absolute top-0 left-0 w-32 h-32 md:w-48 md:h-48 opacity-20 pointer-events-none z-0">
                <img alt="Decorative cloud pattern" className="w-full h-full object-contain -scale-x-100 mix-blend-multiply grayscale" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCV_ZcBcR_lBGNNec1o5H_UzQ1IfYt1ILCXOj7vKkkP8MUFxmWumH4qck5wqFZ230xrs5IhH5dIRFnLpUDt8pTqDMJwgEaYI-jArtcNEFTfUbIL77zyi6LkHPUwSd7wPPtvQV0if3rWqsSg_8K4xfvlFNvr83__p2KXR_o4ukSyQlNo4JFZxoPi3XKYV6S7YdfkgRuRrv2vwspJCnbQQbsxwFeDfX6jiovi5ONGEruDHj647QtoXo-1T_aIJK5fFfgiO1oHhjL4oPgX" />
            </div>

            <TraditionalHeader />

            <main className="flex-grow flex flex-col relative z-10 px-4 py-12 md:py-20">
                <div className="max-w-7xl w-full mx-auto">
                    {/* Header Section */}
                    <div className="text-center mb-12">
                        <div className="inline-flex items-center justify-center p-3 rounded-full bg-trad-bg-warm border border-trad-border-warm mb-4 shadow-sm">
                            <span className="material-symbols-outlined text-trad-primary text-2xl">favorite</span>
                        </div>
                        <h1 className="font-display font-bold text-3xl md:text-5xl text-trad-red-900 leading-tight mb-4">
                            Danh Sách Yêu Thích
                        </h1>
                        <p className="font-serif italic text-trad-text-muted text-lg">
                            "Nơi lưu giữ những tinh hoa bạn đã chọn."
                        </p>
                    </div>

                    {isEmpty ? (
                        /* Empty State */
                        <div className="text-center py-12 max-w-3xl mx-auto">
                            <div className="animate-fade-in-up mb-8 md:mb-12 relative inline-block">
                                <div className="absolute inset-0 border border-trad-gold/30 rounded-full scale-110 animate-[spin_20s_linear_infinite]"></div>
                                <div className="absolute inset-0 border border-dashed border-trad-primary/20 rounded-full scale-125"></div>
                                <div className="w-48 h-48 md:w-64 md:h-64 mx-auto rounded-full overflow-hidden border-4 border-white shadow-xl relative bg-trad-bg-warm">
                                    <img alt="Empty wishlist illustration" className="w-full h-full object-cover opacity-90 hover:scale-105 transition-transform duration-700" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAFEDUXzNAnMRIxd3mdqphy3Sj_Gm_VtzJGU0ha16XoWP4-jI3mf5vFmR4ItdSvX18qpPiITXHTwINP9JlpQnfCOTDPF7Od_XGCT8HK4B4dWvEBR7O5-HQnjYTlXbhY1uBGp99vwcatDKZYxlX110njy6_9UYaOIOgucfFncZ9M7M9Yf29mxYV5gI1d8N-pj1Y6hbpMR4mkyQuMqz8RI2h6OC0u7fCQnvUSqde1Y5IgjgFAFWa4OhSYw2xKN3mzPHo6-aYfVGCoYzPs" />
                                    <div className="absolute inset-0 bg-yellow-900/10 mix-blend-sepia pointer-events-none"></div>
                                </div>
                            </div>
                            <div className="animate-fade-in-up animation-delay-2000 space-y-4">
                                <h2 className="font-display font-bold text-2xl text-trad-primary dark:text-trad-gold leading-tight">
                                    Khoảng trống này<br />chờ đợi những tinh hoa
                                </h2>
                                <p className="text-xs font-display uppercase tracking-widest text-trad-text-muted mt-2">
                                    — Danh sách yêu thích của bạn chưa có sản phẩm —
                                </p>
                            </div>
                            <div className="animate-fade-in-up animation-delay-4000 mt-10">
                                <Link href="/products" className="group relative inline-flex items-center justify-center px-8 py-3 overflow-hidden font-display font-medium tracking-tighter text-white bg-trad-primary rounded-sm shadow-lg hover:bg-trad-red-900 hover:shadow-xl transition-all duration-300">
                                    <span className="relative flex items-center gap-2 uppercase tracking-widest text-sm">
                                        Khám Phá Sản Phẩm Ngay
                                        <span className="material-symbols-outlined text-sm group-hover:translate-x-1 transition-transform">arrow_forward</span>
                                    </span>
                                </Link>
                            </div>
                        </div>
                    ) : (
                        /* Product Grid */
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
                            {displayedProducts.map((item) => (
                                <div key={item.id} className="group relative bg-white border border-trad-border-warm rounded-sm overflow-hidden hover:shadow-lg transition-all duration-500">
                                    <div className="relative aspect-[4/5] bg-trad-bg-warm overflow-hidden">
                                        {item.product && (
                                            <>
                                                <ProductImage
                                                    src={item.product.images?.[0]}
                                                    alt={item.product_title}
                                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                                                />
                                                <div className="absolute top-2 right-2 z-10">
                                                    <WishlistButton
                                                        productId={item.product.id}
                                                        className="bg-white/90 backdrop-blur-sm shadow-sm hover:text-red-600 text-red-600 rounded-full p-2"
                                                    />
                                                </div>
                                                <Link href={`/products/${item.product.slug}`} className="absolute inset-0 z-0" />

                                                {/* Quick Add Overlay */}
                                                <div className="absolute bottom-0 left-0 w-full p-4 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex justify-center">
                                                    <Link href={`/products/${item.product.slug}`} className="text-white text-sm font-bold uppercase tracking-widest hover:text-trad-gold transition-colors flex items-center gap-1">
                                                        Xem chi tiết
                                                    </Link>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                    <div className="p-4 text-center">
                                        <h3 className="font-display font-bold text-lg text-trad-text-main line-clamp-1 mb-1 group-hover:text-trad-primary transition-colors">
                                            <Link href={`/products/${item.product?.slug}`}>{item.product_title}</Link>
                                        </h3>
                                        <p className="font-serif text-trad-primary font-bold">{formatPrice(Number(item.product?.price || 0))}</p>
                                        <p className="text-[10px] text-gray-400 uppercase tracking-wider mt-2">Thêm ngày {new Date(item.created_at).toLocaleDateString('vi-VN')}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </main>

            {/* Suggested Products (Only show if empty or generic suggestion needed) */}
            <section className="relative z-10 w-full bg-trad-bg-warm/50 backdrop-blur-sm py-16 border-t border-trad-gold/10">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="text-center mb-10">
                        <h3 className="font-display text-2xl text-trad-text-main">Gợi ý cho bạn</h3>
                        <div className="w-16 h-0.5 bg-trad-gold mx-auto mt-2"></div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {/* Hardcoded suggestions from template for visual parity */}
                        <div className="group cursor-pointer">
                            <div className="relative overflow-hidden aspect-[4/5] rounded-sm bg-white border border-trad-border-warm mb-4">
                                <img alt="Vòng tay trầm hương" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBHvJLPbjH143ICbgFYr3XDf4cXBAO5QCVFeq1kHC9Xs8ryy5KtAe9-iTZasI4f4qXe56427LpsgCjpANypOE-kU2MG-jVC8asK8xTuI-ugaIXf5M0j82rJPiUNS3jUsSpYBG5UEj6Hy0W0c_2pXzjpiFOuCn61pKtjck2tjQ6_GHa0MRAyC-hiqku98OwCtIZupAHIWHg7lV0svrzH-Wp_NUhaqr2rTCKmZJrQktbj65k0S7H-YYEMJqTKN1Kx_FQDmQeEYh_6ds9Q" />
                                <div className="absolute bottom-0 left-0 w-full p-4 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex justify-end">
                                    <span className="material-symbols-outlined text-white hover:text-trad-gold">favorite_border</span>
                                </div>
                            </div>
                            <h4 className="font-display text-lg text-trad-text-main group-hover:text-trad-primary transition-colors text-center">Vòng Tay Trầm Hương 108 Hạt</h4>
                            <p className="font-body text-sm text-trad-primary mt-1 text-center">1.200.000 ₫</p>
                        </div>
                        <div className="group cursor-pointer">
                            <div className="relative overflow-hidden aspect-[4/5] rounded-sm bg-white border border-trad-border-warm mb-4">
                                <img alt="Nụ trầm cao cấp" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBVKGhWZl78sGHNfDXu7d2AnKLR8Q8pbtEaAx4Lif9atGQxkanZ1OU6gYSascqwHF9wlz0zKNUHRD8rNNgFcW2alFzf_BRPOnciwtpN9q_FGjYiUwZnXxwdCDl5hnIsHtMcebDN6aOUMRQ7cp4HnVSY14rE31jr9wfGJxOBEneDd1skSHt0ESW3SuBB9aezkMrr8yqX9ySGiy0ptKCsFOVkuRQ4_dpsjCwbcCA47-fTPDg4GAK-WguZYrZiBxWzYatJF7QrOHhjAwCP" />
                                <div className="absolute bottom-0 left-0 w-full p-4 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex justify-end">
                                    <span className="material-symbols-outlined text-white hover:text-trad-gold">favorite_border</span>
                                </div>
                            </div>
                            <h4 className="font-display text-lg text-trad-text-main group-hover:text-trad-primary transition-colors text-center">Nụ Trầm Cao Cấp</h4>
                            <p className="font-body text-sm text-trad-primary mt-1 text-center">450.000 ₫</p>
                        </div>
                        <div className="group cursor-pointer">
                            <div className="relative overflow-hidden aspect-[4/5] rounded-sm bg-white border border-trad-border-warm mb-4">
                                <img alt="Lư đốt trầm" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" src="https://lh3.googleusercontent.com/aida-public/AB6AXuB1UHHrnSKHdbibtcOB0stfFz9unz-T-dN8PVhXpIlC2Mq2gbmIHaJIEo8keP3LnNf1wKz0R8ZyPQWBfHN0WUQ1fZEdx516JB93n1a8xACO9jFXFnmJHREEcvhbaf_7xQwA3JuX_3JghdST6-UL6giOg0ZULH7ViLhKgcSLcRDtFW8o74c3U-_y73UDfXI_hEEQIzu82RBxW-p7ijJmUzY3lZezak2RYdU3rUCuzqYKxNUE6lmYd075o7mTXSE6lHAFeXxbmVT1xway" />
                                <div className="absolute bottom-0 left-0 w-full p-4 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex justify-end">
                                    <span className="material-symbols-outlined text-white hover:text-trad-gold">favorite_border</span>
                                </div>
                            </div>
                            <h4 className="font-display text-lg text-trad-text-main group-hover:text-trad-primary transition-colors text-center">Lư Đốt Trầm Gốm Sứ</h4>
                            <p className="font-body text-sm text-trad-primary mt-1 text-center">890.000 ₫</p>
                        </div>
                    </div>
                </div>
            </section>

            <TraditionalFooter />
        </div>
    );
}
