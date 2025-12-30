'use client';

import { useTranslations, useLocale } from 'next-intl';
import { Link, useRouter, usePathname } from '@/i18n/routing';
import { useSearchParams } from 'next/navigation';
import ProductImage from '../ui/ProductImage';
import { useCurrency } from '@/hooks/useCurrency';
import { useCart } from '@/components/providers/CartProvider';
import { useWishlist } from '@/components/providers/WishlistProvider';
import { useState, useEffect } from 'react';
import TraditionalHeader from './TraditionalHeader';
import TraditionalFooter from './TraditionalFooter';
import { getCategories } from '@/lib/api-client';
import { toast } from 'sonner';
import { Alert } from '@/components/ui/alert';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet";

interface TraditionalProductCatalogProps {
    products: any[];
}

export default function TraditionalProductCatalog({ products }: TraditionalProductCatalogProps) {
    const locale = useLocale();
    const { formatPrice } = useCurrency();
    const { addItem } = useCart();
    const { items: wishlistItems, toggle: toggleWishlist } = useWishlist();
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    // URL State
    const selectedCategory = searchParams.get('category') || null;
    const sortOption = searchParams.get('sort') || 'newest';
    const minPriceParam = searchParams.get('min_price') || '';
    const maxPriceParam = searchParams.get('max_price') || '';

    // Local State for UI
    const [categories, setCategories] = useState<any[]>([]);
    const [priceInputs, setPriceInputs] = useState({ min: minPriceParam, max: maxPriceParam });
    const [isFilterOpen, setIsFilterOpen] = useState(false);

    // Sync local input with URL param if it changes externally
    useEffect(() => {
        setPriceInputs({ min: minPriceParam, max: maxPriceParam });
    }, [minPriceParam, maxPriceParam]);

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

    const updateFilters = (newParams: Record<string, string | null>) => {
        const params = new URLSearchParams(searchParams.toString());
        Object.entries(newParams).forEach(([key, value]) => {
            if (value === null) {
                params.delete(key);
            } else {
                params.set(key, value);
            }
        });
        router.push(`${pathname}?${params.toString()}`);
    };

    const handleCategoryChange = (categoryId: string | null) => {
        updateFilters({ category: categoryId });
    };

    const handleSortChange = (sort: string) => {
        updateFilters({ sort });
    };

    const handleApplyPriceFilter = () => {
        updateFilters({
            min_price: priceInputs.min || null,
            max_price: priceInputs.max || null
        });
        setIsFilterOpen(false);
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

    // Reusable Filter Content
    const FilterContent = ({ prefix, isMobile = false }: { prefix: string, isMobile?: boolean }) => (
        <div className={`space-y-8 ${isMobile ? 'pb-20' : ''}`}>
            {/* Categories */}
            <div className="space-y-4">
                <h3 className="text-lg font-bold text-trad-text-main font-display border-b border-trad-border-warm pb-2">Danh mục</h3>
                <div className="space-y-3">
                    <div className="flex items-center space-x-3 group cursor-pointer" onClick={() => handleCategoryChange(null)}>
                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center transition-colors ${selectedCategory === null ? 'border-trad-primary bg-trad-primary' : 'border-trad-text-muted group-hover:border-trad-primary'}`}>
                            {selectedCategory === null && <div className="w-1.5 h-1.5 bg-white rounded-full"></div>}
                        </div>
                        <label className="text-sm font-medium leading-none cursor-pointer text-trad-text-main group-hover:text-trad-primary transition-colors">Tất cả</label>
                    </div>
                    {categories.map((cat) => (
                        <div key={cat.id} className="flex items-center space-x-3 group cursor-pointer" onClick={() => handleCategoryChange(String(cat.id))}>
                            <div className={`w-4 h-4 rounded-full border flex items-center justify-center transition-colors ${selectedCategory === String(cat.id) ? 'border-trad-primary bg-trad-primary' : 'border-trad-text-muted group-hover:border-trad-primary'}`}>
                                {selectedCategory === String(cat.id) && <div className="w-1.5 h-1.5 bg-white rounded-full"></div>}
                            </div>
                            <label className="text-sm font-medium leading-none cursor-pointer text-trad-text-main group-hover:text-trad-primary transition-colors">
                                {cat.translation?.name || cat.name}
                            </label>
                        </div>
                    ))}
                </div>
            </div>

            {/* Price Range */}
            <div className="space-y-4">
                <h3 className="text-lg font-bold text-trad-text-main font-display border-b border-trad-border-warm pb-2">Khoảng giá</h3>
                <div className="pt-2">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="grid w-full gap-2">
                            <label htmlFor={`${prefix}-min-price`} className="text-xs font-semibold text-trad-text-muted uppercase">Từ (đ)</label>
                            <input
                                id={`${prefix}-min-price`}
                                className="flex h-10 w-full rounded-lg border border-trad-border-warm bg-white px-3 py-2 text-sm shadow-sm transition-all focus-visible:outline-none focus-visible:border-trad-primary focus-visible:ring-1 focus-visible:ring-trad-primary"
                                placeholder="0"
                                type="number"
                                value={priceInputs.min}
                                onChange={(e) => setPriceInputs(prev => ({ ...prev, min: e.target.value }))}
                            />
                        </div>
                        <div className="grid w-full gap-2">
                            <label htmlFor={`${prefix}-max-price`} className="text-xs font-semibold text-trad-text-muted uppercase">Đến (đ)</label>
                            <input
                                id={`${prefix}-max-price`}
                                className="flex h-10 w-full rounded-lg border border-trad-border-warm bg-white px-3 py-2 text-sm shadow-sm transition-all focus-visible:outline-none focus-visible:border-trad-primary focus-visible:ring-1 focus-visible:ring-trad-primary"
                                placeholder="Tối đa"
                                type="number"
                                value={priceInputs.max}
                                onChange={(e) => setPriceInputs(prev => ({ ...prev, max: e.target.value }))}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Apply Button */}
            <div className={isMobile ? "absolute bottom-0 left-0 right-0 p-4 bg-white border-t border-trad-border-warm" : "mt-2"}>
                <button
                    onClick={handleApplyPriceFilter}
                    className={`w-full inline-flex items-center justify-center rounded-lg text-sm font-bold transition-all focus:outline-none focus:ring-2 focus:ring-trad-primary focus:ring-offset-2 bg-trad-primary text-white shadow hover:bg-trad-primary-dark active:scale-[0.98] uppercase tracking-wide ${isMobile ? 'h-12 px-6' : 'h-10 px-4 py-2'}`}
                >
                    Áp dụng
                </button>
            </div>
        </div>
    );

    return (
        <div className="bg-trad-bg-light font-display text-trad-text-main antialiased min-h-screen flex flex-col bg-pattern-lotus selection:bg-trad-primary selection:text-white">
            <TraditionalHeader />

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
                {/* Mobile Filter & Categories Toolbar */}
                <div className="lg:hidden mb-6 space-y-4">
                    <div className="flex items-center gap-3">
                        {/* Mobile Filter Sheet */}
                        <Sheet open={isFilterOpen} onOpenChange={setIsFilterOpen}>
                            <SheetTrigger asChild>
                                <button className="flex items-center gap-2 text-sm font-medium text-trad-primary border border-trad-primary/30 px-4 py-2 rounded-full bg-white shadow-sm h-10 whitespace-nowrap">
                                    <span className="material-symbols-outlined text-[18px]">filter_list</span>
                                    Bộ lọc
                                </button>
                            </SheetTrigger>
                            <SheetContent side="left" className="w-[85%] sm:max-w-[340px] overflow-y-auto">
                                <SheetHeader className="mb-6 text-left">
                                    <SheetTitle className="font-display text-xl font-bold text-trad-red-900">Bộ lọc sản phẩm</SheetTitle>
                                    <SheetDescription>
                                        Tìm kiếm sản phẩm phù hợp với nhu cầu của bạn
                                    </SheetDescription>
                                </SheetHeader>
                                <FilterContent prefix="mobile" isMobile={true} />
                            </SheetContent>
                        </Sheet>

                        {/* Horizontal Category List (Pills) */}
                        <div className="flex-1 overflow-x-auto no-scrollbar flex items-center gap-2 pb-1 mask-linear-fade">
                            <button
                                onClick={() => handleCategoryChange(null)}
                                className={`whitespace-nowrap px-4 py-2 rounded-full text-xs font-bold border transition-all ${selectedCategory === null
                                    ? 'bg-trad-primary text-white border-trad-primary shadow-md'
                                    : 'bg-white text-trad-text-main border-trad-border-warm hover:border-trad-primary'
                                    }`}
                            >
                                Tất cả
                            </button>
                            {categories.map((cat) => (
                                <button
                                    key={cat.id}
                                    onClick={() => handleCategoryChange(String(cat.id))}
                                    className={`whitespace-nowrap px-4 py-2 rounded-full text-xs font-bold border transition-all ${selectedCategory === String(cat.id)
                                        ? 'bg-trad-primary text-white border-trad-primary shadow-md'
                                        : 'bg-white text-trad-text-main border-trad-border-warm hover:border-trad-primary'
                                        }`}
                                >
                                    {cat.translation?.name || cat.name}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="flex flex-col lg:flex-row gap-6 lg:gap-10">
                    {/* Desktop Sidebar Filter */}
                    <aside className="hidden lg:block w-72 shrink-0 space-y-6">
                        <div className="p-6 bg-white rounded-xl border border-trad-border-warm shadow-sm relative overflow-hidden animate-fade-in sticky top-24">
                            <div className="absolute top-0 right-0 w-16 h-16 opacity-10 pointer-events-none">
                                <span className="material-symbols-outlined text-6xl text-trad-primary">spa</span>
                            </div>
                            <FilterContent prefix="desktop" />
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
                                        onChange={(e) => handleSortChange(e.target.value)}
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
                        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-3 md:gap-6 relative">
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
                                                <Link href={`/products/${product.slug}`}>{product.translation?.title}</Link>
                                            </h3>
                                            <div className="mt-auto pt-2 md:pt-3 flex flex-col gap-2 md:gap-3">
                                                <div className="flex items-baseline gap-2 flex-wrap">
                                                    <span className="text-base md:text-xl font-bold text-trad-primary">{formatPrice(currentPrice)}</span>
                                                    {hasDiscount && (
                                                        <span className="text-xs md:text-sm text-trad-text-muted line-through opacity-70">{formatPrice(originalPrice)}</span>
                                                    )}
                                                </div>
                                                <button
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        handleAddToCart(product, currentPrice);
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
                            }) : (
                                <div className="col-span-full py-20 text-center bg-white rounded-xl border border-trad-border-warm">
                                    <div className="mb-4 text-trad-text-muted opacity-50">
                                        <span className="material-symbols-outlined text-6xl">inventory_2</span>
                                    </div>
                                    <h3 className="text-lg font-bold text-trad-text-main mb-2">Không tìm thấy sản phẩm</h3>
                                    <p className="text-trad-text-muted mb-6">Xin lỗi, chúng tôi không tìm thấy sản phẩm nào phù hợp với bộ lọc của bạn.</p>
                                    <button
                                        onClick={() => updateFilters({ category: null, sort: null, min_price: null, max_price: null })}
                                        className="text-trad-primary font-bold hover:underline"
                                    >
                                        Xóa tất cả bộ lọc
                                    </button>
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
