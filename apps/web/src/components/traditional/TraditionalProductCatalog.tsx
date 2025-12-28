'use client';

import { useTranslations, useLocale } from 'next-intl';
import { Link } from '@/i18n/routing';
import ProductImage from '../ui/ProductImage';
import { useCurrency } from '@/hooks/useCurrency';
import { useCart } from '@/components/providers/CartProvider';
import { useWishlist } from '@/components/providers/WishlistProvider';
import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import TraditionalHeader from './TraditionalHeader';
import TraditionalFooter from './TraditionalFooter';
import TraditionalProductCard from './TraditionalProductCard';
import { getCategories, getProducts } from '@/lib/api-client';
import { toast } from 'sonner';
import { Alert } from '@/components/ui/alert';

interface TraditionalProductCatalogProps {
    products: any[];
}

export default function TraditionalProductCatalog({ products: initialProducts }: TraditionalProductCatalogProps) {
    const t = useTranslations('HomePage');
    const locale = useLocale();
    const { formatPrice } = useCurrency();
    const { addItem } = useCart();
    const { items: wishlistItems, toggle: toggleWishlist } = useWishlist();

    // State
    const [products, setProducts] = useState(initialProducts);
    const [categories, setCategories] = useState<any[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [sortOption, setSortOption] = useState('newest');
    const [loading, setLoading] = useState(false);

    const handleAddToCart = (product: any, currentPrice: number) => {
        addItem({
            id: product.id,
            slug: product.slug,
            title: product.translation.title,
            price: currentPrice,
            image: product.images?.[0] || 'placeholder',
            quantity: 1
        });
        toast.custom((t) => (
            <Alert variant="success" size="sm" title="Thành Công" className="w-[300px] bg-white border-none shadow-xl">
                Đã thêm sản phẩm vào giỏ hàng!
            </Alert>
        ));
    };

    // Price Filter State
    const [priceInputs, setPriceInputs] = useState({ min: '', max: '' });
    const [activePriceRange, setActivePriceRange] = useState<{ min: number | null, max: number | null }>({ min: null, max: null });

    const handleApplyPriceFilter = () => {
        const min = priceInputs.min ? parseFloat(priceInputs.min.replace(/\./g, '')) : null;
        const max = priceInputs.max ? parseFloat(priceInputs.max.replace(/\./g, '')) : null;
        setActivePriceRange({ min, max });
    };

    // Fetch Categories
    useEffect(() => {
        const fetchCats = async () => {
            try {
                const cats = await getCategories(locale);
                setCategories(cats || []);
            } catch (e) {
                console.error("Failed to fetch categories", e);
            }
        };
        fetchCats();
    }, [locale]);

    // Fetch Products (API)
    useEffect(() => {
        const fetchProducts = async () => {
            setLoading(true);
            try {
                // Map Sort
                let apiSort = 'created_at:desc';
                if (sortOption === 'price-asc') apiSort = 'price:asc';
                else if (sortOption === 'price-desc') apiSort = 'price:desc';
                else if (sortOption === 'name-asc') apiSort = 'slug:asc';

                // Map Category
                let catSlug = undefined;
                if (selectedCategory) {
                    const cat = categories.find(c => String(c.id) === String(selectedCategory));
                    if (cat) catSlug = cat.slug;
                }

                const data = await getProducts(locale, {
                    category: catSlug,
                    sort: apiSort,
                    min_price: activePriceRange.min ?? undefined,
                    max_price: activePriceRange.max ?? undefined,
                    limit: 50 // Retrieve more items since we don't have pagination UI yet
                });
                setProducts(data);
            } catch (error) {
                console.error("Failed to fetch products", error);
            } finally {
                setLoading(false);
            }
        };

        // Debounce slightly or just call
        // Using timeout to prevent flashing if coming from SSR?
        // Actually, if we just mounted and initialProducts matches default filters, we might want to skip.
        // But checking equality is hard.
        // Let's just fetch.
        fetchProducts();

    }, [locale, selectedCategory, sortOption, activePriceRange, categories]);

    return (
        <div className="bg-trad-bg-light font-display text-trad-text-main antialiased min-h-screen flex flex-col bg-pattern-lotus selection:bg-trad-primary selection:text-white">
            <TraditionalHeader />

            {/* Success Notification - Handled by Sonner */}

            {/* Breadcrumb / Page Header */}
            <div className="w-full bg-gradient-to-r from-trad-bg-light via-white to-trad-bg-light border-b border-trad-border-warm">
                <div className="container mx-auto px-4 md:px-8 xl:px-20 py-6 text-center">
                    <h1 className="text-3xl md:text-4xl font-bold text-trad-red-900 mb-2 font-display">Tất Cả Sản Phẩm</h1>
                    <nav className="flex justify-center text-sm text-trad-text-muted/80 font-body">
                        <Link className="hover:text-trad-primary transition-colors" href="/">Trang chủ</Link>
                        <span className="mx-2 text-trad-border-warm">•</span>
                        <span className="font-medium text-trad-primary">Sản phẩm</span>
                    </nav>
                </div>
            </div>

            <main className="flex-grow w-full container mx-auto px-4 md:px-8 xl:px-20 py-10">
                <div className="flex flex-col lg:flex-row gap-10">
                    {/* Sidebar Filter */}
                    <aside className="w-full lg:w-72 shrink-0 space-y-6">
                        <div className="lg:hidden flex items-center justify-between mb-4">
                            <span className="text-lg font-bold font-display text-trad-text-main">Bộ lọc sản phẩm</span>
                            <button className="flex items-center gap-2 text-sm font-medium text-trad-primary border border-trad-primary/30 px-4 py-2 rounded bg-white shadow-sm">
                                <span className="material-symbols-outlined text-[18px]">filter_list</span>
                                Lọc ngay
                            </button>
                        </div>
                        <div className="hidden lg:block space-y-8 p-6 bg-white rounded-xl border border-trad-border-warm shadow-sm relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-16 h-16 opacity-10 pointer-events-none">
                                <span className="material-symbols-outlined text-6xl text-trad-primary">spa</span>
                            </div>

                            {/* Categories */}
                            <div className="space-y-4">
                                <h3 className="text-lg font-bold text-trad-text-main font-display border-b border-trad-border-warm pb-2">Danh mục</h3>
                                <div className="space-y-3">
                                    <div className="flex items-center space-x-3">
                                        <input
                                            className="h-4 w-4 rounded border-trad-border-warm text-trad-primary focus:ring-trad-primary cursor-pointer"
                                            id="cat-all"
                                            type="radio"
                                            name="category"
                                            checked={selectedCategory === null}
                                            onChange={() => setSelectedCategory(null)}
                                        />
                                        <label className="text-sm font-medium leading-none cursor-pointer text-trad-text-main hover:text-trad-primary transition-colors" htmlFor="cat-all">Tất cả</label>
                                    </div>
                                    {categories.map((cat) => (
                                        <div key={cat.id} className="flex items-center space-x-3">
                                            <input
                                                className="h-4 w-4 rounded border-trad-border-warm text-trad-primary focus:ring-trad-primary cursor-pointer"
                                                id={`cat-${cat.id}`}
                                                type="radio"
                                                name="category"
                                                checked={selectedCategory === cat.id}
                                                onChange={() => setSelectedCategory(cat.id)}
                                            />
                                            <label className="text-sm font-medium leading-none cursor-pointer text-trad-text-main hover:text-trad-primary transition-colors" htmlFor={`cat-${cat.id}`}>
                                                {cat.translation?.name || cat.name}
                                            </label>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="space-y-4">
                                <h3 className="text-lg font-bold text-trad-text-main font-display border-b border-trad-border-warm pb-2">Khoảng giá</h3>
                                <div className="pt-2">
                                    <div className="relative h-1.5 w-full rounded-full bg-trad-border-warm mb-6">
                                        <div className="absolute left-0 h-full w-2/3 rounded-full bg-trad-primary"></div>
                                        <div className="absolute -top-1.5 left-[66%] h-4 w-4 rounded-full border-2 border-trad-primary bg-white shadow cursor-pointer hover:scale-110 transition-transform"></div>
                                        <div className="absolute -top-1.5 left-0 h-4 w-4 rounded-full border-2 border-trad-primary bg-white shadow cursor-pointer hover:scale-110 transition-transform"></div>
                                    </div>
                                    <div className="flex items-center gap-2 mb-4">
                                        <div className="grid w-full items-center gap-1.5">
                                            <label className="text-[10px] uppercase font-bold text-trad-text-muted">Từ</label>
                                            <input
                                                className="flex h-9 w-full rounded-md border border-trad-border-warm bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-trad-primary disabled:cursor-not-allowed disabled:opacity-50"
                                                placeholder="0"
                                                value={priceInputs.min}
                                                onChange={(e) => setPriceInputs(prev => ({ ...prev, min: e.target.value }))}
                                            />
                                        </div>
                                        <span className="text-trad-text-muted pt-5">-</span>
                                        <div className="grid w-full items-center gap-1.5">
                                            <label className="text-[10px] uppercase font-bold text-trad-text-muted">Đến</label>
                                            <input
                                                className="flex h-9 w-full rounded-md border border-trad-border-warm bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-trad-primary disabled:cursor-not-allowed disabled:opacity-50"
                                                placeholder="MAX"
                                                value={priceInputs.max}
                                                onChange={(e) => setPriceInputs(prev => ({ ...prev, max: e.target.value }))}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={handleApplyPriceFilter}
                                className="w-full inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-trad-primary disabled:pointer-events-none disabled:opacity-50 bg-trad-primary text-white shadow hover:bg-trad-primary-dark h-9 px-4 py-2 uppercase tracking-wide mt-4"
                            >
                                Áp dụng bộ lọc
                            </button>
                        </div>
                    </aside>

                    {/* Product Grid */}
                    <div className="flex-1">
                        <div className="mb-8 flex flex-wrap items-center justify-between gap-4 p-2 border-b border-trad-border-warm">
                            <p className="text-sm text-trad-text-muted font-medium">Hiển thị <span className="font-bold text-trad-primary">{products.length}</span> sản phẩm</p>
                            <div className="flex items-center gap-3">
                                <label className="text-sm font-medium text-trad-text-main hidden sm:block">Sắp xếp theo:</label>
                                <div className="relative">
                                    <select
                                        value={sortOption}
                                        onChange={(e) => setSortOption(e.target.value)}
                                        className="h-9 rounded-md border border-trad-border-warm bg-white py-1 pl-3 pr-8 text-sm focus:border-trad-primary focus:outline-none focus:ring-1 focus:ring-trad-primary"
                                    >
                                        <option value="newest">Mới nhất</option>
                                        <option value="price-asc">Giá tăng dần</option>
                                        <option value="price-desc">Giá giảm dần</option>
                                        <option value="name-asc">Tên A-Z</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-6 relative">
                            {loading && (
                                <div className="absolute inset-0 z-10 bg-white/50 backdrop-blur-[2px] flex items-center justify-center min-h-[400px]">
                                    <div className="flex flex-col items-center">
                                        <div className="w-12 h-12 border-4 border-trad-primary border-t-transparent rounded-full animate-spin mb-4"></div>
                                        <p className="text-trad-primary font-medium">Đang tải...</p>
                                    </div>
                                </div>
                            )}
                            {products.length > 0 ? products.map((product) => {
                                const currentPrice = Number(product.price);
                                const originalPrice = Number(product.original_price || 0);
                                const hasDiscount = originalPrice > currentPrice;
                                const discountPercent = hasDiscount ? Math.round(((originalPrice - currentPrice) / originalPrice) * 100) : 0;

                                return (
                                    <div key={product.id} className="rounded-xl border border-trad-border-warm bg-white text-trad-text-main shadow-sm hover:shadow-md transition-all duration-300 group flex flex-col overflow-hidden">
                                        <div className="relative aspect-[4/5] w-full overflow-hidden bg-trad-bg-warm">
                                            {hasDiscount && (
                                                <span className="absolute left-2 top-2 z-10 rounded bg-trad-red-900 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-white shadow">
                                                    -{discountPercent}%
                                                </span>
                                            )}
                                            <ProductImage
                                                src={product.images?.[0] || 'https://lh3.googleusercontent.com/aida-public/AB6AXuBwD0foJUP_hTJwAfMEq8pczGOEqf3yl0c5rIvOIkLcsLSMaPRa3lWPo26cFQBDBiCaJPywFlQOhci8vHtJJHGF5_KLpC6FSyTIL4BBKvfs3jVPh0mAjq8N_BqiFEchwW6m3euXU_i600Fz7RGb1QHZXZlf023XpCfsJ5jKHbwpkpHNzAvKbCb7m3ojkdPOFWSEGkjHsFI_c_EZtzzRC2bIRffXiev81bLAJt3qEqYLbAwY6Np0doM5PO_iNx5-zBZMGBUSuFOg1rcg'}
                                                alt={product.translation?.title}
                                                className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                                            />
                                            <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-3 opacity-0 translate-y-4 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300">
                                                <Link href={`/products/${product.slug}`}>
                                                    <button className="h-9 w-9 rounded-full bg-white text-trad-text-main hover:text-trad-primary hover:bg-trad-bg-warm shadow-lg flex items-center justify-center transition-colors" title="Xem chi tiết">
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
                                                                <Alert variant="success" size="sm" title="Yêu Thích" className="w-[300px] bg-white border-none shadow-xl">
                                                                    Đã thêm vào danh sách yêu thích!
                                                                </Alert>
                                                            ));
                                                        } else {
                                                            toast.info("Đã xóa khỏi danh sách yêu thích"); // Or custom Alert
                                                        }
                                                    }}
                                                    className={`h-9 w-9 rounded-full bg-white shadow-lg flex items-center justify-center transition-colors ${wishlistItems.has(product.id) ? 'text-trad-red-900' : 'text-trad-text-main hover:text-trad-primary hover:bg-trad-bg-warm'}`}
                                                    title="Yêu thích"
                                                >
                                                    <span className={`material-symbols-outlined text-[20px] ${wishlistItems.has(product.id) ? 'filled' : ''}`}>favorite</span>
                                                </button>
                                            </div>
                                        </div>
                                        <div className="flex flex-1 flex-col p-5">
                                            <div className="mb-2 flex text-trad-primary text-[14px]">
                                                {[1, 2, 3, 4, 5].map(i => (
                                                    <span key={i} className="material-symbols-outlined filled text-[16px]">star</span>
                                                ))}
                                            </div>
                                            <h3 className="mb-2 text-lg font-bold font-display leading-tight text-trad-text-main group-hover:text-trad-primary transition-colors line-clamp-2">
                                                <Link href={`/products/${product.slug}`}>{product.translation?.title}</Link>
                                            </h3>
                                            <div className="mt-auto pt-3 flex flex-col gap-3">
                                                <div className="flex items-baseline gap-2 flex-wrap">
                                                    <span className="text-xl font-bold text-trad-primary">{formatPrice(currentPrice)}</span>
                                                    {hasDiscount && (
                                                        <span className="text-sm text-trad-text-muted line-through opacity-70">{formatPrice(originalPrice)}</span>
                                                    )}
                                                </div>
                                                <button
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        handleAddToCart(product, currentPrice);
                                                    }}
                                                    className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-trad-primary text-white shadow bg-trad-primary hover:bg-trad-primary-dark h-9 px-4 py-2 uppercase tracking-wide w-full gap-2 group-hover:bg-trad-bg-warm group-hover:text-trad-primary border border-transparent group-hover:border-trad-primary"
                                                >
                                                    <span className="material-symbols-outlined text-[18px]">add_shopping_cart</span>
                                                    Thêm vào giỏ
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            }) : (
                                // Render placeholder if no products (or mock cards as in design)
                                <div className="rounded-xl border border-trad-border-warm bg-white text-trad-text-main shadow-sm hover:shadow-md transition-all duration-300 group flex flex-col overflow-hidden">
                                    <div className="relative aspect-[4/5] w-full overflow-hidden bg-trad-bg-warm">
                                        <img className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBwD0foJUP_hTJwAfMEq8pczGOEqf3yl0c5rIvOIkLcsLSMaPRa3lWPo26cFQBDBiCaJPywFlQOhci8vHtJJHGF5_KLpC6FSyTIL4BBKvfs3jVPh0mAjq8N_BqiFEchwW6m3euXU_i600Fz7RGb1QHZXZlf023XpCfsJ5jKHbwpkpHNzAvKbCb7m3ojkdPOFWSEGkjHsFI_c_EZtzzRC2bIRffXiev81bLAJt3qEqYLbAwY6Np0doM5PO_iNx5-zBZMGBUSuFOg1rcg" alt="Placeholder" />
                                    </div>
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
