'use client';

import { useLocale } from 'next-intl';
import { Link, useRouter, usePathname } from '@/i18n/routing';
import { useSearchParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import TraditionalHeader from './TraditionalHeader';
import TraditionalFooter from './TraditionalFooter';
import { getCategories } from '@/lib/api-client';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet";
import { Product, Category } from '@/types/product';
import TraditionalProductGridItem from '@/components/traditional/TraditionalProductGridItem';
import TraditionalProductFilter from './TraditionalProductFilter';

import { PaginationMeta } from '@/services/product-service';

interface TraditionalProductCatalogProps {
    products: Product[];
    pagination?: PaginationMeta;
}

export default function TraditionalProductCatalog({ products, pagination }: TraditionalProductCatalogProps) {
    const locale = useLocale();
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    // URL State
    const selectedCategory = searchParams.get('category') || null;
    const sortOption = searchParams.get('sort') || 'newest';
    const minPriceParam = searchParams.get('min_price') || '';
    const maxPriceParam = searchParams.get('max_price') || '';
    const currentPage = searchParams.get('page') ? Number(searchParams.get('page')) : 1;

    // Local State for UI
    const [categories, setCategories] = useState<Category[]>([]);
    const [priceInputs, setPriceInputs] = useState({ min: minPriceParam, max: maxPriceParam });
    const [isFilterOpen, setIsFilterOpen] = useState(false);

    // Sync local input with URL param if it changes externally
    useEffect(() => {
        if (minPriceParam !== priceInputs.min || maxPriceParam !== priceInputs.max) {
            setPriceInputs({ min: minPriceParam, max: maxPriceParam });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps -- Intentional: syncing local state with URL params, avoiding infinite loop
    }, [minPriceParam, maxPriceParam]);

    const updateFilters = (newParams: Record<string, string | null>) => {
        const params = new URLSearchParams(searchParams.toString());

        // Reset page to 1 if filters change (category, price, sort), unless page is explicitly set
        if (!newParams.page) {
            params.delete('page');
        }

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
        updateFilters({ category: categoryId, page: null }); // Reset page on filter change
    };

    const handleSortChange = (sort: string) => {
        updateFilters({ sort, page: null });
    };

    const handleApplyPriceFilter = () => {
        updateFilters({
            min_price: priceInputs.min || null,
            max_price: priceInputs.max || null,
            page: null
        });
        setIsFilterOpen(false);
    };

    const handlePageChange = (newPage: number) => {
        updateFilters({ page: String(newPage) });
        // Scroll to top of grid
        window.scrollTo({ top: 0, behavior: 'smooth' });
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
                        {currentPage > 1 && <span className="ml-1 text-trad-text-muted"> (Trang {currentPage})</span>}
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
                                <TraditionalProductFilter
                                    prefix="mobile"
                                    isMobile={true}
                                    categories={categories}
                                    selectedCategory={selectedCategory}
                                    priceInputs={priceInputs}
                                    setPriceInputs={setPriceInputs}
                                    onCategoryChange={handleCategoryChange}
                                    onApplyPriceFilter={handleApplyPriceFilter}
                                />
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
                                    {cat.translation?.name || 'Danh mục'}
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
                            <TraditionalProductFilter
                                prefix="desktop"
                                categories={categories}
                                selectedCategory={selectedCategory}
                                priceInputs={priceInputs}
                                setPriceInputs={setPriceInputs}
                                onCategoryChange={handleCategoryChange}
                                onApplyPriceFilter={handleApplyPriceFilter}
                            />
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
                            {products.length > 0 ? products.map((product) => (
                                <TraditionalProductGridItem key={product.id} product={product} />
                            )) : (
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

                        {/* Pagination */}
                        {pagination && pagination.last_page > 1 && (
                            <div className="mt-12 flex justify-center items-center gap-2 font-display">
                                <button
                                    onClick={() => handlePageChange(pagination.page - 1)}
                                    disabled={pagination.page === 1}
                                    className="p-2 border border-trad-border-warm rounded-full hover:bg-white hover:text-trad-primary disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                                    aria-label="Trang trước"
                                >
                                    <span className="material-symbols-outlined text-sm">chevron_left</span>
                                </button>

                                {Array.from({ length: pagination.last_page }, (_, i) => i + 1).map((pageNum) => (
                                    <button
                                        key={pageNum}
                                        onClick={() => handlePageChange(pageNum)}
                                        className={`w-9 h-9 flex items-center justify-center rounded-full text-sm font-medium transition-all ${pageNum === pagination.page
                                                ? 'bg-trad-primary text-white shadow-md'
                                                : 'bg-white text-trad-text-main border border-trad-border-warm hover:border-trad-primary'
                                            }`}
                                    >
                                        {pageNum}
                                    </button>
                                ))}

                                <button
                                    onClick={() => handlePageChange(pagination.page + 1)}
                                    disabled={pagination.page === pagination.last_page}
                                    className="p-2 border border-trad-border-warm rounded-full hover:bg-white hover:text-trad-primary disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                                    aria-label="Trang tiếp"
                                >
                                    <span className="material-symbols-outlined text-sm">chevron_right</span>
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </main>

            <TraditionalFooter />
        </div>
    );
}
