'use client';

import { useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { useRouter } from '@/i18n/routing';
import { useDebouncedCallback } from 'use-debounce';

const CATEGORIES = [
    { id: 'all', name: 'Tất Cả' },
    { id: 'knowledge', name: 'Kiến Thức Trầm Hương' },
    { id: 'culture', name: 'Văn Hóa & Tâm Linh' },
    { id: 'health', name: 'Sức Khỏe & Đời Sống' }
];

export function BlogToolbar() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const currentCategory = searchParams.get('category') || 'all';
    const currentSearch = searchParams.get('search') || '';

    // Local state for immediate input feedback
    const [searchValue, setSearchValue] = useState(currentSearch);

    // Debounce URL update
    const handleSearch = useDebouncedCallback((term: string) => {
        const params = new URLSearchParams(searchParams);
        if (term) {
            params.set('search', term);
        } else {
            params.delete('search');
        }
        params.delete('page'); // Reset pagination
        router.push(`/blog?${params.toString()}`);
    }, 500);

    const handleCategoryChange = (catId: string) => {
        const params = new URLSearchParams(searchParams);
        if (catId === 'all') {
            params.delete('category');
        } else {
            params.set('category', catId);
        }
        params.delete('page'); // Reset pagination
        router.push(`/blog?${params.toString()}`);
    };

    return (
        <section className="sticky top-0 z-20 py-4 -my-4 bg-trad-bg-light/95 backdrop-blur-sm border-b border-trad-border-subtle">
            <div className="container mx-auto px-4 max-w-6xl">
                <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
                    {/* Category Tabs */}
                    <div className="flex overflow-x-auto pb-2 md:pb-0 gap-2 w-full md:w-auto no-scrollbar mask-gradient scrollbar-hide">
                        {CATEGORIES.map(cat => (
                            <button
                                key={cat.id}
                                onClick={() => handleCategoryChange(cat.id)}
                                className={`whitespace-nowrap px-5 py-3 rounded-full text-sm font-medium transition-colors duration-300 ${(currentCategory === cat.id || (cat.id === 'all' && !searchParams.has('category')))
                                    ? 'bg-trad-primary text-white shadow-md'
                                    : 'bg-white text-trad-text-main hover:bg-black/5 hover:text-trad-primary'
                                    }`}
                            >
                                {cat.name}
                            </button>
                        ))}
                    </div>

                    {/* Search & Filter */}
                    <div className="flex items-center gap-3 w-full md:w-auto">
                        <div className="relative w-full md:w-64 group">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-trad-text-muted text-[20px] group-focus-within:text-trad-primary transition-colors">
                                search
                            </span>
                            <input
                                className="w-full pl-10 pr-4 py-3 rounded-lg border border-trad-border-warm bg-white focus:border-trad-primary focus:ring-1 focus:ring-trad-primary outline-none text-sm font-sans transition-all text-trad-text-main placeholder:text-trad-text-muted/70"
                                placeholder="Tìm kiếm bài viết..."
                                type="text"
                                value={searchValue}
                                onChange={(e) => {
                                    setSearchValue(e.target.value);
                                    handleSearch(e.target.value);
                                }}
                            />
                            {searchValue && (
                                <button
                                    onClick={() => {
                                        setSearchValue('');
                                        handleSearch('');
                                    }}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500 transition-colors p-2"
                                >
                                    <span className="material-symbols-outlined text-[18px]">close</span>
                                </button>
                            )}
                        </div>
                        <button className="h-11 w-11 flex items-center justify-center border border-trad-border-warm rounded-lg bg-white text-trad-text-main hover:text-trad-primary hover:border-trad-primary transition-colors shadow-sm" title="Lọc">
                            <span className="material-symbols-outlined text-[20px]">filter_list</span>
                        </button>
                    </div>
                </div>
            </div>
        </section>
    );
}
