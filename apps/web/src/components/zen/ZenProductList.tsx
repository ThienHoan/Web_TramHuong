'use client';

import { useState, useEffect } from 'react';
import { getCategories } from '@/lib/api-client';
import { useLocale } from 'next-intl';
import { Category, Product } from '@/types/product';
import ZenFooter from './ZenFooter';

import { useRouter, usePathname } from '@/i18n/routing';
import { useSearchParams } from 'next/navigation';
import ZenProductCard from './ZenProductCard';

import { PaginationMeta } from '@/services/product-service';

export default function ZenProductList({ products, pagination }: { products: Product[]; pagination?: PaginationMeta }) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const locale = useLocale();

    const [categories, setCategories] = useState<Category[]>([]);

    useEffect(() => {
        getCategories(locale).then(cats => setCategories(cats || []));
    }, [locale]);

    // Get active filters from URL
    const activeCategory = searchParams.get('category') || 'all';
    const activeSort = searchParams.get('sort') || 'recommended';

    const handleCategoryChange = (category: string) => {
        const params = new URLSearchParams(searchParams.toString());
        // Reset page when category changes
        params.delete('page');

        if (category === 'all') {
            params.delete('category');
        } else {
            params.set('category', category);
        }
        router.push(`${pathname}?${params.toString()}`);
    };

    const handleSortChange = (sort: string) => {
        const params = new URLSearchParams(searchParams.toString());
        params.delete('page'); // Reset page
        params.set('sort', sort);
        router.push(`${pathname}?${params.toString()}`);
    };

    const handlePageChange = (newPage: number) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set('page', String(newPage));
        router.push(`${pathname}?${params.toString()}`);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    return (
        <div className="bg-zen-green-50 text-zen-green-text font-manrope antialiased selection:bg-zen-green-200 selection:text-zen-green-text min-h-screen">
            <main className="flex flex-col w-full max-w-[1440px] mx-auto">
                {/* Page Heading */}
                <section className="pt-32 pb-12 px-6 lg:px-12 text-center animate-[fadeInUp_0.8s_ease-out_forwards]">
                    <h2 className="text-3xl md:text-5xl font-extralight tracking-zen-wide uppercase text-zen-green-text mb-4">The Collection</h2>
                    <p className="text-zen-green-accent text-sm md:text-base font-light tracking-widest max-w-2xl mx-auto">
                        Sustainably harvested from the ancient forests of Vietnam. <br className="hidden sm:block" />Curated for mindfulness and inner peace.
                    </p>
                </section>

                {/* Main Layout */}
                <div className="flex flex-col lg:flex-row px-6 lg:px-12 gap-12 pb-24">
                    {/* Sidebar / Filter Panel */}
                    <aside className="w-full lg:w-64 shrink-0 animate-[fadeInUp_0.8s_ease-out_forwards] delay-100">
                        <div className="sticky top-24 space-y-10">
                            {/* Categories */}
                            <div>
                                <h3 className="text-xs font-bold uppercase tracking-[0.2em] mb-6 text-zen-green-text/40">Category</h3>
                                <div className="flex flex-col gap-1">
                                    {[
                                        { id: 'all', label: 'VIEW ALL' },
                                        ...categories.map(cat => ({
                                            id: cat.slug, // Use slug for cleaner URLs and API compatibility
                                            label: (cat.translation?.name || cat.slug).toUpperCase()
                                        }))
                                    ].map((cat) => (
                                        <label key={cat.id} className="group flex items-center justify-between cursor-pointer py-2" onClick={() => handleCategoryChange(cat.id)}>
                                            <span className={`text-sm tracking-widest transition-colors ${activeCategory === cat.id ? 'font-medium text-zen-green-primary' : 'font-light text-zen-green-text/70 group-hover:text-zen-green-text'}`}>
                                                {cat.label}
                                            </span>
                                            <input
                                                type="radio"
                                                name="category"
                                                className="hidden"
                                                checked={activeCategory === cat.id}
                                                readOnly
                                            />
                                            <div className={`h-1.5 w-1.5 rounded-full bg-zen-green-primary transition-opacity ${activeCategory === cat.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-20'}`}></div>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            {/* Filter By Scent (Hidden until supported by DB) */}
                            {/* <div className="hidden lg:block">
                                <h3 className="text-xs font-bold uppercase tracking-[0.2em] mb-6 text-zen-green-text/40">Scent Profile</h3>
                                <div className="flex flex-wrap gap-2">
                                    {['Woody', 'Sweet', 'Floral', 'Spicy'].map(scent => (
                                        <button key={scent} className="text-xs border border-zen-green-text/20 rounded-full px-3 py-1 hover:bg-zen-green-text/5 transition-colors">
                                            {scent}
                                        </button>
                                    ))}
                                </div>
                            </div> */}

                            {/* Price Range (Visual Only for now) */}
                            <div className="hidden lg:block">
                                <h3 className="text-xs font-bold uppercase tracking-[0.2em] mb-6 text-zen-green-text/40">Price</h3>
                                <div className="flex items-center gap-4 text-xs tracking-widest text-zen-green-text/70">
                                    <span>$0</span>
                                    <div className="flex-1 h-px bg-zen-green-200 relative">
                                        <div className="absolute left-0 w-1/2 h-full bg-zen-green-accent"></div>
                                        <div className="absolute left-1/2 top-1/2 -translate-y-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-zen-green-text cursor-pointer hover:scale-125 transition-transform"></div>
                                    </div>
                                    <span>$500+</span>
                                </div>
                            </div>
                        </div>
                    </aside>

                    {/* Product Grid & Controls */}
                    <div className="flex-1 animate-[fadeInUp_0.8s_ease-out_forwards] delay-200">
                        {/* Sort & Count */}
                        <div className="flex items-center justify-between mb-8 border-b border-zen-green-text/10 pb-4">
                            <span className="text-xs tracking-widest text-zen-green-text/60">{pagination?.total || products.length} ARTIFACTS</span>
                            <div className="flex items-center gap-4">
                                <span className="text-xs tracking-widest text-zen-green-text/60">SORT BY</span>
                                <div className="relative group">
                                    <select
                                        value={activeSort}
                                        onChange={(e) => handleSortChange(e.target.value)}
                                        className="appearance-none bg-transparent text-xs tracking-widest border-none focus:ring-0 cursor-pointer text-zen-green-text uppercase pr-6"
                                    >
                                        <option value="recommended">Recommended</option>
                                        <option value="newest">New Arrivals</option>
                                        <option value="price-asc">Price: Low to High</option>
                                        <option value="price-desc">Price: High to Low</option>
                                    </select>
                                    <span className="material-symbols-outlined text-[16px] absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none text-zen-green-text">expand_more</span>
                                </div>
                            </div>
                        </div>

                        {/* Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-12">
                            {products.map((product) => (
                                <ZenProductCard key={product.id} product={product} />
                            ))}
                        </div>

                        {/* Pagination UI */}
                        {pagination && pagination.last_page > 1 && (
                            <div className="mt-20 flex justify-center items-center gap-8 border-t border-zen-green-text/10 pt-10">
                                <button
                                    onClick={() => handlePageChange(pagination.page - 1)}
                                    disabled={pagination.page === 1}
                                    className="text-xs tracking-[0.2em] uppercase hover:text-zen-green-primary disabled:opacity-30 disabled:hover:text-zen-green-text transition-colors"
                                >
                                    Previous
                                </button>

                                <span className="text-sm font-light tracking-widest text-zen-green-text/60">
                                    PAGE {pagination.page} / {pagination.last_page}
                                </span>

                                <button
                                    onClick={() => handlePageChange(pagination.page + 1)}
                                    disabled={pagination.page === pagination.last_page}
                                    className="text-xs tracking-[0.2em] uppercase hover:text-zen-green-primary disabled:opacity-30 disabled:hover:text-zen-green-text transition-colors"
                                >
                                    Next
                                </button>
                            </div>
                        )}

                        {/* Empty State */}
                        {products.length === 0 && (
                            <div className="py-20 text-center">
                                <p className="text-lg font-light">No artifacts found matching your criteria.</p>
                                <button onClick={() => handleCategoryChange('all')} className="mt-4 text-sm underline hover:text-zen-green-primary">View all collection</button>
                            </div>
                        )}
                    </div>
                </div>
            </main>
            <ZenFooter />
        </div>

    );
}
