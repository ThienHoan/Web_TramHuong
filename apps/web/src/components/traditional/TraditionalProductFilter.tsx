'use client';

import { Category } from '@/types/product';

interface TraditionalProductFilterProps {
    categories: Category[];
    selectedCategory: string | null;
    priceInputs: { min: string; max: string };
    setPriceInputs: React.Dispatch<React.SetStateAction<{ min: string; max: string }>>;
    onCategoryChange: (categoryId: string | null) => void;
    onApplyPriceFilter: () => void;
    prefix: string;
    isMobile?: boolean;
}

export default function TraditionalProductFilter({
    categories,
    selectedCategory,
    priceInputs,
    setPriceInputs,
    onCategoryChange,
    onApplyPriceFilter,
    prefix,
    isMobile = false
}: TraditionalProductFilterProps) {
    return (
        <div className={`space-y-8 ${isMobile ? 'pb-20' : ''}`}>
            {/* Categories */}
            <div className="space-y-4">
                <h3 className="text-lg font-bold text-trad-text-main font-display border-b border-trad-border-warm pb-2">Danh mục</h3>
                <div className="space-y-3">
                    <div className="flex items-center space-x-3 group cursor-pointer" onClick={() => onCategoryChange(null)}>
                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center transition-colors ${selectedCategory === null ? 'border-trad-primary bg-trad-primary' : 'border-trad-text-muted group-hover:border-trad-primary'}`}>
                            {selectedCategory === null && <div className="w-1.5 h-1.5 bg-white rounded-full"></div>}
                        </div>
                        <label className="text-sm font-medium leading-none cursor-pointer text-trad-text-main group-hover:text-trad-primary transition-colors">Tất cả</label>
                    </div>
                    {categories.map((cat) => (
                        <div key={cat.id} className="flex items-center space-x-3 group cursor-pointer" onClick={() => onCategoryChange(String(cat.id))}>
                            <div className={`w-4 h-4 rounded-full border flex items-center justify-center transition-colors ${selectedCategory === String(cat.id) ? 'border-trad-primary bg-trad-primary' : 'border-trad-text-muted group-hover:border-trad-primary'}`}>
                                {selectedCategory === String(cat.id) && <div className="w-1.5 h-1.5 bg-white rounded-full"></div>}
                            </div>
                            <label className="text-sm font-medium leading-none cursor-pointer text-trad-text-main group-hover:text-trad-primary transition-colors">
                                {cat.translation?.name || 'Danh mục'}
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
                    onClick={onApplyPriceFilter}
                    className={`w-full inline-flex items-center justify-center rounded-lg text-sm font-bold transition-all focus:outline-none focus:ring-2 focus:ring-trad-primary focus:ring-offset-2 bg-trad-primary text-white shadow hover:bg-trad-primary-dark active:scale-[0.98] uppercase tracking-wide ${isMobile ? 'h-12 px-6' : 'h-10 px-4 py-2'}`}
                >
                    Áp dụng
                </button>
            </div>
        </div>
    );
}
