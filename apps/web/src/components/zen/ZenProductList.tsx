'use client';

import { Link, useRouter, usePathname } from '@/i18n/routing';
import { useSearchParams } from 'next/navigation';
import ProductImage from '../ui/ProductImage';
import { useCurrency } from '@/hooks/useCurrency';
import { useState, useEffect } from 'react';

export default function ZenProductList({ products }: { products: any[] }) {
    const { formatPrice } = useCurrency();
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    // Get active filters from URL
    const activeCategory = searchParams.get('category') || 'all';
    const activeSort = searchParams.get('sort') || 'recommended';

    const handleCategoryChange = (category: string) => {
        const params = new URLSearchParams(searchParams.toString());
        if (category === 'all') {
            params.delete('category');
        } else {
            params.set('category', category);
        }
        router.push(`${pathname}?${params.toString()}`);
    };

    const handleSortChange = (sort: string) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set('sort', sort);
        router.push(`${pathname}?${params.toString()}`);
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
                                        { id: 'incense-sticks', label: 'INCENSE STICKS' },
                                        { id: 'cones-coils', label: 'CONES & COILS' },
                                        { id: 'pure-chips', label: 'PURE CHIPS' },
                                        { id: 'accessories', label: 'ACCESSORIES' }
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

                            {/* Filter By Scent (Visual - Desktop only mostly) */}
                            <div className="hidden lg:block">
                                <h3 className="text-xs font-bold uppercase tracking-[0.2em] mb-6 text-zen-green-text/40">Scent Profile</h3>
                                <div className="flex flex-wrap gap-2">
                                    {['Woody', 'Sweet', 'Floral', 'Spicy'].map(scent => (
                                        <button key={scent} className="px-3 py-1.5 border border-zen-green-200 rounded-sm text-[10px] uppercase tracking-widest hover:border-zen-green-accent hover:text-zen-green-accent transition-colors text-zen-green-text/70">
                                            {scent}
                                        </button>
                                    ))}
                                </div>
                            </div>

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

                    {/* Product Grid Area */}
                    <div className="flex-1 animate-[fadeInUp_0.8s_ease-out_forwards] delay-200">
                        {/* Toolbar */}
                        <div className="flex flex-wrap items-center justify-between mb-8 pb-4 border-b border-zen-green-100 gap-4">
                            <p className="text-xs font-medium tracking-[0.1em] text-zen-green-text/60">SHOWING {products.length} PRODUCTS</p>
                            <div className="flex items-center gap-4">
                                <div className="relative group">
                                    <select
                                        value={activeSort}
                                        onChange={(e) => handleSortChange(e.target.value)}
                                        className="appearance-none bg-transparent text-xs font-bold tracking-[0.1em] uppercase hover:text-zen-green-primary transition-colors cursor-pointer border-none focus:ring-0 pr-8 text-right"
                                    >
                                        <option value="recommended">Sort By: Recommended</option>
                                        <option value="price_asc">Price: Low to High</option>
                                        <option value="price_desc">Price: High to Low</option>
                                        <option value="newest">Newest Arrivals</option>
                                    </select>
                                    <span className="material-symbols-outlined text-[16px] absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none text-zen-green-text">expand_more</span>
                                </div>
                            </div>
                        </div>

                        {/* Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-x-6 gap-y-12">
                            {products.map((product) => (
                                <Link key={product.id} href={`/products/${product.slug}`} className="group flex flex-col gap-4 cursor-pointer">
                                    <div className="relative w-full aspect-[3/4] overflow-hidden rounded-lg bg-zen-green-100">
                                        <div className="absolute inset-0">
                                            <ProductImage
                                                src={product.images?.[0]}
                                                alt={product.translation?.title}
                                                className="w-full h-full object-cover object-center transition-transform duration-[2000ms] ease-out group-hover:scale-105"
                                            />
                                        </div>

                                        {/* Badges */}
                                        {product.is_featured && (
                                            <div className="absolute top-3 left-3 flex flex-col gap-2">
                                                <span className="bg-zen-green-50/80 backdrop-blur-sm border border-zen-green-200 px-2 py-1 text-[10px] font-bold tracking-[0.1em] uppercase text-zen-green-text rounded-sm">
                                                    Featured
                                                </span>
                                            </div>
                                        )}

                                        {/* Quick Add Button (Hover) */}
                                        <button className="absolute bottom-4 left-1/2 -translate-x-1/2 opacity-0 translate-y-4 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-500 bg-zen-green-text text-zen-green-50 hover:bg-zen-green-primary hover:text-white px-6 py-3 rounded-full text-xs font-bold tracking-[0.2em] uppercase shadow-xl shadow-zen-green-200/50 whitespace-nowrap">
                                            View Details
                                        </button>
                                    </div>

                                    <div className="text-center md:text-left space-y-1">
                                        <h3 className="text-base font-light tracking-[0.15em] uppercase text-zen-green-text group-hover:text-zen-green-primary transition-colors">
                                            {product.translation?.title}
                                        </h3>
                                        <div className="flex items-center justify-center md:justify-start gap-3">
                                            <span className="text-sm font-medium tracking-widest text-zen-green-accent">
                                                {formatPrice(product.price)}
                                            </span>
                                            {product.stock_status === 'out_of_stock' && (
                                                <span className="text-[10px] uppercase tracking-widest text-red-400 border-l border-zen-green-200 pl-3">Sold Out</span>
                                            )}
                                            {product.stock_status !== 'out_of_stock' && (
                                                <span className="text-[10px] uppercase tracking-widest text-zen-green-text/40 border-l border-zen-green-200 pl-3">
                                                    {product.category?.translation?.name || 'Collection'}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </Link>
                            ))}

                            {products.length === 0 && (
                                <div className="col-span-full py-20 text-center">
                                    <p className="text-lg font-light text-zen-green-text/60">No products found matching your criteria.</p>
                                    <button onClick={() => handleCategoryChange('all')} className="mt-4 text-sm underline text-zen-green-primary hover:text-zen-green-text">Clear Filters</button>
                                </div>
                            )}
                        </div>

                        {/* Minimal Pagination (Visual only, dependent on backend paging which is not yet passed as prop) */}
                        {/* 
                        <div className="mt-20 flex justify-center items-center gap-8">
                            <button className="text-xs font-bold tracking-[0.2em] uppercase text-zen-green-text/40 hover:text-zen-green-text transition-colors disabled:opacity-20" disabled>Prev</button>
                            <div className="flex items-center gap-4">
                                <a className="w-8 h-8 flex items-center justify-center rounded-full bg-zen-green-text text-zen-green-50 text-xs font-bold" href="#">1</a>
                            </div>
                            <button className="text-xs font-bold tracking-[0.2em] uppercase text-zen-green-text hover:text-zen-green-primary transition-colors">Next</button>
                        </div> 
                        */}
                    </div>
                </div>
            </main>
        </div>
    );
}
