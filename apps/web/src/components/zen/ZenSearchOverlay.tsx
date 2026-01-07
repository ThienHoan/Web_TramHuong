'use client';

import { useState, useEffect, useRef } from 'react';
import { useDebounce } from '@/hooks/useDebounce';
import { getProducts, getPosts } from '@/lib/api-client';
import { Product } from '@/types/product';
import { BlogPost } from '@/types/blog'; // Verify type exists
import { useRouter } from '@/i18n/routing'; // Use i18n routing
import Image from 'next/image';

interface ZenSearchOverlayProps {
    isOpen: boolean;
    onClose: () => void;
    locale: string;
}

export default function ZenSearchOverlay({ isOpen, onClose, locale }: ZenSearchOverlayProps) {
    const [query, setQuery] = useState('');
    const debouncedQuery = useDebounce(query, 400);
    const [results, setResults] = useState<{
        products: Product[];
        posts: BlogPost[];
        loading: boolean;
    }>({ products: [], posts: [], loading: false });

    const inputRef = useRef<HTMLInputElement>(null);
    const router = useRouter();

    // Auto-focus logic
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden'; // Lock scroll
            setTimeout(() => inputRef.current?.focus(), 100);
        } else {
            document.body.style.overflow = '';
        }
        return () => { document.body.style.overflow = ''; };
    }, [isOpen]);

    // Search Logic
    useEffect(() => {
        if (!debouncedQuery.trim()) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setResults({ products: [], posts: [], loading: false });
            return;
        }

        let isCancelled = false;
        setResults(prev => ({ ...prev, loading: true }));

        const fetchData = async () => {
            try {
                // Parallel fetch
                const [productsData, postsData] = await Promise.all([
                    getProducts(locale, { search: debouncedQuery, limit: 4 }), // Limit product results
                    getPosts({ search: debouncedQuery, limit: 3 })
                ]);

                if (!isCancelled) {
                    setResults({
                        products: productsData || [],
                        posts: postsData.data || [],
                        loading: false
                    });
                }
            } catch (error) {
                console.error("Search error", error);
                if (!isCancelled) setResults(prev => ({ ...prev, loading: false }));
            }
        };

        fetchData();

        return () => { isCancelled = true; };
    }, [debouncedQuery, locale]);

    // Handle Close Interaction (ESC)
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [onClose]);

    // Handle Navigation (Close on link click)
    const handleLinkClick = (path: string) => {
        onClose();
        router.push(path);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] bg-white/95 dark:bg-zinc-950/98 backdrop-blur-md animate-fade-in flex flex-col">
            {/* Header / Search Input */}
            <div className="max-w-5xl w-full mx-auto px-6 lg:px-12 pt-8 pb-4 border-b border-zen-100 dark:border-white/10 flex items-center gap-6">
                <span className="material-symbols-outlined text-3xl text-zen-400 dark:text-zinc-500">search</span>
                <input
                    ref={inputRef}
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search for agarwood, purity, stories..."
                    className="flex-grow bg-transparent text-2xl md:text-4xl font-light text-zen-900 dark:text-white placeholder-zen-200 dark:placeholder-zinc-700 focus:outline-none font-display tracking-wide"
                />
                <div className="flex items-center gap-4">
                    {query && (
                        <button
                            onClick={() => setQuery('')}
                            className="hidden md:flex text-xs font-bold uppercase tracking-widest text-zen-400 hover:text-zen-900 border border-zen-200 rounded-full px-4 py-2 transition-colors"
                        >
                            Clear
                        </button>
                    )}
                    <button
                        onClick={onClose}
                        className="size-10 flex items-center justify-center rounded-full hover:bg-zen-100 dark:hover:bg-zinc-800 transition-colors"
                    >
                        <span className="material-symbols-outlined text-3xl text-zen-900 dark:text-white">close</span>
                    </button>
                </div>
            </div>

            {/* Results Area */}
            <div className="flex-grow overflow-y-auto w-full">
                <div className="max-w-5xl mx-auto px-6 lg:px-12 py-12">

                    {/* Loading State */}
                    {results.loading && (
                        <div className="flex justify-center py-20">
                            <span className="material-symbols-outlined animate-spin text-4xl text-zen-300">progress_activity</span>
                        </div>
                    )}

                    {/* Empty / Initial State - Suggestions */}
                    {!query && !results.loading && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                            <div>
                                <h4 className="text-xs font-bold uppercase tracking-widest text-zen-400 mb-6">Popular Collections</h4>
                                <ul className="space-y-4">
                                    {['Incense', 'Bracelets', 'Essentials', 'Gift Sets'].map(item => (
                                        <li key={item}>
                                            <button
                                                onClick={() => { setQuery(item); }}
                                                className="text-lg md:text-xl font-light text-zen-800 dark:text-zinc-300 hover:text-primary transition-colors hover:translate-x-2 duration-300 flex items-center gap-2"
                                            >
                                                <span>{item}</span>
                                                <span className="material-symbols-outlined text-sm opacity-0 hover:opacity-100 transition-opacity">arrow_forward</span>
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                            <div>
                                <h4 className="text-xs font-bold uppercase tracking-widest text-zen-400 mb-6">Trending Searches</h4>
                                <div className="flex flex-wrap gap-3">
                                    {['Ky Nam', 'Meditation', 'Peace', 'Ceramic Burner', 'Premium'].map(tag => (
                                        <button
                                            key={tag}
                                            onClick={() => setQuery(tag)}
                                            className="px-4 py-2 border border-zen-100 dark:border-zinc-800 rounded-full text-sm text-zen-600 dark:text-zinc-400 hover:bg-zen-50 dark:hover:bg-zinc-800 transition-colors"
                                        >
                                            {tag}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Results Grid */}
                    {query && !results.loading && (
                        <div className="space-y-16">

                            {/* Products Section */}
                            {results.products.length > 0 && (
                                <section className="animate-fade-in-up">
                                    <div className="flex justify-between items-end mb-8 border-b border-zen-100 dark:border-zinc-800 pb-4">
                                        <h3 className="text-xl font-light text-zen-900 dark:text-white uppercase tracking-widest">Products</h3>
                                        <button onClick={() => handleLinkClick(`/products?search=${query}`)} className="text-xs font-bold text-primary tracking-widest uppercase hover:underline">View All Products</button>
                                    </div>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                                        {results.products.map(product => (
                                            <div key={product.id} onClick={() => handleLinkClick(`/products/${product.slug}`)} className="group cursor-pointer">
                                                <div className="relative aspect-square bg-zen-50 dark:bg-zinc-900 rounded-lg overflow-hidden mb-3">
                                                    {product.images?.[0] ? (
                                                        <Image src={product.images[0]} alt={product.translation?.title || product.title || 'Product'} fill className="object-cover group-hover:scale-105 transition-transform duration-500" />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-zen-200"><span className="material-symbols-outlined">spa</span></div>
                                                    )}
                                                </div>
                                                <h4 className="text-sm font-medium text-zen-900 dark:text-white group-hover:text-primary transition-colors">{product.translation?.title || product.title}</h4>
                                                <p className="text-xs text-zen-500 mt-1">{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(product.price)}</p>
                                            </div>
                                        ))}
                                    </div>
                                </section>
                            )}

                            {/* Blog Section */}
                            {results.posts.length > 0 && (
                                <section className="animate-fade-in-up delay-100">
                                    <div className="flex justify-between items-end mb-8 border-b border-zen-100 dark:border-zinc-800 pb-4">
                                        <h3 className="text-xl font-light text-zen-900 dark:text-white uppercase tracking-widest">Journal</h3>
                                        <button onClick={() => handleLinkClick(`/blog?search=${query}`)} className="text-xs font-bold text-primary tracking-widest uppercase hover:underline">Read All Stories</button>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                        {results.posts.map(post => (
                                            <div key={post.id} onClick={() => handleLinkClick(`/blog/${post.slug}`)} className="group cursor-pointer flex gap-4 md:block">
                                                <div className="relative w-24 h-24 md:w-full md:aspect-video bg-zen-50 dark:bg-zinc-900 rounded-lg overflow-hidden md:mb-3 flex-shrink-0">
                                                    {post.cover_image ? (
                                                        <Image src={post.cover_image} alt={post.title} fill className="object-cover group-hover:scale-105 transition-transform duration-500" />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-zen-200"><span className="material-symbols-outlined">article</span></div>
                                                    )}
                                                </div>
                                                <div className="flex flex-col justify-center">
                                                    <h4 className="text-sm md:text-base font-medium text-zen-900 dark:text-white group-hover:text-primary transition-colors line-clamp-2 md:line-clamp-1">{post.title}</h4>
                                                    <p className="text-xs text-zen-500 mt-1 line-clamp-2">{post.excerpt}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </section>
                            )}

                            {/* No Results */}
                            {query && results.products.length === 0 && results.posts.length === 0 && (
                                <div className="text-center py-20">
                                    <p className="text-zen-400 text-lg font-light">We searched far and wide, but found nothing for &quot;{query}&quot;.</p>
                                    <button onClick={() => setQuery('')} className="mt-4 text-primary text-sm font-bold uppercase tracking-widest hover:underline">Clear Search</button>
                                </div>
                            )}

                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
