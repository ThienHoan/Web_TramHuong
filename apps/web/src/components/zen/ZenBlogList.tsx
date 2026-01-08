'use client';

import { BlogPost } from '@/types/blog';
import { Link, useRouter, usePathname } from '@/i18n/routing';
import Image from 'next/image';
import { useState, useTransition } from 'react';

interface ZenBlogListProps {
    posts: BlogPost[];
    meta: {
        currentPage: number;
        totalPages: number;
        totalItems: number;
    };
    featuredPost: BlogPost | null;
    searchParams: {
        page?: number;
        category?: string;
        search?: string;
    };
}

const CATEGORIES = [
    { id: 'all', name: 'ALL STORIES' },
    { id: 'rituals', name: 'RITUALS' },
    { id: 'scent_origins', name: 'SCENT ORIGINS' },
    { id: 'culture', name: 'CULTURE' }
];

export default function ZenBlogList({ posts, meta, featuredPost, searchParams }: ZenBlogListProps) {
    const router = useRouter();
    const pathname = usePathname();
    const [, startTransition] = useTransition();
    const [searchValue, setSearchValue] = useState(searchParams.search || '');

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        const params = new URLSearchParams();
        if (searchValue) params.set('search', searchValue);
        if (searchParams.category) params.set('category', searchParams.category);

        startTransition(() => {
            router.push(`${pathname}?${params.toString()}`);
        });
    };

    const handleCategoryChange = (categoryId: string) => {
        const params = new URLSearchParams();
        if (categoryId !== 'all') params.set('category', categoryId);
        if (searchParams.search) params.set('search', searchParams.search);

        startTransition(() => {
            router.push(`${pathname}?${params.toString()}`);
        });
    };

    const handlePageChange = (newPage: number) => {
        const params = new URLSearchParams();
        if (searchParams.category) params.set('category', searchParams.category);
        if (searchParams.search) params.set('search', searchParams.search);
        params.set('page', newPage.toString());

        startTransition(() => {
            router.push(`${pathname}?${params.toString()}`);
        });
    };

    return (
        <div className="bg-background-light dark:bg-background-dark text-zen-800 dark:text-gray-200 font-display selection:bg-primary/20 min-h-screen flex flex-col">

            <main className="flex-grow">
                {/* Page Heading */}
                <section className="w-full px-4 md:px-10 pt-20 pb-12">
                    <div className="max-w-[1280px] mx-auto flex flex-col items-center text-center space-y-6">
                        <p className="text-primary text-xs font-medium tracking-[0.3em] uppercase animate-fade-in">The Agarwood Journal</p>
                        <h1 className="text-zen-900 dark:text-white text-4xl md:text-6xl font-thin leading-tight tracking-[0.15em] uppercase max-w-4xl">
                            Insights &amp; Reflections
                        </h1>
                        <p className="text-zen-800/70 dark:text-gray-400 text-sm md:text-base font-light tracking-wide max-w-lg leading-relaxed">
                            Exploring the heritage, scent, and stillness of Vietnamese Agarwood. A collection of stories for the mindful soul.
                        </p>
                    </div>
                </section>

                {/* Featured Article (Still Moment) */}
                {featuredPost && (
                    <section className="w-full px-4 md:px-10 py-8">
                        <div className="max-w-[1280px] mx-auto">
                            <div className="group relative overflow-hidden rounded-xl bg-white dark:bg-white/5 border border-zen-100 dark:border-white/5 shadow-sm hover:shadow-md transition-all duration-500">
                                <div className="flex flex-col lg:flex-row h-full">
                                    {/* Image Side */}
                                    <div className="w-full lg:w-3/5 h-[400px] lg:h-[500px] overflow-hidden relative">
                                        <div className="absolute inset-0 bg-black/10 z-10 transition-opacity group-hover:bg-black/0"></div>
                                        <Image
                                            src={featuredPost.cover_image || 'https://lh3.googleusercontent.com/aida-public/AB6AXuC1vpbdoMLJGx-eUns-4pVf__QW9dm3bmqMVLiGMZxxU19FMFQQDj9tCG_MQkfwaK0abkHY4D9oyHCFQCHOkW9RY5ilO3Kz3-h1pnlMaJYL_Lg5prchGW-hpAxSoQ3GNJTwm_Rj6N8qHh1vkxQOzDd2QAPpIvokmV9qMYMOt2BPx59iUz3BuvPxJ6iXuRDk6D3joaSUZzMhVlFiagL3qsGOTuSEkKmSRWiuQBPftbrWJZ6lfDCELrFzXzoBy-IdvnHgZZw2V04IniZF'}
                                            alt={featuredPost.title}
                                            fill
                                            className="object-cover transition-transform duration-1000 ease-out group-hover:scale-105"
                                        />
                                    </div>
                                    {/* Content Side */}
                                    <div className="w-full lg:w-2/5 flex flex-col justify-center p-8 lg:p-12 space-y-6 bg-zen-50 dark:bg-background-dark">
                                        <div className="flex items-center gap-3">
                                            <span className="w-8 h-[1px] bg-primary"></span>
                                            <span className="text-primary text-xs font-medium tracking-[0.2em] uppercase">Featured Story</span>
                                        </div>
                                        <h2 className="text-zen-900 dark:text-white text-2xl lg:text-4xl font-light leading-tight tracking-wide uppercase">
                                            {featuredPost.title}
                                        </h2>
                                        <p className="text-zen-800/80 dark:text-gray-300 text-sm font-light leading-relaxed tracking-wide line-clamp-4">
                                            {featuredPost.excerpt}
                                        </p>
                                        <div className="pt-4">
                                            <Link href={`/blog/${featuredPost.slug}`} className="inline-flex items-center gap-2 text-zen-900 dark:text-white text-xs font-bold tracking-[0.2em] uppercase group/link hover:text-primary transition-colors">
                                                Read Full Article
                                                <span className="material-symbols-outlined text-[16px] transition-transform duration-300 group-hover/link:translate-x-1">arrow_forward</span>
                                            </Link>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>
                )}

                {/* Search & Filters */}
                <section className="w-full px-4 md:px-10 py-12">
                    <div className="max-w-[1280px] mx-auto">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-8 border-b border-zen-100 dark:border-white/10 pb-6">
                            {/* Filter Chips */}
                            <div className="flex flex-wrap gap-3">
                                {CATEGORIES.map(cat => (
                                    <button
                                        key={cat.id}
                                        onClick={() => handleCategoryChange(cat.id)}
                                        className={`px-4 py-2 rounded-full border text-xs tracking-wider transition-all ${(searchParams.category === cat.id || (!searchParams.category && cat.id === 'all'))
                                            ? 'border-zen-800 dark:border-white bg-zen-800 dark:bg-white text-white dark:text-zen-900'
                                            : 'border-zen-100 dark:border-white/20 bg-transparent hover:border-primary text-zen-600 dark:text-gray-400 hover:text-primary'
                                            }`}
                                    >
                                        {cat.name}
                                    </button>
                                ))}
                            </div>
                            {/* Search Field */}
                            <div className="w-full md:w-auto min-w-[300px]">
                                <form onSubmit={handleSearch} className="relative group">
                                    <input
                                        className="w-full bg-transparent border-b border-zen-200 dark:border-white/20 py-2 pl-0 pr-8 text-sm text-zen-900 dark:text-white placeholder-zen-400 dark:placeholder-gray-500 focus:outline-none focus:border-primary transition-colors"
                                        placeholder="Search for tranquility..."
                                        type="text"
                                        value={searchValue}
                                        onChange={(e) => setSearchValue(e.target.value)}
                                    />
                                    <button type="submit" className="material-symbols-outlined absolute right-0 top-1/2 -translate-y-1/2 text-zen-400 dark:text-gray-500 group-focus-within:text-primary transition-colors text-[20px]">search</button>
                                </form>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Blog Grid (Contemplative Entries) */}
                <section className="w-full px-4 md:px-10 pb-20">
                    <div className="max-w-[1280px] mx-auto">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-16">
                            {posts.filter(p => p.id !== featuredPost?.id).map((post) => (
                                <Link key={post.id} href={`/blog/${post.slug}`} className="group flex flex-col gap-4 cursor-pointer">
                                    <div className="overflow-hidden rounded-lg aspect-[4/3] w-full bg-zen-100 relative">
                                        <Image
                                            src={post.cover_image || 'https://lh3.googleusercontent.com/aida-public/AB6AXuDSdbVvde-by1m-yuHQZPM6e6L4KUnsF11fkN_XdU-uDSLtNGzHiEDUDWfWYvqVN-XkpI2X4hm00Qfz5QCcf8g4su9Da6IeYPn2QarmRE6XDpWkPggonZR4G79nZiCTKRJtXoHB-L48yGRt0Sn7lAxdJkRThkp-hXvhL5Cvr79obiQID3uJrE6DLwnL3JOszkKEZzSdSr3ob_9mUbXdUxXI1Jug4E85CZBs0YPYvWb_yoOfn9xoG008EpzWyOGMhHzJTMACJQ_IG7kV'}
                                            alt={post.title}
                                            fill
                                            className="object-cover transition-transform duration-700 group-hover:scale-105"
                                        />
                                        <div className="absolute top-4 left-4 bg-white/90 dark:bg-black/80 backdrop-blur-sm px-3 py-1 rounded text-[10px] font-bold tracking-widest uppercase text-zen-900 dark:text-white">
                                            {post.category || 'Article'}
                                        </div>
                                    </div>
                                    <div className="flex flex-col gap-2 pt-2">
                                        <div className="flex items-center gap-2 text-[10px] text-zen-500 dark:text-gray-400 tracking-wider uppercase">
                                            <span>{new Date(post.created_at).toLocaleDateString()}</span>
                                            <span className="size-1 rounded-full bg-primary/40"></span>
                                            <span>By {post.author?.full_name || 'Zen Team'}</span>
                                        </div>
                                        <h3 className="text-xl font-light text-zen-900 dark:text-white uppercase tracking-wide leading-tight group-hover:text-primary transition-colors">
                                            {post.title}
                                        </h3>
                                        <p className="text-sm text-zen-600 dark:text-gray-400 line-clamp-2 font-light leading-relaxed">
                                            {post.excerpt}
                                        </p>
                                        <div className="pt-2">
                                            <span className="text-xs font-bold text-zen-900 dark:text-white tracking-[0.15em] uppercase border-b border-transparent group-hover:border-primary transition-all">Read More</span>
                                        </div>
                                    </div>
                                </Link>
                            ))}

                            {posts.length === 0 && (
                                <div className="col-span-full text-center py-20">
                                    <span className="material-symbols-outlined text-4xl text-zen-300 dark:text-gray-600 mb-4">spa</span>
                                    <h3 className="text-xl font-light text-zen-900 dark:text-white mb-2">No stories found</h3>
                                    <p className="text-zen-600 dark:text-gray-400 font-light">Try searching for something else.</p>
                                </div>
                            )}
                        </div>

                        {/* Pagination */}
                        {meta.totalPages > 1 && (
                            <div className="flex justify-center items-center gap-8 mt-24">
                                <button
                                    onClick={() => handlePageChange(meta.currentPage - 1)}
                                    disabled={meta.currentPage <= 1}
                                    className="flex items-center gap-2 text-xs font-bold tracking-[0.2em] uppercase text-zen-400 hover:text-zen-900 dark:hover:text-white disabled:opacity-50 transition-colors disabled:cursor-not-allowed"
                                >
                                    <span className="material-symbols-outlined text-[16px]">arrow_back</span>
                                    Prev
                                </button>
                                <div className="flex items-center gap-4 text-sm font-medium">
                                    {/* Simplified Pagination: Show current / total */}
                                    <span className="text-zen-900 dark:text-white border-b border-zen-900 dark:border-white pb-0.5">{meta.currentPage}</span>
                                    <span className="text-zen-400 text-xs">OF</span>
                                    <span className="text-zen-400">{meta.totalPages}</span>
                                </div>
                                <button
                                    onClick={() => handlePageChange(meta.currentPage + 1)}
                                    disabled={meta.currentPage >= meta.totalPages}
                                    className="flex items-center gap-2 text-xs font-bold tracking-[0.2em] uppercase text-zen-900 dark:text-white hover:text-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Next
                                    <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                                </button>
                            </div>
                        )}
                    </div>
                </section>

                {/* Newsletter / Footer CTA */}
                <section className="w-full bg-zen-100/50 dark:bg-white/5 py-24 px-4">
                    <div className="max-w-md mx-auto text-center space-y-6">
                        <span className="material-symbols-outlined text-4xl text-primary font-light">spa</span>
                        <h2 className="text-2xl font-light tracking-[0.2em] uppercase text-zen-900 dark:text-white">Subscribe to Stillness</h2>
                        <p className="text-sm text-zen-600 dark:text-gray-400 font-light leading-relaxed">
                            Receive contemplative stories, exclusive release news, and guides on the art of incense directly to your inbox.
                        </p>
                        <form className="flex flex-col gap-4 pt-4">
                            <div className="flex border-b border-zen-800 dark:border-white/50">
                                <input className="w-full bg-transparent py-3 text-sm focus:outline-none placeholder:text-zen-400 dark:placeholder:text-gray-500 text-zen-900 dark:text-white" placeholder="Your email address" type="email" />
                                <button className="text-xs font-bold uppercase tracking-widest text-zen-900 dark:text-white hover:text-primary transition-colors">Join</button>
                            </div>
                        </form>
                    </div>
                </section>
            </main>
        </div>
    );
}
