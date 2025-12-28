'use client';

import { useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
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
        <div className="sticky top-20 z-10 container mx-auto px-4 mb-10 transition-all duration-300">
            <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-sm border border-white/50 p-4">
                <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                    {/* Category Tabs */}
                    <div className="flex overflow-x-auto pb-2 md:pb-0 gap-2 w-full md:w-auto scrollbar-hide">
                        {CATEGORIES.map(cat => (
                            <button
                                key={cat.id}
                                onClick={() => handleCategoryChange(cat.id)}
                                className={`px-4 py-2 rounded-full whitespace-nowrap text-sm font-bold transition-all duration-300 ${(currentCategory === cat.id || (cat.id === 'all' && !searchParams.has('category')))
                                        ? 'bg-trad-primary text-white shadow-lg shadow-trad-primary/30 transform scale-105'
                                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-black'
                                    }`}
                            >
                                {cat.name}
                            </button>
                        ))}
                    </div>

                    {/* Search Bar */}
                    <div className="relative w-full md:w-80 group">
                        <input
                            type="text"
                            placeholder="Tìm kiếm bài viết..."
                            value={searchValue}
                            onChange={(e) => {
                                setSearchValue(e.target.value);
                                handleSearch(e.target.value);
                            }}
                            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-gray-50 border-2 border-transparent focus:border-trad-primary/50 focus:bg-white focus:outline-none transition-all duration-300 font-medium text-trad-text-main placeholder:font-light"
                        />
                        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-trad-primary transition-colors">
                            search
                        </span>
                        {searchValue && (
                            <button
                                onClick={() => {
                                    setSearchValue('');
                                    handleSearch('');
                                }}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500 transition-colors"
                            >
                                <span className="material-symbols-outlined text-sm">close</span>
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
